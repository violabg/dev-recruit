"use server";

import {
  candidateQuizAssignmentSchema,
  candidateQuizSelectionSchema,
  submitAnswerSchema,
} from "@/lib/schemas";
import { acceptsAnswers, interviewState } from "@/lib/utils/interview-utils";
import { generateInterviewToken } from "@/lib/utils/token";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { Prisma } from "../prisma/client";
import { invalidateInterviewCache } from "../utils/cache-utils";
import { runAction, UserError } from "./run-action";

// ============================================================================
// Candidate-facing actions. Public by design: the interview token in the URL
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

async function findInterviewByToken(token: string) {
  const interview = await prisma.interview.findUnique({
    where: { token },
    select: lifecycleSelect,
  });

  if (!interview) {
    throw new UserError("Colloquio non trovato");
  }

  return {
    ...interview,
    timeLimit: interview.quiz.timeLimit,
  };
}

/** Mark an interview as completed. An interview that ran out of time ends here too. */
async function closeInterview(interviewId: string) {
  await prisma.interview.update({
    where: { id: interviewId },
    data: { status: "completed", completedAt: new Date() },
  });
  invalidateInterviewCache({ interviewId });
}

export async function startInterviewAction(token: string) {
  return runAction("startInterviewAction", async () => {
    const interview = await findInterviewByToken(token);

    // If already started, return existing startedAt
    if (interview.status !== "pending") {
      return {
        startedAt: interview.startedAt?.toISOString() ?? new Date().toISOString(),
      };
    }

    const startedAt = new Date();

    await prisma.interview.update({
      where: { id: interview.id },
      data: { status: "in_progress", startedAt },
    });

    invalidateInterviewCache({ interviewId: interview.id });

    return { startedAt: startedAt.toISOString() };
  });
}

export async function submitAnswerAction(
  token: string,
  questionId: string,
  answer: Prisma.JsonValue,
) {
  return runAction("submitAnswerAction", async () => {
    const interview = await findInterviewByToken(token);

    const quiz = await prisma.quiz.findUnique({
      where: { id: interview.quizId },
      select: { quizQuestions: { select: { questionId: true } } },
    });

    if (
      !quiz?.quizQuestions.some((link) => link.questionId === questionId)
    ) {
      throw new UserError("Domanda non valida per questo colloquio");
    }

    const parsed = submitAnswerSchema.parse({ token, questionId, answer });

    const state = interviewState(interview);

    if (state === "completed" || state === "cancelled") {
      throw new UserError("Il colloquio è già concluso");
    }

    if (!acceptsAnswers(interview)) {
      // Out of time: the interview ends with the answers given so far
      await closeInterview(interview.id);
      throw new UserError("Il tempo a disposizione è scaduto");
    }

    const currentAnswers =
      (interview.answers as Record<string, Prisma.JsonValue>) ?? {};

    await prisma.interview.update({
      where: { id: interview.id },
      data: { answers: { ...currentAnswers, [questionId]: parsed.answer } },
    });

    invalidateInterviewCache({ interviewId: interview.id });

  });
}

export async function completeInterviewAction(token: string) {
  return runAction("completeInterviewAction", async () => {
    const interview = await findInterviewByToken(token);

    // Already closed: keep the original completion time and never reopen a
    // cancelled interview
    if (interview.status === "completed" || interview.status === "cancelled") {
      return;
    }

    await closeInterview(interview.id);

  });
}

// ============================================================================
// Recruiter actions
// ============================================================================

export async function deleteInterviewAction(id: string) {
  return runAction("deleteInterviewAction", async () => {
    await requireUser();

    const interview = await prisma.interview.findUnique({
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

    if (!interview) {
      throw new UserError("Colloquio non trovato");
    }

    await prisma.interview.delete({
      where: { id },
    });

    invalidateInterviewCache({
      interviewId: id,
      quizId: interview.quizId,
      deleted: true,
    });

  });
}

/**
 * Close an in-progress interview whose time limit has passed, so the
 * dashboard stops showing it as running. It ends as "completed": the answers
 * given before time ran out still count.
 */
export async function closeExpiredInterviewAction(interviewId: string) {
  return runAction("closeExpiredInterviewAction", async () => {
    await requireUser();

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: lifecycleSelect,
    });

    if (!interview) {
      throw new UserError("Colloquio non trovato");
    }

    const expired =
      interviewState({ ...interview, timeLimit: interview.quiz.timeLimit }) ===
      "expired";

    if (expired) {
      await closeInterview(interview.id);
    }

    return { closed: expired };
  });
}

// ============================================================================
// Assignment: creating interviews for candidate/quiz pairs
// ============================================================================

/**
 * Create a pending interview for the pair, unless one already exists.
 * Returns the new token, or null when the pair already has an interview.
 */
async function createPendingInterview(candidateId: string, quizId: string) {
  const existing = await prisma.interview.findFirst({
    where: { candidateId, quizId },
    select: { id: true },
  });

  if (existing) return null;

  const interview = await prisma.interview.create({
    data: {
      candidateId,
      quizId,
      status: "pending",
      token: await generateInterviewToken(),
      answers: {},
    },
    select: { token: true },
  });

  return interview.token;
}

/**
 * Invite several candidates to one quiz. Candidates must be linked to the
 * quiz's position. Pairs that already have an interview are skipped and
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

    const candidates = await prisma.candidate.findMany({
      where: {
        id: { in: candidateIds },
        positions: { some: { positionId: quiz.positionId } },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (candidates.length !== new Set(candidateIds).size) {
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

    for (const candidate of candidates) {
      const candidateName = `${candidate.firstName} ${candidate.lastName}`.trim();
      const token = await createPendingInterview(candidate.id, quiz.id);

      if (!token) {
        skipped.push(`Esiste già un colloquio per ${candidateName}.`);
        continue;
      }

      created.push({
        candidateId: candidate.id,
        token,
        candidateName,
        candidateEmail: candidate.email,
      });
    }

    if (created.length > 0) {
      invalidateInterviewCache({ quizId: quiz.id });
    }

    return { created, skipped };
  });
}

/**
 * Invite one candidate to several quizzes. Every quiz must belong to one of
 * the candidate's positions. Pairs that already have an interview are skipped
 * and reported in `skipped`.
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
      select: { id: true, positions: { select: { positionId: true } } },
    });

    if (!candidate) {
      throw new UserError("Candidato non trovato");
    }

    const positionIds = candidate.positions.map((p) => p.positionId);

    const quizzes = await prisma.quiz.findMany({
      where: { id: { in: quizIds }, positionId: { in: positionIds } },
      select: { id: true, title: true },
    });

    if (quizzes.length !== new Set(quizIds).size) {
      throw new UserError(
        "Alcuni quiz non sono validi per le posizioni di questo candidato",
      );
    }

    const created: { quizId: string; token: string; quizTitle: string }[] = [];
    const skipped: string[] = [];

    for (const quiz of quizzes) {
      const token = await createPendingInterview(candidate.id, quiz.id);

      if (!token) {
        skipped.push(`Esiste già un colloquio per ${quiz.title}.`);
        continue;
      }

      created.push({ quizId: quiz.id, token, quizTitle: quiz.title });
      invalidateInterviewCache({ quizId: quiz.id });
    }

    return { created, skipped };
  });
}
