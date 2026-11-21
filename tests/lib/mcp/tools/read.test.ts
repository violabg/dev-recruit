import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/applications", () => ({
  getActionCenterForUser: vi.fn(),
  getApplicationsByPosition: vi.fn(),
}));

vi.mock("@/lib/data/positions", () => ({
  getPositions: vi.fn(),
  getPositionById: vi.fn(),
  getPositionSetupStatus: vi.fn(),
}));

vi.mock("@/lib/mcp/views", () => ({
  buildApplicationView: vi.fn(),
  buildInterviewPrepView: vi.fn(),
  buildInterviewRows: vi.fn(),
}));

vi.mock("@/lib/mcp/widgets/build", () => ({
  buildActionCenterWidget: vi.fn(() => ({ kind: "action-center" })),
  buildPositionWidget: vi.fn(() => ({ kind: "position" })),
  buildApplicationFlowWidget: vi.fn(() => ({ kind: "application-flow" })),
}));

vi.mock("@/lib/mcp/render", () => ({
  renderActionCenter: vi.fn(() => "testo azioni"),
  renderPositionList: vi.fn(() => "testo posizioni"),
  renderPosition: vi.fn(() => "testo posizione"),
  renderApplication: vi.fn(() => "testo candidatura"),
  renderInterviewList: vi.fn(() => "testo colloqui"),
  renderInterview: vi.fn(() => "testo colloquio"),
}));

import {
  getActionCenterForUser,
  getApplicationsByPosition,
} from "@/lib/data/applications";
import {
  getPositionById,
  getPositions,
  getPositionSetupStatus,
} from "@/lib/data/positions";
import type { McpActor } from "@/lib/mcp/auth";
import {
  actionCenterTool,
  getApplicationTool,
  getInterviewTool,
  getPositionTool,
  listInterviewsTool,
  listPositionsTool,
  readTools,
} from "@/lib/mcp/tools/read";
import {
  buildApplicationView,
  buildInterviewPrepView,
  buildInterviewRows,
} from "@/lib/mcp/views";

const actor: McpActor = {
  userId: "u1",
  role: "user",
  clientId: "c1",
  scopes: ["recruit:read"],
  tokenId: "t1",
};

const emptyCenter = {
  data: {
    positionsWithIncompleteSetup: [],
    assessmentsToEvaluate: [],
    openApplications: [],
    interviewsWithoutKit: [],
    feedbackToFill: [],
  },
  staleApplications: [],
};

beforeEach(() => {
  vi.mocked(getActionCenterForUser).mockResolvedValue(emptyCenter as any);
});

describe("read tools", () => {
  it("are all read-only, scope recruit:read, group read", () => {
    expect(readTools.map((tool) => tool.name)).toEqual([
      "action_center",
      "list_positions",
      "get_position",
      "get_application",
      "list_interviews",
      "get_interview",
    ]);
    for (const tool of readTools) {
      expect(tool).toMatchObject({ scope: "recruit:read", group: "read", readOnly: true });
    }
  });

  it("action_center reads the actor's action center with the current time", async () => {
    const before = Date.now();

    const result = await actionCenterTool.handler(actor, { mineOnly: true });

    const [userId, options] = vi.mocked(getActionCenterForUser).mock.calls[0];
    expect(userId).toBe("u1");
    expect(options.mineOnly).toBe(true);
    expect(options.now.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.text).toBe("testo azioni");
    expect(result.structured).toMatchObject({
      staleApplications: [],
      widget: { kind: "action-center" },
    });
    expect(result.auditSummary).toContain("setup=0");
  });

  it("list_positions reads 20 positions per page", async () => {
    vi.mocked(getPositions).mockResolvedValue({
      positions: [],
      totalCount: 0,
      currentPage: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: true,
    });

    const result = await listPositionsTool.handler(actor, {
      search: "dev",
      status: "open",
      page: 2,
    });

    expect(getPositions).toHaveBeenCalledWith({
      search: "dev",
      status: "open",
      page: 2,
      pageSize: 20,
    });
    expect(result.text).toBe("testo posizioni");
  });

  it("get_position reads the position, its setup and its applications", async () => {
    vi.mocked(getPositionById).mockResolvedValue({ id: "pos-1", title: "Dev" } as any);
    vi.mocked(getPositionSetupStatus).mockResolvedValue(null);
    vi.mocked(getApplicationsByPosition).mockResolvedValue([]);

    const result = await getPositionTool.handler(actor, { positionId: "pos-1" });

    expect(getPositionSetupStatus).toHaveBeenCalledWith("pos-1");
    expect(getApplicationsByPosition).toHaveBeenCalledWith("pos-1");
    expect(result.text).toBe("testo posizione");
    expect(result.structured).toMatchObject({ widget: { kind: "position" } });
  });

  it("get_position refuses a missing position", async () => {
    vi.mocked(getPositionById).mockResolvedValue(null);

    await expect(getPositionTool.handler(actor, { positionId: "nope" })).rejects.toThrow(
      "Posizione non trovata",
    );
  });

  it("get_application passes the actor and the CV flag", async () => {
    vi.mocked(buildApplicationView).mockResolvedValue({
      id: "app-1",
      cvText: null,
      decision: { hidden: false },
    } as any);

    const result = await getApplicationTool.handler(actor, {
      applicationId: "app-1",
      includeCv: true,
    });

    expect(buildApplicationView).toHaveBeenCalledWith(actor, "app-1", { includeCv: true });
    expect(result.text).toBe("testo candidatura");
    expect(result.auditSummary).toBe("application=app-1 cv=unreadable hidden=false");
    expect(result.structured).toMatchObject({ widget: { kind: "application-flow" } });
  });

  it("get_application refuses a missing application", async () => {
    vi.mocked(buildApplicationView).mockResolvedValue(null);

    await expect(
      getApplicationTool.handler(actor, { applicationId: "nope", includeCv: false }),
    ).rejects.toThrow("Candidatura non trovata");
  });

  it("list_interviews converts the date filter", async () => {
    vi.mocked(buildInterviewRows).mockResolvedValue([]);

    await listInterviewsTool.handler(actor, {
      mineOnly: true,
      from: "2026-11-21T00:00:00+01:00",
    });

    expect(buildInterviewRows).toHaveBeenCalledWith(actor, {
      applicationId: undefined,
      mineOnly: true,
      from: new Date("2026-11-21T00:00:00+01:00"),
      to: undefined,
    });
  });

  it("get_interview reads the non-identifying preparation, or refuses a missing one", async () => {
    vi.mocked(buildInterviewPrepView).mockResolvedValue({ id: "int-1", sections: [] } as any);
    const result = await getInterviewTool.handler(actor, { interviewId: "int-1" });
    expect(result.text).toBe("testo colloquio");

    vi.mocked(buildInterviewPrepView).mockResolvedValue(null);
    await expect(getInterviewTool.handler(actor, { interviewId: "nope" })).rejects.toThrow(
      "Colloquio non trovato",
    );
  });
});
