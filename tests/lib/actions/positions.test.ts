import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    position: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    application: {
      count: vi.fn(),
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

vi.mock("@/lib/services/positions", () => ({
  createPosition: vi.fn(),
}));

import {
  createPositionAction,
  deletePositionAction,
  fetchPositionDataAction,
  updatePositionAction,
  updatePositionStatusAction,
} from "@/lib/actions/positions";
import { getPositionById } from "@/lib/data/positions";
import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { createPosition } from "@/lib/services/positions";
import { UserError } from "@/lib/services/user-error";
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
  // No application: deleting is allowed
  vi.mocked(prisma.application.count).mockResolvedValue(0);
  vi.mocked(createPosition).mockResolvedValue({ positionId: "pos-123" });
});

describe("createPositionAction", () => {
  it("delegates to createPosition with the session actor, invalidates and redirects", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({
      id: "user-123",
      role: "user",
    } as any);

    const result = await createPositionAction(values);

    expect(result).toEqual({ success: true });
    expect(createPosition).toHaveBeenCalledWith(
      { userId: "user-123", role: "user" },
      values,
    );
    expect(invalidatePositionCache).toHaveBeenCalledWith("pos-123");
    expect(redirect).toHaveBeenCalledWith("/dashboard/positions/pos-123");
  });

  it("passes the admin role of the session user to the actor", async () => {
    vi.mocked(requireUser).mockResolvedValueOnce({
      id: "admin-1",
      role: "admin",
    } as any);

    await createPositionAction(values);

    expect(createPosition).toHaveBeenCalledWith(
      { userId: "admin-1", role: "admin" },
      values,
    );
  });

  it("returns the service refusal and neither invalidates nor redirects", async () => {
    vi.mocked(createPosition).mockRejectedValueOnce(
      new UserError("Seleziona almeno una competenza."),
    );

    const result = await createPositionAction({ ...values, skills: [] });

    expect(result).toEqual({
      success: false,
      error: "Seleziona almeno una competenza.",
    });
    expect(invalidatePositionCache).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns the expired-session message for a disabled actor", async () => {
    vi.mocked(createPosition).mockRejectedValueOnce(
      new UserError("Sessione scaduta. Accedi di nuovo per continuare."),
    );

    const result = await createPositionAction(values);

    expect(result).toEqual({
      success: false,
      error: "Sessione scaduta. Accedi di nuovo per continuare.",
    });
  });

  it("returns the generic message when the write fails", async () => {
    vi.mocked(createPosition).mockRejectedValueOnce(new Error("db down"));

    const result = await createPositionAction(values);

    expect(result).toEqual({
      success: false,
      error: "Si è verificato un errore. Riprova.",
    });
    expect(invalidatePositionCache).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await createPositionAction(values);

    expect(result).toMatchObject({ success: false });
    expect(createPosition).not.toHaveBeenCalled();
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

  it("refuses to delete a position with applications", async () => {
    vi.mocked(prisma.application.count).mockResolvedValueOnce(3);

    const result = await deletePositionAction("pos-123");

    expect(result).toEqual({
      success: false,
      error: "Impossibile eliminare una posizione con candidature: chiudila",
    });
    expect(prisma.application.count).toHaveBeenCalledWith({
      where: { positionId: "pos-123" },
    });
    expect(prisma.position.delete).not.toHaveBeenCalled();
    expect(invalidatePositionCache).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("updatePositionStatusAction", () => {
  it("requires a signed-in user", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));

    const result = await updatePositionStatusAction({
      positionId: "pos-123",
      status: "open",
    });

    expect(result).toMatchObject({ success: false });
    expect(prisma.position.update).not.toHaveBeenCalled();
  });

  it("refuses an unknown status", async () => {
    const result = await updatePositionStatusAction({
      positionId: "pos-123",
      status: "archived" as any,
    });

    expect(result).toEqual({
      success: false,
      error: "Stato della posizione non valido",
    });
    expect(prisma.position.update).not.toHaveBeenCalled();
  });

  it("reports a missing position", async () => {
    vi.mocked(prisma.position.findUnique).mockResolvedValueOnce(null);

    const result = await updatePositionStatusAction({
      positionId: "nope",
      status: "open",
    });

    expect(result).toEqual({ success: false, error: "Posizione non trovata" });
    expect(prisma.position.update).not.toHaveBeenCalled();
  });

  it.each(["open", "closed", "draft"] as const)(
    "sets the status %s and refreshes the position",
    async (status) => {
      const result = await updatePositionStatusAction({
        positionId: "pos-123",
        status,
      });

      expect(result).toEqual({ success: true, status });
      expect(prisma.position.update).toHaveBeenCalledWith({
        where: { id: "pos-123" },
        data: { status },
      });
      expect(invalidatePositionCache).toHaveBeenCalledWith("pos-123");
      // Closing keeps everything: nothing is deleted
      expect(prisma.position.delete).not.toHaveBeenCalled();
    },
  );
});

describe("fetchPositionDataAction", () => {
  it("returns the position wrapped in the action result", async () => {
    const position = {
      id: "pos-123",
      title: "Senior Developer",
      status: "open",
    };
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

  it.each(["draft", "closed"])(
    "hides a %s position from the public form",
    async (status) => {
      vi.mocked(getPositionById).mockResolvedValueOnce({
        id: "pos-123",
        title: "Senior Developer",
        status,
      } as any);

      const result = await fetchPositionDataAction("pos-123");

      expect(result).toEqual({ success: true, position: null });
    },
  );

  it("is public: no signed-in user needed", async () => {
    vi.mocked(getPositionById).mockResolvedValueOnce(null);

    await fetchPositionDataAction("pos-123");

    expect(requireUser).not.toHaveBeenCalled();
  });
});
