# Schema and Type Safety Improvements Plan

## 📊 Current State Analysis

### Issues Identified

#### 1. **Schema Duplication and Inconsistency**

- **Multiple validation schemas** for similar data across different contexts
- **Inconsistent naming conventions** between FormData schemas and API schemas
- **Type safety gaps** between frontend forms and backend validation

#### 2. **Current Schema Duplication Examples**

| Purpose         | File                                               | Schema Name                  | Issues                                  |
| --------------- | -------------------------------------------------- | ---------------------------- | --------------------------------------- |
| Form validation | [`lib/schemas/quiz.ts:25`](lib/schemas/quiz.ts:25) | `quizFormSchema`             | Snake_case vs camelCase inconsistency   |
| API requests    | [`lib/schemas/api.ts:16`](lib/schemas/api.ts:16)   | `generateQuizRequestSchema`  | Different field names for same concepts |
| Server actions  | [`lib/schemas/api.ts:65`](lib/schemas/api.ts:65)   | `generateQuizFormDataSchema` | Complex string transformations          |

#### 3. **Type Safety Issues**

- **FormData transformations** require manual string → boolean conversions
- **Optional vs required** field inconsistencies across schemas
- **Missing discriminated unions** for polymorphic data structures

## 🎯 Improvement Strategy

### Phase 1: Schema Consolidation and Standardization

#### **1.1 Create Unified Base Schemas**

Create a comprehensive base schema system that eliminates duplication:

```typescript
// lib/schemas/base-unified.ts
import { z } from "zod";

// Enhanced base schemas with consistent validation
export const baseSchemas = {
  // Identity schemas
  uuid: z.string().uuid("Invalid UUID format"),
  id: z.string().min(1, "ID is required"),

  // Text schemas with consistent validation
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title must not exceed 200 characters")
    .trim(),

  description: z
    .string()
    .max(2000, "Description must not exceed 2000 characters")
    .optional(),

  instructions: z
    .string()
    .max(2000, "Instructions must not exceed 2000 characters")
    .optional(),

  // Numeric schemas with validation
  difficulty: z
    .number()
    .int("Difficulty must be an integer")
    .min(1, "Minimum difficulty is 1")
    .max(5, "Maximum difficulty is 5"),

  questionCount: z
    .number()
    .int("Question count must be an integer")
    .min(1, "At least 1 question required")
    .max(50, "Maximum 50 questions allowed"),

  timeLimit: z
    .number()
    .int("Time limit must be an integer")
    .min(5, "Minimum time limit is 5 minutes")
    .max(120, "Maximum time limit is 120 minutes")
    .nullable(),

  // Boolean schemas with proper coercion
  booleanField: z.union([
    z.boolean(),
    z.string().transform((val) => val === "true"),
    z.literal("on").transform(() => true),
  ]),

  // Array schemas
  skills: z
    .array(z.string().min(1, "Skill name required"))
    .min(1, "At least one skill required"),

  // Enum schemas
  questionType: z.enum(["multiple_choice", "open_question", "code_snippet"], {
    errorMap: () => ({ message: "Invalid question type" }),
  }),

  experienceLevel: z.enum(["junior", "mid", "senior", "expert"], {
    errorMap: () => ({ message: "Invalid experience level" }),
  }),

  candidateStatus: z.enum(
    ["pending", "in_progress", "completed", "hired", "rejected"],
    {
      errorMap: () => ({ message: "Invalid candidate status" }),
    }
  ),
} as const;

// Composite schemas for reuse
export const commonSchemas = {
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10),
  }),

  timestamps: z.object({
    created_at: z.string().datetime(),
    updated_at: z.string().datetime().optional(),
  }),

  userReference: z.object({
    created_by: baseSchemas.uuid,
    updated_by: baseSchemas.uuid.optional(),
  }),
} as const;

// Form-specific transformers
export const formTransformers = {
  // Transform string "true"/"false" to boolean
  stringToBoolean: z.string().transform((val) => val === "true"),

  // Transform string number to number
  stringToNumber: z.string().transform((val) => {
    const num = Number(val);
    if (isNaN(num)) throw new Error("Invalid number");
    return num;
  }),

  // Transform comma-separated string to array
  stringToArray: z.string().transform((val) =>
    val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  ),
} as const;
```

