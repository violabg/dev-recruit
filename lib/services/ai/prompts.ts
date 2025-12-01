/**
 * AI Service Prompts
 *
 * Prompt builders for quiz and question generation.
 * Each question type has its own specialized prompt builder.
 */

import { sanitizeInput } from "./sanitize";
import type {
  BaseQuestionParams,
  CodeSnippetQuestionParams,
  GeneratePositionDescriptionParams,
  GenerateQuestionParams,
  GenerateQuizParams,
  MultipleChoiceQuestionParams,
  OpenQuestionParams,
} from "./types";

// ====================
// COMMON CONTEXT BUILDER
// ====================

/**
 * Builds common context shared across all question types
 */
function buildCommonContext(params: BaseQuestionParams): string {
  const sanitizedQuizTitle = sanitizeInput(params.quizTitle);
  const sanitizedPositionTitle = sanitizeInput(params.positionTitle);
  const sanitizedInstructions = params.instructions
    ? sanitizeInput(params.instructions)
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
            .map((q) => `- ${sanitizeInput(q.question)}`)
            .join("\n")}
          `
              : ""
          }`;
}

// ====================
// QUESTION TYPE PROMPT BUILDERS
// ====================

/**
 * Prompt builders for each question type
 */
export const questionPromptBuilders = {
  multiple_choice: {
    system: (questionIndex: number) => `
          You are a technical recruitment expert specializing in creating multiple choice assessment questions.

          Generate a valid JSON object for a single multiple choice question (NOT an array) that adheres to these specifications:

          REQUIRED FIELDS:
          - id: Format "q${questionIndex}" (use "q${questionIndex}" for this specific question)
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
            "id": "q${questionIndex}",
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
          \`\`\``,

    user: (params: MultipleChoiceQuestionParams): string => {
      const context = buildCommonContext(params);
      const requirements: string[] = [];

      if (params.focusAreas?.length) {
        requirements.push(`Focus areas: ${params.focusAreas.join(", ")}`);
      }
      if (params.distractorComplexity) {
        requirements.push(
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
            requirements.length > 0
              ? `Additional Requirements:\n${requirements
                  .map((r) => `- ${r}`)
                  .join("\n")}`
              : ""
          }

          Generate exactly 1 multiple choice question following these specifications.`;
    },
  },

  open_question: {
    system: (questionIndex: number) => `
          You are a technical recruitment expert specializing in creating open-ended assessment questions.

          Generate a valid JSON object for a single open question (NOT an array) that adheres to these specifications:

          REQUIRED FIELDS:
          - id: Format "q${questionIndex}" (use "q${questionIndex}" for this specific question)
          - type: "open_question"
          - question: Italian text (clear, specific, and open-ended)
          - keywords: Array of relevant strings for evaluation (optional)
          - sampleAnswer: Italian text providing an example answer
          - explanation: Italian text with evaluation guidance (optional)

          CRITICAL CONSTRAINT:
          - DO NOT ask questions that require writing blocks of code
          - Questions should focus on concepts, explanations, comparisons, architecture decisions, or problem-solving approaches
          - If code is relevant, ask candidates to EXPLAIN or DESCRIBE rather than WRITE code
          - Acceptable: "Spiega come funziona..." or "Descrivi l'approccio per..."
          - NOT acceptable: "Scrivi una funzione che..." or "Implementa un algoritmo per..."

          QUALITY REQUIREMENTS:
          - Question should encourage detailed, thoughtful explanations
          - Allow for multiple valid approaches or answers
          - Test understanding of concepts, not just memorization
          - Provide clear evaluation criteria in sampleAnswer
          - Focus on reasoning, trade-offs, and architectural thinking

          Example Structure:
          \`\`\`json
          {
            "id": "q${questionIndex}",
            "type": "open_question",
            "question": "Spiega i principali vantaggi e svantaggi dell'utilizzo di Redux rispetto a Context API per la gestione dello stato in un'applicazione React. In quali scenari consiglieresti l'uno rispetto all'altro?",
            "keywords": ["React", "state management", "Redux", "Context API", "architecture"],
            "sampleAnswer": "Una risposta completa dovrebbe includere: scalabilità (Redux migliore per app complesse), debugging (Redux DevTools), boilerplate (Context API più semplice), performance (Context può causare re-render non necessari), middleware (Redux supporta middleware per side effects). Consigliare Redux per app grandi con stato complesso, Context API per stato semplice o localizzato.",
            "explanation": "Valutare la comprensione dell'architettura React, capacità di analisi dei trade-off, e esperienza pratica con diverse soluzioni di state management."
          }
          \`\`\``,

    user: (params: OpenQuestionParams): string => {
      const context = buildCommonContext(params);
      const requirements: string[] = [];

      if (params.expectedResponseLength) {
        requirements.push(
          `Expected response length: ${params.expectedResponseLength}`
        );
      }
      if (params.evaluationCriteria?.length) {
        requirements.push(
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
          
          IMPORTANT CONSTRAINT:
          - DO NOT create questions that ask to write blocks of code
          - Focus on explanations, comparisons, trade-offs, or architectural decisions
          - Ask candidates to EXPLAIN or DESCRIBE concepts, not to IMPLEMENT code

          ${
            requirements.length > 0
              ? `Additional Requirements:\n${requirements
                  .map((r) => `- ${r}`)
                  .join("\n")}`
              : ""
          }

          Generate exactly 1 open question following these specifications.`;
    },
  },

  code_snippet: {
    system: (questionIndex: number) => `
          You are a technical recruitment expert specializing in creating code-based assessment questions.

          Generate a valid JSON object for a single code snippet question (NOT an array) that adheres to these specifications:

          REQUIRED FIELDS:
          - id: Format "q${questionIndex}" (use "q${questionIndex}" for this specific question)
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

          Example (JavaScript):
          \`\`\`json
          {
            "id": "q${questionIndex}",
            "type": "code_snippet",
            "question": "Il seguente codice JavaScript presenta un bug che impedisce il corretto funzionamento asincrono. Identifica e correggi il problema.",
            "codeSnippet": "async function fetchUserData(userId) {\\n  const response = fetch(\`/api/users/\${userId}\`);\\n  const userData = await response.json();\\n  return userData;\\n}",
            "sampleSolution": "async function fetchUserData(userId) {\\n  const response = await fetch(\`/api/users/\${userId}\`);\\n  if (!response.ok) {\\n    throw new Error(\`HTTP error! status: \${response.status}\`);\\n  }\\n  const userData = await response.json();\\n  return userData;\\n}",
            "language": "javascript",
            "keywords": ["async/await", "fetch", "error handling", "Promise"],
            "explanation": "Il bug principale era la mancanza di 'await' prima di fetch(). La soluzione include anche la gestione degli errori HTTP per robustezza."
          }
          \`\`\`

          REMEMBER: Use the EXACT programming language specified in the user prompt!`,

    user: (params: CodeSnippetQuestionParams): string => {
      const context = buildCommonContext(params);

      // Determine the programming language
      let targetLanguage = params.language;
      if (!targetLanguage) {
        const skills = params.skills.map((s) => s.toLowerCase());
        if (
          skills.some(
            (s) =>
              s.includes("javascript") || s.includes("js") || s.includes("node")
          )
        ) {
          targetLanguage = "javascript";
        } else if (
          skills.some((s) => s.includes("typescript") || s.includes("ts"))
        ) {
          targetLanguage = "typescript";
        } else if (skills.some((s) => s.includes("python"))) {
          targetLanguage = "python";
        } else if (skills.some((s) => s.includes("java"))) {
          targetLanguage = "java";
        } else if (
          skills.some((s) => s.includes("c#") || s.includes("csharp"))
        ) {
          targetLanguage = "csharp";
        } else if (skills.some((s) => s.includes("php"))) {
          targetLanguage = "php";
        } else {
          targetLanguage = "javascript";
        }
      }

      const requirements = [`Programming language: ${targetLanguage}`];
      const hasBugType = params.bugType && params.bugType.trim() !== "";

      let questionType: string;
      let codeRequirements: string;

      if (hasBugType) {
        questionType = "bug fixing";
        codeRequirements = `- Include intentional ${params.bugType} bugs that are common in practice
          - Provide a corrected solution demonstrating best practices
          - Focus on practical debugging skills`;
        requirements.push(`Bug type focus: ${params.bugType}`);
      } else {
        questionType = "code improvement/analysis";
        codeRequirements = `- Code should be functional but have room for improvement
          - Focus on best practices, performance optimization, or code readability
          - Provide an improved solution that demonstrates professional coding standards`;
      }

      if (params.codeComplexity) {
        requirements.push(`Code complexity: ${params.codeComplexity}`);
      }
      if (params.includeComments !== undefined) {
        requirements.push(
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

          Additional Requirements:
          ${requirements.map((r) => `- ${r}`).join("\n")}

          Generate exactly 1 code snippet question following these specifications.`;
    },
  },
} as const;

/**
 * Builds system and user prompts for a specific question type.
 * Handles type narrowing to ensure proper parameter matching.
 */
export function buildQuestionPrompts(params: GenerateQuestionParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  switch (params.type) {
    case "multiple_choice":
      return {
        systemPrompt: questionPromptBuilders.multiple_choice.system(
          params.questionIndex
        ),
        userPrompt: questionPromptBuilders.multiple_choice.user(params),
      };
    case "open_question":
      return {
        systemPrompt: questionPromptBuilders.open_question.system(
          params.questionIndex
        ),
        userPrompt: questionPromptBuilders.open_question.user(params),
      };
    case "code_snippet":
      return {
        systemPrompt: questionPromptBuilders.code_snippet.system(
          params.questionIndex
        ),
        userPrompt: questionPromptBuilders.code_snippet.user(params),
      };
    default:
      throw new Error(
        `Unsupported question type: ${(params as GenerateQuestionParams).type}`
      );
  }
}

// ====================
// QUIZ PROMPT BUILDERS
// ====================

/**
 * Builds the system prompt for quiz generation
 */
export function buildQuizSystemPrompt(): string {
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

/**
 * Builds the user prompt for quiz generation
 */
export function buildQuizPrompt(params: GenerateQuizParams): string {
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
  const sanitizedInstructions = instructions ? sanitizeInput(instructions) : "";

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

// ====================
// POSITION DESCRIPTION PROMPT
// ====================

/**
 * Builds prompt for position description generation
 */
export function buildPositionDescriptionPrompt(
  params: GeneratePositionDescriptionParams
): string {
  const sanitizedTitle = sanitizeInput(params.title);
  const sanitizedSkills = params.skills.map(sanitizeInput).join(", ");
  const sanitizedSoftSkills = params.softSkills
    ? params.softSkills.map(sanitizeInput).join(", ")
    : "Not specified";
  const sanitizedContract = params.contractType
    ? sanitizeInput(params.contractType)
    : "Not specified";
  const sanitizedCurrentDescription = params.currentDescription
    ? sanitizeInput(params.currentDescription)
    : "";
  const sanitizedInstructions = params.instructions
    ? sanitizeInput(params.instructions)
    : "";

  return `
          Position:
          - Title: ${sanitizedTitle}
          - Experience level: ${params.experienceLevel}
          - Technical skills: ${sanitizedSkills}
          - Soft skills: ${sanitizedSoftSkills}
          - Contract type: ${sanitizedContract}
          ${
            sanitizedCurrentDescription
              ? `\n- Current description: ${sanitizedCurrentDescription}`
              : ""
          }
          ${
            sanitizedInstructions
              ? `\n- Additional instructions: ${sanitizedInstructions}`
              : ""
          }

          You are a senior technical recruiter writing concise Italian job descriptions for a modern tech team.
          Generate a short summary that highlights responsibilities, required experience.
          Write only the description text in Italian (4-8 sentences). Do not include JSON, markdown, or any formatting - just the plain description text.
          `;
}
