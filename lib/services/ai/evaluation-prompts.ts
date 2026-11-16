/**
 * Evaluation prompts
 *
 * Prompt builders for scoring assessment answers, summarising an assessment
 * and evaluating a resume against a position.
 */

import type { EvaluationResult, FlexibleQuestion } from "../../schemas";

export const ANSWER_EVALUATION_SYSTEM_PROMPT =
  "You are an expert technical evaluator. You must respond ONLY with valid JSON matching the exact schema: {evaluation: string, score: number, strengths: string[], weaknesses: string[]}. No additional text, formatting, or nested objects.";

export const OVERALL_EVALUATION_SYSTEM_PROMPT =
  "You are an expert technical recruiter who provides objective and constructive candidate evaluations. Base your evaluation exclusively on the provided information and return responses in Italian.";

export const RESUME_EVALUATION_SYSTEM_PROMPT =
  "Sei un esperto recruiter tecnico che valuta candidati in modo oggettivo e costruttivo. Basa la tua valutazione esclusivamente sulle informazioni fornite nel curriculum. Rispondi sempre in italiano. Rispondi SOLO con JSON valido.";

/** Resume text beyond this length is cut (models have a 131K context). */
export const MAX_RESUME_CHARS = 80000;

/**
 * Prompt asking the model to score one answer.
 * `answer` is the candidate's answer as text; for multiple choice it is the
 * index of the selected option.
 */
export function buildAnswerEvaluationPrompt(
  question: FlexibleQuestion,
  answer: string,
): string {
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
  } else if (question.type === "behavioral_scenario") {
    prompt = `
          Evaluate this behavioral scenario response:

          Scenario: ${question.question}
          Candidate's answer: "${answer}"
          ${
            question.sampleAnswer
              ? `Sample strong response: "${question.sampleAnswer}"`
              : ""
          }
          ${
            question.keywords && question.keywords.length > 0
              ? `Evaluation themes: ${question.keywords.join(", ")}`
              : ""
          }

          EVALUATION CONTEXT:
          This is a behavioral or situational question. Evaluate:
          1. Judgment and decision-making
          2. Communication and clarity
          3. Collaboration and stakeholder awareness
          4. Risk awareness and trade-offs
          5. Practicality of the proposed approach

          Focus on reasoning and maturity appropriate to the role.
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

  return prompt;
}

/**
 * Prompt asking the model for the overall assessment evaluation.
 */
export function buildOverallEvaluationPrompt(params: {
  candidateName: string;
  answeredCount: number;
  totalCount: number;
  percentageScore: number;
  evaluations: Pick<EvaluationResult, "strengths" | "weaknesses">[];
}): string {
  const { candidateName, answeredCount, totalCount, percentageScore } = params;

  const allStrengths = params.evaluations.flatMap((e) => e.strengths ?? []);
  const allWeaknesses = params.evaluations.flatMap((e) => e.weaknesses ?? []);

  return `
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
}

/**
 * Prompt asking the model to evaluate a resume against a position.
 * The response is streamed as text, so the JSON shape is spelled out.
 */
export function buildResumeEvaluationPrompt(params: {
  candidateName: string;
  resumeText: string;
  position: {
    title: string;
    description: string | null;
    experienceLevel: string;
    skills: string[];
    softSkills: string[];
  };
}): string {
  const { candidateName, resumeText, position } = params;
  const truncatedResume = resumeText.substring(0, MAX_RESUME_CHARS);
  const resumeSuffix =
    resumeText.length > MAX_RESUME_CHARS ? "... [troncato]" : "";

  return `Analizza il seguente curriculum vitae e valuta l'idoneità del candidato per la posizione specificata.

          CURRICULUM DEL CANDIDATO (${candidateName}):
          ${truncatedResume}${resumeSuffix}

          POSIZIONE DA VALUTARE:
          - Titolo: ${position.title}
          - Livello di esperienza richiesto: ${position.experienceLevel}
          - Competenze tecniche richieste: ${position.skills.join(", ")}
          - Soft skills richieste: ${position.softSkills.join(", ")}
          ${
            position.description ? `- Descrizione: ${position.description}` : ""
          }

          Fornisci una valutazione dettagliata considerando:
          1. Corrispondenza delle competenze tecniche
          2. Esperienza lavorativa rilevante
          3. Livello di esperienza rispetto a quanto richiesto
          4. Soft skills e caratteristiche personali evidenziate
          5. Formazione e certificazioni pertinenti
          6. Potenziale di crescita e adattabilità

          Rispondi con un oggetto JSON contenente:
          - evaluation: una valutazione dettagliata in italiano
          - strengths: array di punti di forza del candidato
          - weaknesses: array di aree di miglioramento o lacune
          - recommendation: una raccomandazione su come procedere con il candidato
          - fitScore: un punteggio da 0 a 100 che indica l'idoneità complessiva per la posizione

          IMPORTANTE: Rispondi SOLO con un oggetto JSON valido, senza markdown o altri formati. L'oggetto deve avere questa struttura esatta:
          {
            "evaluation": "testo della valutazione",
            "strengths": ["punto 1", "punto 2", ...],
            "weaknesses": ["punto 1", "punto 2", ...],
            "recommendation": "testo della raccomandazione",
            "fitScore": numero da 0 a 100
          }`;
}
