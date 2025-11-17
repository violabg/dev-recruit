import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Available LLM models with their capabilities
export const LLM_MODELS = {
  // Production models - stable and reliable
  VERSATILE: "llama-3.3-70b-versatile", // 128K context, 32K output - Best for complex tasks
  INSTANT: "llama-3.1-8b-instant", // 128K context, 8K output - Fast for simple tasks
  GEMMA2_9B_IT: "gemma2-9b-it", // 8K context - Google model
  LLAMA_GUARD_4_12B: "meta-llama/llama-guard-4-12b", // 131K context - Content moderation
  LLAMA3_70B_8192: "llama3-70b-8192", // 8K context - Legacy Meta model
  LLAMA3_8B_8192: "llama3-8b-8192", // 8K context - Legacy Meta model
  WHISPER_LARGE_V3: "whisper-large-v3", // Audio transcription
  WHISPER_LARGE_V3_TURBO: "whisper-large-v3-turbo", // Fast audio transcription
  DISTIL_WHISPER_LARGE_V3_EN: "distil-whisper-large-v3-en", // English audio transcription

  // Preview models - experimental, may be discontinued
  REASONING: "deepseek-r1-distill-llama-70b", // 128K context - Best for evaluation/reasoning
  KIMI: "moonshotai/kimi-k2-instruct",
  MAVERICK: "meta-llama/llama-4-maverick-17b-128e-instruct", // 131K context, 8K output
  SCOUT: "meta-llama/llama-4-scout-17b-16e-instruct", // 131K context, 8K output
  ALLAM_2_7B: "allam-2-7b", // 4K context - Saudi Data and AI Authority model
  LLAMA_PROMPT_GUARD_2_22M: "meta-llama/llama-prompt-guard-2-22m", // 512 context - Prompt safety
  LLAMA_PROMPT_GUARD_2_86M: "meta-llama/llama-prompt-guard-2-86m", // 512 context - Prompt safety
  MISTRAL_SABA_24B: "mistral-saba-24b", // 32K context - Mistral model
  PLAYAI_TTS: "playai-tts", // 10K context - Text to speech
  PLAYAI_TTS_ARABIC: "playai-tts-arabic", // 10K context - Arabic text to speech
  QWEN_QWQ_32B: "qwen-qwq-32b", // 128K context - Alibaba Cloud model
  GPT_OSS_20B: "openai/gpt-oss-20b", // 131K context - OpenAI model has  Tool Use, Browser Search, Code Execution, JSON Object Mode, Reasoning
  GPT_OSS_120B: "openai/gpt-oss-120b", // 131K context - OpenAI model has  Tool Use, Browser Search, Code Execution, JSON Object Mode, Reasoning

  // Preview systems - compound models with tools
  COMPOUND_BETA: "compound-beta", // 128K context, 8K output - Agentic system
  COMPOUND_BETA_MINI: "compound-beta-mini", // 128K context, 8K output - Lightweight agentic system
} as const;

// Task types for model selection
export type LLMTaskType =
  | "quiz_generation" // Complex quiz creation with multiple questions
  | "question_generation" // Single question creation
  | "evaluation" // Answer evaluation and scoring
  | "overall_evaluation" // Comprehensive candidate assessment
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
      text: [
        LLM_MODELS.VERSATILE,
        LLM_MODELS.INSTANT,
        LLM_MODELS.GEMMA2_9B_IT,
        LLM_MODELS.LLAMA3_70B_8192,
        LLM_MODELS.LLAMA3_8B_8192,
      ],
      moderation: [LLM_MODELS.LLAMA_GUARD_4_12B],
      audio: [
        LLM_MODELS.WHISPER_LARGE_V3,
        LLM_MODELS.WHISPER_LARGE_V3_TURBO,
        LLM_MODELS.DISTIL_WHISPER_LARGE_V3_EN,
      ],
    },
    preview: {
      text: [
        LLM_MODELS.REASONING,
        LLM_MODELS.KIMI,
        LLM_MODELS.MAVERICK,
        LLM_MODELS.SCOUT,
        LLM_MODELS.ALLAM_2_7B,
        LLM_MODELS.MISTRAL_SABA_24B,
        LLM_MODELS.QWEN_QWQ_32B,
        LLM_MODELS.GPT_OSS_20B,
        LLM_MODELS.GPT_OSS_120B,
      ],
      safety: [
        LLM_MODELS.LLAMA_PROMPT_GUARD_2_22M,
        LLM_MODELS.LLAMA_PROMPT_GUARD_2_86M,
      ],
      tts: [LLM_MODELS.PLAYAI_TTS, LLM_MODELS.PLAYAI_TTS_ARABIC],
      systems: [LLM_MODELS.COMPOUND_BETA, LLM_MODELS.COMPOUND_BETA_MINI],
    },
  };
};

/**
 * Returns the optimal LLM model for a given task type.
 * Balances performance, cost, and reliability based on task complexity.
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
      // Complex multi-question generation needs high capability and large output
      return LLM_MODELS.GPT_OSS_20B;
    // return LLM_MODELS.VERSATILE;

    case "question_generation":
      // Single question generation can use faster model
      return LLM_MODELS.GPT_OSS_20B;
    // return LLM_MODELS.INSTANT;

    case "overall_evaluation":
    case "evaluation":
      // Answer evaluation benefits from reasoning capabilities
      // Using DeepSeek R1 model with proper v5 configuration for structured outputs
      return LLM_MODELS.GPT_OSS_120B;
    // return LLM_MODELS.REASONING;

    case "simple_task":
      // Basic tasks use fastest model
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
