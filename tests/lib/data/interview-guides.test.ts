import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    interviewGuide: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

import {
  getInterviewGuideById,
  getInterviewGuidesByPosition,
} from "@/lib/data/interview-guides";
import prisma from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

const db = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getInterviewGuidesByPosition", () => {
  it("is cached for hours with the guide, position and entity tags, by round then creation", async () => {
    db.interviewGuide.findMany.mockResolvedValueOnce([]);

    expect(await getInterviewGuidesByPosition("pos-1")).toEqual([]);
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(
      "interview-guides",
      "positions",
      "positions-pos-1",
    );
    expect(db.interviewGuide.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { positionId: "pos-1" },
        orderBy: [{ round: "asc" }, { createdAt: "asc" }],
      }),
    );
  });

  it("counts sections and questions", async () => {
    const updatedAt = new Date("2026-01-03");
    db.interviewGuide.findMany.mockResolvedValueOnce([
      {
        id: "g-1",
        title: "Tecnico",
        round: 1,
        durationMinutes: 60,
        updatedAt,
        sections: [
          { _count: { questions: 2 } },
          { _count: { questions: 3 } },
          { _count: { questions: 0 } },
        ],
      },
      {
        id: "g-2",
        title: "Culturale",
        round: 2,
        durationMinutes: 30,
        updatedAt,
        sections: [],
      },
    ]);

    expect(await getInterviewGuidesByPosition("pos-1")).toEqual([
      {
        id: "g-1",
        title: "Tecnico",
        round: 1,
        durationMinutes: 60,
        sectionCount: 3,
        questionCount: 5,
        updatedAt,
      },
      {
        id: "g-2",
        title: "Culturale",
        round: 2,
        durationMinutes: 30,
        sectionCount: 0,
        questionCount: 0,
        updatedAt,
      },
    ]);
  });
});

describe("getInterviewGuideById", () => {
  it("is cached for hours with the guide collection and entity tags", async () => {
    db.interviewGuide.findUnique.mockResolvedValueOnce(null);

    await getInterviewGuideById("g-1");

    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(
      "interview-guides",
      "interview-guide-g-1",
    );
  });

  it("returns null when the guide does not exist", async () => {
    db.interviewGuide.findUnique.mockResolvedValueOnce(null);

    expect(await getInterviewGuideById("g-x")).toBeNull();
  });

  it("orders sections and questions by order and normalizes the anchors", async () => {
    db.interviewGuide.findUnique.mockResolvedValueOnce({
      id: "g-1",
      positionId: "pos-1",
      title: "Tecnico",
      round: 1,
      durationMinutes: 60,
      sections: [
        {
          id: "s-1",
          title: "Introduzione",
          minutes: 5,
          kind: "intro",
          questions: [
            {
              id: "q-1",
              text: "Presentati",
              followUps: [],
              criterionIds: [],
              anchors: null,
              required: false,
            },
            {
              id: "q-2",
              text: "Perché noi?",
              followUps: ["Cosa sai di noi?"],
              criterionIds: ["c-1"],
              anchors: { weak: "w", strong: "s" },
              required: true,
            },
          ],
        },
      ],
    });

    const guide = await getInterviewGuideById("g-1");

    const call = db.interviewGuide.findUnique.mock.calls[0][0];
    expect(call.where).toEqual({ id: "g-1" });
    expect(call.select.sections.orderBy).toEqual({ order: "asc" });
    expect(call.select.sections.select.questions.orderBy).toEqual({
      order: "asc",
    });
    expect(guide).toEqual({
      id: "g-1",
      positionId: "pos-1",
      title: "Tecnico",
      round: 1,
      durationMinutes: 60,
      sections: [
        {
          id: "s-1",
          title: "Introduzione",
          minutes: 5,
          kind: "intro",
          questions: [
            {
              id: "q-1",
              text: "Presentati",
              followUps: [],
              criterionIds: [],
              anchors: { weak: "", medium: "", strong: "" },
              required: false,
            },
            {
              id: "q-2",
              text: "Perché noi?",
              followUps: ["Cosa sai di noi?"],
              criterionIds: ["c-1"],
              anchors: { weak: "w", medium: "", strong: "s" },
              required: true,
            },
          ],
        },
      ],
    });
  });
});
