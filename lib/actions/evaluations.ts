"use server";

import {
  EvaluationResult,
  evaluationResultSchema,
  FlexibleQuestion,
  overallEvaluationSchema,
} from "@/lib/schemas";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { groq } from "@ai-sdk/groq";
import { generateText, Output, wrapLanguageModel } from "ai";
import { aiLogger } from "../services/logger";
import { getOptimalModel, isDevelopment } from "../utils";

// Evaluation actions
export async function evaluateAnswer(
  question: FlexibleQuestion,
  answer: string,
  specificModel?: string
) {
  if (!question || !answer) {
    throw new Error("Missing required fields");
  }

  // Prepare the prompt based on question type
  let prompt = "";

  // Parse answer index for multiple choice - handle various formats
  const answerIndex = Number.parseInt(answer, 10);
  const isValidAnswerIndex =
    !isNaN(answerIndex) &&
    answerIndex >= 0 &&
    answerIndex < (question.options?.length || 0);
  const selectedOptionText = isValidAnswerIndex
    ? question.options?.[answerIndex]
    : null;
  const correctOptionText = question.options?.[question.correctAnswer ?? 0];
  const isCorrect =
    isValidAnswerIndex && answerIndex === question.correctAnswer;

  if (question.type === "multiple_choice") {
    prompt = `
          Evaluate this multiple choice answer:

          Question: ${question.question}
          Options available:
          ${question.options?.map((opt, idx) => `${idx}. ${opt}`).join("\n")}
          
          Candidate's selected option: ${
            isValidAnswerIndex
              ? `${answerIndex} - "${selectedOptionText}"`
              : "No valid option selected"
          }
          Correct option: ${
            question.correctAnswer ?? 0
          } - "${correctOptionText}"

          The answer is ${isCorrect ? "CORRECT" : "INCORRECT"}.
          ${question.explanation ? `Explanation: ${question.explanation}` : ""}

          IMPORTANT CONTEXT FOR EVALUATION:
          This is a multiple choice question where the candidate can ONLY select one option from the list.
          The candidate CANNOT add explanations, comments, or additional context - they can only click on one answer.
          
          Your evaluation should:
          - Focus ONLY on whether the selected option demonstrates understanding of the concept
          - ${
            isCorrect
              ? "Acknowledge the correct choice and the knowledge it demonstrates"
              : "Explain why the correct answer is better and what misconception the wrong choice might indicate"
          }
          - DO NOT criticize lack of depth, explanation, or elaboration - this format doesn't allow for it
          - DO NOT suggest the candidate should have "gone deeper" or "provided more context"
          - Evaluate based on the binary choice made, not on what they could have explained
          
          Scoring guide for multiple choice:
          - Correct answer: 8-10 points (based on question difficulty)
          - Incorrect answer: 0-4 points (partial credit if the wrong answer shows some related understanding)
          `;
  } else if (question.type === "open_question") {
    prompt = `
          Evaluate this open-ended answer:

          Question: ${question.question}
          Candidate's answer: "${answer}"
          ${
            question.sampleAnswer
              ? `Sample answer: "${question.sampleAnswer}"`
              : ""
          }
          ${
            question.keywords && question.keywords.length > 0
              ? `Keywords to look for: ${question.keywords.join(", ")}`
              : ""
          }
          
          EVALUATION CONTEXT:
          This is an open question where the candidate can write a detailed response.
          Here you CAN and SHOULD evaluate:
          - Depth and completeness of the explanation
          - Technical accuracy and correctness
          - Clarity of expression and communication
          - Coverage of key concepts and keywords
          - Practical examples or real-world application (if relevant)

          Provide a detailed evaluation considering:
          1. Technical correctness - Is the answer factually accurate?
          2. Completeness - Did they cover all important aspects?
          3. Clarity of expression - Is it well-articulated?
          4. Presence of key concepts - Did they mention important keywords/ideas?
          `;
  } else if (question.type === "code_snippet") {
    prompt = `
          Evaluate this code solution:

          Question: ${question.question}
          ${
            question.codeSnippet
              ? `Original code to analyze/fix:\n\`\`\`${
                  question.language ? question.language : ""
                }\n${question.codeSnippet}\n\`\`\``
              : ""
          }
          
          Candidate's code:
          \`\`\`${question.language ? question.language : ""}
          ${answer}
          \`\`\`

          ${
            question.sampleSolution
              ? `Sample solution:\n\`\`\`${
                  question.language ? question.language : ""
                }\n${question.sampleSolution}\n\`\`\``
              : ""
          }

          EVALUATION CONTEXT:
          This is a code question where the candidate writes/modifies code.
          ${
            question.language
              ? `Programming language: ${question.language}`
              : ""
          }
          Evaluate the code quality and correctness, considering:
          
          1. Functional correctness - Does it solve the problem correctly?
          2. Bug fixes - If the question was about fixing bugs, were they identified and fixed?
          3. Code quality - Readability, naming conventions, structure
          4. Algorithm efficiency - Is the approach reasonably efficient?
          5. Error handling - Are edge cases considered?
          6. Best practices - Does it follow good coding conventions?
          
          Note: Minor syntax differences from the sample solution are acceptable if the logic is correct.
          `;
  }

  prompt += ` 

  IMPORTANT: Your response must be valid JSON that exactly matches this structure:
  {
    "evaluation": "Your detailed evaluation text here",
    "score": 7,
    "strengths": ["First strength", "Second strength"],
    "weaknesses": ["First weakness", "Second weakness"]
  }
  The values of the fields must be in italian.
  Do not include any other fields, nested objects, or additional formatting.`;

  // Use Groq to evaluate the answer with generateText
  // Use zero temperature for deterministic, reproducible evaluations
  const aiModel = groq(getOptimalModel("evaluation", specificModel));

  const devToolsEnabledModel = wrapLanguageModel({
    model: aiModel,
    middleware: devToolsMiddleware(),
  });
  try {
    const { output: result } = await generateText({
      model: isDevelopment ? devToolsEnabledModel : aiModel,
      prompt,
      system:
        "You are an expert technical evaluator. You must respond ONLY with valid JSON matching the exact schema: {evaluation: string, score: number, strengths: string[], weaknesses: string[]}. No additional text, formatting, or nested objects.",
      output: Output.object({ schema: evaluationResultSchema }),
      temperature: 0.0, // Zero temperature for deterministic, reproducible evaluations
      seed: 42, // Fixed seed for reproducible results
      providerOptions: {
        groq: {
          structuredOutputs: false, // Using json mode instead for broader model compatibility
        },
      },
    });

    return {
      ...result,
      maxScore: 10,
    } as EvaluationResult & { maxScore: number };
  } catch (error) {
    aiLogger.warn("Primary model failed for evaluation, trying fallback", {
      error,
      questionType: question.type,
    });

    // Fallback to a different stable model if the primary fails
    const fallbackModel = "llama-3.1-8b-instant"; // Fast and reliable model

    const aiModel = groq(fallbackModel);

    const devToolsEnabledModel = wrapLanguageModel({
      model: aiModel,
      middleware: devToolsMiddleware(),
    });

    try {
      const { output: result } = await generateText({
        model: isDevelopment ? devToolsEnabledModel : aiModel,
        prompt,
        system:
          "You are an expert technical evaluator. You must respond ONLY with valid JSON matching the exact schema: {evaluation: string, score: number, strengths: string[], weaknesses: string[]}. No additional text, formatting, or nested objects.",
        output: Output.object({ schema: evaluationResultSchema }),
        temperature: 0.0, // Zero temperature for deterministic evaluations
        seed: 42, // Fixed seed for reproducible results
        providerOptions: {
          groq: {
            structuredOutputs: false,
          },
        },
      });

      return {
        ...result,
        maxScore: 10,
      } as EvaluationResult & { maxScore: number };
    } catch (fallbackError) {
      aiLogger.error("Fallback model also failed for evaluation", {
        error: fallbackError,
        questionType: question.type,
      });

      // Provide more specific error message based on error type
      let errorMessage = "Evaluation service temporarily unavailable";
      if (fallbackError instanceof Error) {
        if (fallbackError.message.includes("rate limit")) {
          errorMessage =
            "Rate limit exceeded. Please try again in a few minutes.";
        } else if (fallbackError.message.includes("Internal Server Error")) {
          errorMessage =
            "AI service is experiencing issues. Please try again later.";
        } else {
          errorMessage = `Evaluation failed: ${fallbackError.message}`;
        }
      }

      throw new Error(errorMessage);
    }
  }
}

export async function generateOverallEvaluation(
  candidateName: string,
  answeredCount: number,
  totalCount: number,
  percentageScore: number,
  evaluations: Record<string, EvaluationResult>,
  specificModel?: string
) {
  // Extract strengths and weaknesses from evaluations
  const allStrengths: string[] = [];
  const allWeaknesses: string[] = [];

  Object.values(evaluations).forEach((evaluationItem: EvaluationResult) => {
    if (evaluationItem.strengths)
      allStrengths.push(...evaluationItem.strengths);
    if (evaluationItem.weaknesses)
      allWeaknesses.push(...evaluationItem.weaknesses);
  });

  // Prepare the prompt for overall evaluation
  const prompt = `
                  Provide an overall evaluation of candidate ${candidateName} based on their technical quiz responses.

                  The candidate answered ${answeredCount} questions out of ${totalCount}.
                  The overall score is ${percentageScore}%.

                  Identified strengths:
                  ${allStrengths.map((s) => `- ${s}`).join("\n")}

                  Areas for improvement:
                  ${allWeaknesses.map((w) => `- ${w}`).join("\n")}

                  Provide a detailed evaluation of the candidate's skills, highlighting strengths and areas for improvement.
                  Include a recommendation on how to proceed with this candidate (e.g., proceed with a live interview, consider for another position, etc.).
                  
                  You must return a JSON object with these exact field names:
                  - evaluation: string (detailed evaluation)
                  - strengths: array of strings
                  - weaknesses: array of strings  
                  - recommendation: string
                  - fitScore: number (0-100, overall fit score for the position)

                  the values of the fields must be in italian.
                  `;

  // Generate overall evaluation using AI
  // Use zero temperature for deterministic, reproducible evaluations
  try {
    const aiModel = groq(getOptimalModel("overall_evaluation", specificModel));

    const devToolsEnabledModel = wrapLanguageModel({
      model: aiModel,
      middleware: devToolsMiddleware(),
    });
    const { output: result } = await generateText({
      model: isDevelopment ? devToolsEnabledModel : aiModel,
      prompt,
      system:
        "You are an expert technical recruiter who provides objective and constructive candidate evaluations. Base your evaluation exclusively on the provided information and return responses in Italian.",
      output: Output.object({ schema: overallEvaluationSchema }),
      temperature: 0.0, // Zero temperature for deterministic evaluations
      seed: 42, // Fixed seed for reproducible results
      providerOptions: {
        groq: {
          structuredOutputs: false, // Using json mode instead for broader model compatibility
        },
      },
    });

    return result;
  } catch (error) {
    aiLogger.warn(
      "Primary model failed for overall evaluation, trying fallback",
      { error, candidateName }
    );

    // Fallback to a different stable model if the primary fails
    const fallbackModel = "llama-3.1-8b-instant";

    try {
      const aiModel = groq(fallbackModel);

      const devToolsEnabledModel = wrapLanguageModel({
        model: aiModel,
        middleware: devToolsMiddleware(),
      });

      const { output: result } = await generateText({
        model: isDevelopment ? devToolsEnabledModel : aiModel,
        prompt,
        system:
          "You are an expert technical recruiter who provides objective and constructive candidate evaluations. Base your evaluation exclusively on the provided information and return responses in Italian.",
        output: Output.object({ schema: overallEvaluationSchema }),
        temperature: 0.0, // Zero temperature for deterministic evaluations
        seed: 42, // Fixed seed for reproducible results
        providerOptions: {
          groq: {
            structuredOutputs: false,
          },
        },
      });

      return result;
    } catch (fallbackError) {
      aiLogger.error("Fallback model also failed for overall evaluation", {
        error: fallbackError,
        candidateName,
      });

      // Provide more specific error message based on error type
      let errorMessage = "Overall evaluation service temporarily unavailable";
      if (fallbackError instanceof Error) {
        if (fallbackError.message.includes("rate limit")) {
          errorMessage =
            "Rate limit exceeded. Please try again in a few minutes.";
        } else if (fallbackError.message.includes("Internal Server Error")) {
          errorMessage =
            "AI service is experiencing issues. Please try again later.";
        } else {
          errorMessage = `Overall evaluation failed: ${fallbackError.message}`;
        }
      }

      throw new Error(errorMessage);
    }
  }
}
