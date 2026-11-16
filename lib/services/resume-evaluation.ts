/**
 * Resume evaluation
 *
 * Evaluates a Candidate's resume against a Position. Split in two steps so
 * the model output can be streamed to the browser in between:
 *   prepareResumeEvaluation -> (stream the model) -> saveResumeEvaluation
 */

import prisma from "../prisma";
import { Prisma } from "../prisma/client";
import {
  resumeEvaluationResultSchema,
  type CriteriaAssessment,
  type ResumeEvaluationResult,
} from "../schemas";
import { buildCriterionKeys } from "../utils/criterion-keys";
import {
  buildResumeEvaluationPrompt,
  RESUME_EVALUATION_SYSTEM_PROMPT,
} from "./ai/evaluation-prompts";
import { advanceApplicationStage, type StageChangeResult } from "./applications";
import { aiLogger } from "./logger";
import { getActiveCriteria } from "./scorecards";

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

  // A resume evaluation is evidence of an application
  const application = await prisma.application.findUnique({
    where: { candidateId_positionId: { candidateId, positionId } },
    select: { id: true },
  });

  if (!application) {
    throw new ResumeEvaluationError(
      "Il candidato non è candidato a questa posizione",
      404,
    );
  }

  const existingEvaluation = await prisma.evaluation.findFirst({
    where: { candidateId, positionId, assessmentId: null },
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

  // Active criteria of the position scorecard, listed to the model by key.
  // The key map travels to the save, so the stored ids are the ones the
  // prompt used even if the scorecard changes meanwhile.
  const criteria = await getActiveCriteria(position.id);
  const keyed = buildCriterionKeys(criteria);

  return {
    candidateId: candidate.id,
    positionId: position.id,
    applicationId: application.id,
    title: position.title,
    system: RESUME_EVALUATION_SYSTEM_PROMPT,
    prompt: buildResumeEvaluationPrompt({
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      resumeText,
      position,
      criteria: keyed.map(({ key, name, description, expectedLevel }) => ({
        key,
        name,
        description,
        expectedLevel,
      })),
    }),
    criterionKeys: keyed.map(({ id, key }) => ({ id, key })),
  };
}

/**
 * Assessment per criterion, keyed by criterion id, from the model output.
 * Unknown keys and repeated criteria are dropped; a score is rounded and
 * clamped to 1-5 (null = no evidence in the CV). When at least one item is
 * valid, every criterion the model skipped is stored as "no evidence", so the
 * result has one entry per criterion. Returns null when nothing is valid.
 */
export function buildCriteriaAssessment(
  items: ResumeEvaluationResult["criteriaAssessment"],
  criterionKeys: { id: string; key: string }[],
): CriteriaAssessment | null {
  if (criterionKeys.length === 0 || !items || items.length === 0) return null;

  const idByKey = new Map(
    criterionKeys.map(({ id, key }) => [key.trim().toUpperCase(), id]),
  );

  const assessment: CriteriaAssessment = {};
  for (const item of items) {
    const id = idByKey.get(item.criterionKey.trim().toUpperCase());
    if (!id || id in assessment) continue;

    assessment[id] = {
      score:
        item.score === null
          ? null
          : Math.min(5, Math.max(1, Math.round(item.score))),
      evidence: item.evidence.trim(),
    };
  }

  if (Object.keys(assessment).length === 0) return null;

  for (const { id } of criterionKeys) {
    if (!(id in assessment)) {
      assessment[id] = { score: null, evidence: "" };
    }
  }

  return assessment;
}

/**
 * Parse the model's full text response, store it as an Evaluation and advance
 * the application to screening, in one transaction.
 * Throws when the response is not a valid evaluation.
 */
export async function saveResumeEvaluation(params: {
  candidateId: string;
  positionId: string;
  applicationId: string;
  title: string;
  responseText: string;
  userId: string;
  /** Key map built by prepareResumeEvaluation (empty without criteria) */
  criterionKeys: { id: string; key: string }[];
}): Promise<{ id: string; stageChange: StageChangeResult }> {
  const parsed = resumeEvaluationResultSchema.parse(
    JSON.parse(cleanJsonResponse(params.responseText)),
  );

  const criteriaAssessment = buildCriteriaAssessment(
    parsed.criteriaAssessment,
    params.criterionKeys,
  );

  return prisma.$transaction(async (tx) => {
    const evaluation = await tx.evaluation.create({
      data: {
        title: params.title,
        candidateId: params.candidateId,
        positionId: params.positionId,
        evaluation: parsed.evaluation,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        recommendation: parsed.recommendation,
        fitScore: Math.round(parsed.fitScore / 10), // 0-100 -> 0-10
        criteriaAssessment: criteriaAssessment ?? Prisma.JsonNull,
        createdBy: params.userId,
      },
      select: { id: true },
    });

    const stageChange = await advanceApplicationStage(
      tx,
      params.applicationId,
      "cv_evaluated",
    );

    return { id: evaluation.id, stageChange };
  });
}
