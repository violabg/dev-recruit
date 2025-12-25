import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Available LLM models with their capabilities
// Updated: December 2025 - Synced with Groq documentation
export const LLM_MODELS = {
  // ============================================================================
  // PRODUCTION MODELS - Stable and reliable for production use
  // ============================================================================

  // Meta Llama 3.3 70B - Best for complex tasks requiring high capability
  // Context: 131K, Output: 32K, Speed: 280 tps
  VERSATILE: "llama-3.3-70b-versatile",

  // Meta Llama 3.1 8B - Fastest text model for simple tasks
  // Context: 131K, Output: 131K, Speed: 560 tps
  INSTANT: "llama-3.1-8b-instant",

  // Meta Llama Guard 4 12B - Content moderation and safety
  // Context: 131K, Output: 1K, Speed: 1200 tps
  LLAMA_GUARD_4_12B: "meta-llama/llama-guard-4-12b",

  // OpenAI GPT OSS 120B - Reasoning, Tool Use, JSON Mode, Code Execution
  // Context: 131K, Output: 65K, Speed: 500 tps
  // Best for: Structured outputs, evaluations, complex reasoning
  GPT_OSS_120B: "openai/gpt-oss-120b",

  // OpenAI GPT OSS 20B - Faster reasoning with same capabilities
  // Context: 131K, Output: 65K, Speed: 1000 tps
  GPT_OSS_20B: "openai/gpt-oss-20b",

  // OpenAI GPT OSS Safeguard 20B - Safety-focused model
  // Context: 131K, Output: 65K, Speed: 1000 tps
  GPT_OSS_SAFEGUARD_20B: "openai/gpt-oss-safeguard-20b",

  // Audio transcription models
  WHISPER_LARGE_V3: "whisper-large-v3", // Audio transcription
  WHISPER_LARGE_V3_TURBO: "whisper-large-v3-turbo", // Fast audio transcription

  // ============================================================================
  // PRODUCTION SYSTEMS - Compound AI systems with tool use
  // ============================================================================

  // Groq Compound - Agentic system with tool use
  // Context: 131K, Output: 8K, Speed: 450 tps
  COMPOUND: "groq/compound",

  // Groq Compound Mini - Lightweight agentic system
  // Context: 131K, Output: 8K, Speed: 450 tps
  COMPOUND_MINI: "groq/compound-mini",

  // ============================================================================
  // PREVIEW MODELS - Experimental, evaluate before production use
  // ============================================================================

  // Moonshot AI Kimi K2 - Largest context window available
  // Context: 262K, Output: 16K, Speed: 200 tps
  // Best for: Long documents, resume analysis, multi-question generation
  KIMI: "moonshotai/kimi-k2-instruct-0905",

  // Meta Llama 4 Maverick 17B - Fast preview model
  // Context: 131K, Output: 8K, Speed: 600 tps
  MAVERICK: "meta-llama/llama-4-maverick-17b-128e-instruct",

  // Meta Llama 4 Scout 17B - Fastest Llama 4 model
  // Context: 131K, Output: 8K, Speed: 750 tps
  SCOUT: "meta-llama/llama-4-scout-17b-16e-instruct",

  // Alibaba Cloud Qwen3 32B - Strong multilingual model
  // Context: 131K, Output: 40K, Speed: 400 tps
  QWEN3_32B: "qwen/qwen3-32b",

  // Safety models for prompt injection detection
  LLAMA_PROMPT_GUARD_2_22M: "meta-llama/llama-prompt-guard-2-22m", // Context: 512
  LLAMA_PROMPT_GUARD_2_86M: "meta-llama/llama-prompt-guard-2-86m", // Context: 512

  // Text-to-speech models
  PLAYAI_TTS: "playai-tts", // Context: 8K
  PLAYAI_TTS_ARABIC: "playai-tts-arabic", // Context: 8K
} as const;

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
 * Updated: December 2025 - Synced with Groq documentation
 */
export const getModelsByCategory = () => {
  return {
    production: {
      text: [
        LLM_MODELS.VERSATILE, // llama-3.3-70b - Complex tasks
        LLM_MODELS.INSTANT, // llama-3.1-8b - Fast simple tasks
        LLM_MODELS.GPT_OSS_120B, // Reasoning + JSON Mode
        LLM_MODELS.GPT_OSS_20B, // Faster reasoning
      ],
      moderation: [
        LLM_MODELS.LLAMA_GUARD_4_12B,
        LLM_MODELS.GPT_OSS_SAFEGUARD_20B,
      ],
      audio: [LLM_MODELS.WHISPER_LARGE_V3, LLM_MODELS.WHISPER_LARGE_V3_TURBO],
      systems: [
        LLM_MODELS.COMPOUND, // Agentic with tools
        LLM_MODELS.COMPOUND_MINI, // Lightweight agentic
      ],
    },
    preview: {
      text: [
        LLM_MODELS.KIMI, // 262K context - largest
        LLM_MODELS.MAVERICK, // Llama 4 - fast
        LLM_MODELS.SCOUT, // Llama 4 - fastest
        LLM_MODELS.QWEN3_32B, // Multilingual
      ],
      safety: [
        LLM_MODELS.LLAMA_PROMPT_GUARD_2_22M,
        LLM_MODELS.LLAMA_PROMPT_GUARD_2_86M,
      ],
      tts: [LLM_MODELS.PLAYAI_TTS, LLM_MODELS.PLAYAI_TTS_ARABIC],
    },
  };
};

/**
 * Returns the optimal LLM model for a given task type.
 * Balances performance, cost, and reliability based on task complexity.
 *
 * Model Selection Rationale (December 2025):
 * - KIMI (262K context, 16K output): Best for long documents and multi-question generation
 * - GPT_OSS_120B (131K context, 65K output): Best for structured outputs, reasoning, JSON mode
 * - VERSATILE (131K context, 32K output): Reliable production model for general tasks
 * - INSTANT (131K context, 131K output, 560 tps): Fastest for simple tasks
 *
 * @param taskType - The type of task to perform
 * @param specificModel - Optional specific model to use instead of the optimal one
 */
export const getOptimalModel = (
  taskType: LLMTaskType,
  specificModel?: string
): string => {
  // If a specific model is provided, use it
  if (specificModel) {
    return specificModel;
  }

  // Otherwise, return the optimal model for the task type
  switch (taskType) {
    case "quiz_generation":
      // Complex multi-question generation needs large context and output
      // KIMI: 262K context for position context + 16K output for multiple questions
      return LLM_MODELS.KIMI;

    case "question_generation":
      // Single question generation - use reliable production model
      // VERSATILE: 32K output is plenty, 280 tps is fast enough
      return LLM_MODELS.VERSATILE;

    case "evaluation":
    case "overall_evaluation":
      // Answer evaluation benefits from reasoning capabilities and JSON mode
      // GPT_OSS_120B: Native JSON Mode, reasoning, 65K output for detailed feedback
      return LLM_MODELS.GPT_OSS_120B;

    case "resume_evaluation":
      // Resume analysis needs large context for full resume text
      // KIMI: 262K context ideal for resume + position requirements
      return LLM_MODELS.KIMI;

    case "simple_task":
      // Basic tasks use fastest model
      // INSTANT: 560 tps, cheapest, fast responses
      return LLM_MODELS.INSTANT;

    default:
      // Default to versatile model for unknown tasks
      return LLM_MODELS.VERSATILE;
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
