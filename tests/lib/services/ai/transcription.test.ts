import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ai-sdk/groq", () => ({
  groq: { transcription: vi.fn((model: string) => ({ model })) },
}));

vi.mock("ai", () => ({ transcribe: vi.fn() }));

import { transcribe as aiTranscribe } from "ai";
import { groq } from "@ai-sdk/groq";
import { LLM_MODELS } from "@/lib/services/ai/models";
import { transcribeAudio } from "@/lib/services/ai/transcription";
import { AIErrorCode, AIGenerationError } from "@/lib/services/ai/types";

describe("transcribeAudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(aiTranscribe).mockResolvedValue({ text: "Testo" } as any);
  });

  it("transcribes the received bytes with the interview Whisper model", async () => {
    const bytes = new Uint8Array([1, 2, 3]);

    const text = await transcribeAudio(bytes);

    expect(text).toBe("Testo");
    expect(groq.transcription).toHaveBeenCalledWith(
      LLM_MODELS.WHISPER_LARGE_V3_TURBO,
    );
    expect(aiTranscribe).toHaveBeenCalledWith({
      model: { model: LLM_MODELS.WHISPER_LARGE_V3_TURBO },
      audio: bytes,
    });
  });

  it("turns a provider failure into an AIGenerationError", async () => {
    vi.mocked(aiTranscribe).mockRejectedValue(new Error("provider down"));

    const promise = transcribeAudio(new Uint8Array([1]));

    await expect(promise).rejects.toBeInstanceOf(AIGenerationError);
    await expect(promise).rejects.toMatchObject({
      message: "Trascrizione non riuscita",
      code: AIErrorCode.GENERATION_FAILED,
    });
  });
});
