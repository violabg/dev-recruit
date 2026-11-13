import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Available LLM models with their capabilities.
// Only models available on Groq's FREE plan (verified against the Groq
// models API and docs, November 2026). Free-plan limits per chat model:
// 30 RPM · 1K RPD · 8K TPM · 200K TPD (check console.groq.com/settings/limits).
export const LLM_MODELS = {
  // ============================================================================
  // PRODUCTION MODELS
  // ============================================================================

  // OpenAI GPT-OSS 120B - strongest reasoning model on Groq
  // Context: 131K, Output: 65K, Speed: ~500 tps, strict JSON-schema outputs
  // Best for: quiz/question generation, evaluations, resume analysis
  GPT_OSS_120B: "openai/gpt-oss-120b",

  // OpenAI GPT-OSS 20B - same family, about 2x faster
  // Context: 131K, Output: 65K, Speed: ~1000 tps, strict JSON-schema outputs
  // Best for: short/simple text tasks, first fallback for GPT-OSS 120B
  GPT_OSS_20B: "openai/gpt-oss-20b",

  // Audio transcription
  WHISPER_LARGE_V3: "whisper-large-v3", // Highest accuracy
  WHISPER_LARGE_V3_TURBO: "whisper-large-v3-turbo", // Faster, used for interviews

  // ============================================================================
  // PREVIEW MODELS - may be discontinued by Groq at short notice
  // ============================================================================

  // Alibaba Qwen3.8 27B - strong multilingual model (different family:
  // useful fallback when GPT-OSS is rate limited)
  // Context: 131K, Output: 16K, Speed: ~450 tps, strict JSON-schema outputs
  QWEN3_8_27B: "qwen/qwen3.8-27b",

  // Safety / moderation
  GPT_OSS_SAFEGUARD_20B: "openai/gpt-oss-safeguard-20b", // Policy-based moderation
  LLAMA_PROMPT_GUARD_2_22M: "meta-llama/llama-prompt-guard-2-22m", // Prompt-injection check, ctx 512
  LLAMA_PROMPT_GUARD_2_86M: "meta-llama/llama-prompt-guard-2-86m", // Prompt-injection check, ctx 512
} as const;

// Default model for AI generation in forms (quiz + question generation)
export const DEFAULT_GENERATION_MODEL = LLM_MODELS.GPT_OSS_120B;

// Task types for model selection
export type LLMTaskType =
  | "quiz_generation" // Complex quiz creation with multiple questions
  | "question_generation" // Single question creation
  | "evaluation" // Answer evaluation and scoring
  | "overall_evaluation" // Comprehensive candidate assessment
  | "resume_evaluation" // Resume-based candidate evaluation against position
  | "simple_task"; // Basic text processing

// Type for available model names
export type LLMModelName = (typeof LLM_MODELS)[keyof typeof LLM_MODELS];

/**
 * Returns an array of all available model names
 */
export const getAllAvailableModels = (): LLMModelName[] => {
  return Object.values(LLM_MODELS);
};

/**
 * Returns an object with model categories for easier selection
 */
export const getModelsByCategory = () => {
  return {
    production: {
      text: [LLM_MODELS.GPT_OSS_120B, LLM_MODELS.GPT_OSS_20B],
      audio: [LLM_MODELS.WHISPER_LARGE_V3, LLM_MODELS.WHISPER_LARGE_V3_TURBO],
    },
    preview: {
      text: [LLM_MODELS.QWEN3_8_27B],
      safety: [
        LLM_MODELS.GPT_OSS_SAFEGUARD_20B,
        LLM_MODELS.LLAMA_PROMPT_GUARD_2_22M,
        LLM_MODELS.LLAMA_PROMPT_GUARD_2_86M,
      ],
    },
  };
};

/**
 * Fallback chain used when the primary model fails (errors, rate limits):
 * GPT-OSS 20B first (same family, fast), then Qwen3.8 27B (different family,
 * separate rate-limit bucket).
 */
export const FALLBACK_MODELS: readonly LLMModelName[] = [
  LLM_MODELS.GPT_OSS_20B,
  LLM_MODELS.QWEN3_8_27B,
];

/**
 * Returns the optimal LLM model for a given task type.
 *
 * Model Selection Rationale (Groq free plan, November 2026):
 * - GPT_OSS_120B: best reasoning + strict JSON schema + 65K output. Used for
 *   everything where quality matters (Italian technical content, scoring).
 *   All free chat models share the same rate limits, so the strongest model
 *   costs nothing extra.
 * - GPT_OSS_20B: ~2x faster, used for short free-text tasks (position
 *   descriptions) and as first fallback.
 *
 * @param taskType - The type of task to perform
 * @param specificModel - Optional specific model to use instead of the optimal one
 */
export const getOptimalModel = (
  taskType: LLMTaskType,
  specificModel?: string,
): string => {
  // If a specific model is provided, use it
  if (specificModel) {
    return specificModel;
  }

  switch (taskType) {
    case "quiz_generation":
      // Many structured questions in one response: needs the strongest
      // reasoning and a large output budget (65K)
      return LLM_MODELS.GPT_OSS_120B;

    case "question_generation":
      // Single structured question - quality of distractors/code matters
      return LLM_MODELS.GPT_OSS_120B;

    case "evaluation":
    case "overall_evaluation":
      // Scoring needs careful reasoning and reliable JSON
      return LLM_MODELS.GPT_OSS_120B;

    case "resume_evaluation":
      // Full resume + position requirements fit easily in 131K context
      return LLM_MODELS.GPT_OSS_120B;

    case "simple_task":
      // Short free text (e.g. streamed position descriptions): fastest model
      return LLM_MODELS.GPT_OSS_20B;

    default:
      return LLM_MODELS.GPT_OSS_120B;
  }
};

// Legacy export for backward compatibility
export const LLM_MODEL = getOptimalModel("quiz_generation");

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitials = (name?: string | null) => {
  return (
    name
      ?.split(" ")
      ?.map((word) => word[0])
      ?.join("")
      ?.toUpperCase() || "U"
  );
};

export const prismLanguage = (language: string) => {
  switch ((language || "").toLowerCase()) {
    case "javascript":
    case "js":
      return "javascript";
    case "typescript":
    case "ts":
      return "typescript";
    case "python":
    case "py":
      return "python";
    case "java":
      return "typescript";
    case "c#":
    case "csharp":
      return "csharp";
    case "cpp":
    case "c++":
      return "cpp";
    case "go":
      return "go";
    case "ruby":
      return "ruby";
    case "php":
      return "php";
    case "swift":
      return "swift";
    case "kotlin":
      return "kotlin";
    case "html":
    case "css":
      return "markup";
    default:
      return "javascript";
  }
};

export function formatDate(dateString: string | null, showTime?: boolean) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const formatOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(showTime && { hour: "2-digit", minute: "2-digit" }),
  };
  return new Intl.DateTimeFormat("it-IT", formatOptions).format(date);
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500 text-black";
    case "contacted":
      return "bg-blue-600";
    case "interviewing":
      return "bg-purple-500";
    case "hired":
      return "bg-green-500 text-black";
    case "rejected":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

export const isDevelopment = process.env.NODE_ENV === "development";
