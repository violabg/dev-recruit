// ====================
// UTILITY TYPES FOR ENHANCED TYPE SAFETY
// ====================
// Enhanced utility types for better type inference and safety across the application

import { z } from "zod/v4";

// Utility type for extracting form data types from Zod schemas
export type FormDataType<T extends Record<string, z.ZodTypeAny>> = {
  [K in keyof T]: T[K] extends z.ZodType<infer U> ? U : never;
};

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

// Utility type for database entities with standard fields
export type DatabaseEntity<T> = T & {
  id: string;
  created_at: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
};

// Utility type for partial updates (excludes immutable fields)
export type PartialUpdate<T> = Partial<
  Omit<T, "id" | "created_at" | "created_by">
>;

// Generic form state type for React Hook Form integration
export type FormState<T> = {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
};

// Utility type for paginated API responses
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

// Utility type for creating TypeScript discriminated unions from Zod discriminated unions
export type DiscriminatedUnion<T extends z.ZodTypeAny> = z.infer<T>;

// Utility type for extracting the shape of a Zod object schema
export type ZodShape<T extends z.ZodRawShape> = {
  [K in keyof T]: T[K] extends z.ZodType<infer U> ? U : never;
};

// Utility type for making certain fields required
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Utility type for making certain fields optional
export type WithOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Utility type for server action responses
export type ServerActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// Utility type for form validation results
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: z.ZodError<T> };

// Utility type for async operation states
export type AsyncState<T, E = string> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: E };

// Helper type for extracting array element types
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

// Helper type for creating optional fields from required ones
export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Helper type for creating required fields from optional ones
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

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
