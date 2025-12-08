"use server";

import { candidateQuizAssignmentSchema } from "@/lib/schemas";
import { generateInterviewToken } from "@/lib/utils/token";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { invalidateInterviewCache } from "../utils/cache-utils";

export type AssignQuizzesToCandidateState = {
  message: string;
  errors?: {
    quizIds?: string[];
    candidateId?: string[];
    general?: string[];
  };
  createdInterviews?: {
    quizId: string;
    token: string;
    quizTitle: string;
  }[];
  success?: boolean;
};

export async function assignQuizzesToCandidate(
  _prevState: AssignQuizzesToCandidateState,
  formData: FormData
): Promise<AssignQuizzesToCandidateState> {
  const quizIds = formData.getAll("quizIds").map((value) => String(value));
  const candidateId = formData.get("candidateId");

  const validated = candidateQuizAssignmentSchema.safeParse({
    quizIds,
    candidateId,
  });

  if (!validated.success) {
    return {
      message: "Invalid form data.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { quizIds: validatedQuizIds, candidateId: validatedCandidateId } =
    validated.data;

  const user = await requireUser();

  const candidate = await prisma.candidate.findUnique({
    where: {
      id: validatedCandidateId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      positions: {
        select: {
          positionId: true,
        },
      },
    },
  });

  if (!candidate || !candidate.positions || candidate.positions.length === 0) {
    return { message: "Candidate not found or has no positions." };
  }

  const quizzes = await prisma.quiz.findMany({
    where: {
      id: {
        in: validatedQuizIds,
      },
    },
    select: {
      id: true,
      title: true,
      positionId: true,
    },
  });

  if (!quizzes.length) {
    return {
      message: "No valid quizzes selected.",
      errors: {
        quizIds: ["Seleziona almeno un quiz valido."],
      },
    };
  }

  // Get candidate's position IDs
  const candidatePositionIds = candidate.positions.map((p) => p.positionId);

  // Check if all quizzes match one of the candidate's positions
  const invalidQuizzes = quizzes.filter(
    (quiz) => !candidatePositionIds.includes(quiz.positionId)
  );

  if (invalidQuizzes.length > 0) {
    return {
      message:
        "Some quizzes are not valid for this candidate's positions or you don't have permission.",
    };
  }

  const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

  const createdInterviews: NonNullable<
    AssignQuizzesToCandidateState["createdInterviews"]
  > = [];
  const generalErrors: string[] = [];

  for (const quizId of validatedQuizIds) {
    const quiz = quizMap.get(quizId);

    if (!quiz) {
      generalErrors.push("Quiz non trovato");
      continue;
    }

    const existingInterview = await prisma.interview.findFirst({
      where: {
        candidateId: candidate.id,
        quizId: quiz.id,
      },
      select: { id: true },
    });

    if (existingInterview) {
      generalErrors.push(`Esiste già un colloquio per ${quiz.title}.`);
      continue;
    }

    const token = await generateInterviewToken();

    const interview = await prisma.interview.create({
      data: {
        candidateId: candidate.id,
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
      quizId: quiz.id,
      token: interview.token,
      quizTitle: quiz.title,
    });
  }

  // Invalidate cache for created interviews
  if (createdInterviews.length > 0) {
    for (const interview of createdInterviews) {
      invalidateInterviewCache({ quizId: interview.quizId });
    }
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
    message: "Interviste create con successo.",
    createdInterviews,
    success: true,
  };
}
