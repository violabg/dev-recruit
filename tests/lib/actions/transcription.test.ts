import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/ai/transcription", () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock("@/lib/services/logger", () => ({ logger: { error: vi.fn() } }));

import { transcribeAudioAction } from "@/lib/actions/transcription";
import { transcribeAudio } from "@/lib/services/ai/transcription";
import { AIErrorCode, AIGenerationError } from "@/lib/services/ai/types";
import prisma from "@/lib/prisma";

const form = (fields: { token?: string; audio?: Blob }) => {
  const formData = new FormData();
  if (fields.token !== undefined) formData.append("token", fields.token);
  if (fields.audio) formData.append("audio", fields.audio);
  return formData;
};

const audio = () => new Blob([new Uint8Array([10, 20, 30])]);

/** A real FormData whose stored file reports a size above the 25 MB limit */
const formWithOversizedAudio = () => {
  const formData = new FormData();
  formData.append("token", "tok");
  formData.append("audio", new Blob([]), "audio.webm");
  const file = formData.get("audio") as File;
  Object.defineProperty(file, "size", { value: 25 * 1024 * 1024 + 1 });
  return formData;
};

const activeAssessment = {
  status: "in_progress",
  startedAt: new Date(),
  quiz: { timeLimit: 30 },
};

describe("transcribeAudioAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.assessment.findUnique).mockResolvedValue(
      activeAssessment as any,
    );
    vi.mocked(transcribeAudio).mockResolvedValue("Testo trascritto");
  });

  it("transcribes audio for an active assessment", async () => {
    const result = await transcribeAudioAction(
      form({ token: "tok", audio: audio() }),
    );

    expect(result).toEqual({ success: true, text: "Testo trascritto" });
    expect(prisma.assessment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: "tok" } }),
    );
    expect(transcribeAudio).toHaveBeenCalledWith(
      new Uint8Array([10, 20, 30]),
    );
  });

  it("refuses a request without an assessment token", async () => {
    const result = await transcribeAudioAction(form({ audio: audio() }));

    expect(result).toEqual({
      success: false,
      error: "Il token del test è obbligatorio",
    });
    expect(transcribeAudio).not.toHaveBeenCalled();
  });

  it("refuses an unknown token", async () => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValueOnce(null);

    const result = await transcribeAudioAction(
      form({ token: "nope", audio: audio() }),
    );

    expect(result).toEqual({
      success: false,
      error: "Test non valido",
    });
    expect(transcribeAudio).not.toHaveBeenCalled();
  });

  it.each([
    ["completed", new Date()],
    ["cancelled", new Date()],
    ["in_progress", new Date(Date.now() - 3 * 60 * 60 * 1000)],
  ])("refuses a %s assessment that no longer accepts answers", async (status, startedAt) => {
    vi.mocked(prisma.assessment.findUnique).mockResolvedValueOnce({
      ...activeAssessment,
      status,
      startedAt,
    } as any);

    const result = await transcribeAudioAction(
      form({ token: "tok", audio: audio() }),
    );

    expect(result).toEqual({
      success: false,
      error: "Il test non è più attivo",
    });
    expect(transcribeAudio).not.toHaveBeenCalled();
  });

  it("refuses a request without audio", async () => {
    const result = await transcribeAudioAction(form({ token: "tok" }));

    expect(result).toEqual({
      success: false,
      error: "Nessun file audio fornito",
    });
    expect(transcribeAudio).not.toHaveBeenCalled();
  });

  it("refuses a recording above 25 MB", async () => {
    const result = await transcribeAudioAction(formWithOversizedAudio());

    expect(result).toEqual({
      success: false,
      error: "La registrazione è troppo lunga",
    });
    expect(transcribeAudio).not.toHaveBeenCalled();
  });

  it("returns the AI layer's Italian message when the provider fails", async () => {
    vi.mocked(transcribeAudio).mockRejectedValueOnce(
      new AIGenerationError(
        "Trascrizione non riuscita",
        AIErrorCode.GENERATION_FAILED,
      ),
    );

    const result = await transcribeAudioAction(
      form({ token: "tok", audio: audio() }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Servizio AI temporaneamente non disponibile. Riprova più tardi.",
      );
    }
  });
});