#### **1.2 Consolidate Quiz Schemas**

Replace the current fragmented quiz schemas with a unified approach:

```typescript
// lib/schemas/quiz-unified.ts
import { z } from "zod";
import { baseSchemas, commonSchemas, formTransformers } from "./base-unified";
import { questionSchemas } from "./question-unified";

// Core quiz data schema - the single source of truth
export const quizDataSchema = z.object({
  id: baseSchemas.uuid.optional(), // Optional for creation
  title: baseSchemas.title,
  position_id: baseSchemas.uuid,
  questions: z.array(questionSchemas.flexible),
  time_limit: baseSchemas.timeLimit,
  difficulty: baseSchemas.difficulty.optional(),
  instructions: baseSchemas.instructions,
  ...commonSchemas.timestamps,
  ...commonSchemas.userReference,
});

// Generation configuration - shared across all generation contexts
export const quizGenerationConfigSchema = z.object({
  quizTitle: baseSchemas.title,
  difficulty: baseSchemas.difficulty,
  questionCount: baseSchemas.questionCount,
  instructions: baseSchemas.instructions,

  // Question type inclusion flags
  includeMultipleChoice: z.boolean(),
  includeOpenQuestions: z.boolean(),
  includeCodeSnippets: z.boolean(),

  // Optional generation parameters
  specificModel: z.string().optional(),
  previousQuestions: z
    .array(
      z.object({
        question: z.string().min(1),
        type: baseSchemas.questionType.optional(),
      })
    )
    .optional(),
});

// API request schemas - extend base configuration
export const quizApiSchemas = {
  generateQuiz: quizGenerationConfigSchema.extend({
    positionId: baseSchemas.uuid,
  }),

  updateQuiz: z.object({
    quizId: baseSchemas.uuid,
    title: baseSchemas.title,
    questions: z.array(questionSchemas.flexible),
    time_limit: baseSchemas.timeLimit,
    instructions: baseSchemas.instructions,
  }),

  saveQuiz: quizDataSchema.omit({
    id: true,
    created_at: true,
    updated_at: true,
  }),
} as const;

// Form schemas with proper transformation
export const quizFormSchemas = {
  // Frontend form schema (React Hook Form)
  frontend: quizGenerationConfigSchema.extend({
    enableTimeLimit: z.boolean(),
    timeLimit: baseSchemas.timeLimit,
    llmModel: z.string(),
  }),

  // FormData schema (server actions)
  formData: z.object({
    position_id: baseSchemas.uuid,
    title: baseSchemas.title,
    question_count: formTransformers.stringToNumber.pipe(
      baseSchemas.questionCount
    ),
    difficulty: formTransformers.stringToNumber.pipe(baseSchemas.difficulty),
    include_multiple_choice: formTransformers.stringToBoolean,
    include_open_questions: formTransformers.stringToBoolean,
    include_code_snippets: formTransformers.stringToBoolean,
    instructions: baseSchemas.instructions,
    enable_time_limit: formTransformers.stringToBoolean.optional(),
    time_limit: formTransformers.stringToNumber
      .pipe(baseSchemas.timeLimit)
      .optional(),
    llm_model: z.string().optional(),
  }),
} as const;

// Type exports with consistent naming
export type QuizData = z.infer<typeof quizDataSchema>;
export type QuizGenerationConfig = z.infer<typeof quizGenerationConfigSchema>;
export type QuizApiRequest = z.infer<typeof quizApiSchemas.generateQuiz>;
export type QuizFormData = z.infer<typeof quizFormSchemas.frontend>;
export type QuizFormDataRaw = z.infer<typeof quizFormSchemas.formData>;
```

#### **1.3 Enhanced Question Schema System**

