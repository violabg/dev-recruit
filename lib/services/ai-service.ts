import { groq } from "@ai-sdk/groq";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod/v4";
import {
  aiQuizGenerationSchema,
  convertToStrictQuestions,
  Question,
  questionSchemas,
  QuestionType,
} from "../schemas";
import { getOptimalModel } from "../utils";

// AI-specific error types
export class AIGenerationError extends Error {
  constructor(
    message: string,
    public code: AIErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AIGenerationError";
  }
}

export enum AIErrorCode {
  GENERATION_FAILED = "GENERATION_FAILED",
  MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE",
  TIMEOUT = "TIMEOUT",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  RATE_LIMITED = "RATE_LIMITED",
  CONTENT_FILTERED = "CONTENT_FILTERED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
}

// Configuration interface
export interface AIGenerationConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  fallbackModels: string[];
}

// Default configuration
const DEFAULT_CONFIG: AIGenerationConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
  timeout: 60000, // 60 seconds
  fallbackModels: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
  ],
};

const positionDescriptionResponseSchema = z.object({
  description: z
    .string()
    .min(40, "La descrizione generata è troppo breve")
    .max(1200, "La descrizione generata è troppo lunga"),
});

// Input sanitization to prevent prompt injection
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Remove potential prompt injection patterns
  const dangerous_patterns = [
    /ignore\s+previous\s+instructions/gi,
    /forget\s+everything\s+above/gi,
    /you\s+are\s+now/gi,
    /new\s+instructions/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /user\s*:/gi,
    /<\s*script[^>]*>/gi,
    /javascript\s*:/gi,
    /data\s*:/gi,
  ];

  let sanitized = input;
  dangerous_patterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[filtered]");
  });

  // Limit length to prevent token exhaustion
  return sanitized.substring(0, 2000);
}

// Retry mechanism with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: AIGenerationConfig
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (error instanceof AIGenerationError) {
        if (error.code === AIErrorCode.CONTENT_FILTERED) {
          throw error; // Don't retry content filtering
        }
      }

      if (attempt < config.maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = config.retryDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Unknown error occurred during retry");
}

// Timeout wrapper
export function withTimeout<T>(
  promise: Promise<T>,
  timeout: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new AIGenerationError(
              "AI generation timed out",
              AIErrorCode.TIMEOUT
            )
          ),
        timeout
      )
    ),
  ]);
}

// Quiz generation parameters
export interface GenerateQuizParams {
  positionTitle: string;
  experienceLevel: string;
  skills: string[];
  description?: string;
  quizTitle: string;
  questionCount: number;
  difficulty: number;
  includeMultipleChoice: boolean;
  includeOpenQuestions: boolean;
  includeCodeSnippets: boolean;
  instructions?: string;
  previousQuestions?: { question: string }[];
  specificModel?: string;
}

// Base parameters for all question types
export interface BaseQuestionParams {
  quizTitle: string;
  positionTitle: string;
  experienceLevel: string;
  skills: string[];
  difficulty?: number;
  previousQuestions?: { question: string; type?: string }[];
  specificModel?: string;
  instructions?: string;
  questionIndex: number;
}

// Type-specific question generation parameters
export interface MultipleChoiceQuestionParams extends BaseQuestionParams {
  type: "multiple_choice";
  focusAreas?: string[];
  distractorComplexity?: "simple" | "moderate" | "complex";
}

export interface OpenQuestionParams extends BaseQuestionParams {
  type: "open_question";
  requireCodeExample?: boolean;
  expectedResponseLength?: "short" | "medium" | "long";
  evaluationCriteria?: string[];
}

export interface CodeSnippetQuestionParams extends BaseQuestionParams {
  type: "code_snippet";
  language?: string;
  bugType?: "syntax" | "logic" | "performance" | "security";
  codeComplexity?: "basic" | "intermediate" | "advanced";
  includeComments?: boolean;
}

// Union type for all question generation parameters
export type GenerateQuestionParams =
  | MultipleChoiceQuestionParams
  | OpenQuestionParams
  | CodeSnippetQuestionParams;

