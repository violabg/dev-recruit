"use server";

import {
  EvaluationResult,
  evaluationResultSchema,
  FlexibleQuestion,
  overallEvaluationSchema,
} from "@/lib/schemas";
import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { getOptimalModel } from "../utils";

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
  if (question.type === "multiple_choice") {
    prompt = `
          Evaluate this multiple choice answer:

          Question: ${question.question}
          Candidate's selected option: "${answer}"
          Correct option: "${question.options?.[question.correctAnswer || 0]}"

          The answer is ${
            Number.parseInt(answer) === question.correctAnswer
              ? "correct"
              : "incorrect"
          }.
          Provide a detailed evaluation of the answer, explaining why it is correct or incorrect.
          Identify strengths and weaknesses in the candidate's understanding.
          You must respond with EXACTLY this JSON structure:
          {
          "evaluation": "detailed evaluation text here",
          "score": number_from_0_to_10,
          "strengths": ["strength1", "strength2"],
          "weaknesses": ["weakness1", "weakness2"]
          }
          `;
  } else if (question.type === "open_question") {
    prompt = `
          Evaluate this open-ended answer:

          Question: ${question.question}
          Candidate's answer: "${answer}"
          Sample answer: "${question.sampleAnswer}"
          ${
            question.keywords
              ? `Keywords to look for: ${question.keywords.join(", ")}`
              : ""
          }
          Provide a detailed evaluation of the answer, considering:
          1. Technical correctness
          2. Completeness
          3. Clarity of expression
          4. Presence of key words or important concepts

          You must respond with EXACTLY this JSON structure:
          {
            "evaluation": "detailed evaluation text here",
            "score": number_from_0_to_10,
            "strengths": ["strength1", "strength2"],
            "weaknesses": ["weakness1", "weakness2"]
          }
        `;
  } else if (question.type === "code_snippet") {
    prompt = `
              Evaluate this code snippet:

              Question: ${question.question}
              Candidate's code:
              \`\`\`
              ${answer}
              \`\`\`

              Sample solution:
              \`\`\`
              ${question.sampleSolution}
              \`\`\`

              Provide a detailed evaluation of the code, considering:
              1. Functional correctness
              2. Algorithm efficiency
              3. Code readability and style
              4. Error handling

              You must respond with EXACTLY this JSON structure:
              {
                "evaluation": "detailed evaluation text here",
                "score": number_from_0_to_10,
                "strengths": ["strength1", "strength2"],
                "weaknesses": ["weakness1", "weakness2"]
              }
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

  // Use Groq to evaluate the answer with generateObject
  const model = groq(getOptimalModel("evaluation", specificModel));
  try {
    const { object: result } = await generateObject({
      model,
      prompt,
      system:
        "You are an expert technical evaluator. You must respond ONLY with valid JSON matching the exact schema: {evaluation: string, score: number, strengths: string[], weaknesses: string[]}. No additional text, formatting, or nested objects.",
      schema: evaluationResultSchema,
      mode: "json",
      providerOptions: {
        groq: {
          structuredOutputs: false, // Disable for DeepSeek R1 - not supported
        },
      },
    });

    return {
      ...result,
      maxScore: 10,
    } as EvaluationResult & { maxScore: number };
  } catch (error) {
    console.error("Primary model failed, trying fallback model:", error);

    // Fallback to a different stable model if the primary fails
    const fallbackModel = "llama-3.1-8b-instant"; // Fast and reliable model

    try {
      const { object: result } = await generateObject({
        model: groq(fallbackModel),
        prompt,
        system:
          "You are an expert technical evaluator. You must respond ONLY with valid JSON matching the exact schema: {evaluation: string, score: number, strengths: string[], weaknesses: string[]}. No additional text, formatting, or nested objects.",
        schema: evaluationResultSchema,
        mode: "json",
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
      console.error("Fallback model also failed:", fallbackError);

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
  try {
    const { object: result } = await generateObject({
      model: groq(getOptimalModel("overall_evaluation", specificModel)),
      prompt,
      system:
        "You are an expert technical recruiter who provides objective and constructive candidate evaluations. Base your evaluation exclusively on the provided information and return responses in English.",
      schema: overallEvaluationSchema,
      mode: "json",
      providerOptions: {
        groq: {
          structuredOutputs: false, // Disable for DeepSeek R1 - not supported
        },
      },
    });

    return result;
  } catch (error) {
    console.error(
      "Primary model failed for overall evaluation, trying fallback:",
      error
    );

    // Fallback to a different stable model if the primary fails
    const fallbackModel = "llama-3.1-8b-instant";

    try {
      const { object: result } = await generateObject({
        model: groq(fallbackModel),
        prompt,
        system:
          "You are an expert technical recruiter who provides objective and constructive candidate evaluations. Base your evaluation exclusively on the provided information and return responses in English.",
        schema: overallEvaluationSchema,
        mode: "json",
        providerOptions: {
          groq: {
            structuredOutputs: false,
          },
        },
      });

      return result;
    } catch (fallbackError) {
      console.error(
        "Fallback model also failed for overall evaluation:",
        fallbackError
      );

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
