"use client";
import { CodeHighlight } from "@/components/quiz/code-highlight";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { transcribeAudioAction } from "@/lib/actions/transcription";
import { FlexibleQuestion } from "@/lib/schemas";
import Editor from "@monaco-editor/react";
import { Loader2, Speech, Square } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";

type QuestionAnswer = string | { code: string } | null;

interface QuestionProps {
  question: FlexibleQuestion;
  questionNumber: number;
  onAnswerChange: (answer: QuestionAnswer) => void;
  currentAnswer: QuestionAnswer;
}

export function InterviewQuestion({
  question,
  questionNumber,
  onAnswerChange,
  currentAnswer,
}: QuestionProps) {
  const { theme, resolvedTheme } = useTheme();

  // Use resolvedTheme to handle 'system' theme properly
  const monacoTheme =
    resolvedTheme === "dark" || theme === "dark" ? "vs-dark" : "light";

  // Compute initial values from currentAnswer
  const getInitialAnswer = (): string | null => {
    if (typeof currentAnswer === "string") return currentAnswer;
    return null;
  };
  const getInitialCode = (): string => {
    if (
      currentAnswer &&
      typeof currentAnswer === "object" &&
      "code" in currentAnswer
    ) {
      return currentAnswer.code;
    }
    return "";
  };

  // Reset answer and code when question changes
  const [answer, setAnswer] = useState<string | null>(getInitialAnswer);
  const [code, setCode] = useState<string>(getInitialCode);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  // Track question.id to detect when question changes
  const [lastQuestionId, setLastQuestionId] = useState(question.id);

  // Reset state when question changes (render-time sync)
  if (question.id !== lastQuestionId) {
    setLastQuestionId(question.id);
    if (typeof currentAnswer === "string") {
      setAnswer(currentAnswer);
      setCode("");
    } else if (
      currentAnswer &&
      typeof currentAnswer === "object" &&
      "code" in currentAnswer
    ) {
      setAnswer(null);
      setCode(currentAnswer.code);
    } else {
      setAnswer(null);
      setCode("");
    }
  }

  // Report answer changes to parent
  useEffect(() => {
    if (question.type === "code_snippet") {
      onAnswerChange(code ? { code } : null);
    } else {
      // Treat empty string as null (no answer)
      onAnswerChange(answer && answer.trim() ? answer : null);
    }
  }, [answer, code, question.type, onAnswerChange]);

  // Audio recording and transcription logic
  const handleStartRecording = async () => {
    setIsRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      const chunks: Blob[] = [];

      setMediaRecorder(recorder);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        // Use transition to indicate pending state for transcription
        startTransition(async () => {
          // Stop all tracks to release the microphone
          stream.getTracks().forEach((track) => track.stop());

          const audioBlob = new Blob(chunks, { type: "audio/webm" });

          // Convert Blob to Uint8Array for server action
          const arrayBuffer = await audioBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          // Convert to regular array for server action serialization
          const audioArray = Array.from(uint8Array);

          try {
            const result = await transcribeAudioAction(audioArray);
            if (result.success && result.text) {
              setAnswer(result.text);
            }
          } catch {
            // Transcription error is handled silently - user sees no transcription text
          }
        });
      };
      recorder.start();
    } catch (err) {
      setIsRecording(false);
      console.error("Impossibile avviare la registrazione:", err);
      // Gestione errore opzionale
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      // mediaRecorder will be cleaned up in the onstop handler
    }
  };

  return (
    <Card key={questionNumber}>
      <CardHeader>
        <CardTitle className="text-xl">
          {questionNumber}. {question.question}
        </CardTitle>
        {question.type === "code_snippet" && (
          <CardDescription>
            {question.language && <span>Linguaggio: {question.language}</span>}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {question.type === "multiple_choice" && (
          <RadioGroup
            value={answer?.toString()}
            onValueChange={(value) => setAnswer(value)}
            className="space-y-3"
          >
            {question.options?.map((option: string, index: number) => (
              <div
                key={index}
                className="flex items-center space-x-2 p-3 border rounded-md"
              >
                <RadioGroupItem
                  value={index.toString()}
                  id={`option-${index}`}
                />
                <Label htmlFor={`option-${index}`} className="flex-1">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === "open_question" && (
          <div className="space-y-2">
            <Textarea
              placeholder="Scrivi la tua risposta qui..."
              className="min-h-32"
              value={answer || ""}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isPending}
            />
            <div className="flex items-center gap-2">
              {!isRecording && !isPending && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleStartRecording}
                >
                  <Speech className="mr-2 size-4" />
                  Registra risposta
                </Button>
              )}
              {isRecording && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleStopRecording}
                >
                  <Square className="mr-2 size-4" />
                  Ferma registrazione
                </Button>
              )}
              {isPending && (
                <span className="text-muted-foreground text-sm">
                  <Loader2 className="inline-block mr-2 size-4 animate-spin" />
                  Trascrizione in corso...
                </span>
              )}
            </div>
          </div>
        )}

        {question.type === "code_snippet" && (
          <div className="space-y-4">
            {question.codeSnippet && (
              <div>
                <h3 className="mb-2 font-medium">Codice:</h3>
                <CodeHighlight
                  code={question.codeSnippet}
                  language={question.language || "javascript"}
                />
              </div>
            )}
            <div>
              <h3 className="mb-2 font-medium">La tua soluzione:</h3>
              <div className="border rounded-md overflow-hidden">
                <Editor
                  height="300px"
                  language={question.language || "javascript"}
                  theme={monacoTheme}
                  value={code}
                  onChange={(value) => setCode(value || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                    folding: true,
                    contextmenu: true,
                    selectOnLineNumbers: true,
                    scrollbar: {
                      vertical: "visible",
                      horizontal: "visible",
                    },
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
