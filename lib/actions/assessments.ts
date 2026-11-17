"use server";

import {
  candidateQuizAssignmentSchema,
  candidateQuizSelectionSchema,
  submitAnswerSchema,
} from "@/lib/schemas";
import { acceptsAnswers, assessmentState } from "@/lib/utils/assessment-utils";
import { generateAssessmentToken } from "@/lib/utils/token";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { Prisma } from "../prisma/client";
import {
  advanceApplicationStage,
  type StageChangeResult,
} from "../services/applications";
import {
  invalidateAssessmentCache,
  invalidateCandidateCache,
} from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

/** A test can be sent only to an application that is still open to it */
const CLOSED_APPLICATION_STAGES = ["rejected", "withdrawn"] as const;

// ============================================================================
// Candidate-facing actions. Public by design: the assessment token in the URL
// is the credential, so these never call requireUser().
// ============================================================================

const lifecycleSelect = {
  id: true,
  quizId: true,
  status: true,
  startedAt: true,
  answers: true,
  quiz: { select: { timeLimit: true } },
} as const;

async function findAssessmentByToken(token: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { token },
    select: lifecycleSelect,
  });

  if (!assessment) {
    throw new UserError("Test non trovato");
  }

  return {
    ...assessment,
    timeLimit: assessment.quiz.timeLimit,
  };
}

/** Mark an assessment as completed. An assessment that ran out of time ends here too. */
async function closeAssessment(assessmentId: string) {
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { status: "completed", completedAt: new Date() },
  });
  invalidateAssessmentCache({ assessmentId });
}

export async function startAssessmentAction(token: string) {
  return runAction("startAssessmentAction", async () => {
    const assessment = await findAssessmentByToken(token);

    // If already started, return existing startedAt
    if (assessment.status !== "pending") {
      return {
        startedAt:
          assessment.startedAt?.toISOString() ?? new Date().toISOString(),
      };
    }

    const startedAt = new Date();

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: "in_progress", startedAt },
    });

    invalidateAssessmentCache({ assessmentId: assessment.id });

    return { startedAt: startedAt.toISOString() };
  });
}

export async function submitAnswerAction(
  token: string,
  questionId: string,
  answer: Prisma.JsonValue,
) {
  return runAction("submitAnswerAction", async () => {
    const parsed = submitAnswerSchema.parse({ token, questionId, answer });

    const assessment = await findAssessmentByToken(parsed.token);

    const quiz = await prisma.quiz.findUnique({
      where: { id: assessment.quizId },
      select: { quizQuestions: { select: { questionId: true } } },
    });

    if (
      !quiz?.quizQuestions.some(
        (link) => link.questionId === parsed.questionId,
      )
    ) {
      throw new UserError("Domanda non valida per questo test");
    }

    const state = assessmentState(assessment);

    if (state === "completed" || state === "cancelled") {
      throw new UserError("Il test è già concluso");
    }

    if (!acceptsAnswers(assessment)) {
      // Out of time: the assessment ends with the answers given so far
      await closeAssessment(assessment.id);
      throw new UserError("Il tempo a disposizione è scaduto");
    }

    const currentAnswers =
      (assessment.answers as Record<string, Prisma.JsonValue>) ?? {};

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        answers: { ...currentAnswers, [parsed.questionId]: parsed.answer },
      },
    });

    invalidateAssessmentCache({ assessmentId: assessment.id });
  });
}

export async function completeAssessmentAction(token: string) {
  return runAction("completeAssessmentAction", async () => {
    const assessment = await findAssessmentByToken(token);

    // Already closed: keep the original completion time and never reopen a
    // cancelled assessment
    if (
      assessment.status === "completed" ||
      assessment.status === "cancelled"
    ) {
      return;
    }

    await closeAssessment(assessment.id);
  });
}

// ============================================================================
// Recruiter actions
// ============================================================================

export async function deleteAssessmentAction(id: string) {
  return runAction("deleteAssessmentAction", async () => {
    await requireUser();

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      select: {
        quizId: true,
        quiz: {
          select: {
            createdBy: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new UserError("Test non trovato");
    }

    await prisma.assessment.delete({
      where: { id },
    });

    invalidateAssessmentCache({
      assessmentId: id,
      quizId: assessment.quizId,
      deleted: true,
    });

  });
}

/**
 * Close an in-progress assessment whose time limit has passed, so the
 * dashboard stops showing it as running. It ends as "completed": the answers
 * given before time ran out still count.
 */
export async function closeExpiredAssessmentAction(assessmentId: string) {
  return runAction("closeExpiredAssessmentAction", async () => {
    await requireUser();

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: lifecycleSelect,
    });

    if (!assessment) {
      throw new UserError("Test non trovato");
    }

    const expired =
      assessmentState({
        ...assessment,
        timeLimit: assessment.quiz.timeLimit,
      }) === "expired";

    if (expired) {
      await closeAssessment(assessment.id);
    }

    return { closed: expired };
  });
}

// ============================================================================
// Assignment: creating assessments for candidate/quiz pairs
// ============================================================================

/**
 * Create a pending assessment on the application, unless the candidate already
 * has one for the quiz. The only place that creates assessments: sending a
 * test advances the application to the assessment stage.
 * Returns null when the pair already has an assessment.
 */
