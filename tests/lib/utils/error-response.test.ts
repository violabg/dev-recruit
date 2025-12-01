/**
 * Tests for Error Response Utilities
 */

import { describe, expect, it, vi } from "vitest";

// Mock the services before importing getErrorResponse
vi.mock("@/lib/services/ai-service", () => ({
  AIGenerationError: class AIGenerationError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = "AIGenerationError";
      this.code = code;
    }
  },
  AIErrorCode: {
    GENERATION_FAILED: "GENERATION_FAILED",
    TIMEOUT: "TIMEOUT",
  },
}));

vi.mock("@/lib/services/error-handler", () => ({
  QuizErrorCode: {
    INTERNAL_ERROR: "INTERNAL_ERROR",
    INVALID_INPUT: "INVALID_INPUT",
  },
  QuizSystemError: class QuizSystemError extends Error {
    code: string;
    context?: Record<string, unknown>;
    constructor(
      message: string,
      code: string,
      context?: Record<string, unknown>
    ) {
      super(message);
      this.name = "QuizSystemError";
      this.code = code;
      this.context = context;
    }
  },
  getUserFriendlyErrorMessage: (error: { code: string }) => {
    const messages: Record<string, string> = {
      INVALID_INPUT: "I dati inseriti non sono validi.",
      INTERNAL_ERROR: "Si è verificato un errore interno.",
    };
    return messages[error.code] || "Si è verificato un errore.";
  },
}));

import { AIErrorCode, AIGenerationError } from "@/lib/services/ai-service";
import { QuizErrorCode, QuizSystemError } from "@/lib/services/error-handler";
import { getErrorResponse } from "@/lib/utils/error-response";

describe("getErrorResponse", () => {
  describe("QuizSystemError handling", () => {
    it("should return user-friendly message for QuizSystemError", () => {
      const error = new QuizSystemError(
        "Technical error",
        QuizErrorCode.INVALID_INPUT
      );

      const response = getErrorResponse(error);

      expect(response.error).toBe("I dati inseriti non sono validi.");
      expect(response.code).toBe(QuizErrorCode.INVALID_INPUT);
    });

    it("should include error code in response", () => {
      const error = new QuizSystemError(
        "Internal error",
        QuizErrorCode.INTERNAL_ERROR
      );

      const response = getErrorResponse(error);

      expect(response.code).toBe(QuizErrorCode.INTERNAL_ERROR);
    });
  });

  describe("AIGenerationError handling", () => {
    it("should return generic AI error message", () => {
      const error = new AIGenerationError(
        "Model failed",
        AIErrorCode.GENERATION_FAILED
      );

      const response = getErrorResponse(error);

      expect(response.error).toBe("AI generation failed. Please try again.");
      expect(response.code).toBe("AI_ERROR");
    });
  });

  describe("generic error handling", () => {
    it("should return Italian default message for standard Error", () => {
      const error = new Error("Some error");

      const response = getErrorResponse(error);

      expect(response.error).toBe(
        "Si è verificato un errore interno. Riprova più tardi."
      );
      expect(response.code).toBe(QuizErrorCode.INTERNAL_ERROR);
    });

    it("should return Italian default message for string error", () => {
      const response = getErrorResponse("string error");

      expect(response.error).toBe(
        "Si è verificato un errore interno. Riprova più tardi."
      );
      expect(response.code).toBe(QuizErrorCode.INTERNAL_ERROR);
    });

    it("should return Italian default message for null", () => {
      const response = getErrorResponse(null);

      expect(response.error).toBe(
        "Si è verificato un errore interno. Riprova più tardi."
      );
      expect(response.code).toBe(QuizErrorCode.INTERNAL_ERROR);
    });

    it("should return Italian default message for undefined", () => {
      const response = getErrorResponse(undefined);

      expect(response.error).toBe(
        "Si è verificato un errore interno. Riprova più tardi."
      );
      expect(response.code).toBe(QuizErrorCode.INTERNAL_ERROR);
    });

    it("should return Italian default message for object", () => {
      const response = getErrorResponse({ message: "object error" });

      expect(response.error).toBe(
        "Si è verificato un errore interno. Riprova più tardi."
      );
    });
  });

  describe("response structure", () => {
    it("should always return object with error and optional code", () => {
      const response = getErrorResponse(new Error("test"));

      expect(response).toHaveProperty("error");
      expect(typeof response.error).toBe("string");
    });

    it("should have consistent response shape", () => {
      const responses = [
        getErrorResponse(new Error("test")),
        getErrorResponse(
          new QuizSystemError("test", QuizErrorCode.INVALID_INPUT)
        ),
        getErrorResponse(new AIGenerationError("test", AIErrorCode.TIMEOUT)),
        getErrorResponse("string"),
      ];

      responses.forEach((response) => {
        expect(response).toHaveProperty("error");
        expect(typeof response.error).toBe("string");
        expect(response.error.length).toBeGreaterThan(0);
      });
    });
  });
});
