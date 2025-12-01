/**
 * Tests for Utility Types
 *
 * These are type-level tests that verify the TypeScript types compile correctly.
 */

import type {
  ApiResponse,
  ValidatedRequestData,
  ValidationConfig,
} from "@/lib/types/utilities";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

describe("ApiResponse type", () => {
  it("should accept success response with data", () => {
    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: "123" },
    };

    expect(response.success).toBe(true);
    if (response.success) {
      expect(response.data.id).toBe("123");
    }
  });

  it("should accept success response with meta", () => {
    const response: ApiResponse<{ name: string }> = {
      success: true,
      data: { name: "Test" },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: "req-123",
        performance: {
          duration: 100,
          model: "gpt-4",
        },
      },
    };

    expect(response.success).toBe(true);
    if (response.success) {
      expect(response.meta?.requestId).toBe("req-123");
    }
  });

  it("should accept error response", () => {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        message: "Something went wrong",
        code: "ERROR_CODE",
        details: { field: "email" },
      },
    };

    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error.message).toBe("Something went wrong");
      expect(response.error.code).toBe("ERROR_CODE");
    }
  });

  it("should accept error response with meta", () => {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        message: "Error",
      },
      meta: {
        timestamp: new Date().toISOString(),
        performance: {
          duration: 50,
        },
      },
    };

    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.meta?.performance?.duration).toBe(50);
    }
  });
});

describe("ValidationConfig type", () => {
  it("should accept body schema", () => {
    const config: ValidationConfig = {
      body: z.object({
        name: z.string(),
      }),
    };

    expect(config.body).toBeDefined();
  });

  it("should accept query schema", () => {
    const config: ValidationConfig = {
      query: z.object({
        page: z.string().optional(),
      }),
    };

    expect(config.query).toBeDefined();
  });

  it("should accept params schema", () => {
    const config: ValidationConfig = {
      params: z.object({
        id: z.string(),
      }),
    };

    expect(config.params).toBeDefined();
  });

  it("should accept headers schema", () => {
    const config: ValidationConfig = {
      headers: z.object({
        authorization: z.string(),
      }),
    };

    expect(config.headers).toBeDefined();
  });

  it("should accept multiple schemas", () => {
    const config: ValidationConfig = {
      body: z.object({ data: z.string() }),
      query: z.object({ filter: z.string().optional() }),
      params: z.object({ id: z.string() }),
    };

    expect(config.body).toBeDefined();
    expect(config.query).toBeDefined();
    expect(config.params).toBeDefined();
  });

  it("should accept empty config", () => {
    const config: ValidationConfig = {};

    expect(config.body).toBeUndefined();
    expect(config.query).toBeUndefined();
  });
});

describe("ValidatedRequestData type", () => {
  it("should infer body type from config", () => {
    const bodySchema = z.object({
      email: z.string(),
      password: z.string(),
    });

    type Config = { body: typeof bodySchema };
    type Data = ValidatedRequestData<Config>;

    // Type assertion - this would fail at compile time if types are wrong
    const data: Data["body"] = {
      email: "test@example.com",
      password: "secret",
    };

    expect(data.email).toBe("test@example.com");
    expect(data.password).toBe("secret");
  });

  it("should infer query type from config", () => {
    const querySchema = z.object({
      page: z.string(),
      limit: z.string(),
    });

    type Config = { query: typeof querySchema };
    type Data = ValidatedRequestData<Config>;

    const data: Data["query"] = {
      page: "1",
      limit: "10",
    };

    expect(data.page).toBe("1");
    expect(data.limit).toBe("10");
  });

  it("should infer params type from config", () => {
    const paramsSchema = z.object({
      id: z.string(),
      slug: z.string(),
    });

    type Config = { params: typeof paramsSchema };
    type Data = ValidatedRequestData<Config>;

    const data: Data["params"] = {
      id: "123",
      slug: "test-slug",
    };

    expect(data.id).toBe("123");
    expect(data.slug).toBe("test-slug");
  });

  it("should handle mixed config with multiple schemas", () => {
    const config = {
      body: z.object({ name: z.string() }),
      params: z.object({ id: z.string() }),
    };

    type Config = typeof config;
    type Data = ValidatedRequestData<Config>;

    const body: Data["body"] = { name: "Test" };
    const params: Data["params"] = { id: "456" };

    expect(body.name).toBe("Test");
    expect(params.id).toBe("456");
  });
});

describe("Type inference integration", () => {
  it("should work with real validation scenario", () => {
    // Define schemas
    const createUserSchema = {
      body: z.object({
        email: z.string().email(),
        name: z.string().min(1),
      }),
      query: z.object({
        redirect: z.string().optional(),
      }),
    };

    type CreateUserConfig = typeof createUserSchema;
    type CreateUserData = ValidatedRequestData<CreateUserConfig>;

    // Simulated validated data
    const validatedData: Partial<CreateUserData> = {
      body: {
        email: "user@example.com",
        name: "John Doe",
      },
      query: {
        redirect: "/dashboard",
      },
    };

    expect(validatedData.body?.email).toBe("user@example.com");
    expect(validatedData.query?.redirect).toBe("/dashboard");
  });

  it("should handle API response flow", () => {
    // Success case
    function handleSuccess<T>(data: T): ApiResponse<T> {
      return {
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Error case
    function handleError(message: string, code: string): ApiResponse<never> {
      return {
        success: false,
        error: { message, code },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
    }

    const successResponse = handleSuccess({ userId: "123" });
    const errorResponse = handleError("Not found", "NOT_FOUND");

    expect(successResponse.success).toBe(true);
    expect(errorResponse.success).toBe(false);

    if (successResponse.success) {
      expect(successResponse.data.userId).toBe("123");
    }

    if (!errorResponse.success) {
      expect(errorResponse.error.code).toBe("NOT_FOUND");
    }
  });
});
