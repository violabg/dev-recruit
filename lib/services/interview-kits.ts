/**
 * Interview kits
 *
 * Source of the kit snapshot and the kit write rules. Domain logic only: no
 * Next.js import and no cache call. It throws UserError for expected
 * failures; the callers invalidate the cache.
 */

import type { InterviewGuideDetail } from "@/lib/data/interview-guides";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/lib/prisma/client";
import {
  AI_KIT_ITEM_ORIGIN_VALUES,
  answerEvaluationsSchema,
  criteriaAssessmentSchema,
  type AiKitItemOrigin,
  type CriterionAnchors,
  type FlexibleQuestion,
  type GuideSectionKind,
  type InterviewMissingSource,
  type KitChecklistCategory,
  type KitItemInput,
  type KitStatus,
  type SaveInterviewKitInput,
  type SetInterviewKitStatusInput,
  saveInterviewKitSchema,
  setInterviewKitStatusSchema,
} from "@/lib/schemas";
import { assertActorEnabled, type Actor } from "./actor";
import { MAX_ANSWER_CHARS, MAX_RESUME_CHARS } from "./ai/evaluation-prompts";
import { redactBirthDate, sanitizeInput } from "./ai/sanitize";
import type { DbClient } from "./applications";
import { answerToText } from "./assessment-evaluation";
import { assertInterviewStatus, loadInterview } from "./interviews";
import { resumePublicUrl } from "./r2-storage";
import { extractTextFromPDF } from "./resume-evaluation";
import { type ActiveCriterion, getActiveCriteria } from "./scorecards";
import { UserError } from "./user-error";

/** Checklist of every new kit; the legal reminder is a fixed component, never stored */
export const DEFAULT_KIT_CHECKLIST: readonly {
  category: KitChecklistCategory;
  text: string;
}[] = [
  { category: "communicate", text: "RAL e benefit" },
  { category: "communicate", text: "Modalità di lavoro (sede, ibrido, remoto)" },
  { category: "communicate", text: "Prossimi passi della selezione" },
  { category: "logistics", text: "Link della call verificato" },
  { category: "logistics", text: "Partecipanti confermati" },
];

/** Anchors are stored as JSON: always return the full object. */
export function normalizeAnchors(value: unknown): CriterionAnchors {
  const anchors =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const text = (part: unknown) => (typeof part === "string" ? part : "");
  return {
    weak: text(anchors.weak),
    medium: text(anchors.medium),
    strong: text(anchors.strong),
  };
}

/**
 * Guide with its sections and questions in their order, read without cache
 * (for the scheduling transaction). UserError when the guide is missing or
 * belongs to another position.
 */
export async function loadGuideForSnapshot(
  client: DbClient,
  guideId: string,
  positionId: string,
): Promise<InterviewGuideDetail> {
  const guide = await client.interviewGuide.findUnique({
    where: { id: guideId },
    select: {
      id: true,
      positionId: true,
      title: true,
      round: true,
      durationMinutes: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          minutes: true,
          kind: true,
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              text: true,
              followUps: true,
              criterionIds: true,
              anchors: true,
              required: true,
            },
          },
        },
      },
    },
  });

  if (!guide || guide.positionId !== positionId) {
    throw new UserError("Guida non trovata per questa posizione");
  }

  return {
    id: guide.id,
    positionId: guide.positionId,
    title: guide.title,
    round: guide.round,
    durationMinutes: guide.durationMinutes,
    sections: guide.sections.map((section) => ({
      id: section.id,
      title: section.title,
      minutes: section.minutes,
      kind: section.kind,
      questions: section.questions.map((question) => ({
        id: question.id,
        text: question.text,
        followUps: question.followUps,
        criterionIds: question.criterionIds,
        anchors: normalizeAnchors(question.anchors),
        required: question.required,
      })),
    })),
  };
}

// ====================
// KIT ITEMS
// ====================

const isAiOrigin = (origin: string): origin is AiKitItemOrigin =>
  (AI_KIT_ITEM_ORIGIN_VALUES as readonly string[]).includes(origin);

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/**
 * The only writer of KitItem. Rows match by id inside the kit: a stored id is
 * updated (an AI-origin row whose text, follow-ups or criteria change becomes
 * edited; the origin never changes), a row without id is created (origin kept
 * only when it is an AI origin from a confirmed proposal, otherwise
 * 'manual'), stored rows missing from the input are deleted with their notes.
 * order = position among the input items of the same section. It never
 * writes covered/coveredAt.
 */
