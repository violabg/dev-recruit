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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
            <Sparkles className="mr-2 w-4 h-4" />
            Genera nuovo quiz con AI
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titolo del Quiz</FormLabel>
              <FormControl>
                <Input
                  placeholder="Inserisci il titolo del quiz"
                  {...field}
                  maxLength={200}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="time_limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limite di Tempo (minuti)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Lascia vuoto per nessun limite"
                  {...field}
                  value={field.value || ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  min={1}
                  max={180}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
