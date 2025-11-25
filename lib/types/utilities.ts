// ====================
// UTILITY TYPES FOR API AND VALIDATION
// ====================
// Types used by API middleware and validation layer

import { z } from "zod/v4";

// Utility type for API responses with consistent structure
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      meta?: {
        timestamp: string;
        requestId?: string;
        performance?: {
          duration: number;
          model?: string;
        };
      };
    }
  | {
      success: false;
      error: {
        message: string;
        code?: string;
        details?: unknown;
      };
      meta?: {
        timestamp: string;
        requestId?: string;
        performance?: {
          duration: number;
        };
      };
    };

// Type for schema validation middleware configuration
export type ValidationConfig = {
  body?: z.ZodJSONSchema;
  query?: z.ZodJSONSchema;
  params?: z.ZodJSONSchema;
  headers?: z.ZodJSONSchema;
};

// Type for validated request data in API routes
export type ValidatedRequestData<T extends ValidationConfig> = {
  body: T["body"] extends z.ZodJSONSchema ? z.infer<T["body"]> : never;
  query: T["query"] extends z.ZodJSONSchema ? z.infer<T["query"]> : never;
  params: T["params"] extends z.ZodJSONSchema ? z.infer<T["params"]> : never;
  headers: T["headers"] extends z.ZodJSONSchema ? z.infer<T["headers"]> : never;
};