export async function syncKitItems(
  tx: Prisma.TransactionClient,
  kitId: string,
  items: KitItemInput[],
): Promise<{ deletedIds: string[] }> {
  const stored = await tx.kitItem.findMany({
    where: { kitId },
    select: {
      id: true,
      text: true,
      followUps: true,
      criterionIds: true,
      origin: true,
      edited: true,
    },
  });
  const sections = await tx.kitSection.findMany({
    where: { kitId },
    select: { id: true },
  });

  const storedById = new Map(stored.map((row) => [row.id, row]));
  const sectionIds = new Set(sections.map((section) => section.id));

  for (const item of items) {
    if (!sectionIds.has(item.sectionId)) {
      throw new UserError("Sezione del kit non valida");
    }
    if (item.id && !storedById.has(item.id)) {
      throw new UserError("Una o più domande non appartengono a questo kit");
    }
  }

  const orderInSection = new Map<string, number>();
  const keptIds = new Set<string>();

  for (const item of items) {
    const order = orderInSection.get(item.sectionId) ?? 0;
    orderInSection.set(item.sectionId, order + 1);

    const followUps = item.followUps ?? [];
    const criterionIds = item.criterionIds ?? [];
    const storedRow = item.id ? storedById.get(item.id) : undefined;

    if (storedRow) {
      keptIds.add(storedRow.id);
      const changed =
        storedRow.text !== item.text ||
        !sameList(storedRow.followUps, followUps) ||
        !sameList(storedRow.criterionIds, criterionIds);

      await tx.kitItem.update({
        where: { id: storedRow.id },
        data: {
          sectionId: item.sectionId,
          text: item.text,
          followUps,
          criterionIds,
          ...(item.anchors ? { anchors: item.anchors } : {}),
          required: item.required ?? false,
          order,
          rationale: item.rationale ?? null,
          sourceRef: item.sourceRef ?? null,
          edited:
            storedRow.edited || (isAiOrigin(storedRow.origin) && changed),
        },
      });
    } else {
      const origin = item.origin && isAiOrigin(item.origin) ? item.origin : "manual";
      await tx.kitItem.create({
        data: {
          kitId,
          sectionId: item.sectionId,
          text: item.text,
          followUps,
          criterionIds,
          ...(item.anchors ? { anchors: item.anchors } : {}),
          required: item.required ?? false,
          order,
          origin,
          rationale: item.rationale ?? null,
          sourceRef: item.sourceRef ?? null,
          edited: false,
        },
      });
    }
  }

  const deletedIds = stored
    .map((row) => row.id)
    .filter((id) => !keptIds.has(id));

  if (deletedIds.length > 0) {
    await tx.kitItem.deleteMany({ where: { id: { in: deletedIds } } });
  }

  return { deletedIds };
}

/** criterionId of every valid hypothesis of a stored JSON value */
function hypothesisCriterionIds(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((element) =>
    element !== null &&
    typeof element === "object" &&
    !Array.isArray(element) &&
    typeof (element as { criterionId?: unknown }).criterionId === "string"
      ? [(element as { criterionId: string }).criterionId]
      : [],
  );
}

/**
 * Checks the criterion ids of items and hypotheses: ids that are not a
 * criterion of the position scorecard (active or archived) are dropped (a
 * hypothesis citing one is dropped); an archived id is accepted only when it
 * is already stored on the same kit. Returns the cleaned input.
 */
export async function cleanKitCriteria(
  client: DbClient,
  kitId: string,
  positionId: string,
  input: Pick<SaveInterviewKitInput, "items" | "hypotheses">,
): Promise<Pick<SaveInterviewKitInput, "items" | "hypotheses">> {
  const criteria = await client.scorecardCriterion.findMany({
    where: { scorecard: { positionId } },
    select: { id: true, archivedAt: true },
  });
  const known = new Map(
    criteria.map((criterion) => [criterion.id, criterion.archivedAt !== null]),
  );

  const kit = await client.interviewKit.findUnique({
    where: { id: kitId },
    select: {
      hypotheses: true,
      items: { select: { criterionIds: true } },
    },
  });
  const storedIds = new Set<string>([
    ...(kit?.items.flatMap((item) => item.criterionIds) ?? []),
    ...hypothesisCriterionIds(kit?.hypotheses ?? null),
  ]);

  const assertUsable = (id: string) => {
    if (known.get(id) && !storedIds.has(id)) {
      throw new UserError(
        "Uno o più criteri selezionati non appartengono alla scheda della posizione",
      );
    }
  };

  const items = input.items.map((item) => {
    const criterionIds = (item.criterionIds ?? []).filter((id) =>
      known.has(id),
    );
    criterionIds.forEach(assertUsable);
    return { ...item, criterionIds };
  });

  const hypotheses = (input.hypotheses ?? []).filter((hypothesis) =>
    known.has(hypothesis.criterionId),
  );
  hypotheses.forEach((hypothesis) => assertUsable(hypothesis.criterionId));

  return { items, hypotheses };
}

