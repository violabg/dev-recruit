"use server";

import { groq } from "@ai-sdk/groq";
import { generateText, Output, wrapLanguageModel } from "ai";
import { requireUser } from "../auth-server";
import prisma from "../prisma";
import {
  hiringNotesSchema,
  overallEvaluationSchema,
  type OverallEvaluation,
} from "../schemas";
import { aiLogger, logger } from "../services/logger";
import { getOptimalModel, isDevelopment } from "../utils";
import { invalidateEvaluationCache } from "../utils/cache-utils";

// PDF parsing using unpdf (serverless-compatible)
async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    // Fetch the PDF file from the URL
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Use unpdf which is designed for serverless environments
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });

    return text || "";
  } catch (error) {
    aiLogger.error("Failed to extract text from PDF", { error, pdfUrl });
    throw new Error(
      `Impossibile leggere il curriculum: ${
        error instanceof Error ? error.message : "Errore sconosciuto"
      }`,
    );
  }
}

// Generate resume-based evaluation using AI
async function generateResumeEvaluation(
  resumeText: string,
  position: {
    title: string;
    description: string | null;
    experienceLevel: string;
    skills: string[];
    softSkills: string[];
  },
  candidateName: string,
  specificModel?: string,
): Promise<OverallEvaluation> {
  const prompt = `
    Analizza il seguente curriculum vitae e valuta l'idoneità del candidato per la posizione specificata.

    CURRICULUM DEL CANDIDATO (${candidateName}):
    ${resumeText.substring(0, 8000)} ${
      resumeText.length > 8000 ? "... [troncato]" : ""
    }

    POSIZIONE DA VALUTARE:
    - Titolo: ${position.title}
    - Livello di esperienza richiesto: ${position.experienceLevel}
    - Competenze tecniche richieste: ${position.skills.join(", ")}
    - Soft skills richieste: ${position.softSkills.join(", ")}
    ${position.description ? `- Descrizione: ${position.description}` : ""}

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
  `;

  const aiModel = groq(getOptimalModel("resume_evaluation", specificModel));

  let model = aiModel;
  if (isDevelopment) {
    const { devToolsMiddleware } = await import("@ai-sdk/devtools");
    model = wrapLanguageModel({
      model: aiModel,
      middleware: devToolsMiddleware(),
    });
  }

  try {
    const { output: result } = await generateText({
      model,
      prompt,
      system:
        "Sei un esperto recruiter tecnico che valuta candidati in modo oggettivo e costruttivo. Basa la tua valutazione esclusivamente sulle informazioni fornite nel curriculum. Rispondi sempre in italiano.",
      output: Output.object({ schema: overallEvaluationSchema }),
      temperature: 0.0, // Zero temperature for deterministic, reproducible evaluations
      seed: 42, // Fixed seed for reproducible results
      providerOptions: {
        groq: {
          structuredOutputs: false, // Disable for preview models like KIMI
        },
      },
    });

    return result;
  } catch (error) {
    aiLogger.warn(
      "Primary model failed for resume evaluation, trying fallback",
      {
        error,
        candidateName,
      },
    );

    // Fallback model
    const fallbackModel = "llama-3.1-8b-instant";

    const aiModel = groq(fallbackModel);

    let model = aiModel;
    if (isDevelopment) {
      const { devToolsMiddleware } = await import("@ai-sdk/devtools");
      model = wrapLanguageModel({
        model: aiModel,
        middleware: devToolsMiddleware(),
      });
    }

    try {
      const { output: result } = await generateText({
        model,
        prompt,
        system:
          "Sei un esperto recruiter tecnico che valuta candidati in modo oggettivo e costruttivo. Basa la tua valutazione esclusivamente sulle informazioni fornite nel curriculum. Rispondi sempre in italiano.",
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
      logger.error("Fallback model also failed:", { error: fallbackError });
      throw new Error(
        "Servizio di valutazione temporaneamente non disponibile. Riprova più tardi.",
      );
    }
  }
}

// =====================
// EVALUATION ENTITY CRUD
// =====================

/**
 * Create an interview evaluation (AI-generated based on quiz answers)
 */
export async function createInterviewEvaluation(
  interviewId: string,
  aiEvaluation: OverallEvaluation,
  quizScore?: number,
) {
  const user = await requireUser();

  // Fetch interview with quiz info
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      quiz: { select: { title: true } },
      evaluation: { select: { id: true } },
    },
  });

  if (!interview) {
    throw new Error("Colloquio non trovato");
  }

  if (interview.evaluation) {
    throw new Error("Esiste già una valutazione per questo colloquio");
  }

  const evaluation = await prisma.evaluation.create({
    data: {
      title: interview.quiz.title,
      interviewId: interview.id,
      evaluation: aiEvaluation.evaluation,
      strengths: aiEvaluation.strengths,
      weaknesses: aiEvaluation.weaknesses,
      recommendation: aiEvaluation.recommendation,
      fitScore: Math.round(aiEvaluation.fitScore / 10), // Convert 0-100 to 0-10
      quizScore: quizScore, // Percentage score from quiz answers
      createdBy: user.id,
    },
  });

  invalidateEvaluationCache({
    evaluationId: evaluation.id,
    interviewId,
  });

  return evaluation;
}

