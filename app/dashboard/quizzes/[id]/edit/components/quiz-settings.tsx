"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  getSaveButtonContent,
  getSaveButtonVariant,
  SaveStatus,
} from "@/lib/utils/quiz-form-utils";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, UseFormReturn } from "react-hook-form";
import { EditQuizFormData } from "../hooks/use-edit-quiz-form";

type QuizSettingsProps = {
  form: UseFormReturn<EditQuizFormData>;
  saveStatus: SaveStatus;
  onGenerateFullQuiz: () => void;
  aiLoading: boolean;
};

export const QuizSettings = ({
  form,
  saveStatus,
  onGenerateFullQuiz,
  aiLoading,
}: QuizSettingsProps) => {
  const router = useRouter();
  const titleError = form.formState.errors.title;
  const timeLimitError = form.formState.errors.time_limit;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Impostazioni Quiz</CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerateFullQuiz}
            disabled={aiLoading}
          >
            <Sparkles className="mr-2 w-4 h-4" />
            Genera nuovo quiz con AI
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field>
          <FieldLabel htmlFor="quiz-title">Titolo del Quiz</FieldLabel>
          <FieldContent>
            <Controller
              control={form.control}
              name="title"
              render={({ field }) => (
                <Input
                  id="quiz-title"
                  placeholder="Inserisci il titolo del quiz"
                  {...field}
                  maxLength={200}
                />
              )}
            />
          </FieldContent>
          <FieldError errors={titleError ? [titleError] : undefined} />
        </Field>
        <Field>
          <FieldLabel htmlFor="quiz-time-limit">
            Limite di Tempo (minuti)
          </FieldLabel>
          <FieldContent>
            <Controller
              control={form.control}
              name="time_limit"
              render={({ field: timeLimitField }) => (
                <Input
                  id="quiz-time-limit"
                  type="number"
                  placeholder="Lascia vuoto per nessun limite"
                  {...timeLimitField}
                  value={timeLimitField.value || ""}
                  onChange={(e) =>
                    timeLimitField.onChange(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  min={1}
                  max={180}
                />
              )}
            />
          </FieldContent>
          <FieldError errors={timeLimitError ? [timeLimitError] : undefined} />
        </Field>
        <CardFooter className="px-0 pt-2">
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saveStatus === "saving"}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={saveStatus === "saving"}
              variant={getSaveButtonVariant(saveStatus)}
            >
              {getSaveButtonContent(saveStatus)}
            </Button>
          </div>
        </CardFooter>
      </CardContent>
    </Card>
  );
};