// ====================
// PROMPT BUILDERS BY QUESTION TYPE
// ====================

abstract class BasePromptBuilder {
  protected sanitizeInput(input: string): string {
    return sanitizeInput(input);
  }

  protected buildCommonContext(params: BaseQuestionParams): string {
    const sanitizedQuizTitle = this.sanitizeInput(params.quizTitle);
    const sanitizedPositionTitle = this.sanitizeInput(params.positionTitle);
    const sanitizedInstructions = params.instructions
      ? this.sanitizeInput(params.instructions)
      : "";

    return `
            Position Details:
            - Experience Level: ${params.experienceLevel}
            - Required Skills: ${params.skills.join(", ")}
            - Difficulty level: ${params.difficulty || 3}/5
            ${
              sanitizedInstructions
                ? `- Special instructions: ${sanitizedInstructions}`
                : ""
            }

            Quiz Context: "${sanitizedQuizTitle}" for position "${sanitizedPositionTitle}"

            ${
              params.previousQuestions && params.previousQuestions.length > 0
                ? `
            Avoid repeating these existing questions:
            ${params.previousQuestions
              .map((q) => `- ${this.sanitizeInput(q.question)}`)
              .join("\n")}
            `
                : ""
            }`;
  }

  abstract buildSystemPrompt(questionIndex?: number): string;
  abstract buildUserPrompt(params: BaseQuestionParams): string;
}

class MultipleChoicePromptBuilder extends BasePromptBuilder {
  buildSystemPrompt(questionIndex?: number): string {
    const idFormat = `Format "q${questionIndex || 1}" (use "q${
      questionIndex || 1
    }" for this specific question)`;

    return `
            You are a technical recruitment expert specializing in creating multiple choice assessment questions.

            Generate a valid JSON object for a single multiple choice question (NOT an array) that adheres to these specifications:

            REQUIRED FIELDS:
            - id: ${idFormat}
            - type: "multiple_choice"
            - question: Italian text (clear, specific, and job-relevant)
            - options: Array of exactly 4 Italian strings (each at least 3 characters)
            - correctAnswer: Zero-based index number (0-3) of the correct option
            - keywords: Array of relevant strings (optional)
            - explanation: Italian text explaining the correct answer (optional)

            QUALITY REQUIREMENTS:
            - Question must test practical, job-relevant knowledge
            - Options should be plausible but clearly distinguishable
            - Avoid ambiguous or trick questions
            - Include realistic distractors that test understanding
            - Explanation should be educational and concise

            Example Structure:
            \`\`\`json
            {
              "id": "q${questionIndex || 1}",
              "type": "multiple_choice",
              "question": "Cosa rappresenta il DOM in JavaScript?",
              "options": [
                "Document Object Model",
                "Data Object Management", 
                "Dynamic Object Mapping",
                "Distributed Object Method"
              ],
              "correctAnswer": 0,
              "keywords": ["DOM", "JavaScript", "web"],
              "explanation": "Il DOM (Document Object Model) è una rappresentazione strutturata del documento HTML che permette a JavaScript di manipolare il contenuto e la struttura della pagina."
            }
            \`\`\``;
  }

  buildUserPrompt(params: MultipleChoiceQuestionParams): string {
    const context = this.buildCommonContext(params);

    const specificRequirements = [];
    if (params.focusAreas?.length) {
      specificRequirements.push(`Focus areas: ${params.focusAreas.join(", ")}`);
    }
    if (params.distractorComplexity) {
      specificRequirements.push(
        `Distractor complexity: ${params.distractorComplexity}`
      );
    }

    return `${context}

            Create a multiple choice question with the following requirements:
            - Must be practical and job-relevant
            - Should test real-world application of skills
            - Appropriate for ${params.experienceLevel} level
            - Include 4 plausible options with clear distinctions

            ${
              specificRequirements.length > 0
                ? `
            Additional Requirements:
            ${specificRequirements.map((req) => `- ${req}`).join("\n")}
            `
                : ""
            }

            Generate exactly 1 multiple choice question following these specifications.`;
  }
}

