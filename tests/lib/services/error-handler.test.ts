/**
 * Tests for Error Handler Service
 */
import {
  createQuizError,
  ErrorHandler,
  getErrorMessage,
  getUserFriendlyErrorMessage,
  isQuizSystemError,
  QuizErrorCode,
  QuizSystemError,
} from "@/lib/services/error-handler";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the logger
vi.mock("@/lib/services/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

// Mock AIErrorCode from ai-service
vi.mock("@/lib/services/ai-service", () => ({
  AIErrorCode: {
    GENERATION_FAILED: "GENERATION_FAILED",
    MODEL_UNAVAILABLE: "MODEL_UNAVAILABLE",
    TIMEOUT: "TIMEOUT",
    RATE_LIMITED: "RATE_LIMITED",
    QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
    INVALID_RESPONSE: "INVALID_RESPONSE",
    CONTENT_FILTERED: "CONTENT_FILTERED",
  },
}));

describe("QuizSystemError", () => {
  it("should create error with message and code", () => {
    const error = new QuizSystemError(
      "Test error",
      QuizErrorCode.INVALID_INPUT
    );

    expect(error.message).toBe("Test error");
    expect(error.code).toBe(QuizErrorCode.INVALID_INPUT);
    expect(error.name).toBe("QuizSystemError");
    expect(error.context).toBeUndefined();
  });

  it("should create error with context", () => {
    const context = { userId: "123", quizId: "456" };
    const error = new QuizSystemError(
      "Test error",
      QuizErrorCode.QUIZ_NOT_FOUND,
      context
    );

    expect(error.context).toEqual(context);
  });

  it("should be instanceof Error", () => {
    const error = new QuizSystemError("Test", QuizErrorCode.INTERNAL_ERROR);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(QuizSystemError);
  });
});

describe("QuizErrorCode", () => {
  it("should have all expected error codes", () => {
    expect(QuizErrorCode.INVALID_INPUT).toBe("INVALID_INPUT");
    expect(QuizErrorCode.INVALID_QUIZ_PARAMS).toBe("INVALID_QUIZ_PARAMS");
    expect(QuizErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
    expect(QuizErrorCode.POSITION_NOT_FOUND).toBe("POSITION_NOT_FOUND");
    expect(QuizErrorCode.QUIZ_NOT_FOUND).toBe("QUIZ_NOT_FOUND");
    expect(QuizErrorCode.AI_GENERATION_FAILED).toBe("AI_GENERATION_FAILED");
    expect(QuizErrorCode.AI_MODEL_UNAVAILABLE).toBe("AI_MODEL_UNAVAILABLE");
    expect(QuizErrorCode.DATABASE_ERROR).toBe("DATABASE_ERROR");
    expect(QuizErrorCode.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
    expect(QuizErrorCode.SERVICE_UNAVAILABLE).toBe("SERVICE_UNAVAILABLE");
    expect(QuizErrorCode.TIMEOUT).toBe("TIMEOUT");
    expect(QuizErrorCode.RATE_LIMITED).toBe("RATE_LIMITED");
  });
});

describe("getUserFriendlyErrorMessage", () => {
  it("should return Italian message for INVALID_INPUT", () => {
    const error = new QuizSystemError("Error", QuizErrorCode.INVALID_INPUT);
    expect(getUserFriendlyErrorMessage(error)).toBe(
      "I dati inseriti non sono validi. Controlla e riprova."
    );
  });

  it("should return Italian message for UNAUTHORIZED", () => {
    const error = new QuizSystemError("Error", QuizErrorCode.UNAUTHORIZED);
    expect(getUserFriendlyErrorMessage(error)).toBe(
      "Non hai i permessi per eseguire questa operazione."
    );
  });

  it("should return Italian message for AI_GENERATION_FAILED", () => {
    const error = new QuizSystemError(
      "Error",
      QuizErrorCode.AI_GENERATION_FAILED
    );
    expect(getUserFriendlyErrorMessage(error)).toBe(
      "Generazione AI fallita. Riprova tra qualche minuto."
    );
  });

  it("should return Italian message for TIMEOUT", () => {
    const error = new QuizSystemError("Error", QuizErrorCode.TIMEOUT);
    expect(getUserFriendlyErrorMessage(error)).toBe(
      "L'operazione ha richiesto troppo tempo. Riprova con parametri più semplici."
    );
  });

  it("should return Italian message for RATE_LIMITED", () => {
    const error = new QuizSystemError("Error", QuizErrorCode.RATE_LIMITED);
    expect(getUserFriendlyErrorMessage(error)).toBe(
      "Troppe richieste. Attendi un minuto prima di riprovare."
    );
  });

  it("should return default message for unknown error code", () => {
    const error = new QuizSystemError("Error", "UNKNOWN_CODE" as QuizErrorCode);
    expect(getUserFriendlyErrorMessage(error)).toBe(
      "Si è verificato un errore imprevisto."
    );
  });
});

describe("ErrorHandler", () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    vi.clearAllMocks();
  });

  describe("handleError", () => {
    it("should handle QuizSystemError", async () => {
      const error = new QuizSystemError(
        "Test error",
        QuizErrorCode.INVALID_INPUT,
        { field: "title" }
      );

      await errorHandler.handleError(error, { operation: "createQuiz" });

      // Should have called logger.error
      const { logger } = await import("@/lib/services/logger");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle standard Error", async () => {
      const error = new Error("Standard error");

      await errorHandler.handleError(error);

      const { logger } = await import("@/lib/services/logger");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should handle non-Error values", async () => {
      await errorHandler.handleError("String error");

      const { logger } = await import("@/lib/services/logger");
      expect(logger.error).toHaveBeenCalled();
    });

    it("should include context in log", async () => {
      const error = new Error("Test");
      const context = { userId: "123", operation: "test" };

      await errorHandler.handleError(error, context);

      const { logger } = await import("@/lib/services/logger");
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context,
        })
      );
    });
  });

  describe("mapAIError", () => {
    it("should map GENERATION_FAILED to AI_GENERATION_FAILED", () => {
      const aiError = {
        code: "GENERATION_FAILED",
        message: "Generation failed",
      };
      const result = errorHandler.mapAIError(aiError);

      expect(result).toBeInstanceOf(QuizSystemError);
      expect(result.code).toBe(QuizErrorCode.AI_GENERATION_FAILED);
    });

    it("should map MODEL_UNAVAILABLE to AI_MODEL_UNAVAILABLE", () => {
      const aiError = { code: "MODEL_UNAVAILABLE", message: "Model down" };
      const result = errorHandler.mapAIError(aiError);

      expect(result.code).toBe(QuizErrorCode.AI_MODEL_UNAVAILABLE);
    });

    it("should map TIMEOUT to TIMEOUT", () => {
      const aiError = { code: "TIMEOUT", message: "Timed out" };
      const result = errorHandler.mapAIError(aiError);

      expect(result.code).toBe(QuizErrorCode.TIMEOUT);
    });

    it("should map RATE_LIMITED to RATE_LIMITED", () => {
      const aiError = { code: "RATE_LIMITED", message: "Too many requests" };
      const result = errorHandler.mapAIError(aiError);

      expect(result.code).toBe(QuizErrorCode.RATE_LIMITED);
    });

    it("should map QUOTA_EXCEEDED to SERVICE_UNAVAILABLE", () => {
      const aiError = { code: "QUOTA_EXCEEDED", message: "Quota exceeded" };
      const result = errorHandler.mapAIError(aiError);

      expect(result.code).toBe(QuizErrorCode.SERVICE_UNAVAILABLE);
    });

    it("should map unknown AI errors to AI_GENERATION_FAILED", () => {
      const aiError = { code: "UNKNOWN", message: "Unknown error" };
      const result = errorHandler.mapAIError(aiError);

      expect(result.code).toBe(QuizErrorCode.AI_GENERATION_FAILED);
    });

    it("should handle non-object AI errors", () => {
      const result = errorHandler.mapAIError("String error");

      expect(result).toBeInstanceOf(QuizSystemError);
      expect(result.code).toBe(QuizErrorCode.AI_GENERATION_FAILED);
    });
  });
});

