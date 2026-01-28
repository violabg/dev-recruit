"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputField } from "@/components/ui/rhf-inputs";
import { Sparkles } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { EditQuizFormData } from "../../hooks/use-edit-quiz-form";

type QuizSettingsProps = {
  form: UseFormReturn<EditQuizFormData>;
  onGenerateFullQuiz: () => void;
  aiLoading: boolean;
};

export const QuizSettings = ({
  form,
  onGenerateFullQuiz,
  aiLoading,
}: QuizSettingsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Impostazioni Quiz</CardTitle>
          </div>
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
          name="timeLimit"
          label="Limite di Tempo (minuti)"
          placeholder="Lascia vuoto per nessun limite"
          type="number"
          min={1}
          max={180}
        />
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerateFullQuiz}
            disabled={aiLoading}
          >
            <Sparkles className="mr-2 size-4 text-primary" />
            Genera nuovo quiz con AI
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
