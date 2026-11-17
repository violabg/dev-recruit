/**
 * Application decisions
 *
 * The decision model of one application (criteria x sources) and the
 * decision write. Domain logic only: no Next.js import and no cache call. It
 * throws UserError for expected failures; the callers invalidate the cache.
 *
 * loadApplicationDecision is the single builder of the decision model. It
 * returns submitted interviewer scorecards only and never reads live notes.
 */

import prisma from "@/lib/prisma";
import {
  answerEvaluationsSchema,
  criteriaAssessmentSchema,
  DECISION_OUTCOME_VALUES,
  decisionWeightsSchema,
  type ApplicationStage,
  type DecisionOutcomeValue,
  type DecisionWeights,
  type InterviewStatus,
} from "@/lib/schemas";
import {
  buildDecisionWeights,
  testScoresByCriterion,
  toFivePointScale,
  type CriterionSources,
  type DecisionCriterion,
  type InterviewerCriterionScore,
} from "@/lib/utils/decision-score";
import {
  advanceApplicationStage,
  type DbClient,
} from "@/lib/services/applications";
import { UserError } from "./user-error";

export type DecisionScorecard = {
  feedbackId: string;
  interviewerId: string;
  interviewerName: string;
  hireRecommendation: string | null;
  notes: string | null;
  redFlags: string[];
  standoutMoments: string[];
  submittedAt: Date;
};

export type DecisionInterview = {
  id: string;
  round: number;
  status: InterviewStatus;
  scheduledAt: Date;
  participantIds: string[];
  submittedInterviewerIds: string[];
  /** Submitted only, ordered by submittedAt */
  scorecards: DecisionScorecard[];
};

export type ApplicationDecision = {
  id: string;
  stage: ApplicationStage;
  candidateId: string;
  positionId: string;
  candidate: { id: string; firstName: string; lastName: string };
  position: { id: string; title: string };
  recorded: {
    outcome: DecisionOutcomeValue | null;
    rationale: string | null;
    decidedAt: Date | null;
    decidedBy: { id: string; name: string } | null;
    /** Parsed; null when absent or malformed */
    weights: DecisionWeights | null;
  };
  criteria: DecisionCriterion[];
  /** One per criteria row, same order */
  sources: CriterionSources[];
  /** global = toFivePointScale(fitScore, 10) */
  cv: {
    evaluationId: string;
    fitScore: number;
    global: number;
    perCriterion: boolean;
  } | null;
  /** global = toFivePointScale(quizScore, 100) */
  test: {
    assessmentId: string;
    quizTitle: string;
    quizScore: number | null;
    global: number | null;
    perCriterion: boolean;
    answerDetailMissing: boolean;
  } | null;
  interviews: DecisionInterview[];
};

export type RecordDecisionResult = {
  applicationId: string;
  candidateId: string;
  positionId: string;
  stage: ApplicationStage;
  changed: boolean;
};

/** Stages on which a decision can no longer be recorded */
const DECISION_CLOSED_STAGES: readonly ApplicationStage[] = [
  "hired",
  "rejected",
  "withdrawn",
];

const isDecisionOutcome = (
  value: string | null,
): value is DecisionOutcomeValue =>
  value !== null &&
  (DECISION_OUTCOME_VALUES as readonly string[]).includes(value);

/**
 * Build the decision model of an application, or null when it does not
 * exist. Criterion ids are resolved through the position scorecard (active and
 * archived); ids of deleted criteria are ignored everywhere.
 */
