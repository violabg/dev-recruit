"use server";

import { logger } from "@/lib/services/logger";
import { LLM_MODELS } from "@/lib/utils";
import { groq } from "@ai-sdk/groq";
import { experimental_transcribe as transcribe } from "ai";

export async function transcribeAudioAction(
  audioData: number[]
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    // Convert the number array back to Uint8Array
    const uint8Array = new Uint8Array(audioData);

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
