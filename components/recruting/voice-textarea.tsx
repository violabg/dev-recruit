"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { transcribeAudioAction } from "@/lib/actions/transcription";
import { Loader2, Speech, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

interface VoiceTextareaProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function VoiceTextarea({
  value,
  onChange,
  placeholder = "Scrivi la tua risposta qui...",
  disabled = false,
}: VoiceTextareaProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0, 0, 0]);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio analysis
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // Audio equalizer analysis loop
  useEffect(() => {
    if (!isRecording || !analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const updateLevels = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Create 5 frequency bands from low to high
      // Low frequencies on left, medium in middle, high on right
      const bandCount = 5;
      const levels = Array.from({ length: bandCount }, (_, i) => {
        // Linear distribution across entire spectrum
        const bandSize = Math.floor(dataArray.length / bandCount);
        const start = i * bandSize;
        const end = (i + 1) * bandSize;

        const bandData = dataArray.slice(
          start,
          Math.min(end, dataArray.length)
        );

        if (bandData.length === 0) return 0;

        // Get max value in this band
        const maxValue = Math.max(...bandData);

        // Normalize to 0-1
        let normalized = maxValue / 255;

        // Apply logarithmic scaling for better sensitivity to quiet sounds
        normalized = Math.log10(normalized * 9 + 1) / Math.log10(10);

        // Amplify higher frequencies more (right side bars should be more sensitive)
        const amplification = 1.2 + i * 0.5; // Increases from 1.2 to 3.2
        normalized = Math.min(normalized * amplification, 1);

        return normalized;
      });

      setAudioLevels(levels);
      animationIdRef.current = requestAnimationFrame(updateLevels);
    };

    updateLevels();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isRecording]);

  // Audio recording and transcription logic
  const handleStartRecording = async () => {
    setAudioLevels([0, 0, 0, 0, 0]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;

      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.1;

      const recorder = new window.MediaRecorder(stream);
      const chunks: Blob[] = [];

      setMediaRecorder(recorder);
      setIsRecording(true);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        setAudioLevels([0, 0, 0, 0, 0]);

        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;

        // Use transition to indicate pending state for transcription
        startTransition(async () => {
          // Stop all tracks to release the microphone
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;

          const audioBlob = new Blob(chunks, { type: "audio/webm" });

          // Use FormData to send audio without JSON serialization
          const formData = new FormData();
          formData.append("audio", audioBlob, "audio.webm");

          try {
            setError(null);
            const result = await transcribeAudioAction(formData);
            if (result.success && result.text) {
              // Append new transcription to existing answer instead of replacing
              onChange(
                value && value.trim()
                  ? `${value.trim()} ${result.text}`
                  : result.text || null
              );
            } else if (result.error) {
              setError(result.error);
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Errore sconosciuto durante la trascrizione";
            setError(errorMessage);
            console.error("Errore durante la trascrizione:", error);
          }
        });
      };
      recorder.start();
    } catch (err) {
      setIsRecording(false);
      console.error("Impossibile avviare la registrazione:", err);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
  };

  const handleClearMessage = () => {
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <Textarea
        placeholder={placeholder}
        className="min-h-32"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPending || disabled}
      />
      <div className="flex flex-wrap items-center gap-2">
        {!isRecording && !isPending && (
          <Button
            type="button"
            variant="outline"
            onClick={handleStartRecording}
            disabled={disabled}
          >
            <Speech className="mr-2 size-4" />
            Registra risposta
          </Button>
        )}
        {isRecording && (
          <>
            <Button
              type="button"
              variant="destructive"
              onClick={handleStopRecording}
            >
              <Square className="mr-2 size-4" />
              Ferma
            </Button>
            <div className="flex flex-1 items-center gap-2 px-3 py-2 min-w-[200px]">
              <div className="flex items-end gap-1 h-9">
                {audioLevels.map((level, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-white rounded-sm min-w-1 transition-all duration-100"
                    style={{
                      height: `${Math.max(3, level * 36)}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
        {isPending && (
          <span className="text-muted-foreground text-sm">
            <Loader2 className="inline-block mr-2 size-4 animate-spin" />
            Trascrizione in corso...
          </span>
        )}
        {value && !isRecording && !isPending && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearMessage}
            className="hover:bg-destructive/10 text-destructive hover:text-destructive"
            disabled={disabled}
          >
            <Trash2 className="mr-2 size-4" />
            Cancella
          </Button>
        )}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
