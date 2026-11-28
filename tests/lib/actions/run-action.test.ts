import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/lib/services/logger", () => ({
  logger: { error: vi.fn() },
  aiLogger: { warn: vi.fn(), error: vi.fn() },
}));

import { runAction, UserError } from "@/lib/actions/run-action";
import { AIErrorCode, AIGenerationError } from "@/lib/services/ai/types";
import {
  QuizErrorCode,
  QuizSystemError,
} from "@/lib/services/error-handler";
import { logger } from "@/lib/services/logger";
import { errorMessage, GENERIC_ERROR, unwrap } from "@/lib/utils/action-result";

describe("runAction", () => {
  it("merges what the body returns into a success result", async () => {
    await expect(runAction("op", async () => ({ id: "1" }))).resolves.toEqual({
      success: true,
      id: "1",
    });
  });

  it("returns a bare success when the body returns nothing", async () => {
    await expect(runAction("op", async () => {})).resolves.toEqual({
      success: true,
    });
  });

  it("shows the message of a UserError", async () => {
    const result = await runAction("op", async () => {
      throw new UserError("Posizione non trovata");
    });

    expect(result).toEqual({ success: false, error: "Posizione non trovata" });
  });

  it("shows the first validation message", async () => {
    const schema = z.object({ title: z.string().min(2, "Titolo troppo corto") });

    const result = await runAction("op", async () => {
      schema.parse({ title: "" });
    });

    expect(result).toEqual({ success: false, error: "Titolo troppo corto" });
  });

  it("translates quiz and AI errors", async () => {
    const quiz = await runAction("op", async () => {
      throw new QuizSystemError("internal", QuizErrorCode.QUIZ_NOT_FOUND);
    });
    const ai = await runAction("op", async () => {
      throw new AIGenerationError("internal", AIErrorCode.TIMEOUT);
    });

    expect(quiz).toEqual({
      success: false,
      error: "Test non trovato o accesso negato.",
    });
    expect(ai).toMatchObject({
      success: false,
      error: expect.stringContaining("non ha risposto in tempo"),
    });
  });

  it("reports an expired session", async () => {
    const result = await runAction("op", async () => {
      throw new Error("UNAUTHENTICATED");
    });

    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining("Sessione scaduta"),
    });
  });

  it("hides and logs unexpected errors", async () => {
    const result = await runAction("saveThing", async () => {
      throw new Error("connection refused at 10.0.0.1");
    });

    expect(result).toEqual({ success: false, error: GENERIC_ERROR });
    expect(logger.error).toHaveBeenCalledWith(
      "saveThing failed",
      expect.anything(),
    );
  });

  it("lets redirects through", async () => {
    const { redirect } = await vi.importActual<
      typeof import("next/navigation")
    >("next/navigation");

    await expect(
      runAction("op", async () => {
        redirect("/dashboard");
      }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });
});

describe("unwrap", () => {
  it("returns a successful result", () => {
    expect(unwrap({ success: true as const, id: "1" })).toEqual({
      success: true,
      id: "1",
    });
  });

  it("throws the action's message on failure", () => {
    expect(() =>
      unwrap({ success: false as const, error: "Test non trovato" }),
    ).toThrow("Test non trovato");
  });

  it("throws a generic message when there is no result", () => {
    expect(() => unwrap(undefined)).toThrow(GENERIC_ERROR);
  });
});

describe("errorMessage", () => {
  it("uses the error's message, or the fallback", () => {
    expect(errorMessage(new Error("Dettaglio"))).toBe("Dettaglio");
    expect(errorMessage("boom", "Riprova")).toBe("Riprova");
    expect(errorMessage(null)).toBe(GENERIC_ERROR);
  });
});
