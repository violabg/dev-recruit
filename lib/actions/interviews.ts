"use server";

import { randomUUID } from "node:crypto";

import { candidateQuizSelectionSchema } from "@/lib/schemas";
import { revalidatePath, updateTag } from "next/cache";

import { requireUser } from "../auth-server";
import prisma from "../prisma";
import { Prisma } from "../prisma/client";
import type { AssignedInterview, InterviewListItem } from "../types/interview";

export type InterviewsFilters = {
  search?: string;
  status?: string;
  positionId?: string;
  programmingLanguage?: string;
  page?: number;
  limit?: number;
};

type InterviewRecord = Prisma.InterviewGetPayload<{
  include: {
    candidate: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    quiz: {
      select: {
        id: true;
        title: true;
        positionId: true;
        position: {
          select: {
            id: true;
            title: true;
            skills: true;
          };
        };
      };
    };
  };
}>;

const mapInterviewRecord = (record: InterviewRecord): InterviewListItem => {
  return {
    id: record.id,
    token: record.token,
    status: record.status,
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    score: record.score ?? null,
    candidateId: record.candidateId,
    candidateName: record.candidate.name ?? "",
    candidateEmail: record.candidate.email ?? "",
    quizId: record.quizId,
    quizTitle: record.quiz.title,
    positionId: record.quiz.position?.id ?? null,
    positionTitle: record.quiz.position?.title ?? null,
    positionSkills: record.quiz.position?.skills ?? [],
  };
};

const generateInterviewToken = async (): Promise<string> => {
  while (true) {
    const token = randomUUID().replace(/-/g, "");

    const existing = await prisma.interview.findUnique({
      where: { token },
      select: { id: true },
    });

    if (!existing) {
      return token;
    }
  }
};

export async function fetchInterviewsData(filters: InterviewsFilters = {}) {
  const user = await requireUser();

  const {
    search = "",
    status = "all",
    positionId = "all",
    programmingLanguage = "all",
    page = 1,
    limit = 10,
  } = filters;

  const normalizedPage = Math.max(page ?? 1, 1);
  const normalizedLimit = Math.max(limit ?? 10, 1);
  const searchTerm = search.trim();

  const whereClauses: Prisma.InterviewWhereInput[] = [
    {
      candidate: {
        createdBy: user.id,
      },
    },
  ];

  if (status !== "all") {
    whereClauses.push({ status });
  }

  if (positionId !== "all") {
    whereClauses.push({ quiz: { positionId } });
  }

  if (programmingLanguage !== "all") {
    whereClauses.push({
      quiz: {
        position: {
          skills: {
            has: programmingLanguage,
          },
        },
      },
    });
  }

  if (searchTerm) {
    const searchFilter: Prisma.InterviewWhereInput = {
      OR: [
        {
          candidate: {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          candidate: {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          quiz: {
            title: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        {
          quiz: {
            position: {
              title: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    };

    whereClauses.push(searchFilter);
  }

  const where: Prisma.InterviewWhereInput = whereClauses.length
    ? { AND: whereClauses }
    : {};

  const interviewRecords = await prisma.interview.findMany({
    where,
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
          positionId: true,
          position: {
            select: {
              id: true,
              title: true,
              skills: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (normalizedPage - 1) * normalizedLimit,
    take: normalizedLimit,
  });

  const interviews = interviewRecords.map(mapInterviewRecord);

  const statusCounts = interviews.reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const totalCount = await prisma.interview.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / normalizedLimit));

  const positions = await prisma.position.findMany({
    where: {
      createdBy: user.id,
    },
    select: {
      id: true,
      title: true,
      skills: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  const programmingLanguages = Array.from(
    new Set(positions.flatMap((position) => position.skills ?? []))
  ).sort((a, b) => a.localeCompare(b));

  return {
    interviews,
    positions,
    programmingLanguages,
    statusCounts,
    totalCount,
    currentPage: normalizedPage,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPrevPage: normalizedPage > 1,
  };
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

export async function getInterviewsByQuiz(
  quizId: string
): Promise<AssignedInterview[]> {
  const interviews = await prisma.interview.findMany({
    where: { quizId },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return interviews.map((interview) => ({
    id: interview.id,
    token: interview.token,
    status: interview.status,
    createdAt: interview.createdAt.toISOString(),
    startedAt: interview.startedAt?.toISOString() ?? null,
    completedAt: interview.completedAt?.toISOString() ?? null,
    candidateId: interview.candidateId,
    candidateName: interview.candidate?.name ?? "",
    candidateEmail: interview.candidate?.email ?? "",
    quizId: interview.quizId,
    quizTitle: interview.quiz?.title ?? "",
  }));
}

export type InterviewsByQuiz = Awaited<ReturnType<typeof getInterviewsByQuiz>>;

export async function deleteInterview(id: string) {
  const user = await requireUser();

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

  if (!interview || interview.quiz?.createdBy !== user.id) {
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
