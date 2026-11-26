import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { APPLICATION_STAGE_VALUES, type ApplicationStage } from "@/lib/schemas";
import { CacheTags, entityTag } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";

// Prisma type for candidate with applications and assessments
export type CandidateWithRelations = Prisma.CandidateGetPayload<{
  include: {
    applications: {
      include: {
        position: {
          select: {
            id: true;
            title: true;
            experienceLevel: true;
            status: true;
          };
        };
      };
    };
    assessments: {
      select: {
        id: true;
        status: true;
        createdAt: true;
      };
    };
  };
}>;

// Reusable include pattern for candidate queries
const CANDIDATE_INCLUDE = {
  applications: {
    include: {
      position: {
        select: {
          id: true,
          title: true,
          experienceLevel: true,
          status: true,
        },
      },
    },
    // Recent activity first: no application is primary
    orderBy: {
      stageChangedAt: "desc" as const,
    },
  },
  assessments: {
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
  },
} as const;

export type FetchCandidatesParams = {
  search?: string;
  /** An ApplicationStage or "all" */
  stage?: string;
  /** A position id or "all" */
  positionId?: string;
  /** "newest" | "oldest" | "name" */
  sort?: string;
  page?: number;
  pageSize?: number;
};

export type PaginatedCandidates = {
  candidates: CandidateWithRelations[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

const ORDER_BY_MAP: Record<string, Prisma.CandidateOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  name: { lastName: "asc" },
};

const isApplicationStage = (value: string): value is ApplicationStage =>
  (APPLICATION_STAGE_VALUES as readonly string[]).includes(value);

const buildCandidateWhere = ({
  search,
  stage,
  positionId,
}: Pick<
  FetchCandidatesParams,
  "search" | "stage" | "positionId"
>): Prisma.CandidateWhereInput => {
  const where: Prisma.CandidateWhereInput = {};

  const stageFilter =
    stage && stage !== "all" && isApplicationStage(stage) ? stage : null;
  const positionFilter =
    positionId && positionId !== "all" ? positionId : null;

  // Both conditions apply to the same application
  if (stageFilter || positionFilter) {
    where.applications = {
      some: {
        ...(stageFilter ? { stage: stageFilter } : {}),
        ...(positionFilter ? { positionId: positionFilter } : {}),
      },
    };
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
};

export async function getFilteredCandidates(
  params?: FetchCandidatesParams
): Promise<PaginatedCandidates> {
  "use cache";
  cacheLife("hours");
  // CANDIDATE_INCLUDE joins applications (positions) + assessments (status)
  cacheTag(CacheTags.CANDIDATES, CacheTags.POSITIONS, CacheTags.ASSESSMENTS);

  const {
    search = "",
    stage = "all",
    positionId = "all",
    sort = "newest",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = params ?? {};

  // Ensure page and pageSize are valid positive numbers
  const normalizedPage = typeof page === "number" && page > 0 ? page : 1;
  const normalizedPageSize =
    typeof pageSize === "number" && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const where = buildCandidateWhere({ search, stage, positionId });

  const [candidates, totalCount] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: ORDER_BY_MAP[sort] ?? ORDER_BY_MAP.newest,
      include: CANDIDATE_INCLUDE,
      skip: (normalizedPage - 1) * normalizedPageSize,
      take: normalizedPageSize,
    }),
    prisma.candidate.count({ where }),
  ]);

  const totalPages =
    totalCount > 0 ? Math.ceil(totalCount / normalizedPageSize) : 1;

  return {
    candidates,
    totalCount,
    currentPage: normalizedPage,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPrevPage: normalizedPage > 1,
  };
}

export const getCandidatesByPosition = async (positionId: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.CANDIDATES, entityTag.position(positionId));

  return prisma.candidate.findMany({
    where: {
      applications: {
        some: {
          positionId,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getCandidateWithDetails = async (
  id: string
): Promise<CandidateWithRelations | null> => {
  "use cache";
  cacheLife("hours");
  cacheTag(
    CacheTags.CANDIDATES,
    CacheTags.POSITIONS,
    CacheTags.ASSESSMENTS,
    entityTag.candidate(id),
  );

  return prisma.candidate.findFirst({
    where: { id },
    include: {
      ...CANDIDATE_INCLUDE,
      assessments: {
        ...CANDIDATE_INCLUDE.assessments,
        orderBy: { createdAt: "desc" },
      },
    },
  });
};

export const getCandidatesCount = async () => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.CANDIDATES);

  return prisma.candidate.count();
};

/**
 * One candidate as offered by the association picker on the position page.
 * `applications` holds every application, withdrawn included, with the
 * position title.
 */
export type CandidatePickerOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  doNotContact: boolean;
  createdAt: Date;
  applications: {
    positionId: string;
    positionTitle: string;
    stage: ApplicationStage;
  }[];
};

/**
 * Every candidate with its applications, for the existing-candidate picker.
 * Every signed-in user sees every candidate: no per-user filter.
 */
export async function getCandidatePickerOptions(): Promise<
  CandidatePickerOption[]
> {
  "use cache";
  cacheLife("hours");
  // Reads candidates + applications (covered by candidates) + position titles
  cacheTag(CacheTags.CANDIDATES, CacheTags.POSITIONS);

  const rows = await prisma.candidate.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      doNotContact: true,
      createdAt: true,
      applications: {
        select: {
          positionId: true,
          stage: true,
          position: { select: { title: true } },
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    doNotContact: r.doNotContact,
    createdAt: r.createdAt,
    applications: r.applications.map((a) => ({
      positionId: a.positionId,
      positionTitle: a.position.title,
      stage: a.stage,
    })),
  }));
}

/**
 * Returns last N candidates for generateStaticParams.
 * Used to pre-render most recent candidate detail pages at build time.
 */
export const getRecentCandidateIds = async (limit = 100): Promise<string[]> => {
  "use cache";
  cacheLife("hours");
  cacheTag(CacheTags.CANDIDATES);

  const candidates = await prisma.candidate.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });

  return candidates.map((c) => c.id);
};