// ====================
// KIT SAVE AND STATUS
// ====================

/** The kit changes only while the interview is scheduled */
const KIT_EDITABLE = ["scheduled"] as const;
const KIT_LOCKED_MESSAGE = "Il kit si modifica solo prima del colloquio";

async function loadKit(interviewId: string) {
  const kit = await prisma.interviewKit.findUnique({
    where: { interviewId },
    select: { id: true, status: true },
  });
  if (!kit) throw new UserError("Colloquio non trovato");
  return kit;
}

/**
 * Saves briefing, hypotheses, checklist, missing sources and the questions of
 * the kit in one transaction, while the interview is scheduled. The kit
 * status is unchanged. With `requireDraftStatus` a ready kit is refused.
 */
export async function saveInterviewKit(
  actor: Actor,
  input: SaveInterviewKitInput,
  options?: { requireDraftStatus?: boolean },
): Promise<{ kitId: string; interviewId: string; applicationId: string }> {
  await assertActorEnabled(prisma, actor);
  const payload = saveInterviewKitSchema.parse(input);

  const interview = await loadInterview(prisma, payload.interviewId);
  assertInterviewStatus(interview, KIT_EDITABLE, KIT_LOCKED_MESSAGE);
  const kit = await loadKit(interview.id);

  if (options?.requireDraftStatus && kit.status === "ready") {
    throw new UserError(
      "Il kit è pronto: riportalo in bozza dalla dashboard per modificarlo",
    );
  }

  const cleaned = await cleanKitCriteria(prisma, kit.id, interview.positionId, {
    items: payload.items,
    hypotheses: payload.hypotheses,
  });

  await prisma.$transaction(async (tx) => {
    await syncKitItems(tx, kit.id, cleaned.items);
    await tx.interviewKit.update({
      where: { id: kit.id },
      data: {
        briefing: payload.briefing,
        hypotheses: cleaned.hypotheses,
        checklist: payload.checklist,
        missingSources: payload.missingSources,
      },
    });
  });

  return {
    kitId: kit.id,
    interviewId: interview.id,
    applicationId: interview.applicationId,
  };
}

/** "Segna come pronto" / "Riporta in bozza" while the interview is scheduled. */
export async function setInterviewKitStatus(
  actor: Actor,
  input: SetInterviewKitStatusInput,
): Promise<{ status: KitStatus; interviewId: string; applicationId: string }> {
  await assertActorEnabled(prisma, actor);
  const { interviewId, status } = setInterviewKitStatusSchema.parse(input);

  const interview = await loadInterview(prisma, interviewId);
  assertInterviewStatus(interview, KIT_EDITABLE, KIT_LOCKED_MESSAGE);
  const kit = await loadKit(interview.id);

  await prisma.interviewKit.update({
    where: { id: kit.id },
    data: { status },
  });

  return {
    status,
    interviewId: interview.id,
    applicationId: interview.applicationId,
  };
}

// ====================
// GENERATION CONTEXT
// ====================

/** Weak test answers: below the success band (score < 7), at most 6 */
const WEAK_ANSWER_THRESHOLD = 7;
const MAX_WEAK_ANSWERS = 6;
/** Two scores of one criterion this far apart make it discordant */
const DISCORDANT_SPREAD = 2;
/** Questions quoted to the model so it does not repeat them */
const MAX_EXISTING_QUESTIONS = 25;
const MAX_EXISTING_QUESTION_CHARS = 300;