async function createPendingAssessment(
  application: { id: string; candidateId: string },
  quizId: string,
): Promise<{ token: string; stageChange: StageChangeResult } | null> {
  const existing = await prisma.assessment.findFirst({
    where: { candidateId: application.candidateId, quizId },
    select: { id: true },
  });

  if (existing) return null;

  const assessment = await prisma.assessment.create({
    data: {
      applicationId: application.id,
      candidateId: application.candidateId,
      quizId,
      status: "pending",
      token: await generateAssessmentToken(),
      answers: {},
    },
    select: { token: true },
  });

  const stageChange = await advanceApplicationStage(
    prisma,
    application.id,
    "assessment_sent",
  );

  return { token: assessment.token, stageChange };
}

/** Refresh the reads of every application whose stage the new tests moved */
function invalidateStageChanges(changes: StageChangeResult[]) {
  for (const change of changes) {
    if (!change.changed) continue;
    invalidateCandidateCache({
      candidateId: change.candidateId,
      positionId: change.positionId,
      applicationId: change.applicationId,
    });
  }
}

/**
 * Invite several candidates to one quiz. Each candidate needs an application
 * for the quiz's position that is neither rejected nor withdrawn; the test is
 * created on it. Pairs that already have an assessment are skipped and
 * reported in `skipped`.
 */
export async function assignCandidatesToQuizAction(input: {
  quizId: string;
  candidateIds: string[];
}) {
  return runAction("assignCandidatesToQuizAction", async () => {
    await requireUser();
    const { quizId, candidateIds } = candidateQuizSelectionSchema.parse(input);

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, positionId: true },
    });

    if (!quiz) {
      throw new UserError("Quiz non trovato");
    }

    const applications = await prisma.application.findMany({
      where: {
        positionId: quiz.positionId,
        candidateId: { in: candidateIds },
        stage: { notIn: [...CLOSED_APPLICATION_STAGES] },
      },
      select: {
        id: true,
        candidateId: true,
        candidate: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (applications.length !== new Set(candidateIds).size) {
      throw new UserError(
        "Alcuni candidati non sono validi per la posizione di questo quiz",
      );
    }

    const created: {
      candidateId: string;
      token: string;
      candidateName: string;
      candidateEmail: string;
    }[] = [];
    const skipped: string[] = [];
    const stageChanges: StageChangeResult[] = [];

    for (const application of applications) {
      const { candidate } = application;
      const candidateName = `${candidate.firstName} ${candidate.lastName}`.trim();
      const result = await createPendingAssessment(application, quiz.id);

      if (!result) {
        skipped.push(`Esiste già un test per ${candidateName}.`);
        continue;
      }

      stageChanges.push(result.stageChange);
      created.push({
        candidateId: application.candidateId,
        token: result.token,
        candidateName,
        candidateEmail: candidate.email,
      });
    }

    if (created.length > 0) {
      invalidateAssessmentCache({ quizId: quiz.id });
    }
    invalidateStageChanges(stageChanges);

    return { created, skipped };
  });
}

/**
 * Invite one candidate to several quizzes. Every quiz must belong to the
 * position of one of the candidate's applications that is neither rejected
 * nor withdrawn; the test is created on that application. Pairs that already
 * have an assessment are skipped and reported in `skipped`.
 */
export async function assignQuizzesToCandidateAction(input: {
  candidateId: string;
  quizIds: string[];
}) {
  return runAction("assignQuizzesToCandidateAction", async () => {
    await requireUser();
    const { candidateId, quizIds } = candidateQuizAssignmentSchema.parse(input);

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        applications: {
          where: { stage: { notIn: [...CLOSED_APPLICATION_STAGES] } },
          select: { id: true, candidateId: true, positionId: true },
        },
      },
    });

    if (!candidate) {
      throw new UserError("Candidato non trovato");
    }

    const applicationByPosition = new Map(
      candidate.applications.map((application) => [
        application.positionId,
        application,
      ]),
    );

    const quizzes = await prisma.quiz.findMany({
      where: {
        id: { in: quizIds },
        positionId: { in: [...applicationByPosition.keys()] },
      },
      select: { id: true, title: true, positionId: true },
    });

    if (quizzes.length !== new Set(quizIds).size) {
      throw new UserError(
        "Alcuni quiz non sono validi per le posizioni di questo candidato",
      );
    }

    const created: { quizId: string; token: string; quizTitle: string }[] = [];
    const skipped: string[] = [];
    const stageChanges: StageChangeResult[] = [];

    for (const quiz of quizzes) {
      const application = applicationByPosition.get(quiz.positionId);
      if (!application) continue;

      const result = await createPendingAssessment(application, quiz.id);

      if (!result) {
        skipped.push(`Esiste già un test per ${quiz.title}.`);
        continue;
      }

      stageChanges.push(result.stageChange);
      created.push({ quizId: quiz.id, token: result.token, quizTitle: quiz.title });
      invalidateAssessmentCache({ quizId: quiz.id });
    }

    invalidateStageChanges(stageChanges);

    return { created, skipped };
  });
}