export async function loadApplicationDecision(
  client: DbClient,
  applicationId: string,
): Promise<ApplicationDecision | null> {
  const application = await client.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      stage: true,
      candidateId: true,
      positionId: true,
      decision: true,
      decisionRationale: true,
      decidedAt: true,
      decisionWeights: true,
      decider: { select: { id: true, name: true } },
      candidate: { select: { id: true, firstName: true, lastName: true } },
      position: { select: { id: true, title: true } },
    },
  });

  if (!application) {
    return null;
  }

  const { candidateId, positionId } = application;

  const parsedWeights = decisionWeightsSchema.safeParse(
    application.decisionWeights,
  );
  const recorded: ApplicationDecision["recorded"] = {
    outcome: isDecisionOutcome(application.decision)
      ? application.decision
      : null,
    rationale: application.decisionRationale,
    decidedAt: application.decidedAt,
    decidedBy: application.decider ?? null,
    weights: parsedWeights.success ? parsedWeights.data : null,
  };

  // Criteria of the position scorecard, active and archived
  const storedCriteria = await client.scorecardCriterion.findMany({
    where: { scorecard: { positionId } },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      priority: true,
      expectedLevel: true,
      weight: true,
      archivedAt: true,
      order: true,
    },
  });
  const knownIds = new Set(storedCriteria.map((criterion) => criterion.id));

  // CV: the resume evaluation of the same candidate and position
  const resumeEvaluation = await client.evaluation.findFirst({
    where: { candidateId, positionId, assessmentId: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, fitScore: true, criteriaAssessment: true },
  });

  const cvByCriterion = new Map<string, { score: number; evidence: string }>();
  let cv: ApplicationDecision["cv"] = null;
  if (resumeEvaluation) {
    const parsedAssessment = criteriaAssessmentSchema.safeParse(
      resumeEvaluation.criteriaAssessment,
    );
    const criteriaAssessment = parsedAssessment.success
      ? parsedAssessment.data
      : null;

    if (criteriaAssessment) {
      for (const [criterionId, entry] of Object.entries(criteriaAssessment)) {
        if (!knownIds.has(criterionId) || entry.score === null) continue;
        cvByCriterion.set(criterionId, {
          score: entry.score,
          evidence: entry.evidence,
        });
      }
    }

    if (resumeEvaluation.fitScore !== null) {
      cv = {
        evaluationId: resumeEvaluation.id,
        fitScore: resumeEvaluation.fitScore,
        global: toFivePointScale(resumeEvaluation.fitScore, 10),
        perCriterion: criteriaAssessment !== null,
      };
    }
  }

  // Test: the most recent completed assessment of the application with an
  // evaluation
  const assessment = await client.assessment.findFirst({
    where: {
      applicationId,
      status: "completed",
      evaluation: { isNot: null },
    },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      quiz: {
        select: {
          title: true,
          quizQuestions: { select: { questionId: true, criterionIds: true } },
        },
      },
      evaluation: { select: { quizScore: true, answerEvaluations: true } },
    },
  });

  let testByCriterion = new Map<
    string,
    { score: number; questionCount: number }
  >();
  let test: ApplicationDecision["test"] = null;
  if (assessment && assessment.evaluation) {
    const parsedAnswers = answerEvaluationsSchema.safeParse(
      assessment.evaluation.answerEvaluations,
    );
    const answerEvaluations = parsedAnswers.success ? parsedAnswers.data : null;

    testByCriterion = testScoresByCriterion({
      knownCriterionIds: knownIds,
      links: assessment.quiz.quizQuestions,
      answerEvaluations,
    });

    const quizScore = assessment.evaluation.quizScore;
    test = {
      assessmentId: assessment.id,
      quizTitle: assessment.quiz.title,
      quizScore,
      global: quizScore === null ? null : toFivePointScale(quizScore, 100),
      perCriterion: testByCriterion.size > 0,
      answerDetailMissing: answerEvaluations === null,
    };
  }

  // Interviews: submitted scorecards only, never live notes
  const storedInterviews = await client.interview.findMany({
    where: {
      applicationId,
      status: { notIn: ["cancelled", "no_show"] },
    },
    orderBy: [{ round: "asc" }, { scheduledAt: "asc" }],
    select: {
      id: true,
      round: true,
      status: true,
      scheduledAt: true,
      participants: { select: { userId: true } },
      feedback: {
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: "asc" },
        select: {
          id: true,
          interviewerId: true,
          hireRecommendation: true,
          notes: true,
          redFlags: true,
          standoutMoments: true,
          submittedAt: true,
          interviewer: { select: { name: true } },
          scores: {
            select: { criterionId: true, score: true, evidence: true },
          },
        },
      },
    },
  });

  const interviewerScores = new Map<string, InterviewerCriterionScore[]>();
  const interviews: DecisionInterview[] = storedInterviews.map((interview) => {
    const scorecards: DecisionScorecard[] = [];

    for (const feedback of interview.feedback) {
      // The where clause already excludes unsubmitted scorecards
      if (feedback.submittedAt === null) continue;

      scorecards.push({
        feedbackId: feedback.id,
        interviewerId: feedback.interviewerId,
        interviewerName: feedback.interviewer.name,
        hireRecommendation: feedback.hireRecommendation,
        notes: feedback.notes,
        redFlags: feedback.redFlags,
        standoutMoments: feedback.standoutMoments,
        submittedAt: feedback.submittedAt,
      });

      for (const score of feedback.scores) {
        if (!knownIds.has(score.criterionId)) continue;
        const list = interviewerScores.get(score.criterionId) ?? [];
        list.push({
          feedbackId: feedback.id,
          interviewId: interview.id,
          round: interview.round,
          interviewerId: feedback.interviewerId,
          interviewerName: feedback.interviewer.name,
          score: score.score,
          evidence: score.evidence,
        });
        interviewerScores.set(score.criterionId, list);
      }
    }

    return {
      id: interview.id,
      round: interview.round,
      status: interview.status,
      scheduledAt: interview.scheduledAt,
      participantIds: interview.participants.map((p) => p.userId),
      submittedInterviewerIds: scorecards.map((s) => s.interviewerId),
      scorecards,
    };
  });

  // Criteria rows: every active criterion, plus archived criteria with
  // evidence on this application or stored in the decision weights
  const criteria: DecisionCriterion[] = storedCriteria
    .filter(
      (criterion) =>
        criterion.archivedAt === null ||
        cvByCriterion.has(criterion.id) ||
        testByCriterion.has(criterion.id) ||
        interviewerScores.has(criterion.id) ||
        (recorded.weights !== null && criterion.id in recorded.weights),
    )
    .map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      category: criterion.category,
      priority: criterion.priority,
      expectedLevel: criterion.expectedLevel,
      weight: criterion.weight,
      archived: criterion.archivedAt !== null,
      order: criterion.order,
    }));

  const sources: CriterionSources[] = criteria.map((criterion) => ({
    criterionId: criterion.id,
    cv: cvByCriterion.get(criterion.id) ?? null,
    test: testByCriterion.get(criterion.id) ?? null,
    interviewers: interviewerScores.get(criterion.id) ?? [],
  }));

  return {
    id: application.id,
    stage: application.stage,
    candidateId,
    positionId,
    candidate: application.candidate,
    position: application.position,
    recorded,
    criteria,
    sources,
    cv,
    test,
    interviews,
  };
}

