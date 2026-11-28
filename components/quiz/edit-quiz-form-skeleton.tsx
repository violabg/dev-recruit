import {
  BadgeSkeleton,
  ButtonSkeleton,
  FieldSkeleton,
} from "@/components/skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { questionTypes } from "@/lib/utils/quiz-form-utils";
import { Settings } from "lucide-react";
import { PresetGenerationButtonsFallback } from "./preset-generation-buttons";

/**
 * Mirrors <EditQuizForm>: 12-col grid, left (9) = QuizSettings, Smart
 * Presets, QuestionsHeader, QuestionsList; right (3) = sticky "Azioni" card.
 *
 * `questions` = number of collapsed QuestionItem cards to show (0 renders the
 * empty-list message, as in create mode).
 */
export function EditQuizFormSkeleton({ questions = 3 }: { questions?: number }) {
  const addTypes = questionTypes.filter((t) => t.value !== "all");

  return (
    <div className="flex flex-col gap-6">
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-9">
          {/* QuizSettings */}
          <Card>
            <CardHeader>
              <CardTitle>Impostazioni del test</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FieldSkeleton label="Titolo del test" />
              <FieldSkeleton label="Limite di Tempo (minuti)" />
              <div className="pt-2">
                <ButtonSkeleton size="sm" className="w-52" />
              </div>
            </CardContent>
          </Card>

          <PresetGenerationButtonsFallback />

          <div className="flex flex-col gap-6">
            {/* QuestionsHeader */}
            <Card>
              <CardHeader>
                <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-4 sm:gap-0">
                  <div>
                    <CardTitle>Domande ({questions})</CardTitle>
                    <CardDescription>
                      Gestisci e genera domande del test utilizzando l&apos;AI
                    </CardDescription>
                  </div>
                  <Skeleton className="rounded-lg w-45 h-9" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <ButtonSkeleton size="sm" className="w-32" />
                  <ButtonSkeleton size="sm" className="w-36" />
                  <div className="flex gap-2 ml-auto">
                    {addTypes.map((type) => (
                      <ButtonSkeleton
                        key={type.value}
                        size="sm"
                        className="w-36"
                      />
                    ))}
                    <ButtonSkeleton size="sm" className="w-28" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QuestionsList */}
            {questions === 0 ? (
              <div className="py-8 text-muted-foreground text-center">
                Nessuna domanda presente. Aggiungi la prima domanda usando i
                pulsanti sopra.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {Array.from({ length: questions }, (_, i) => (
                  <Card
                    key={i}
                    className="relative shadow-sm pt-0 border border-transparent overflow-hidden"
                  >
                    <CardHeader className="gap-0 bg-muted/10 pt-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-foreground">
                            Domanda {i + 1}
                          </span>
                          <BadgeSkeleton className="w-28" />
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 4 }, (_, b) => (
                            <ButtonSkeleton key={b} size="icon" />
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions (sticky) */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          <Card className="top-6 sticky">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="size-5 text-primary" />
                Azioni
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <Skeleton className="rounded-lg w-full h-8" />
                <Skeleton className="rounded-lg w-full h-8" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
