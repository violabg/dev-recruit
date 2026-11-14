import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("ai", () => ({
  generateText: vi.fn(),
  NoObjectGeneratedError: class NoObjectGeneratedError extends Error {},
  Output: { object: vi.fn((config) => config) },
  wrapLanguageModel: vi.fn((config) => config.model),
}));

vi.mock("@ai-sdk/groq", () => ({ groq: vi.fn((modelId: string) => modelId) }));

vi.mock("@/lib/services/logger", () => ({
  aiLogger: { warn: vi.fn(), error: vi.fn() },
}));

import {
  describeAIError,
  generateStructured,
} from "@/lib/services/ai/generate";
import { FALLBACK_MODELS, LLM_MODELS } from "@/lib/services/ai/models";
import { AIErrorCode, AIGenerationError } from "@/lib/services/ai/types";
import { generateText } from "ai";

const schema = z.object({ value: z.string() });
const base = {
  task: "evaluation" as const,
  schema,
  system: "system",
  prompt: "prompt",
  // No backoff waits in tests
  config: { retryDelay: 0 },
};

describe("generateStructured", () => {
  beforeEach(() => {
    vi.mocked(generateText).mockReset();
  });

  it("returns the model output", async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: { value: "ok" },
    } as any);

    await expect(generateStructured(base)).resolves.toEqual({ value: "ok" });
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(vi.mocked(generateText).mock.calls[0][0].model).toBe(
      LLM_MODELS.GPT_OSS_120B,
    );
  });

  it("retries the primary model before succeeding", async () => {
    vi.mocked(generateText)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue({ output: { value: "ok" } } as any);

    await expect(generateStructured(base)).resolves.toEqual({ value: "ok" });

    const models = vi.mocked(generateText).mock.calls.map((c) => c[0].model);
    expect(models).toEqual([LLM_MODELS.GPT_OSS_120B, LLM_MODELS.GPT_OSS_120B]);
  });

  it("falls back to the next model when the primary keeps failing", async () => {
    vi.mocked(generateText).mockImplementation(async ({ model }: any) => {
      if (model === LLM_MODELS.GPT_OSS_120B) throw new Error("down");
      return { output: { value: "fallback" } } as any;
    });

    await expect(
      generateStructured({ ...base, config: { retryDelay: 0, maxRetries: 1 } }),
    ).resolves.toEqual({ value: "fallback" });

    const models = vi.mocked(generateText).mock.calls.map((c) => c[0].model);
    expect(models).toEqual([
      LLM_MODELS.GPT_OSS_120B,
      LLM_MODELS.GPT_OSS_120B,
      FALLBACK_MODELS[0],
    ]);
  });

  it("falls back even when a specific model was requested", async () => {
    vi.mocked(generateText).mockImplementation(async ({ model }: any) => {
      if (model === "custom-model") throw new Error("down");
      return { output: { value: "fallback" } } as any;
    });

    await expect(
      generateStructured({
        ...base,
        specificModel: "custom-model",
        config: { retryDelay: 0, maxRetries: 0 },
      }),
    ).resolves.toEqual({ value: "fallback" });
  });

  it("throws AIGenerationError when every model fails", async () => {
    vi.mocked(generateText).mockRejectedValue(new Error("down"));

    await expect(
      generateStructured({ ...base, config: { retryDelay: 0, maxRetries: 0 } }),
    ).rejects.toBeInstanceOf(AIGenerationError);
    expect(generateText).toHaveBeenCalledTimes(1 + FALLBACK_MODELS.length);
  });

  it("does not fall back on filtered content", async () => {
    vi.mocked(generateText).mockRejectedValue(
      new AIGenerationError("blocked", AIErrorCode.CONTENT_FILTERED),
    );

    await expect(generateStructured(base)).rejects.toMatchObject({
      code: AIErrorCode.CONTENT_FILTERED,
    });
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("treats an empty output as a failure", async () => {
    vi.mocked(generateText).mockResolvedValue({ output: undefined } as any);

    await expect(
      generateStructured({ ...base, config: { retryDelay: 0, maxRetries: 0 } }),
    ).rejects.toMatchObject({ code: AIErrorCode.INVALID_RESPONSE });
  });

  it("passes temperature and seed through", async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: { value: "ok" },
    } as any);

    await generateStructured({ ...base, temperature: 0, seed: 42 });

    expect(vi.mocked(generateText).mock.calls[0][0]).toMatchObject({
      temperature: 0,
      seed: 42,
    });
  });
});

describe("describeAIError", () => {
  it("explains rate limits", () => {
    expect(describeAIError(new Error("Rate limit exceeded"))).toContain(
      "Limite di richieste",
    );
  });

  it("explains timeouts", () => {
    expect(
      describeAIError(new AIGenerationError("t", AIErrorCode.TIMEOUT)),
    ).toContain("non ha risposto in tempo");
  });

  it("falls back to a generic message", () => {
    expect(describeAIError(new Error("x"))).toContain("non disponibile");
  });
});
