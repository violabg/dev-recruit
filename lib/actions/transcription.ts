"use server";

import { logger } from "@/lib/services/logger";
import { LLM_MODELS } from "@/lib/utils";
import { groq } from "@ai-sdk/groq";
import { experimental_transcribe as transcribe } from "ai";

export async function transcribeAudioAction(
  formData: FormData
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return {
        success: false,
        error: "No audio file provided",
      };
    }

    // Convert Blob to Uint8Array for transcription
    const arrayBuffer = await audioFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { text: transcript } = await transcribe({
      model: groq.transcription(LLM_MODELS.WHISPER_LARGE_V3_TURBO),
      audio: uint8Array,
    });

    return { success: true, text: transcript };
  } catch (error) {
    logger.error("Transcription error:", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transcription failed",
    };
  }
}