describe("createQuizError", () => {
  it("should create QuizSystemError with all params", () => {
    const context = { quizId: "123" };
    const error = createQuizError(
      "Custom error",
      QuizErrorCode.QUIZ_NOT_FOUND,
      context
    );

    expect(error).toBeInstanceOf(QuizSystemError);
    expect(error.message).toBe("Custom error");
    expect(error.code).toBe(QuizErrorCode.QUIZ_NOT_FOUND);
    expect(error.context).toEqual(context);
  });

  it("should create QuizSystemError without context", () => {
    const error = createQuizError("Error", QuizErrorCode.INTERNAL_ERROR);

    expect(error).toBeInstanceOf(QuizSystemError);
    expect(error.context).toBeUndefined();
  });
});

describe("isQuizSystemError", () => {
  it("should return true for QuizSystemError", () => {
    const error = new QuizSystemError("Test", QuizErrorCode.INTERNAL_ERROR);
    expect(isQuizSystemError(error)).toBe(true);
  });

  it("should return false for standard Error", () => {
    const error = new Error("Test");
    expect(isQuizSystemError(error)).toBe(false);
  });

  it("should return false for non-Error values", () => {
    expect(isQuizSystemError(null)).toBe(false);
    expect(isQuizSystemError(undefined)).toBe(false);
    expect(isQuizSystemError("string")).toBe(false);
    expect(isQuizSystemError({})).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("should return user-friendly message for QuizSystemError", () => {
    const error = new QuizSystemError("Error", QuizErrorCode.UNAUTHORIZED);
    expect(getErrorMessage(error)).toBe(
      "Non hai i permessi per eseguire questa operazione."
    );
  });

  it("should return error message for standard Error", () => {
    const error = new Error("Standard error message");
    expect(getErrorMessage(error)).toBe("Standard error message");
  });

  it("should return default message for non-Error values", () => {
    expect(getErrorMessage(null)).toBe("Si è verificato un errore imprevisto.");
    expect(getErrorMessage(undefined)).toBe(
      "Si è verificato un errore imprevisto."
    );
    expect(getErrorMessage("string")).toBe(
      "Si è verificato un errore imprevisto."
    );
  });
});
