/**
 * Audio transcription of an interview answer.
 *
 * Lives in the AI layer like every other provider call: the server action
 * keeps the interview-token and size checks, and this module only turns audio
 * bytes into text (see knowledge/ai_generation.md).
 */

import { groq } from "@ai-sdk/groq";
import { transcribe } from "ai";
import { LLM_MODELS } from "./models";
import { AIErrorCode, AIGenerationError } from "./types";

/** Transcribe spoken audio with the Whisper model used for interviews. */
export async function transcribeAudio(audio: Uint8Array): Promise<string> {
  try {
    const { text } = await transcribe({
      model: groq.transcription(LLM_MODELS.WHISPER_LARGE_V3_TURBO),
      audio,
    });

    return text;
  } catch (error) {
    throw new AIGenerationError(
      "Trascrizione non riuscita",
      AIErrorCode.GENERATION_FAILED,
      { originalError: error },
    );
  }
}
