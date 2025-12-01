/**
 * Tests for AI Service Streaming
 */

import { describe, expect, it, vi } from "vitest";

// Mock the groq SDK
vi.mock("@ai-sdk/groq", () => ({
  groq: vi.fn().mockReturnValue("mock-model"),
}));

// Create a mock result object for streamText
const mockStreamResult = {
  textStream: (async function* () {
    yield "Generated ";
    yield "description ";
    yield "text";
  })(),
  text: Promise.resolve("Generated description text"),
};

// Mock the ai SDK streamText
vi.mock("ai", () => ({
  streamText: vi.fn(() => mockStreamResult),
}));

// Mock utils for getOptimalModel
vi.mock("@/lib/utils", () => ({
  getOptimalModel: vi.fn().mockReturnValue("llama3-8b-8192"),
  cn: vi.fn(),
}));

// Mock prompts
vi.mock("@/lib/services/ai/prompts", () => ({
  buildPositionDescriptionPrompt: vi.fn().mockReturnValue("mock prompt"),
}));

// Mock types
vi.mock("@/lib/services/ai/types", () => ({
  AIErrorCode: {
    GENERATION_FAILED: "GENERATION_FAILED",
  },
  AIGenerationError: class AIGenerationError extends Error {
    code: string;
    details?: Record<string, unknown>;
    constructor(
      message: string,
      code: string,
      details?: Record<string, unknown>
    ) {
      super(message);
      this.name = "AIGenerationError";
      this.code = code;
      this.details = details;
    }
  },
}));

import { buildPositionDescriptionPrompt } from "@/lib/services/ai/prompts";
import { streamPositionDescription } from "@/lib/services/ai/streaming";
import { AIGenerationError } from "@/lib/services/ai/types";
import { getOptimalModel } from "@/lib/utils";
import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";

describe("streamPositionDescription", () => {
  it("should call streamText with correct parameters", async () => {
    const params = {
      title: "Frontend Developer",
      experienceLevel: "senior" as const,
      skills: ["React", "TypeScript"],
    };

    await streamPositionDescription(params);

    expect(getOptimalModel).toHaveBeenCalledWith("simple_task", undefined);
    expect(groq).toHaveBeenCalled();
    expect(buildPositionDescriptionPrompt).toHaveBeenCalledWith(params);
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.anything(),
        prompt: "mock prompt",
        temperature: 0.7,
      })
    );
  });

  it("should use specific model when provided", async () => {
    const params = {
      title: "Backend Developer",
      experienceLevel: "mid" as const,
      skills: ["Node.js"],
      specificModel: "custom-model",
    };

    await streamPositionDescription(params);

    expect(getOptimalModel).toHaveBeenCalledWith("simple_task", "custom-model");
  });

  it("should return stream result", async () => {
    const params = {
      title: "Developer",
      experienceLevel: "junior" as const,
      skills: ["JavaScript"],
    };

    const result = await streamPositionDescription(params);

    expect(result).toBeDefined();
    expect(result.textStream).toBeDefined();
  });

  it("should throw AIGenerationError on failure", async () => {
    // Reset mock to throw error
    vi.mocked(streamText).mockImplementationOnce(() => {
      throw new Error("Stream error");
    });

    const params = {
      title: "Developer",
      experienceLevel: "mid" as const,
      skills: ["Python"],
    };

    await expect(streamPositionDescription(params)).rejects.toThrow(
      AIGenerationError
    );
  });

  it("should include original error in AIGenerationError details", async () => {
    const originalError = new Error("Network failure");
    vi.mocked(streamText).mockImplementationOnce(() => {
      throw originalError;
    });

    const params = {
      title: "Developer",
      experienceLevel: "mid" as const,
      skills: ["Java"],
    };

    try {
      await streamPositionDescription(params);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AIGenerationError);
      expect((error as AIGenerationError).code).toBe("GENERATION_FAILED");
      expect((error as AIGenerationError).details?.originalError).toBe(
        "Network failure"
      );
    }
  });

  it("should handle non-Error thrown values", async () => {
    vi.mocked(streamText).mockImplementationOnce(() => {
      throw "string error";
    });

    const params = {
      title: "Developer",
      experienceLevel: "mid" as const,
      skills: ["Go"],
    };

    try {
      await streamPositionDescription(params);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AIGenerationError);
      expect((error as AIGenerationError).details?.originalError).toBe(
        "string error"
      );
    }
  });
});
