import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    oauthRefreshToken: { findMany: vi.fn() },
    oauthAccessToken: { findMany: vi.fn() },
    mcpAuditLog: { findMany: vi.fn(), count: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/services/mcp-access", () => ({
  isMcpEnabledGlobally: vi.fn(),
}));

import {
  getActiveMcpTokens,
  getMcpAccessState,
  getMcpAudit,
} from "@/lib/data/mcp-admin";
import prisma from "@/lib/prisma";
import { isMcpEnabledGlobally } from "@/lib/services/mcp-access";

const db = prisma as any;
const at = (offsetMinutes: number) => new Date(Date.now() + offsetMinutes * 60_000);

const person = { id: "u1", name: "laura", firstName: "Laura", lastName: "Neri", email: "laura@x.it" };
const client = { clientId: "client-1", name: "Claude" };

beforeEach(() => {
  db.oauthRefreshToken.findMany.mockResolvedValue([]);
  db.oauthAccessToken.findMany.mockResolvedValue([]);
  db.mcpAuditLog.findMany.mockResolvedValue([]);
  db.mcpAuditLog.count.mockResolvedValue(0);
  db.user.findMany.mockResolvedValue([]);
});

describe("getActiveMcpTokens", () => {
  it("reads only live grants: not revoked, not expired", async () => {
    await getActiveMcpTokens();

    const refreshWhere = db.oauthRefreshToken.findMany.mock.calls[0][0].where;
    expect(refreshWhere.revoked).toBeNull();
    expect(refreshWhere.expiresAt.gt).toBeInstanceOf(Date);
    expect(refreshWhere.expiresAt.gt.getTime()).toBeLessThanOrEqual(Date.now());

    const accessWhere = db.oauthAccessToken.findMany.mock.calls[0][0].where;
    expect(accessWhere).toMatchObject({ revoked: null, userId: { not: null } });
    expect(accessWhere.expiresAt.gt).toBeInstanceOf(Date);
  });

  it("lists refresh tokens and unlinked opaque access tokens, newest first, with names", async () => {
    db.oauthRefreshToken.findMany.mockResolvedValue([
      {
        id: "rt-1",
        scopes: ["recruit:read", "offline_access"],
        createdAt: at(-60),
        expiresAt: at(60 * 24),
        user: person,
        client,
      },
    ]);
    db.oauthAccessToken.findMany.mockResolvedValue([
      // covered by rt-1: not listed twice
      {
        id: "at-linked",
        scopes: ["recruit:read"],
        createdAt: at(-5),
        expiresAt: at(10),
        refreshId: "rt-1",
        user: person,
        client,
        refreshToken: { expiresAt: at(60 * 24), revoked: null },
      },
      {
        id: "at-opaque",
        scopes: ["recruit:read"],
        createdAt: at(-1),
        expiresAt: at(14),
        refreshId: null,
        user: { ...person, firstName: null, lastName: null },
        client: { clientId: "client-2", name: null },
        refreshToken: null,
      },
    ]);

    const tokens = await getActiveMcpTokens();

    expect(tokens.map((token) => token.id)).toEqual(["at-opaque", "rt-1"]);
    expect(tokens[1]).toMatchObject({
      user: { id: "u1", name: "Laura Neri", email: "laura@x.it" },
      clientId: "client-1",
      clientName: "Claude",
      scopes: ["recruit:read", "offline_access"],
    });
    expect(tokens[0]).toMatchObject({
      user: { name: "laura" },
      clientName: "client-2",
      refreshExpiresAt: null,
    });
  });
});

describe("getMcpAudit", () => {
  it("pages newest first, 50 per page by default", async () => {
    await getMcpAudit({ page: 3 });

    expect(db.mcpAuditLog.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
      skip: 100,
      take: 50,
    });
    expect(db.mcpAuditLog.count).toHaveBeenCalledWith({ where: {} });
  });

  it("filters by user, tool and dates", async () => {
    const from = at(-60);
    const to = at(0);

    await getMcpAudit({ userId: "u1", tool: "get_application", from, to, page: 1, pageSize: 10 });

    expect(db.mcpAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", tool: "get_application", createdAt: { gte: from, lte: to } },
        skip: 0,
        take: 10,
      }),
    );
  });

  it("joins the user names and returns the total", async () => {
    db.mcpAuditLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        userId: "u1",
        clientId: "client-1",
        scopes: ["recruit:read"],
        tool: "action_center",
        arguments: { mineOnly: true },
        status: "ok",
        summary: "setup=0",
        channel: "mcp",
        createdAt: at(-1),
      },
      {
        id: "log-2",
        userId: null,
        clientId: null,
        scopes: [],
        tool: "get_position",
        arguments: {},
        status: "denied",
        summary: "insufficient_scope",
        channel: "mcp",
        createdAt: at(-2),
      },
    ]);
    db.mcpAuditLog.count.mockResolvedValue(2);
    db.user.findMany.mockResolvedValue([person]);

    const result = await getMcpAudit({ page: 1 });

    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["u1"] } } }),
    );
    expect(result.total).toBe(2);
    expect(result.rows[0]).toMatchObject({ user: { id: "u1", name: "Laura Neri" }, tool: "action_center" });
    expect(result.rows[1].user).toBeNull();
  });
});

describe("getMcpAccessState", () => {
  it("returns the global switch and the enabled users with their flag", async () => {
    vi.mocked(isMcpEnabledGlobally).mockResolvedValue(false);
    db.user.findMany.mockResolvedValue([
      { ...person, mcpDisabled: true },
      { id: "u2", name: "piero", firstName: "Piero", lastName: null, email: "p@x.it", mcpDisabled: false },
    ]);

    const state = await getMcpAccessState();

    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { banned: false, emailVerified: true },
        orderBy: { name: "asc" },
      }),
    );
    expect(state).toEqual({
      enabled: false,
      users: [
        { id: "u1", name: "Laura Neri", email: "laura@x.it", mcpDisabled: true },
        { id: "u2", name: "Piero", email: "p@x.it", mcpDisabled: false },
      ],
      disabledUsers: [{ id: "u1", name: "Laura Neri", email: "laura@x.it" }],
    });
  });
});