export type KitGenerationContext = {
  interview: { id: string; round: number; durationMinutes: number };
  position: {
    title: string;
    experienceLevel: string;
    skills: string[];
    softSkills: string[];
  };
  /** Active criteria, scorecard order */
  criteria: ActiveCriterion[];
  sections: {
    id: string;
    title: string;
    minutes: number;
    kind: GuideSectionKind;
  }[];
  templateQuestionCount: number;
  /** AI items with edited = true: regeneration keeps them */
  keptAiItemCount: number;
  /** Questions that stay in the kit (template + edited AI), in order */
  existingQuestions: string[];
  /** redactBirthDate, then sanitizeInput(MAX_RESUME_CHARS) */
  resumeText: string | null;
  /** Sanitized */
  resumeWeaknesses: string[];
  resumeCriteriaGaps: {
    criterionId: string;
    score: number | null;
    expectedLevel: number;
  }[];
  /** score < 7, lowest first, max 6 */
  weakAnswers: {
    questionId: string;
    question: string;
    answer: string;
    score: number;
    weaknesses: string[];
  }[];
  previousRounds: {
    feedbackIds: string[];
    criteria: {
      criterionId: string;
      status: "no_evidence" | "discordant";
      scores: number[];
    }[];
  }[];
  missingSources: InterviewMissingSource[];
};

/** Text of a stored answer; for multiple choice, the text of the chosen option */
function answerForPrompt(
  question: { type: string; options: string[] },
  rawAnswer: unknown,
): string {
  const text = answerToText(
    { type: question.type as FlexibleQuestion["type"] },
    rawAnswer,
  );
  if (text === null) return "(nessuna risposta)";
  if (question.type === "multiple_choice") {
    const option = question.options[Number(text)];
    if (option !== undefined) return option;
  }
  return text;
}

/**
 * Gathers every input of the kit generation from the database. It never
 * passes the candidate's name, email, date of birth, photo or resume URL
 * further: CV text is redacted and sanitized, answers sanitized, previous
 * rounds reduced to per-criterion statistics.
 */