/**
 * Create a candidate evaluation (AI-generated based on resume)
 */
export async function createCandidateEvaluation(
  candidateId: string,
  positionId: string,
) {
  const user = await requireUser();

  // Fetch candidate with resume URL
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      resumeUrl: true,
    },
  });

  if (!candidate) {
    throw new Error("Candidato non trovato");
  }

  if (!candidate.resumeUrl) {
    throw new Error(
      "Il candidato non ha un curriculum caricato. Carica un curriculum prima di generare la valutazione.",
    );
  }

  // Fetch position details
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
    throw new Error("Posizione non trovata");
  }

  // Check if evaluation already exists for this candidate-position combination
  const existingEvaluation = await prisma.evaluation.findFirst({
    where: {
      candidateId,
      positionId,
      interviewId: null, // Only resume evaluations
    },
  });

  if (existingEvaluation) {
    throw new Error(
      "Esiste già una valutazione per questo candidato e questa posizione",
    );
  }

  // Extract text from resume PDF
  const resumeText = await extractTextFromPDF(candidate.resumeUrl);

  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error(
      "Impossibile estrarre testo sufficiente dal curriculum. Assicurati che il PDF contenga testo selezionabile.",
    );
  }

  // Generate AI evaluation
  const candidateName = `${candidate.firstName} ${candidate.lastName}`;
  const aiEvaluation = await generateResumeEvaluation(
    resumeText,
    position,
    candidateName,
  );

  // Create evaluation record
  const evaluation = await prisma.evaluation.create({
    data: {
      title: position.title,
      candidateId: candidate.id,
      positionId: position.id,
      evaluation: aiEvaluation.evaluation,
      strengths: aiEvaluation.strengths,
      weaknesses: aiEvaluation.weaknesses,
      recommendation: aiEvaluation.recommendation,
      fitScore: Math.round(aiEvaluation.fitScore / 10), // Convert 0-100 to 0-10
      createdBy: user.id,
    },
  });

  invalidateEvaluationCache({
    evaluationId: evaluation.id,
    candidateId,
  });

  return evaluation;
}

/**
 * Update evaluation notes (manual notes field)
 */
export async function updateEvaluationNotes(id: string, notes: string) {
  const user = await requireUser();

  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    select: { id: true, interviewId: true, candidateId: true },
  });

  if (!evaluation) {
    throw new Error("Valutazione non trovata");
  }

  const updated = await prisma.evaluation.update({
    where: { id },
    data: { notes },
  });

  invalidateEvaluationCache({
    evaluationId: id,
    interviewId: evaluation.interviewId ?? undefined,
    candidateId: evaluation.candidateId ?? undefined,
  });

  return updated;
}

/**
 * Update hiring manager notes on an evaluation
 */
export async function updateHiringManagerNotesAction(input: unknown) {
  const user = await requireUser();
  const data = hiringNotesSchema.parse(input);

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: data.evaluationId },
    select: { id: true, interviewId: true, candidateId: true },
  });

  if (!evaluation) {
    throw new Error("Valutazione non trovata");
  }

  const updated = await prisma.evaluation.update({
    where: { id: data.evaluationId },
    data: {
      interviewNotes: data.interviewNotes,
      redFlags: data.redFlags ?? [],
      standoutMoments: data.standoutMoments ?? [],
      hireRecommendation: data.hireRecommendation,
      nextSteps: data.nextSteps,
      assessedBy: user.id,
      assessedAt: new Date(),
    },
  });

  invalidateEvaluationCache({
    evaluationId: updated.id,
    interviewId: evaluation.interviewId ?? undefined,
    candidateId: evaluation.candidateId ?? undefined,
  });

  return updated;
}

/**
 * Delete an evaluation
 */
export async function deleteEvaluation(id: string) {
  const user = await requireUser();

  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    select: { id: true, interviewId: true, candidateId: true },
  });

  if (!evaluation) {
    throw new Error("Valutazione non trovata");
  }

  await prisma.evaluation.delete({ where: { id } });

  invalidateEvaluationCache({
    evaluationId: id,
    interviewId: evaluation.interviewId ?? undefined,
    candidateId: evaluation.candidateId ?? undefined,
  });

  return { success: true };
}
