"use client";

import { InputField } from "@/components/rhf-inputs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSaveButtonContent,
  getSaveButtonVariant,
  SaveStatus,
} from "@/lib/utils/quiz-form-utils";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { UseFormReturn } from "react-hook-form";
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
            <Sparkles className="mr-2 w-4 h-4 text-primary" />
            Genera nuovo quiz con AI
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <InputField
          control={form.control}
          name="title"
          label="Titolo del Quiz"
          placeholder="Inserisci il titolo del quiz"
          maxLength={200}
        />
        <InputField
          control={form.control}
          name="time_limit"
          label="Limite di Tempo (minuti)"
          placeholder="Lascia vuoto per nessun limite"
          type="number"
          min={1}
          max={180}
        />
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
