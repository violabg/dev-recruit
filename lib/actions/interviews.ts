"use server";

import { getFilteredInterviews } from "@/lib/data/interviews";
import { candidateQuizSelectionSchema } from "@/lib/schemas";
import { generateInterviewToken } from "@/lib/utils/token";
import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { Prisma } from "../prisma/client";

/**
 * Legacy wrapper for backward compatibility
 * Delegates to getFilteredInterviews in data layer
 */
export async function getInterviews(
  filters: {
    search?: string;
    status?: string;
    positionId?: string;
    programmingLanguage?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  return getFilteredInterviews(filters);
}

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

  if (interview.status !== "pending") {
    return { success: true };
  }

  await prisma.interview.update({
    where: { id: interview.id },
    data: {
      status: "in_progress",
      startedAt: new Date(),
    },
  });

  updateTag("interviews");

  return { success: true };
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
    },
  });

  if (!interview) {
    throw new Error("Interview not found");
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

  updateTag("interviews");

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

  updateTag("interviews");

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

  updateTag("interviews");

  revalidatePath("/dashboard/interviews");
  revalidatePath(`/dashboard/quizzes/${interview.quizId}`);

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
      createdBy: user.id,
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
      createdBy: user.id,
    },
    select: {
      id: true,
      name: true,
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
          candidate.name ?? "il candidato selezionato"
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
      candidateName: candidate.name,
      candidateEmail: candidate.email,
    });
  }

  revalidatePath(`/dashboard/quizzes/${quiz.id}/invite`);

  if (createdInterviews.length > 0) {
    updateTag("interviews");
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
