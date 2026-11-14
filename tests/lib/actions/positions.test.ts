import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    position: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/utils/cache-utils", () => ({
  invalidatePositionCache: vi.fn(),
}));

vi.mock("@/lib/data/positions", () => ({
  getPositionById: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  unstable_rethrow: vi.fn(),
}));

import {
  createPositionAction,
  deletePositionAction,
  fetchPositionDataAction,
  updatePositionAction,
} from "@/lib/actions/positions";
import { getPositionById } from "@/lib/data/positions";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { invalidatePositionCache } from "@/lib/utils/cache-utils";
import { redirect } from "next/navigation";

const values = {
  title: "Senior Developer",
  description: "  Sviluppo full stack  ",
  experienceLevel: "senior",
  skills: ["JavaScript", "React"],
  softSkills: ["Comunicazione"],
  contractType: "full-time",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ id: "user-123" } as any);
  vi.mocked(prisma.position.findUnique).mockResolvedValue({
    id: "pos-123",
  } as any);
  vi.mocked(prisma.position.create).mockResolvedValue({ id: "pos-123" } as any);
});

describe("createPositionAction", () => {
  it("stores the position and redirects to it", async () => {
    await createPositionAction(values);

    expect(prisma.position.create).toHaveBeenCalledWith({
      data: {
        title: "Senior Developer",
        description: "Sviluppo full stack",
        experienceLevel: "senior",
        skills: ["JavaScript", "React"],
        softSkills: ["Comunicazione"],
        contractType: "full-time",
        createdBy: "user-123",
      },
      select: { id: true },
    });
    expect(invalidatePositionCache).toHaveBeenCalledWith("pos-123");
    expect(redirect).toHaveBeenCalledWith("/dashboard/positions/pos-123");
  });

  it("stores empty optional fields as null", async () => {
    await createPositionAction({
      ...values,
      description: "",
      contractType: "",
      softSkills: undefined,
    });

    expect(prisma.position.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: null,
          contractType: null,
          softSkills: [],
        }),
      }),
    );
  });

  it("returns the validation message for invalid input", async () => {
    const result = await createPositionAction({ ...values, skills: [] });

    expect(result).toEqual({
      success: false,
      error: "Seleziona almeno una competenza.",
    });
    expect(prisma.position.create).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await createPositionAction(values);

    expect(result).toMatchObject({ success: false });
    expect(prisma.position.create).not.toHaveBeenCalled();
  });
});

describe("updatePositionAction", () => {
  it("updates the position and redirects to it", async () => {
    await updatePositionAction("pos-123", values);

    expect(prisma.position.update).toHaveBeenCalledWith({
      where: { id: "pos-123" },
      data: {
        title: "Senior Developer",
        description: "Sviluppo full stack",
        experienceLevel: "senior",
        skills: ["JavaScript", "React"],
        softSkills: ["Comunicazione"],
        contractType: "full-time",
      },
    });
    expect(invalidatePositionCache).toHaveBeenCalledWith("pos-123");
    expect(redirect).toHaveBeenCalledWith("/dashboard/positions/pos-123");
  });

  it("stores the same nulls as create for empty optional fields", async () => {
    await updatePositionAction("pos-123", {
      ...values,
      description: "",
      contractType: "",
    });

    expect(prisma.position.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: null, contractType: null }),
      }),
    );
  });

  it("reports a missing position", async () => {
    vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

    const result = await updatePositionAction("nope", values);

    expect(result).toEqual({ success: false, error: "Posizione non trovata" });
    expect(prisma.position.update).not.toHaveBeenCalled();
  });

  it("returns the validation message for invalid input", async () => {
    const result = await updatePositionAction("pos-123", { ...values, title: "" });

    expect(result).toMatchObject({ success: false });
    expect(prisma.position.update).not.toHaveBeenCalled();
  });
});

describe("deletePositionAction", () => {
  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await deletePositionAction("pos-123");

    expect(result).toMatchObject({ success: false });
    expect(prisma.position.delete).not.toHaveBeenCalled();
  });

  it("deletes the position, expires cascaded caches and redirects", async () => {
    await deletePositionAction("pos-123");

    expect(prisma.position.delete).toHaveBeenCalledWith({
      where: { id: "pos-123" },
    });
    expect(invalidatePositionCache).toHaveBeenCalledWith("pos-123", {
      deleted: true,
    });
    expect(redirect).toHaveBeenCalledWith("/dashboard/positions");
  });

  it("reports a missing position", async () => {
    vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

    const result = await deletePositionAction("nope");

    expect(result).toEqual({ success: false, error: "Posizione non trovata" });
    expect(prisma.position.delete).not.toHaveBeenCalled();
  });
});

describe("fetchPositionDataAction", () => {
  it("returns the position wrapped in the action result", async () => {
    const position = { id: "pos-123", title: "Senior Developer" };
    vi.mocked(getPositionById).mockResolvedValueOnce(position as any);

    const result = await fetchPositionDataAction("pos-123");

    expect(result).toEqual({ success: true, position });
    expect(getPositionById).toHaveBeenCalledWith("pos-123");
  });

  it("returns a successful null position when the position does not exist", async () => {
    vi.mocked(getPositionById).mockResolvedValueOnce(null);

    const result = await fetchPositionDataAction("nope");

    expect(result).toEqual({ success: true, position: null });
  });
});
