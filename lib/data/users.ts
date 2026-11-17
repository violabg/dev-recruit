import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/prisma/client";
import { toUserRole, type UserRole } from "@/lib/schemas/user";
import { CacheTags } from "@/lib/utils/cache-utils";
import { cacheLife, cacheTag } from "next/cache";

export type UserOption = { id: string; name: string; email: string };

/**
 * Every non-banned user ordered by name: the participant picker options.
 * Tagged users: a block, unblock or rename shows on the next load.
 */
export async function getUserOptions(): Promise<UserOption[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.USERS);

  return prisma.user.findMany({
    where: { banned: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

// ============================================================================
// User management reads (callers are admin-guarded pages)
// ============================================================================

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  banned: boolean;
  createdAt: Date;
};

export type UserDetail = UserListItem & {
  firstName: string | null;
  lastName: string | null;
  banReason: string | null;
};

export type UsersFilterParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export type PaginatedUsers = {
  users: UserListItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type UserActivity = { lastLoginAt: Date | null; activeSessions: number };

export type UserSessionRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
};

/**
 * Paginated users, searched by name or email, ordered by name.
 * Tagged users: invalidated by invalidateUserCache after every user change.
 */
export async function getUsersPage(
  params?: UsersFilterParams,
): Promise<PaginatedUsers> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.USERS);

  const { search, page = 1, pageSize = DEFAULT_PAGE_SIZE } = params ?? {};
  // Avoid Math.max() which calls .valueOf() and fails with temporary client references
  const normalizedPage = typeof page === "number" && page > 0 ? page : 1;
  const normalizedPageSize =
    typeof pageSize === "number" && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const searchTerm = search?.trim();

  const where: Prisma.UserWhereInput = searchTerm
    ? {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
        ],
      }
    : {};

  const [rows, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      skip: (normalizedPage - 1) * normalizedPageSize,
      take: normalizedPageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        banned: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages =
    totalCount > 0 ? Math.ceil(totalCount / normalizedPageSize) : 1;

  return {
    users: rows.map((row) => ({
      ...row,
      role: toUserRole(row.role),
      banned: row.banned === true,
    })),
    totalCount,
    currentPage: normalizedPage,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPrevPage: normalizedPage > 1,
  };
}

/**
 * One user for the detail page, or null when missing.
 * Tagged users: invalidated by invalidateUserCache after every user change.
 */
export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CacheTags.USERS);

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      banned: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      banReason: true,
    },
  });

  if (!row) return null;

  return {
    ...row,
    role: toUserRole(row.role),
    banned: row.banned === true,
  };
}

/**
 * Last access and number of active sessions per user. Live data, not cached:
 * callers await connection() first. Every requested id is present.
 */
export async function getUsersActivity(
  userIds: string[],
  now: Date = new Date(),
): Promise<Record<string, UserActivity>> {
  if (userIds.length === 0) return {};

  const [users, counts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, lastLoginAt: true },
    }),
    prisma.session.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, expiresAt: { gt: now } },
      _count: { _all: true },
    }),
  ]);

  const activity: Record<string, UserActivity> = {};
  for (const id of userIds) {
    const user = users.find((u) => u.id === id);
    const count = counts.find((c) => c.userId === id);
    activity[id] = {
      lastLoginAt: user?.lastLoginAt ?? null,
      activeSessions: count?._count._all ?? 0,
    };
  }
  return activity;
}

/**
 * Active (not expired) sessions of a user, newest first. Live data, not
 * cached: callers await connection() first. The session token is never read.
 */
export async function getUserSessions(
  userId: string,
  now: Date = new Date(),
): Promise<UserSessionRow[]> {
  return prisma.session.findMany({
    where: { userId, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
      ipAddress: true,
      userAgent: true,
    },
  });
}