/**
 * Record the decision of an application. In one transaction: decision,
 * rationale, decider, time and the weights of the matrix criteria, then the
 * stage advances with decision_recorded (never backwards). Refused on hired,
 * rejected and withdrawn. A repeated decision overwrites the previous one.
 */
export async function recordApplicationDecision(params: {
  applicationId: string;
  outcome: DecisionOutcomeValue;
  rationale: string;
  userId: string;
}): Promise<RecordDecisionResult> {
  const { applicationId, outcome, rationale, userId } = params;

  return prisma.$transaction(async (tx) => {
    const model = await loadApplicationDecision(tx, applicationId);
    if (!model) {
      throw new UserError("Candidatura non trovata");
    }

    if (DECISION_CLOSED_STAGES.includes(model.stage)) {
      throw new UserError(
        "Candidatura chiusa: riaprila per registrare la decisione",
      );
    }

    await tx.application.update({
      where: { id: applicationId },
      data: {
        decision: outcome,
        decisionRationale: rationale,
        decidedBy: userId,
        decidedAt: new Date(),
        decisionWeights: buildDecisionWeights(model.criteria),
      },
    });

    const change = await advanceApplicationStage(
      tx,
      applicationId,
      "decision_recorded",
      outcome,
    );

    return {
      applicationId,
      candidateId: model.candidateId,
      positionId: model.positionId,
      stage: change.stage,
      changed: change.changed,
    };
  });
}
