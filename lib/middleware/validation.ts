import { logger } from "@/lib/services/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ApiResponse,
  ValidatedRequestData,
  ValidationConfig,
} from "../types/utilities";

// ====================
// API VALIDATION MIDDLEWARE
// ====================
// Standardized middleware for API route validation and error handling

type APIHandler<T extends ValidationConfig> = (
  req: NextRequest,
  validated: Partial<ValidatedRequestData<T>>,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

type MiddlewareConfig = {
  rateLimit?: {
    requests: number;
    window: number; // in milliseconds
  };
  auth?: {
    required: boolean;
  };
};

// In-memory rate limiting (for development - should use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  identifier: string,
  config: { requests: number; window: number }
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + config.window });
    return true;
  }

  if (entry.count >= config.requests) {
    return false;
  }

  entry.count++;
  return true;
}

export function withValidation<T extends ValidationConfig>(
  validationConfig: T,
  middlewareConfig: MiddlewareConfig = {},
  handler: APIHandler<T>
) {
  return async (
    req: NextRequest,
    context?: { params?: Record<string, string> }
  ) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // Rate limiting
      if (middlewareConfig.rateLimit) {
        const identifier =
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown";

        if (!checkRateLimit(identifier, middlewareConfig.rateLimit)) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              message: "Rate limit exceeded. Please try again later.",
              code: "RATE_LIMIT_EXCEEDED",
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          };

          return NextResponse.json(response, { status: 429 });
        }
      }

      // Authentication check (placeholder - implement based on your auth system)
      if (middlewareConfig.auth?.required) {
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              message: "Authentication required",
              code: "UNAUTHORIZED",
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          };

          return NextResponse.json(response, { status: 401 });
        }
      }

      // Validation
      const validated: Partial<ValidatedRequestData<T>> = {};

      // Validate body
      if (validationConfig.body && req.method !== "GET") {
        try {
          const body = await req.json();
          const result = validationConfig.body.safeParse(body);

          if (!result.success) {
            const response: ApiResponse<never> = {
              success: false,
              error: {
                message: "Invalid request body",
                code: "VALIDATION_ERROR",
                details: result.error.issues,
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId,
              },
            };

            return NextResponse.json(response, { status: 400 });
          }

          validated.body = result.data as ValidatedRequestData<T>["body"];
        } catch {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              message: "Invalid JSON in request body",
              code: "INVALID_JSON",
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          };

          return NextResponse.json(response, { status: 400 });
        }
      }

      // Validate query parameters
      if (validationConfig.query) {
        const url = new URL(req.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const result = validationConfig.query.safeParse(queryParams);

        if (!result.success) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              message: "Invalid query parameters",
              code: "VALIDATION_ERROR",
              details: result.error.issues,
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          };

          return NextResponse.json(response, { status: 400 });
        }

        validated.query = result.data as ValidatedRequestData<T>["query"];
      }

      // Validate path parameters
      if (validationConfig.params && context?.params) {
        const result = validationConfig.params.safeParse(context.params);

        if (!result.success) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              message: "Invalid path parameters",
              code: "VALIDATION_ERROR",
              details: result.error.issues,
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          };

          return NextResponse.json(response, { status: 400 });
        }

        validated.params = result.data as ValidatedRequestData<T>["params"];
      }

      // Validate headers
      if (validationConfig.headers) {
        const headers = Object.fromEntries(req.headers.entries());
        const result = validationConfig.headers.safeParse(headers);

        if (!result.success) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              message: "Invalid headers",
              code: "VALIDATION_ERROR",
              details: result.error.issues,
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          };

          return NextResponse.json(response, { status: 400 });
        }

        validated.headers = result.data as ValidatedRequestData<T>["headers"];
      }

      // Call the actual handler
      const response = await handler(req, validated, context);

      // Add performance metadata to successful responses
      const duration = Date.now() - startTime;

      // If response is JSON and has the expected structure, add metadata
      try {
        const responseData = await response.clone().json();
        if (
          responseData &&
          typeof responseData === "object" &&
          "success" in responseData
        ) {
          responseData.meta = {
            ...responseData.meta,
            timestamp: new Date().toISOString(),
            requestId,
            performance: {
              duration,
            },
          };

          return NextResponse.json(responseData, {
            status: response.status,
            headers: response.headers,
          });
        }
      } catch {
        // Response is not JSON, return as-is
      }

      return response;
    } catch (error) {
      logger.error("API middleware error:", { error });

      const response: ApiResponse<never> = {
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
          details: process.env.NODE_ENV === "development" ? error : undefined,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
          performance: {
            duration: Date.now() - startTime,
          },
        },
      };

      return NextResponse.json(response, { status: 500 });
    }
  };
}

// Alias for easier usage
export const createApiHandler = withValidation;

// Helper function to create standardized API responses
export function createApiResponse<T>(
  data: T,
  meta?: {
    requestId?: string;
    performance?: { duration: number; model?: string };
  }
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

export function createApiError(
  message: string,
  code?: string,
  details?: unknown,
  meta?: { requestId?: string }
): ApiResponse<never> {
  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

// Additional helper for simple JSON validation
export function validateJson<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: unknown } {
  try {
    const result = schema.safeParse(data);
    return result.success
      ? { success: true, data: result.data }
      : { success: false, error: result.error };
  } catch (error) {
    return { success: false, error };
  }
}

// Alternative: More specific error typing for better error messages
export function validateJsonWithErrors<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.safeParse(data);
    return result.success
      ? { success: true, data: result.data }
      : {
          success: false,
          error: result.error.issues
            .map((e: z.core.$ZodIssue) => e.message)
            .join(", "),
        };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown validation error",
    };
  }
}
