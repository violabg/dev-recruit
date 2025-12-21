import { beforeEach, describe, expect, it, vi } from "vitest";
import { transcribeAudioAction } from "../../../lib/actions/transcription";

// Mock dependencies
vi.mock("@ai-sdk/groq", () => ({
  groq: {
    transcription: vi.fn(() => ({ model: "whisper-large-v3-turbo" })),
  },
}));
vi.mock("ai", () => ({
  experimental_transcribe: vi.fn(),
}));
vi.mock("../../../lib/services/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));
vi.mock("../../../lib/utils", () => ({
  LLM_MODELS: {
    WHISPER_LARGE_V3_TURBO: "whisper-large-v3-turbo",
  },
}));

describe("transcription action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("transcribeAudioAction", () => {
    it("transcribes audio successfully", async () => {
      const { experimental_transcribe } = await import("ai");
      const mockTranscribe = experimental_transcribe as any;

      mockTranscribe.mockResolvedValueOnce({
        text: "This is the transcribed text from the audio file.",
      });

      const audioBlob = new Blob([new Uint8Array([1, 2, 3, 4, 5])]);
      const formData = new FormData();
      formData.append("audio", audioBlob);
      const result = await transcribeAudioAction(formData);

      expect(result.success).toBe(true);
      expect(result.text).toBe(
        "This is the transcribed text from the audio file."
      );
      expect(mockTranscribe).toHaveBeenCalledWith({
        model: expect.anything(),
        audio: expect.any(Uint8Array),
      });
    });

    it("handles empty audio data", async () => {
      const { experimental_transcribe } = await import("ai");
      const mockTranscribe = experimental_transcribe as any;

      mockTranscribe.mockResolvedValueOnce({
        text: "",
      });

      const audioBlob = new Blob([new Uint8Array([])]);
      const formData = new FormData();
      formData.append("audio", audioBlob);
      const result = await transcribeAudioAction(formData);

      expect(result.success).toBe(true);
      expect(result.text).toBe("");
      expect(mockTranscribe).toHaveBeenCalled();
    });

    it("converts Blob to Uint8Array", async () => {
      const { experimental_transcribe } = await import("ai");
      const mockTranscribe = experimental_transcribe as any;

      mockTranscribe.mockResolvedValueOnce({
        text: "Test transcription",
      });

      const audioData = [10, 20, 30, 40, 50];
      const audioBlob = new Blob([new Uint8Array(audioData)]);
      const formData = new FormData();
      formData.append("audio", audioBlob);
      await transcribeAudioAction(formData);

      const callArgs = mockTranscribe.mock.calls[0][0];
      expect(callArgs.audio).toBeInstanceOf(Uint8Array);
      expect(Array.from(callArgs.audio)).toEqual(audioData);
    });

    it("returns error when transcription fails", async () => {
      const { experimental_transcribe } = await import("ai");
      const mockTranscribe = experimental_transcribe as any;

      mockTranscribe.mockRejectedValueOnce(
        new Error("Transcription service unavailable")
      );

      const audioBlob = new Blob([new Uint8Array([1, 2, 3])]);
      const formData = new FormData();
      formData.append("audio", audioBlob);
      const result = await transcribeAudioAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Transcription service unavailable");
    });

    it("handles long audio files", async () => {
      const { experimental_transcribe } = await import("ai");
      const mockTranscribe = experimental_transcribe as any;

      const longText = "This is a very long transcription. ".repeat(100);
      mockTranscribe.mockResolvedValueOnce({
        text: longText,
      });

      const largeAudioData = Array(10000).fill(1);
      const audioBlob = new Blob([new Uint8Array(largeAudioData)]);
      const formData = new FormData();
      formData.append("audio", audioBlob);
      const result = await transcribeAudioAction(formData);

      expect(result.success).toBe(true);
      expect(result.text).toBe(longText);
      expect(result.text!.length).toBeGreaterThan(1000);
    });

    it("uses Groq Whisper model", async () => {
      const { experimental_transcribe } = await import("ai");
      const mockTranscribe = experimental_transcribe as any;

      mockTranscribe.mockResolvedValueOnce({
        text: "Test",
      });

      const audioBlob = new Blob([new Uint8Array([1, 2, 3])]);
      const formData = new FormData();
      formData.append("audio", audioBlob);
      await transcribeAudioAction(formData);

      const callArgs = mockTranscribe.mock.calls[0][0];
      expect(callArgs.model).toBeDefined();
    });

    it("handles special characters in transcription", async () => {
      const { experimental_transcribe } = await import("ai");
      const mockTranscribe = experimental_transcribe as any;

      mockTranscribe.mockResolvedValueOnce({
        text: "Text with special chars: é, ñ, ü, @, #, $, %, &",
      });

      const audioBlob = new Blob([new Uint8Array([1, 2, 3])]);
      const formData = new FormData();
      formData.append("audio", audioBlob);
      const result = await transcribeAudioAction(formData);

      expect(result.success).toBe(true);
      expect(result.text).toContain("é");
      expect(result.text).toContain("@");
    });

    it("handles multi-language transcription", async () => {
      const { experimental_transcribe } = await import("ai");
      const mockTranscribe = experimental_transcribe as any;

      mockTranscribe.mockResolvedValueOnce({
        text: "English and Italian: Ciao, hello, buongiorno",
      });

      const audioBlob = new Blob([new Uint8Array([1, 2, 3])]);
      const formData = new FormData();
      formData.append("audio", audioBlob);
      const result = await transcribeAudioAction(formData);

      expect(result.success).toBe(true);
      expect(result.text).toContain("English");
      expect(result.text).toContain("Italian");
      expect(result.text).toContain("Ciao");
    });

    it("returns error when no audio file is provided", async () => {
      const formData = new FormData();
      const result = await transcribeAudioAction(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("No audio file provided");
    });
  });
});