export async function buildKitGenerationContext(
  interviewId: string,
): Promise<KitGenerationContext> {
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: {
      id: true,
      round: true,
      durationMinutes: true,
      applicationId: true,
      application: {
        select: {
          candidateId: true,
          positionId: true,
          candidate: { select: { resumeUrl: true } },
          position: {
            select: {
              title: true,
              experienceLevel: true,
              skills: true,
              softSkills: true,
            },
          },
        },
      },
      kit: {
        select: {
          sections: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, minutes: true, kind: true },
          },
          items: {
            orderBy: [{ section: { order: "asc" } }, { order: "asc" }],
            select: { origin: true, edited: true, text: true },
          },
        },
      },
    },
  });

  if (!interview || !interview.kit) {
    throw new UserError("Colloquio non trovato");
  }

  const { application, kit } = interview;
  const missingSources: InterviewMissingSource[] = [];

  const criteria = await getActiveCriteria(application.positionId);
  if (criteria.length === 0) {
    throw new UserError("Crea prima la scheda di valutazione della posizione");
  }

  // CV text: birth date redacted BEFORE sanitizing (mandatory order)
  let resumeText: string | null = null;
  if (application.candidate.resumeUrl) {
    try {
      const raw = await extractTextFromPDF(
        resumePublicUrl(application.candidate.resumeUrl),
      );
      resumeText = raw.trim()
        ? sanitizeInput(redactBirthDate(raw), MAX_RESUME_CHARS)
        : null;
    } catch {
      resumeText = null;
    }
  }
  if (resumeText === null) missingSources.push("cv");

  // CV evaluation: weaknesses and criteria without evidence or below level
  const resumeEvaluation = await prisma.evaluation.findFirst({
    where: {
      candidateId: application.candidateId,
      positionId: application.positionId,
      assessmentId: null,
    },
    select: { weaknesses: true, criteriaAssessment: true },
  });

  let resumeWeaknesses: string[] = [];
  const resumeCriteriaGaps: KitGenerationContext["resumeCriteriaGaps"] = [];
  if (!resumeEvaluation) {
    missingSources.push("cv_evaluation");
  } else {
    resumeWeaknesses = resumeEvaluation.weaknesses.map((weakness) =>
      sanitizeInput(weakness),
    );
    const assessment = criteriaAssessmentSchema.safeParse(
      resumeEvaluation.criteriaAssessment,
    );
    if (assessment.success) {
      for (const criterion of criteria) {
        const entry = assessment.data[criterion.id];
        if (!entry) continue;
        if (entry.score === null || entry.score < criterion.expectedLevel) {
          resumeCriteriaGaps.push({
            criterionId: criterion.id,
            score: entry.score,
            expectedLevel: criterion.expectedLevel,
          });
        }
      }
    }
  }

  // Test: latest completed and evaluated assessment of the application
  const assessment = await prisma.assessment.findFirst({
    where: {
      applicationId: interview.applicationId,
      status: "completed",
      evaluation: { isNot: null },
    },
    orderBy: { completedAt: "desc" },
    select: {
      answers: true,
      evaluation: { select: { answerEvaluations: true } },
      quiz: {
        select: {
          quizQuestions: {
            select: {
              question: {
                select: { id: true, type: true, question: true, options: true },
              },
            },
          },
        },
      },
    },
  });

  let weakAnswers: KitGenerationContext["weakAnswers"] = [];
  if (!assessment) {
    missingSources.push("assessment");
  } else {
    const detail = answerEvaluationsSchema.safeParse(
      assessment.evaluation?.answerEvaluations,
    );
    if (!assessment.evaluation?.answerEvaluations || !detail.success) {
      missingSources.push("answer_detail");
    } else {
      const questions = new Map(
        assessment.quiz.quizQuestions.map(({ question }) => [
          question.id,
          question,
        ]),
      );
      const answers =
        assessment.answers &&
        typeof assessment.answers === "object" &&
        !Array.isArray(assessment.answers)
          ? (assessment.answers as Record<string, unknown>)
          : {};

      weakAnswers = Object.entries(detail.data)
        .filter(
          ([questionId, entry]) =>
            entry.score < WEAK_ANSWER_THRESHOLD && questions.has(questionId),
        )
        .sort(([, a], [, b]) => a.score - b.score)
        .slice(0, MAX_WEAK_ANSWERS)
        .map(([questionId, entry]) => {
          const question = questions.get(questionId)!;
          return {
            questionId,
            question: sanitizeInput(question.question),
            answer: sanitizeInput(
              answerForPrompt(question, answers[questionId]),
              MAX_ANSWER_CHARS,
            ),
            score: entry.score,
            weaknesses: entry.weaknesses.map((weakness) =>
              sanitizeInput(weakness),
            ),
          };
        });
    }
  }

  // Previous rounds: per-criterion statistics only, no names and no text
  const previous = await prisma.interview.findMany({
    where: {
      applicationId: interview.applicationId,
      status: "completed",
      round: { lt: interview.round },
    },
    orderBy: [{ round: "asc" }, { scheduledAt: "asc" }],
    select: {
      feedback: {
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: "asc" },
        select: {
          id: true,
          scores: { select: { criterionId: true, score: true } },
        },
      },
    },
  });

  const previousRounds: KitGenerationContext["previousRounds"] = previous
    .filter((round) => round.feedback.length > 0)
    .map((round) => ({
      feedbackIds: round.feedback.map((feedback) => feedback.id),
      criteria: criteria.flatMap(
        (criterion): KitGenerationContext["previousRounds"][number]["criteria"] => {
        const scores = round.feedback.flatMap((feedback) =>
          feedback.scores
            .filter((score) => score.criterionId === criterion.id)
            .map((score) => score.score),
        );
        if (scores.length === 0) {
          return [
            { criterionId: criterion.id, status: "no_evidence" as const, scores },
          ];
        }
        if (Math.max(...scores) - Math.min(...scores) >= DISCORDANT_SPREAD) {
          return [
            { criterionId: criterion.id, status: "discordant" as const, scores },
          ];
        }
        return [];
      }),
    }));

  return {
    interview: {
      id: interview.id,
      round: interview.round,
      durationMinutes: interview.durationMinutes,
    },
    position: application.position,
    criteria,
    sections: kit.sections,
    templateQuestionCount: kit.items.filter((item) => item.origin === "template")
      .length,
    keptAiItemCount: kit.items.filter(
      (item) => isAiOrigin(item.origin) && item.edited,
    ).length,
    // The questions the proposal must not repeat: template and edited AI
    existingQuestions: kit.items
      .filter(
        (item) =>
          item.origin === "template" || (isAiOrigin(item.origin) && item.edited),
      )
      .slice(0, MAX_EXISTING_QUESTIONS)
      .map((item) => sanitizeInput(item.text, MAX_EXISTING_QUESTION_CHARS)),
    resumeText,
    resumeWeaknesses,
    resumeCriteriaGaps,
    weakAnswers,
    previousRounds,
    missingSources,
  };
}
