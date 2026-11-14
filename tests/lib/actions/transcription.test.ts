import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ai-sdk/groq", () => ({
  groq: { transcription: vi.fn((model: string) => ({ model })) },
}));
vi.mock("ai", () => ({ transcribe: vi.fn() }));
vi.mock("@/lib/services/logger", () => ({ logger: { error: vi.fn() } }));

import { transcribeAudioAction } from "@/lib/actions/transcription";
import prisma from "@/lib/prisma";
import { transcribe } from "ai";

const form = (fields: { token?: string; audio?: Blob }) => {
  const formData = new FormData();
  if (fields.token !== undefined) formData.append("token", fields.token);
  if (fields.audio) formData.append("audio", fields.audio);
  return formData;
};

const audio = () => new Blob([new Uint8Array([10, 20, 30])]);

const activeInterview = {
  status: "in_progress",
  startedAt: new Date(),
  quiz: { timeLimit: 30 },
};

describe("transcribeAudioAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.interview.findUnique).mockResolvedValue(
      activeInterview as any,
    );
    vi.mocked(transcribe).mockResolvedValue({ text: "Testo trascritto" } as any);
  });

  it("transcribes audio for an active interview", async () => {
    const result = await transcribeAudioAction(
      form({ token: "tok", audio: audio() }),
    );

    expect(result).toEqual({ success: true, text: "Testo trascritto" });
    expect(prisma.interview.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: "tok" } }),
    );

    const call = vi.mocked(transcribe).mock.calls[0][0];
    expect(Array.from(call.audio as Uint8Array)).toEqual([10, 20, 30]);
    expect(call.model).toEqual({ model: "whisper-large-v3-turbo" });
  });

  it("refuses a request without an interview token", async () => {
    const result = await transcribeAudioAction(form({ audio: audio() }));

    expect(result.success).toBe(false);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("refuses an unknown token", async () => {
    vi.mocked(prisma.interview.findUnique).mockResolvedValueOnce(null);

    const result = await transcribeAudioAction(
      form({ token: "nope", audio: audio() }),
    );

    expect(result).toEqual({
      success: false,
      error: "Il colloquio non è più attivo",
    });
    expect(transcribe).not.toHaveBeenCalled();
  });

  it.each([
    ["completed", new Date()],
    ["cancelled", new Date()],
    ["in_progress", new Date(Date.now() - 3 * 60 * 60 * 1000)],
  ])("refuses a %s interview that no longer accepts answers", async (status, startedAt) => {
    vi.mocked(prisma.interview.findUnique).mockResolvedValueOnce({
      ...activeInterview,
      status,
      startedAt,
    } as any);

    const result = await transcribeAudioAction(
      form({ token: "tok", audio: audio() }),
    );

    expect(result.success).toBe(false);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("refuses a request without audio", async () => {
    const result = await transcribeAudioAction(form({ token: "tok" }));

    expect(result).toEqual({
      success: false,
      error: "Nessun file audio fornito",
    });
  });

  it("returns a friendly error when the provider fails", async () => {
    vi.mocked(transcribe).mockRejectedValueOnce(new Error("provider down"));

    const result = await transcribeAudioAction(
      form({ token: "tok", audio: audio() }),
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Trascrizione non riuscita");
  });
});
