/**
 * Resume evaluation
 *
 * Evaluates a Candidate's resume against a Position. Split in two steps so
 * the model output can be streamed to the browser in between:
 *   prepareResumeEvaluation -> (stream the model) -> saveResumeEvaluation
 */

import prisma from "../prisma";
import { overallEvaluationSchema } from "../schemas";
import {
  buildResumeEvaluationPrompt,
  RESUME_EVALUATION_SYSTEM_PROMPT,
} from "./ai/evaluation-prompts";
import { aiLogger } from "./logger";

/** A request that cannot be fulfilled; `status` is the HTTP status to return. */
export class ResumeEvaluationError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 409,
  ) {
    super(message);
    this.name = "ResumeEvaluationError";
  }
}

/** Extract text from a PDF using unpdf (serverless-compatible) */
export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });

    return text || "";
  } catch (error) {
    aiLogger.error("Failed to extract text from PDF", { error });
    throw new Error(
      `Impossibile leggere il curriculum: ${
        error instanceof Error ? error.message : "Errore sconosciuto"
      }`,
    );
  }
}

/** Remove markdown code fences from a model response, if present */
export function cleanJsonResponse(text: string): string {
  let jsonText = text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3);
  }
  return jsonText.trim();
}

/**
 * Check that the evaluation can be generated and build its prompt.
 * Throws ResumeEvaluationError when it cannot.
 */
export async function prepareResumeEvaluation(
  candidateId: string,
  positionId: string,
) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { id: true, firstName: true, lastName: true, resumeUrl: true },
  });

  if (!candidate) {
    throw new ResumeEvaluationError("Candidato non trovato", 404);
  }

  if (!candidate.resumeUrl) {
    throw new ResumeEvaluationError(
      "Il candidato non ha un curriculum caricato. Carica un curriculum prima di generare la valutazione.",
      400,
    );
  }

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: {
      id: true,
      title: true,
      description: true,
      experienceLevel: true,
      skills: true,
      softSkills: true,
    },
  });

  if (!position) {
    throw new ResumeEvaluationError("Posizione non trovata", 404);
  }

  const existingEvaluation = await prisma.evaluation.findFirst({
    where: { candidateId, positionId, interviewId: null },
    select: { id: true },
  });

  if (existingEvaluation) {
    throw new ResumeEvaluationError(
      "Esiste già una valutazione per questo candidato e questa posizione",
      409,
    );
  }

  const resumeText = await extractTextFromPDF(candidate.resumeUrl);

  if (!resumeText || resumeText.trim().length < 50) {
    throw new ResumeEvaluationError(
      "Impossibile estrarre testo sufficiente dal curriculum. Assicurati che il PDF contenga testo selezionabile.",
      400,
    );
  }

  return {
    candidateId: candidate.id,
    positionId: position.id,
    title: position.title,
    system: RESUME_EVALUATION_SYSTEM_PROMPT,
    prompt: buildResumeEvaluationPrompt({
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      resumeText,
      position,
    }),
  };
}

/**
 * Parse the model's full text response and store it as an Evaluation.
 * Throws when the response is not a valid evaluation.
 */
export async function saveResumeEvaluation(params: {
  candidateId: string;
  positionId: string;
  title: string;
  responseText: string;
  userId: string;
}) {
  const parsed = overallEvaluationSchema.parse(
    JSON.parse(cleanJsonResponse(params.responseText)),
  );

  return prisma.evaluation.create({
    data: {
      title: params.title,
      candidateId: params.candidateId,
      positionId: params.positionId,
      evaluation: parsed.evaluation,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      recommendation: parsed.recommendation,
      fitScore: Math.round(parsed.fitScore / 10), // 0-100 -> 0-10
      createdBy: params.userId,
    },
    select: { id: true },
  });
}
