"use server";

import prisma from "@/lib/prisma";
import { LLM_MODELS } from "@/lib/services/ai/models";
import { logger } from "@/lib/services/logger";
import { acceptsAnswers } from "@/lib/utils/interview-utils";
import { groq } from "@ai-sdk/groq";
import { transcribe } from "ai";

/** Longest accepted recording (about 25 MB, the provider's own limit) */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/**
 * Transcribe a spoken answer.
 *
 * Candidate-facing, so there is no signed-in user: the interview token is the
 * credential, and it only works while that interview still accepts answers.
 */
export async function transcribeAudioAction(
  formData: FormData,
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const token = formData.get("token");
    const audioFile = formData.get("audio");

    if (typeof token !== "string" || !token) {
      return { success: false, error: "Colloquio non valido" };
    }

    if (!audioFile || !(audioFile instanceof Blob)) {
      return { success: false, error: "Nessun file audio fornito" };
    }

    if (audioFile.size > MAX_AUDIO_BYTES) {
      return { success: false, error: "La registrazione è troppo lunga" };
    }

    const interview = await prisma.interview.findUnique({
      where: { token },
      select: {
        status: true,
        startedAt: true,
        quiz: { select: { timeLimit: true } },
      },
    });

    if (
      !interview ||
      !acceptsAnswers({ ...interview, timeLimit: interview.quiz.timeLimit })
    ) {
      return { success: false, error: "Il colloquio non è più attivo" };
    }

    const { text: transcript } = await transcribe({
      model: groq.transcription(LLM_MODELS.WHISPER_LARGE_V3_TURBO),
      audio: new Uint8Array(await audioFile.arrayBuffer()),
    });

    return { success: true, text: transcript };
  } catch (error) {
    logger.error("Transcription error:", { error });
    return {
      success: false,
      error: "Trascrizione non riuscita. Riprova o scrivi la risposta.",
    };
  }
}
