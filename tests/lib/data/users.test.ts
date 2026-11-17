import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    user: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    session: { findMany: vi.fn(), groupBy: vi.fn() },
  },
}));

import {
  getUserDetail,
  getUserOptions,
  getUserSessions,
  getUsersActivity,
  getUsersPage,
} from "@/lib/data/users";
import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

const db = prisma as any;

const now = new Date("2026-11-17T09:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserOptions", () => {
  it("returns non-banned users by name, cached for minutes and tagged users", async () => {
    const users = [
      { id: "u1", name: "Anna", email: "anna@example.com" },
      { id: "u2", name: "Luca", email: "luca@example.com" },
    ];
    db.user.findMany.mockResolvedValueOnce(users);

    expect(await getUserOptions()).toEqual(users);
    expect(cacheLife).toHaveBeenCalledWith("minutes");
    expect(cacheTag).toHaveBeenCalledWith("users");
    expect(db.user.findMany).toHaveBeenCalledWith({
      where: { banned: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
  });
});

describe("getUsersPage", () => {
  it("searches name or email, paginates and narrows the role", async () => {
    db.user.findMany.mockResolvedValueOnce([
      {
        id: "u1",
        name: "Anna",
        email: "anna@example.com",
        role: "admin",
        emailVerified: true,
        banned: null,
        createdAt: now,
      },
    ]);
    db.user.count.mockResolvedValueOnce(25);

    const result = await getUsersPage({ search: "  ann  ", page: 2, pageSize: 10 });

    expect(cacheLife).toHaveBeenCalledWith("minutes");
    expect(cacheTag).toHaveBeenCalledWith("users");
    expect(db.user.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: "ann", mode: "insensitive" } },
          { email: { contains: "ann", mode: "insensitive" } },
        ],
      },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      skip: 10,
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        banned: true,
        createdAt: true,
      },
    });
    expect(result).toMatchObject({
      totalCount: 25,
      currentPage: 2,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
    expect(result.users[0]).toMatchObject({ role: "admin", banned: false });
  });

  it("lists every user without a search term", async () => {
    db.user.findMany.mockResolvedValueOnce([]);
    db.user.count.mockResolvedValueOnce(0);

    const result = await getUsersPage();

    expect(db.user.count).toHaveBeenCalledWith({ where: {} });
    expect(result).toMatchObject({
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });
});

describe("getUserDetail", () => {
  it("returns null when the user does not exist", async () => {
    db.user.findUnique.mockResolvedValueOnce(null);

    expect(await getUserDetail("missing")).toBeNull();
    expect(cacheTag).toHaveBeenCalledWith("users");
  });

  it("returns the user with the role narrowed and banned as a boolean", async () => {
    db.user.findUnique.mockResolvedValueOnce({
      id: "u1",
      name: "Anna",
      email: "anna@example.com",
      role: "admin",
      emailVerified: true,
      banned: null,
      createdAt: now,
      firstName: "Anna",
      lastName: "Rossi",
      banReason: null,
    });

    const detail = await getUserDetail("u1");

    expect(detail).toMatchObject({ role: "admin", banned: false });
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
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
  });
});

describe("getUsersActivity", () => {
  it("returns no entry and no cache for an empty list", async () => {
    expect(await getUsersActivity([])).toEqual({});
    expect(cacheLife).not.toHaveBeenCalled();
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it("counts only non-expired sessions and defaults the missing ids", async () => {
    const lastLoginAt = new Date("2026-11-16T08:00:00.000Z");
    db.user.findMany.mockResolvedValueOnce([{ id: "u1", lastLoginAt }]);
    db.session.groupBy.mockResolvedValueOnce([
      { userId: "u1", _count: { _all: 2 } },
    ]);

    const activity = await getUsersActivity(["u1", "u2"], now);

    expect(cacheLife).not.toHaveBeenCalled();
    expect(db.session.groupBy).toHaveBeenCalledWith({
      by: ["userId"],
      where: { userId: { in: ["u1", "u2"] }, expiresAt: { gt: now } },
      _count: { _all: true },
    });
    expect(activity).toEqual({
      u1: { lastLoginAt, activeSessions: 2 },
      u2: { lastLoginAt: null, activeSessions: 0 },
    });
  });
});

describe("getUserSessions", () => {
  it("reads only non-expired sessions, newest first, without the token", async () => {
    const rows = [
      {
        id: "s1",
        createdAt: now,
        updatedAt: now,
        expiresAt: now,
        ipAddress: null,
        userAgent: null,
      },
    ];
    db.session.findMany.mockResolvedValueOnce(rows);

    expect(await getUserSessions("u1", now)).toEqual(rows);
    expect(cacheLife).not.toHaveBeenCalled();

    const args = db.session.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "u1", expiresAt: { gt: now } });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.select).not.toHaveProperty("token");
    expect(args.select.id).toBe(true);
  });
});
