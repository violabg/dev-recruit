/**
 * Tests for Logger Service
 *
 * Note: Logger suppresses output during tests (NODE_ENV=test),
 * so we test the public API structure and scoped logger creation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Import logger after setting up environment
describe("logger module", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("logger API", () => {
    it("should export logger with all log methods", async () => {
      const { logger } = await import("@/lib/services/logger");

      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.log).toBe("function");
    });

    it("should call methods without throwing (test mode suppresses output)", async () => {
      const { logger } = await import("@/lib/services/logger");

      // These should not throw even if suppressed in test mode
      expect(() => logger.debug("Debug message")).not.toThrow();
      expect(() => logger.info("Info message")).not.toThrow();
      expect(() => logger.warn("Warn message")).not.toThrow();
      expect(() => logger.error("Error message")).not.toThrow();
      expect(() => logger.log("info", "Log message")).not.toThrow();
    });

    it("should accept context object", async () => {
      const { logger } = await import("@/lib/services/logger");

      expect(() =>
        logger.info("Message with context", { userId: "123", action: "test" })
      ).not.toThrow();
    });

    it("should handle error objects in context", async () => {
      const { logger } = await import("@/lib/services/logger");
      const error = new Error("Test error");

      expect(() =>
        logger.error("Error occurred", { error, operation: "test" })
      ).not.toThrow();
    });
  });

  describe("createScopedLogger", () => {
    it("should create scoped logger with all methods", async () => {
      const { createScopedLogger } = await import("@/lib/services/logger");
      const scopedLogger = createScopedLogger("TestScope");

      expect(typeof scopedLogger.debug).toBe("function");
      expect(typeof scopedLogger.info).toBe("function");
      expect(typeof scopedLogger.warn).toBe("function");
      expect(typeof scopedLogger.error).toBe("function");
    });

    it("should accept custom scope names", async () => {
      const { createScopedLogger } = await import("@/lib/services/logger");

      expect(() => createScopedLogger("CustomScope")).not.toThrow();
      expect(() => createScopedLogger("Another-Scope")).not.toThrow();
      expect(() => createScopedLogger("123")).not.toThrow();
    });

    it("scoped logger should work without throwing", async () => {
      const { createScopedLogger } = await import("@/lib/services/logger");
      const scopedLogger = createScopedLogger("Test");

      expect(() => scopedLogger.debug("Debug")).not.toThrow();
      expect(() => scopedLogger.info("Info", { data: "value" })).not.toThrow();
      expect(() => scopedLogger.warn("Warn")).not.toThrow();
      expect(() => scopedLogger.error("Error")).not.toThrow();
    });
  });

  describe("pre-configured scoped loggers", () => {
    it("should export aiLogger", async () => {
      const { aiLogger } = await import("@/lib/services/logger");

      expect(typeof aiLogger.debug).toBe("function");
      expect(typeof aiLogger.info).toBe("function");
      expect(typeof aiLogger.warn).toBe("function");
      expect(typeof aiLogger.error).toBe("function");
    });

    it("should export dbLogger", async () => {
      const { dbLogger } = await import("@/lib/services/logger");

      expect(typeof dbLogger.debug).toBe("function");
      expect(typeof dbLogger.info).toBe("function");
      expect(typeof dbLogger.warn).toBe("function");
      expect(typeof dbLogger.error).toBe("function");
    });

    it("should export authLogger", async () => {
      const { authLogger } = await import("@/lib/services/logger");

      expect(typeof authLogger.debug).toBe("function");
      expect(typeof authLogger.info).toBe("function");
      expect(typeof authLogger.warn).toBe("function");
      expect(typeof authLogger.error).toBe("function");
    });

    it("should export storageLogger", async () => {
      const { storageLogger } = await import("@/lib/services/logger");

      expect(typeof storageLogger.debug).toBe("function");
      expect(typeof storageLogger.info).toBe("function");
      expect(typeof storageLogger.warn).toBe("function");
      expect(typeof storageLogger.error).toBe("function");
    });
  });

  describe("default export", () => {
    it("should have default export equal to named logger export", async () => {
      const loggerModule = await import("@/lib/services/logger");

      expect(loggerModule.default).toBe(loggerModule.logger);
    });
  });
});