class OpenQuestionPromptBuilder extends BasePromptBuilder {
  buildSystemPrompt(questionIndex?: number): string {
    const idFormat = `Format "q${questionIndex || 1}" (use "q${
      questionIndex || 1
    }" for this specific question)`;

    return `
            You are a technical recruitment expert specializing in creating open-ended assessment questions.

            Generate a valid JSON object for a single open question (NOT an array) that adheres to these specifications:

            REQUIRED FIELDS:
            - id: ${idFormat}
            - type: "open_question"
            - question: Italian text (clear, specific, and open-ended)
            - keywords: Array of relevant strings for evaluation (optional)
            - sampleAnswer: Italian text providing an example answer
            - sampleSolution: Valid code string if question involves coding (optional)
            - codeSnippet: Valid code string for context if needed (optional)
            - explanation: Italian text with evaluation guidance (optional)

            QUALITY REQUIREMENTS:
            - Question should encourage detailed, thoughtful responses
            - Allow for multiple valid approaches or answers
            - Test understanding of concepts, not just memorization
            - Provide clear evaluation criteria in sampleAnswer
            - Include code examples when relevant to the role

            Example Structure:
            \`\`\`json
            {
              "id": "q${questionIndex || 1}",
              "type": "open_question",
              "question": "Spiega come implementeresti la gestione dello stato in un'applicazione React complessa e giustifica la tua scelta.",
              "keywords": ["React", "state management", "Redux", "Context API", "architecture"],
              "sampleAnswer": "Una risposta completa dovrebbe includere: valutazione dei requisiti, confronto tra soluzioni (Redux, Context API, Zustand), considerazioni di performance, e esempi di implementazione appropriati per il caso d'uso specifico.",
              "explanation": "Valutare la comprensione dell'architettura React, capacità di analisi dei trade-off, e esperienza pratica con diverse soluzioni di state management."
            }
            \`\`\``;
  }

  buildUserPrompt(params: OpenQuestionParams): string {
    const context = this.buildCommonContext(params);

    const specificRequirements = [];
    if (params.requireCodeExample) {
      specificRequirements.push("Include code examples in the answer");
    }
    if (params.expectedResponseLength) {
      specificRequirements.push(
        `Expected response length: ${params.expectedResponseLength}`
      );
    }
    if (params.evaluationCriteria?.length) {
      specificRequirements.push(
        `Evaluation criteria: ${params.evaluationCriteria.join(", ")}`
      );
    }

    return `${context}

            Create an open question with the following requirements:
            - Must be practical and job-relevant
            - Should encourage detailed, thoughtful responses
            - Allow for multiple valid approaches
            - Appropriate for ${params.experienceLevel} level
            - Test conceptual understanding and practical experience

            ${
              specificRequirements.length > 0
                ? `
                  Additional Requirements:
                  ${specificRequirements.map((req) => `- ${req}`).join("\n")}
                  `
                : ""
            }

            Generate exactly 1 open question following these specifications.`;
  }
}

