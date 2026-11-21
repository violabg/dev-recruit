import { beforeEach, describe, expect, it, vi } from "vitest";

import prisma from "@/lib/prisma";
import type { Actor } from "@/lib/services/actor";
import {
  createPosition,
  publishPositionDraft,
} from "@/lib/services/positions";

const actor: Actor = { userId: "user-123", role: "user" };

const values = {
  title: "Senior Developer",
  description: "  Sviluppo full stack  ",
  experienceLevel: "senior",
  skills: ["JavaScript", "React"],
  softSkills: ["Comunicazione"],
  contractType: "full-time",
};

beforeEach(() => {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    emailVerified: true,
    banned: false,
  } as any);
  vi.mocked(prisma.position.create).mockResolvedValue({ id: "pos-123" } as any);
  vi.mocked(prisma.position.findUnique).mockResolvedValue({
    status: "draft",
  } as any);
});

describe("createPosition", () => {
  it("creates a draft authored by the actor and returns its id", async () => {
    const result = await createPosition(actor, values);

    expect(result).toEqual({ positionId: "pos-123" });
    expect(prisma.position.create).toHaveBeenCalledWith({
      data: {
        title: "Senior Developer",
        description: "Sviluppo full stack",
        experienceLevel: "senior",
        skills: ["JavaScript", "React"],
        softSkills: ["Comunicazione"],
        contractType: "full-time",
        status: "draft",
        createdBy: "user-123",
      },
      select: { id: true },
    });
  });

  it("stores empty optional fields as null", async () => {
    await createPosition(actor, {
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

  it("refuses invalid input with the schema message and stores nothing", async () => {
    await expect(
      createPosition(actor, { ...values, skills: [] }),
    ).rejects.toThrow("Seleziona almeno una competenza.");
    expect(prisma.position.create).not.toHaveBeenCalled();
  });

  it("refuses a disabled actor before parsing or writing", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      emailVerified: true,
      banned: true,
    } as any);

    await expect(createPosition(actor, values)).rejects.toThrow(
      "Sessione scaduta. Accedi di nuovo per continuare.",
    );
    expect(prisma.position.create).not.toHaveBeenCalled();
  });

  it("applies no role check: a plain user creates like an admin", async () => {
    await createPosition({ userId: "user-9", role: "user" }, values);

    expect(prisma.position.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdBy: "user-9" }),
      }),
    );
  });
});

describe("publishPositionDraft", () => {
  it("opens a draft position", async () => {
    const result = await publishPositionDraft(actor, "pos-123");

    expect(result).toEqual({ positionId: "pos-123" });
    expect(prisma.position.findUnique).toHaveBeenCalledWith({
      where: { id: "pos-123" },
      select: { status: true },
    });
    expect(prisma.position.update).toHaveBeenCalledWith({
      where: { id: "pos-123" },
      data: { status: "open" },
    });
  });

  it("refuses a missing position", async () => {
    vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

    await expect(publishPositionDraft(actor, "nope")).rejects.toThrow(
      "Posizione non trovata",
    );
    expect(prisma.position.update).not.toHaveBeenCalled();
  });

  it.each(["open", "closed"])(
    "refuses a %s position",
    async (status) => {
      vi.mocked(prisma.position.findUnique).mockResolvedValueOnce({
        status,
      } as any);

      await expect(publishPositionDraft(actor, "pos-123")).rejects.toThrow(
        "La posizione non è una bozza",
      );
      expect(prisma.position.update).not.toHaveBeenCalled();
    },
  );

  it("refuses a disabled actor", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

    await expect(publishPositionDraft(actor, "pos-123")).rejects.toThrow(
      "Sessione scaduta. Accedi di nuovo per continuare.",
    );
    expect(prisma.position.findUnique).not.toHaveBeenCalled();
    expect(prisma.position.update).not.toHaveBeenCalled();
  });
});