Create a more robust question schema system with better type discrimination:

```typescript
// lib/schemas/question-unified.ts
import { z } from "zod";
import { baseSchemas } from "./base-unified";

// Base question schema with common fields
const baseQuestionSchema = z.object({
  id: z
    .string()
    .regex(/^q\d+$/, "Question ID must be in format 'q1', 'q2', etc."),
  question: z.string().min(1, "Question text is required"),
  keywords: z.array(z.string()).optional(),
  explanation: z.string().optional(),
});

// Specific question type schemas
const multipleChoiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("multiple_choice"),
  options: z
    .array(z.string().min(1, "Option text required"))
    .length(4, "Exactly 4 options required"),
  correctAnswer: z.number().int().min(0).max(3),
});

const openQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("open_question"),
  sampleAnswer: z.string().min(1, "Sample answer required"),
  sampleSolution: z.string().optional(),
  codeSnippet: z.string().optional(),
});

const codeSnippetQuestionSchema = baseQuestionSchema.extend({
  type: z.literal("code_snippet"),
  codeSnippet: z.string().min(1, "Code snippet required"),
  sampleSolution: z.string().min(1, "Sample solution required"),
  language: z.string().min(1, "Programming language required"),
});

// Discriminated union for type safety
export const questionSchemas = {
  // Strict schema for runtime validation
  strict: z.discriminatedUnion("type", [
    multipleChoiceQuestionSchema,
    openQuestionSchema,
    codeSnippetQuestionSchema,
  ]),

  // Flexible schema for parsing AI responses
  flexible: z.union([
    multipleChoiceQuestionSchema,
    openQuestionSchema,
    codeSnippetQuestionSchema,
  ]),

  // Individual schemas for targeted validation
  multipleChoice: multipleChoiceQuestionSchema,
  openQuestion: openQuestionSchema,
  codeSnippet: codeSnippetQuestionSchema,
} as const;

// Type exports
export type Question = z.infer<typeof questionSchemas.strict>;
export type MultipleChoiceQuestion = z.infer<
  typeof multipleChoiceQuestionSchema
>;
export type OpenQuestion = z.infer<typeof openQuestionSchema>;
export type CodeSnippetQuestion = z.infer<typeof codeSnippetQuestionSchema>;

// Type guards for runtime type checking
export const isMultipleChoiceQuestion = (
  q: Question
): q is MultipleChoiceQuestion => q.type === "multiple_choice";

export const isOpenQuestion = (q: Question): q is OpenQuestion =>
  q.type === "open_question";

export const isCodeSnippetQuestion = (q: Question): q is CodeSnippetQuestion =>
  q.type === "code_snippet";
```

### Phase 2: Type Safety Enhancements

#### **2.1 Enhanced Type Inference**

Create utility types for better type inference and safety:

```typescript
// lib/types/utilities.ts

// Utility type for extracting form data types
export type FormDataType<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends z.ZodType<infer U> ? U : never;
};

// Utility type for API responses
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// Utility type for database entities
export type DatabaseEntity<T> = T & {
  id: string;
  created_at: string;
  updated_at?: string;
  created_by: string;
};

// Utility type for partial updates
export type PartialUpdate<T> = Partial<
  Omit<T, "id" | "created_at" | "created_by">
>;

// Generic form state type
export type FormState<T> = {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
};
```

#### **2.2 Schema Validation Middleware**

Create reusable validation middleware for consistent error handling:

```typescript
// lib/middleware/validation.ts
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

export type ValidationConfig = {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
};

export function withValidation<T extends ValidationConfig>(
  config: T,
  handler: (
    req: NextRequest,
    validated: {
      body?: T["body"] extends z.ZodSchema ? z.infer<T["body"]> : never;
      query?: T["query"] extends z.ZodSchema ? z.infer<T["query"]> : never;
      params?: T["params"] extends z.ZodSchema ? z.infer<T["params"]> : never;
    }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: { params?: any }) => {
    try {
      const validated: any = {};

      // Validate request body
      if (config.body) {
        const body = await req.json();
        const result = config.body.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            {
              error: "Invalid request body",
              code: "VALIDATION_ERROR",
              details: result.error.format(),
            },
            { status: 400 }
          );
        }
        validated.body = result.data;
      }

      // Validate query parameters
      if (config.query) {
        const url = new URL(req.url);
        const query = Object.fromEntries(url.searchParams.entries());
        const result = config.query.safeParse(query);
        if (!result.success) {
          return NextResponse.json(
            {
              error: "Invalid query parameters",
              code: "VALIDATION_ERROR",
              details: result.error.format(),
            },
            { status: 400 }
          );
        }
        validated.query = result.data;
      }

      // Validate route parameters
      if (config.params && context.params) {
        const result = config.params.safeParse(context.params);
        if (!result.success) {
          return NextResponse.json(
            {
              error: "Invalid route parameters",
              code: "VALIDATION_ERROR",
              details: result.error.format(),
            },
            { status: 400 }
          );
        }
        validated.params = result.data;
      }

      return await handler(req, validated);
    } catch (error) {
      console.error("Validation middleware error:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  };
}

// Usage example:
export const POST = withValidation(
  {
    body: quizApiSchemas.generateQuiz,
    query: z.object({
      debug: z.string().optional(),
    }),
  },
  async (req, { body, query }) => {
    // body is fully typed as QuizGenerationRequest
    // query is fully typed with debug?: string

    const result = await generateQuizAction(body);
    return NextResponse.json(result);
  }
);
```

### Phase 3: Implementation Benefits

#### **3.1 Immediate Improvements**

- **Eliminated Duplication**: Single source of truth for all validation logic
- **Type Safety**: Full end-to-end type safety from forms to database
- **Consistent Validation**: Unified error messages and validation rules
- **Better DX**: Improved IntelliSense and compile-time error detection

#### **3.2 Performance Benefits**

- **Reduced Bundle Size**: Eliminated duplicate schema definitions
- **Faster Validation**: Optimized schema compilation and reuse
- **Memory Efficiency**: Shared schema instances across components

#### **3.3 Maintainability Benefits**

- **Single Point of Change**: Schema changes propagate automatically
- **Consistent Naming**: Unified naming conventions across all layers
- **Better Testing**: Type-safe mocks and test data generation
- **Documentation**: Self-documenting schemas with validation messages

## 📋 Migration Plan

### **Step 1: Create New Schema System** (Week 1)

1. Create `lib/schemas/base-unified.ts`
2. Create `lib/schemas/quiz-unified.ts`
3. Create `lib/schemas/question-unified.ts`
4. Add utility types in `lib/types/utilities.ts`

### **Step 2: Update API Routes** (Week 1-2)

1. Create validation middleware
2. Update all API routes to use new schemas
3. Test validation consistency

### **Step 3: Update Components** (Week 2)

1. Update form components to use new schemas
2. Update server actions with new validation
3. Update type imports across components

### **Step 4: Cleanup and Testing** (Week 2-3)

1. Remove old schema files
2. Update all imports
3. Run comprehensive tests
4. Update documentation

### **Step 5: Performance Optimization** (Week 3)

1. Optimize schema compilation
2. Add schema caching where appropriate
3. Measure and validate performance improvements

## 🎯 Success Metrics

- **30% reduction** in schema-related code duplication
- **100% type safety** across all form → API → database flows
- **Improved build times** due to better TypeScript compilation
- **Zero runtime validation errors** due to compile-time safety
- **Consistent error handling** across all validation points

## 🔄 Future Enhancements

1. **Schema Versioning**: Add versioning support for API evolution
2. **Runtime Schema Generation**: Generate OpenAPI specs from schemas
3. **Enhanced Error Messages**: Localized validation messages
4. **Schema Testing**: Automated schema compatibility testing

---

This comprehensive schema improvement plan provides a solid foundation for better maintainability, type safety, and performance across the entire application.