class CodeSnippetPromptBuilder extends BasePromptBuilder {
  buildSystemPrompt(questionIndex?: number): string {
    const idFormat = `Format "q${questionIndex || 1}" (use "q${
      questionIndex || 1
    }" for this specific question)`;

    return `
            You are a technical recruitment expert specializing in creating code-based assessment questions.

            Generate a valid JSON object for a single code snippet question (NOT an array) that adheres to these specifications:

            REQUIRED FIELDS:
            - id: ${idFormat}
            - type: "code_snippet"
            - question: Italian text asking to analyze, improve, or fix code (NO CODE in question text)
            - codeSnippet: Valid code string (may contain bugs, performance issues, or be suitable for improvement)
            - sampleSolution: Valid code string with the improved/corrected version
            - language: Programming language (e.g., "javascript", "python", "java") MUST be included
            - keywords: Array of relevant technical concepts (optional)
            - explanation: Italian text explaining the solution (optional)

            CRITICAL REQUIREMENT:
            - You MUST use the programming language specified in the user prompt
            - The "language" field MUST match the language requested by the user
            - Both codeSnippet and sampleSolution MUST be written in the specified language
            - Do NOT default to JavaScript unless explicitly requested

            QUALITY REQUIREMENTS:
            - Code should be realistic and job-relevant
            - If fixing bugs: bugs should be common mistakes developers make
            - If improving code: focus on best practices, performance, or readability
            - Solution should demonstrate professional coding standards
            - Include proper error handling where appropriate
            - Code complexity should match experience level

            Example Structures (adapt to requested language):

            JavaScript Bug Fix Example:
            \`\`\`json
            {
              "id": "q${questionIndex || 1}",
              "type": "code_snippet",
              "question": "Il seguente codice JavaScript presenta un bug che impedisce il corretto funzionamento asincrono. Identifica e correggi il problema.",
              "codeSnippet": "async function fetchUserData(userId) {\\n  const response = fetch(\`/api/users/\${userId}\`);\\n  const userData = await response.json();\\n  return userData;\\n}",
              "sampleSolution": "async function fetchUserData(userId) {\\n  const response = await fetch(\`/api/users/\${userId}\`);\\n  if (!response.ok) {\\n    throw new Error(\`HTTP error! status: \${response.status}\`);\\n  }\\n  const userData = await response.json();\\n  return userData;\\n}",
              "language": "javascript",
              "keywords": ["async/await", "fetch", "error handling", "Promise"],
              "explanation": "Il bug principale era la mancanza di 'await' prima di fetch(). La soluzione include anche la gestione degli errori HTTP per robustezza."
            }
            \`\`\`

            Python Code Improvement Example:
            \`\`\`json
            {
              "id": "q${questionIndex || 1}",
              "type": "code_snippet", 
              "question": "Il seguente codice Python funziona ma può essere migliorato per performance e leggibilità. Proponi una versione ottimizzata.",
              "codeSnippet": "def calculate_total(numbers):\\n    total = 0\\n    for i in range(len(numbers)):\\n        if numbers[i] > 0:\\n            total = total + numbers[i]\\n    return total",
              "sampleSolution": "def calculate_total(numbers):\\n    return sum(num for num in numbers if num > 0)",
              "language": "python",
              "keywords": ["list comprehension", "sum function", "pythonic code", "performance"],
              "explanation": "La versione migliorata usa una generator expression con la funzione sum(), che è più efficiente e pythonica."
            }
            \`\`\`

            REMEMBER: Use the EXACT programming language specified in the user prompt, not these examples!`;
  }

  buildUserPrompt(params: CodeSnippetQuestionParams): string {
    const context = this.buildCommonContext(params);

    // Determine the programming language to use
    // Explicit language parameter takes precedence over skills detection
    let targetLanguage = params.language;
    if (!targetLanguage) {
      // Fall back to detecting from skills
      const skills = params.skills.map((skill) => skill.toLowerCase());

      if (
        skills.some(
          (skill) =>
            skill.includes("javascript") ||
            skill.includes("js") ||
            skill.includes("node")
        )
      ) {
        targetLanguage = "javascript";
      } else if (
        skills.some(
          (skill) => skill.includes("typescript") || skill.includes("ts")
        )
      ) {
        targetLanguage = "typescript";
      } else if (skills.some((skill) => skill.includes("python"))) {
        targetLanguage = "python";
      } else if (skills.some((skill) => skill.includes("java"))) {
        targetLanguage = "java";
      } else if (
        skills.some((skill) => skill.includes("c#") || skill.includes("csharp"))
      ) {
        targetLanguage = "csharp";
      } else if (skills.some((skill) => skill.includes("php"))) {
        targetLanguage = "php";
      } else {
        targetLanguage = "javascript"; // Default fallback
      }
    }

    const specificRequirements = [];
    specificRequirements.push(`Programming language: ${targetLanguage}`);

    // Determine question type based on bugType parameter
    const hasBugType = params.bugType && params.bugType.trim() !== "";
    let questionType: string;
    let codeRequirements: string;

    if (hasBugType) {
      questionType = "bug fixing";
      codeRequirements = `- Include intentional ${params.bugType} bugs that are common in practice
                          - Provide a corrected solution demonstrating best practices
                          - Focus on practical debugging skills`;
      specificRequirements.push(`Bug type focus: ${params.bugType}`);
    } else {
      questionType = "code improvement/analysis";
      codeRequirements = `- Code should be functional but have room for improvement
                          - Focus on best practices, performance optimization, or code readability
                          - Provide an improved solution that demonstrates professional coding standards
                          - Focus on code quality and modern programming techniques`;
    }

    if (params.codeComplexity) {
      specificRequirements.push(`Code complexity: ${params.codeComplexity}`);
    }
    if (params.includeComments !== undefined) {
      specificRequirements.push(
        `Include comments: ${params.includeComments ? "yes" : "no"}`
      );
    }

    return `${context}

            Create a code snippet question with the following requirements:
            - Must contain realistic, job-relevant code in ${targetLanguage}
            - CRITICAL: Both codeSnippet and sampleSolution MUST be written in ${targetLanguage}
            - The "language" field MUST be set to "${targetLanguage}"
            ${codeRequirements}
            - Appropriate complexity for ${params.experienceLevel} level
            - Question type: ${questionType}

            ${
              specificRequirements.length > 0
                ? `
                  Additional Requirements:
                  ${specificRequirements.map((req) => `- ${req}`).join("\n")}
                  `
                : ""
            }

Generate exactly 1 code snippet question following these specifications.`;
  }
}

