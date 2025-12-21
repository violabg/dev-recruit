"use client";
import { CodeHighlight } from "@/components/quiz/code-highlight";
import { VoiceTextarea } from "@/components/recruting/voice-textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FlexibleQuestion } from "@/lib/schemas";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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

  // Track question.dbId to detect when question changes
  const [lastQuestionId, setLastQuestionId] = useState(question.dbId);

  // Reset state when question changes (render-time sync)
  if (question.dbId !== lastQuestionId) {
    setLastQuestionId(question.dbId);
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
            value={answer?.toString() ?? ""}
            onValueChange={(value) => setAnswer(value as string)}
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
          <VoiceTextarea value={answer} onChange={setAnswer} />
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
