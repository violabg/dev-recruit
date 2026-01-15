/**
 * Tests for Validation Middleware
 */

import {
  createApiError,
  createApiHandler,
  createApiResponse,
  validateJson,
  validateJsonWithErrors,
  withValidation,
} from "@/lib/middleware/validation";
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// Helper to create mock NextRequest
function createMockRequest(
  options: {
    method?: string;
    url?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const url = options.url || "http://localhost:3000/api/test";
  const headers = new Headers(options.headers || {});

  // If forwarded IP is set, add it to headers
  if (!headers.has("x-forwarded-for")) {
    headers.set("x-forwarded-for", "127.0.0.1");
  }

  const request = new NextRequest(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return request;
}

describe("withValidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("body validation", () => {
    const bodySchema = z.object({
      name: z.string().min(1),
      email: z.email(),
    });

    it("should pass valid body to handler", async () => {
      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true, data: "ok" }));
      const wrapped = withValidation({ body: bodySchema }, {}, handler);

      const req = createMockRequest({
        method: "POST",
        body: { name: "Test", email: "test@example.com" },
      });

      await wrapped(req);

      expect(handler).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          body: { name: "Test", email: "test@example.com" },
        }),
        undefined
      );
    });

    it("should return 400 for invalid body", async () => {
      const handler = vi.fn();
      const wrapped = withValidation({ body: bodySchema }, {}, handler);

      const req = createMockRequest({
        method: "POST",
        body: { name: "", email: "invalid" },
      });

      const response = await wrapped(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(handler).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid JSON", async () => {
      const handler = vi.fn();
      const wrapped = withValidation({ body: bodySchema }, {}, handler);

      // Create request with invalid JSON body
      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        body: "invalid json{",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.1",
        },
      });

      const response = await wrapped(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_JSON");
    });
  });

  describe("query validation", () => {
    const querySchema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    });

    it("should parse and validate query parameters", async () => {
      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true, data: "ok" }));
      const wrapped = withValidation({ query: querySchema }, {}, handler);

      const req = createMockRequest({
        url: "http://localhost:3000/api/test?page=1&limit=10",
      });

      await wrapped(req);

      expect(handler).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          query: { page: "1", limit: "10" },
        }),
        undefined
      );
    });
  });

  describe("params validation", () => {
    const paramsSchema = z.object({
      id: z.string().min(1),
    });

    it("should validate path parameters", async () => {
      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true, data: "ok" }));
      const wrapped = withValidation({ params: paramsSchema }, {}, handler);

      const req = createMockRequest();
      const context = { params: { id: "123" } };

      await wrapped(req, context);

      expect(handler).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          params: { id: "123" },
        }),
        context
      );
    });

    it("should return 400 for invalid params", async () => {
      const handler = vi.fn();
      const wrapped = withValidation({ params: paramsSchema }, {}, handler);

      const req = createMockRequest();
      const context = { params: { id: "" } };

      const response = await wrapped(req, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toBe("Invalid path parameters");
    });
  });

  describe("rate limiting", () => {
    it("should allow requests within limit", async () => {
      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true, data: "ok" }));
      const wrapped = withValidation(
        {},
        { rateLimit: { requests: 10, window: 60000 } },
        handler
      );

      const req = createMockRequest({
        headers: { "x-forwarded-for": "unique-ip-1" },
      });

      const response = await wrapped(req);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it("should block requests exceeding limit", async () => {
      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true, data: "ok" }));
      const wrapped = withValidation(
        {},
        { rateLimit: { requests: 2, window: 60000 } },
        handler
      );

      const ip = `rate-limit-test-${Date.now()}`;
      const req = createMockRequest({
        headers: { "x-forwarded-for": ip },
      });

      // First two requests should succeed
      await wrapped(req);
      await wrapped(req);

      // Third should be rate limited
      const response = await wrapped(req);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("authentication", () => {
    it("should allow requests with valid auth header", async () => {
      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true, data: "ok" }));
      const wrapped = withValidation({}, { auth: { required: true } }, handler);

      const req = createMockRequest({
        headers: {
          authorization: "Bearer valid-token",
          "x-forwarded-for": "127.0.0.1",
        },
      });

      const response = await wrapped(req);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it("should reject requests without auth header", async () => {
      const handler = vi.fn();
      const wrapped = withValidation({}, { auth: { required: true } }, handler);

      const req = createMockRequest();

      const response = await wrapped(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should catch and format handler errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Handler error"));
      const wrapped = withValidation({}, {}, handler);

      const req = createMockRequest();

      const response = await wrapped(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});

describe("createApiHandler", () => {
  it("should be alias for withValidation", () => {
    expect(createApiHandler).toBe(withValidation);
  });
});

describe("createApiResponse", () => {
  it("should create success response", () => {
    const response = createApiResponse({ id: "123", name: "Test" });

    expect(response.success).toBe(true);
    if (response.success) {
      expect(response.data).toEqual({ id: "123", name: "Test" });
    }
    expect(response.meta?.timestamp).toBeDefined();
  });

  it("should include optional metadata", () => {
    const response = createApiResponse(
      { result: "ok" },
      { requestId: "req-123", performance: { duration: 100 } }
    );

    expect(response.meta?.requestId).toBe("req-123");
    expect(response.meta?.performance?.duration).toBe(100);
  });
});

describe("createApiError", () => {
  it("should create error response", () => {
    const response = createApiError("Something went wrong", "ERROR_CODE");

    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error.message).toBe("Something went wrong");
      expect(response.error.code).toBe("ERROR_CODE");
    }
  });

  it("should include details if provided", () => {
    const response = createApiError("Validation failed", "VALIDATION", {
      field: "email",
    });

    if (!response.success) {
      expect(response.error.details).toEqual({ field: "email" });
    }
  });

  it("should include request ID in meta", () => {
    const response = createApiError("Error", "CODE", undefined, {
      requestId: "req-456",
    });

    expect(response.meta?.requestId).toBe("req-456");
  });
});

describe("validateJson", () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it("should return success for valid data", () => {
    const result = validateJson(schema, { name: "Test", age: 25 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Test", age: 25 });
    }
  });

  it("should return error for invalid data", () => {
    const result = validateJson(schema, { name: "Test", age: "not-a-number" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("should return error for missing fields", () => {
    const result = validateJson(schema, { name: "Test" });

    expect(result.success).toBe(false);
  });
});

describe("validateJsonWithErrors", () => {
  const schema = z.object({
    email: z.email({ message: "Invalid email format" }),
  });

  it("should return success for valid data", () => {
    const result = validateJsonWithErrors(schema, {
      email: "test@example.com",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });

  it("should return string error message for invalid data", () => {
    const result = validateJsonWithErrors(schema, { email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.error).toBe("string");
    }
  });

  it("should concatenate multiple error messages", () => {
    const multiFieldSchema = z.object({
      email: z.email({ message: "Invalid email" }),
      age: z.number({ message: "Age must be a number" }),
    });

    const result = validateJsonWithErrors(multiFieldSchema, {
      email: "bad",
      age: "not-number",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain(",");
    }
  });
});