// Factory for prompt builders
class PromptBuilderFactory {
  static createBuilder(type: QuestionType): BasePromptBuilder {
    switch (type) {
      case "multiple_choice":
        return new MultipleChoicePromptBuilder();
      case "open_question":
        return new OpenQuestionPromptBuilder();
      case "code_snippet":
        return new CodeSnippetPromptBuilder();
      default:
        throw new Error(`Unsupported question type: ${type}`);
    }
  }
}

export class AIQuizService {
  private config: AIGenerationConfig;

  constructor(config: Partial<AIGenerationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Builds the appropriate system prompt for quiz generation
   * @returns The system prompt string for quiz generation
   */
  private buildQuizSystemPrompt(): string {
    return `
        You are a technical recruitment expert specializing in creating assessment quizzes. 
        Generate valid JSON that contains a questions array with individual question objects that adheres to the following specifications:
  
        Schema Requirements:
  
        1. Output must be parseable JSON
        2. Questions array must contain individual question objects
        3. All property names must be explicit and in English
        4. String values must use proper escape sequences
        5. No trailing commas allowed
  
        Question Types and Required Fields:
  
        1. Multiple Choice Questions (\`type: "multiple_choice"\`)
          - id: Format "q1" through "q10"
          - question: Italian text
          - options: Array of exactly 4 Italian strings
          - correctAnswer: Zero-based index number of the correct option
          - keywords: Array of relevant strings (optional)
          - explanation: Italian text (optional)
  
        2. Open Questions (\`type: "open_question"\`)
          - id: Format "q1" through "q10"
          - question: Italian text
          - keywords: Array of relevant strings (optional)
          - sampleAnswer: Italian text
          - sampleSolution: if the question is about writing code, provide a valid code string as a sample solution
          - codeSnippet: if the question is about writing code, provide a valid code string as a code snippet
          - explanation: Italian text (optional)
  
        3. Code Questions (\`type: "code_snippet"\`)
          - id: Format "q1" through "q10"
          - question: Italian text, must be code related and ask to fix bugs, don't include code in the question text do it in the codeSnippet field
          - codeSnippet: Valid code string, must be relevant to the question and contain a bug if the question is about fixing bugs,
          - sampleSolution: Valid code string, must be the corrected version of the code snippet
          - language: Programming language of the code snippet (e.g., "javascript", "python", "java") MUST be always included
  
        Content Rules:
  
        - All questions and answers must be in Italian
        - JSON structure and field names must be in English
        - Question text must not contain unescaped newlines
        - Omit optional fields if not applicable
        - The "options" field must never be written as "options>" or any variant
  
        Example Structure:

        \`\`\`json
        {
          "title": "Quiz per Sviluppatore Frontend Senior",
          "questions": [
            {
              "id": "q1",
              "type": "multiple_choice",
              "question": "Cosa rappresenta il DOM in JavaScript?",
              "options": [
                "Document Object Model",
                "Data Object Management",
                "Dynamic Object Mapping",
                "Distributed Object Method"
              ],
              "correctAnswer": 0,
              "keywords": ["DOM", "JavaScript", "web"],
              "explanation": "Il DOM (Document Object Model) è una rappresentazione strutturata del documento HTML che permette a JavaScript di manipolare il contenuto e la struttura della pagina."
            }
          ],
          "time_limit": 60,
          "difficulty": 3,
          "instructions": "Rispondi alle domande nel tempo limite specificato"
        }
        \`\`\`

        Ensure your output matches this exact format for seamless integration.
      `;
  }

  private buildQuizPrompt(params: GenerateQuizParams): string {
    const {
      positionTitle,
      experienceLevel,
      skills,
      description,
      quizTitle,
      questionCount,
      difficulty,
      includeMultipleChoice,
      includeOpenQuestions,
      includeCodeSnippets,
      instructions,
      previousQuestions = [],
    } = params;

    // Sanitize all inputs
    const sanitizedTitle = sanitizeInput(positionTitle);
    const sanitizedDescription = description ? sanitizeInput(description) : "";
    const sanitizedQuizTitle = sanitizeInput(quizTitle);
    const sanitizedInstructions = instructions
      ? sanitizeInput(instructions)
      : "";

    const questionTypes = [];
    if (includeMultipleChoice) questionTypes.push("multiple_choice");
    if (includeOpenQuestions) questionTypes.push("open_question");
    if (includeCodeSnippets) questionTypes.push("code_snippet");

    const prompt = `Create a technical quiz for the position "${sanitizedTitle}" with ${questionCount} questions.

                    Position Details:
                    - Experience Level: ${experienceLevel}
                    - Required Skills: ${skills.join(", ")}
                    ${
                      sanitizedDescription
                        ? `- Description: ${sanitizedDescription}`
                        : ""
                    }

                    Quiz Requirements:
                    - Title: ${sanitizedQuizTitle}
                    - Number of questions: ${questionCount}
                    - Difficulty level: ${difficulty}/5
                    - Question types to include: ${questionTypes.join(", ")}
                    ${
                      sanitizedInstructions
                        ? `- Special instructions: ${sanitizedInstructions}`
                        : ""
                    }

                    ${
                      previousQuestions.length > 0
                        ? `
                    Avoid repeating these existing questions:
                    ${previousQuestions
                      .map((q) => `- ${sanitizeInput(q.question)}`)
                      .join("\n")}
                    `
                        : ""
                    }

                    Important Guidelines:
                    1. Create practical, job-relevant questions
                    2. Ensure questions test real-world application of skills
                    3. For code questions, use realistic scenarios
                    4. Make multiple choice options plausible but clearly distinguishable
                    5. Provide clear, concise explanations for correct answers
                    6. Vary question difficulty within the specified range

                    Generate exactly ${questionCount} questions following these specifications.`;

    return prompt;
  }

  /**
   * Builds quiz generation prompt from parameters
   */

  async generateQuiz(
    params: GenerateQuizParams
  ): Promise<{ questions: Question[] }> {
    const startTime = performance.now();

    try {
      const model = getOptimalModel("quiz_generation", params.specificModel);
      const prompt = this.buildQuizPrompt(params);

      console.log(`Starting quiz generation with model: ${model}`);

      const result = await withTimeout(
        withRetry(async () => {
          try {
            const response = await generateObject({
              model: groq(model),
              prompt,
              system: this.buildQuizSystemPrompt(),
              schema: aiQuizGenerationSchema,
              temperature: 0.7,
              mode: "json",
              providerOptions: {
                groq: {
                  structuredOutputs: false,
                },
              },
            });

            if (
              !response.object ||
              !response.object.questions ||
              !response.object.title
            ) {
              throw new AIGenerationError(
                "Invalid response structure from AI model",
                AIErrorCode.INVALID_RESPONSE,
                { response }
              );
            }

            return response.object;
          } catch (error) {
            if (error instanceof NoObjectGeneratedError) {
              throw new AIGenerationError(
                "AI model failed to generate valid quiz structure",
                AIErrorCode.GENERATION_FAILED,
                { originalError: error.message }
              );
            }
            throw error;
          }
        }, this.config),
        this.config.timeout
      );

      const duration = performance.now() - startTime;
      console.log(`Quiz generation completed in ${duration.toFixed(2)}ms`);

      return {
        questions: convertToStrictQuestions(result.questions),
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(
        `Quiz generation failed after ${duration.toFixed(2)}ms:`,
        error
      );

      if (error instanceof AIGenerationError) {
        throw error;
      }

      // Try fallback models if available
      if (params.specificModel && this.config.fallbackModels.length > 0) {
        console.log("Attempting fallback models...");
        for (const fallbackModel of this.config.fallbackModels) {
          if (fallbackModel !== params.specificModel) {
            try {
              return await this.generateQuiz({
                ...params,
                specificModel: fallbackModel,
              });
            } catch {
              console.log(`Fallback model ${fallbackModel} also failed`);
              continue;
            }
          }
        }
      }

      throw new AIGenerationError(
        "All quiz generation attempts failed",
        AIErrorCode.GENERATION_FAILED,
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  async generateQuestion(params: GenerateQuestionParams): Promise<Question> {
    const startTime = performance.now();

    try {
      const model = getOptimalModel(
        "question_generation",
        params.specificModel
      );

      // Get the appropriate prompt builder for the question type
      const promptBuilder = PromptBuilderFactory.createBuilder(params.type);

      // Build system and user prompts using the type-specific builder
      const systemPrompt = promptBuilder.buildSystemPrompt(
        params.questionIndex
      );
      const userPrompt = promptBuilder.buildUserPrompt(params);

      const result = await withTimeout(
        withRetry(async () => {
          try {
            const response = await generateObject({
              model: groq(model),
              prompt: userPrompt,
              system: systemPrompt,
              schema: questionSchemas.flexible, // Use questionSchemas.flexible for single question
              temperature: 0.7,
              mode: "json",
              providerOptions: {
                groq: {
                  structuredOutputs: false,
                },
              },
            });

            if (!response.object) {
              throw new AIGenerationError(
                "Invalid response structure from AI model",
                AIErrorCode.INVALID_RESPONSE,
                { response }
              );
            }

            return response.object;
          } catch (error) {
            if (error instanceof NoObjectGeneratedError) {
              throw new AIGenerationError(
                "AI model failed to generate valid question structure",
                AIErrorCode.GENERATION_FAILED,
                { originalError: error.message }
              );
            }
            throw error;
          }
        }, this.config),
        this.config.timeout
      );

      const duration = performance.now() - startTime;
      console.log(`Question generation completed in ${duration.toFixed(2)}ms`);

      // Convert the single question result to strict type
      if (!result || !result.question) {
        throw new AIGenerationError(
          "No question generated in response",
          AIErrorCode.INVALID_RESPONSE,
          { result }
        );
      }

      const strictQuestions = convertToStrictQuestions([result]);
      return strictQuestions[0];
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(
        `Question generation failed after ${duration.toFixed(2)}ms:`,
        error
      );

      if (error instanceof AIGenerationError) {
        throw error;
      }

      // Try fallback models if available
      if (params.specificModel && this.config.fallbackModels.length > 0) {
        console.log("Attempting fallback models...");
        for (const fallbackModel of this.config.fallbackModels) {
          if (fallbackModel !== params.specificModel) {
            try {
              return await this.generateQuestion({
                ...params,
                specificModel: fallbackModel,
              });
            } catch {
              console.log(`Fallback model ${fallbackModel} also failed`);
              continue;
            }
          }
        }
      }

      throw new AIGenerationError(
        "All question generation attempts failed",
        AIErrorCode.GENERATION_FAILED,
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }
}

export interface GeneratePositionDescriptionParams {
  title: string;
  experienceLevel: string;
  skills: string[];
  softSkills?: string[];
  contractType?: string;
  currentDescription?: string;
  instructions?: string;
  specificModel?: string;
}

const descriptionSystemPrompt = `
You are a senior technical recruiter writing concise Italian job descriptions for a modern tech team.
Generate a short summary that highlights responsibilities, required experience, and why the role is compelling.
Return a single JSON object with only the field "description" containing Italian text between 2 and 4 sentences. Do not include any commentary or extra keys.
`;

const buildPositionDescriptionPrompt = (
  params: GeneratePositionDescriptionParams
): string => {
  const sanitizedTitle = sanitizeInput(params.title);
  const sanitizedSkills = params.skills.map(sanitizeInput).join(", ");
  const sanitizedSoftSkills = params.softSkills
    ? params.softSkills.map(sanitizeInput).join(", ")
    : "Non specificate";
  const sanitizedContract = params.contractType
    ? sanitizeInput(params.contractType)
    : "Non specificato";
  const sanitizedCurrentDescription = params.currentDescription
    ? sanitizeInput(params.currentDescription)
    : "";
  const sanitizedInstructions = params.instructions
    ? sanitizeInput(params.instructions)
    : "";

  return `
  Posizione:
  - Titolo: ${sanitizedTitle}
  - Livello di esperienza: ${params.experienceLevel}
  - Competenze tecniche: ${sanitizedSkills}
  - Soft skills: ${sanitizedSoftSkills}
  - Tipo di contratto: ${sanitizedContract}
  ${
    sanitizedCurrentDescription
      ? `\n  - Descrizione attuale: ${sanitizedCurrentDescription}`
      : ""
  }
  ${
    sanitizedInstructions
      ? `\n  - Istruzioni aggiuntive: ${sanitizedInstructions}`
      : ""
  }

  Scrivi una breve descrizione (2-4 frasi) in italiano che sintetizzi responsabilità, impatto atteso e aspetti distintivi della posizione. Rispondi esclusivamente con un oggetto JSON contenente il campo "description" e la stringa italiana richiesta.
  `;
};

export async function generatePositionDescription(
  params: GeneratePositionDescriptionParams
): Promise<string> {
  const startTime = performance.now();

  try {
    const model = getOptimalModel("simple_task", params.specificModel);
    const prompt = buildPositionDescriptionPrompt(params);

    const result = await withTimeout(
      withRetry(async () => {
        try {
          const response = await generateObject({
            model: groq(model),
            prompt,
            system: descriptionSystemPrompt,
            schema: positionDescriptionResponseSchema,
            temperature: 0.7,
            mode: "json",
            providerOptions: {
              groq: {
                structuredOutputs: false,
              },
            },
          });

          if (!response.object?.description) {
            throw new AIGenerationError(
              "Invalid description structure",
              AIErrorCode.INVALID_RESPONSE,
              { response }
            );
          }

          return response.object;
        } catch (error) {
          if (error instanceof NoObjectGeneratedError) {
            throw new AIGenerationError(
              "AI model failed to generate a description",
              AIErrorCode.GENERATION_FAILED,
              { originalError: error.message }
            );
          }
          throw error;
        }
      }, DEFAULT_CONFIG),
      DEFAULT_CONFIG.timeout
    );

    const duration = performance.now() - startTime;
    console.log(`Description generation completed in ${duration.toFixed(2)}ms`);

    return result.description.trim();
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(
      `Description generation failed after ${duration.toFixed(2)}ms:`,
      error
    );

    if (error instanceof AIGenerationError) {
      throw error;
    }

    if (params.specificModel && DEFAULT_CONFIG.fallbackModels.length > 0) {
      console.log("Attempting fallback models for description...");
      for (const fallbackModel of DEFAULT_CONFIG.fallbackModels) {
        if (fallbackModel !== params.specificModel) {
          try {
            return await generatePositionDescription({
              ...params,
              specificModel: fallbackModel,
            });
          } catch {
            console.log(
              `Fallback model ${fallbackModel} also failed for description`
            );
            continue;
          }
        }
      }
    }

    throw new AIGenerationError(
      "All description generation attempts failed",
      AIErrorCode.GENERATION_FAILED,
      {
        originalError: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

// Export a singleton instance for use throughout the application
export const aiQuizService = new AIQuizService();
