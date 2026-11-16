import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: { user: { findMany: vi.fn() } },
}));

import { getUserOptions } from "@/lib/data/users";
import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

const db = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserOptions", () => {
  it("returns non-banned users by name, cached for minutes with no tag", async () => {
    const users = [
      { id: "u1", name: "Anna", email: "anna@example.com" },
      { id: "u2", name: "Luca", email: "luca@example.com" },
    ];
    db.user.findMany.mockResolvedValueOnce(users);

    expect(await getUserOptions()).toEqual(users);
    expect(cacheLife).toHaveBeenCalledWith("minutes");
    expect(cacheTag).not.toHaveBeenCalled();
    expect(db.user.findMany).toHaveBeenCalledWith({
      where: { banned: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
  });
});
