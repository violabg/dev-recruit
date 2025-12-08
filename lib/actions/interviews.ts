"use server";

import { candidateQuizSelectionSchema } from "@/lib/schemas";
import { generateInterviewToken } from "@/lib/utils/token";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { Prisma } from "../prisma/client";
import { invalidateInterviewCache } from "../utils/cache-utils";

export async function startInterview(token: string) {
  const interview = await prisma.interview.findUnique({
    where: { token },
    select: {
      id: true,
      status: true,
      startedAt: true,
    },
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  // If already started, return existing startedAt
  if (interview.status !== "pending") {
    return {
      success: true,
      startedAt: interview.startedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  const startedAt = new Date();

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      status: "in_progress",
      startedAt,
    },
  });

  invalidateInterviewCache({ interviewId: interview.id });

  return { success: true, startedAt: startedAt.toISOString() };
}

export async function submitAnswer(
  token: string,
  questionId: string,
  answer: Prisma.JsonValue
) {
  const interview = await prisma.interview.findUnique({
    where: { token },
    select: {
      id: true,
      answers: true,
      startedAt: true,
      status: true,
      quiz: {
        select: {
          timeLimit: true,
        },
      },
    },
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  // Validate time limit if quiz has one and interview has started
  if (interview.quiz.timeLimit && interview.startedAt) {
    const startTime = new Date(interview.startedAt).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - startTime) / (1000 * 60);

    if (elapsedMinutes > interview.quiz.timeLimit) {
      // Auto-complete the interview if time has expired
      if (interview.status !== "completed") {
        await prisma.interview.update({
          where: { id: interview.id },
          data: {
            status: "completed",
            completedAt: new Date(),
          },
        });
        invalidateInterviewCache({ interviewId: interview.id });
      }
      throw new Error("Il tempo a disposizione è scaduto");
    }
  }

  const currentAnswers =
    (interview.answers as Record<string, Prisma.JsonValue>) ?? {};

  const updatedAnswers = {
    ...currentAnswers,
    [questionId]: answer,
  };

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      answers: updatedAnswers,
    },
  });

  invalidateInterviewCache({ interviewId: interview.id });

  return { success: true };
}

export async function completeInterview(token: string) {
  const interview = await prisma.interview.findUnique({
    where: { token },
    select: {
      id: true,
    },
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });

  invalidateInterviewCache({ interviewId: interview.id });

  return { success: true };
}

export async function deleteInterview(id: string) {
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
    throw new Error("Interview not found or you don't have permission");
  }

  await prisma.interview.delete({
    where: { id },
  });

  invalidateInterviewCache({
    interviewId: id,
    quizId: interview.quizId,
  });

  return { success: true };
}

export async function cancelInterviewById(id: string) {
  const user = await requireUser();

  const interview = await prisma.interview.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!interview) {
    throw new Error("Interview not found");
  }

  if (interview.status === "completed" || interview.status === "cancelled") {
    return { success: true, message: "No action needed" };
  }

  await prisma.interview.update({
    where: { id },
    data: {
      status: "cancelled",
      completedAt: new Date(),
    },
  });

  invalidateInterviewCache({ interviewId: id });

  return { success: true };
}

export type AssignCandidatesToQuizState = {
  message: string;
  errors?: {
    candidateIds?: string[];
    quizId?: string[];
    general?: string[];
  };
  createdInterviews?: {
    candidateId: string;
    token: string;
    candidateName: string;
    candidateEmail: string;
  }[];
  success?: boolean;
};

export async function assignCandidatesToQuiz(
  _prevState: AssignCandidatesToQuizState,
  formData: FormData
): Promise<AssignCandidatesToQuizState> {
  const candidateIds = formData
    .getAll("candidateIds")
    .map((value) => String(value));
  const quizId = formData.get("quizId");

  const validated = candidateQuizSelectionSchema.safeParse({
    candidateIds,
    quizId,
  });

  if (!validated.success) {
    return {
      message: "Invalid form data.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { candidateIds: validatedCandidateIds, quizId: validatedQuizId } =
    validated.data;

  const user = await requireUser();

  const quiz = await prisma.quiz.findUnique({
    where: {
      id: validatedQuizId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!quiz) {
    return { message: "Quiz not found." };
  }

  const candidates = await prisma.candidate.findMany({
    where: {
      id: {
        in: validatedCandidateIds,
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  if (candidates.length === 0) {
    return {
      message: "No valid candidates found.",
      errors: {
        candidateIds: ["Nessun candidato valido selezionato."],
      },
    };
  }

  // Helper to get full name
  const getFullName = (firstName: string, lastName: string) =>
    `${firstName} ${lastName}`.trim();

  const candidateMap = new Map(
    candidates.map((candidate) => [candidate.id, candidate])
  );

  const createdInterviews: NonNullable<
    AssignCandidatesToQuizState["createdInterviews"]
  > = [];
  const generalErrors: string[] = [];

  for (const candidateId of validatedCandidateIds) {
    const candidate = candidateMap.get(candidateId);

    if (!candidate) {
      generalErrors.push("Candidato non trovato");
      continue;
    }

    const candidateFullName = getFullName(
      candidate.firstName,
      candidate.lastName
    );

    const existingInterview = await prisma.interview.findFirst({
      where: {
        quizId: quiz.id,
        candidateId,
      },
      select: { id: true },
    });

    if (existingInterview) {
      generalErrors.push(
        `Un colloquio è già presente per ${
          candidateFullName || "il candidato selezionato"
        }.`
      );
      continue;
    }

    const token = await generateInterviewToken();

    const interview = await prisma.interview.create({
      data: {
        candidateId,
        quizId: quiz.id,
        status: "pending",
        token,
        answers: {},
      },
      select: {
        token: true,
      },
    });

    createdInterviews.push({
      candidateId,
      token: interview.token,
      candidateName: candidateFullName,
      candidateEmail: candidate.email,
    });
  }

  if (createdInterviews.length > 0) {
    invalidateInterviewCache({ quizId: quiz.id });
  }

  if (generalErrors.length > 0) {
    return {
      message: `Alcuni colloqui non sono stati creati (${generalErrors.length}).`,
      createdInterviews,
      errors: {
        general: generalErrors,
      },
    };
  }

  return {
    message: "Colloqui creati con successo.",
    createdInterviews,
    success: true,
  };
}
