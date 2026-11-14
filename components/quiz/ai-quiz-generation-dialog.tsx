"use client";
import {
  QuizGenerationForm,
  type GeneratedQuiz,
} from "@/components/quiz/quiz-generation-form";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrainCircuit } from "lucide-react";

type DialogPosition = {
  id: string;
  title: string;
  experienceLevel?: string;
  skills: string[];
  description?: string | null;
};

type AIGenerationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  position: DialogPosition;
  /** Receives the generated quiz. Nothing is saved by this dialog. */
  onGenerated: (quiz: GeneratedQuiz) => void;
};

export const AIQuizGenerationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  position,
  onGenerated,
}: AIGenerationDialogProps) => {
  const experienceLabel = position.experienceLevel ?? "—";

  const handleGenerated = (quiz: GeneratedQuiz) => {
    onOpenChange(false);
    onGenerated(quiz);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 pr-2">
          <div className="gap-6 grid md:grid-cols-5">
            <div className="md:col-span-3 bg-panel p-6 border border-border rounded-2xl">
              <QuizGenerationForm
                position={{
                  id: position.id,
                  title: position.title,
                  experienceLevel: experienceLabel,
                }}
                onCancel={() => onOpenChange(false)}
                onGenerated={handleGenerated}
              />
            </div>
            <Card className="md:col-span-2">
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-2 font-semibold text-lg">
                  <BrainCircuit className="w-5 h-5 text-primary" />
                  <span>Informazioni sulla posizione</span>
                </div>
                <div className="flex flex-col gap-2 text-muted-foreground text-sm">
                  <div>
                    <span className="font-medium">Titolo:</span>{" "}
                    {position.title}
                  </div>
                  <div>
                    <span className="font-medium">Livello:</span>{" "}
                    {experienceLabel}
                  </div>
                  <div>
                    <span className="font-medium">Competenze:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {position.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 border rounded-full font-semibold text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  {position.description && (
                    <div>
                      <span className="font-medium">Descrizione:</span>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {position.description}
                      </p>
                    </div>
                  )}
                </div>
                <div className="bg-muted p-4 rounded-md text-sm">
                  <h3 className="font-medium">
                    Come funziona la generazione AI
                  </h3>
                  <ul className="flex flex-col gap-2 mt-2">
                    <li className="flex items-start gap-2">
                      <span className="flex justify-center items-center bg-primary rounded-full size-4 font-bold text-primary-foreground text-xs">
                        1
                      </span>
                      <span>
                        L&apos;AI analizza le competenze e il livello richiesti
                        per la posizione
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex justify-center items-center bg-primary rounded-full size-4 font-bold text-primary-foreground text-xs">
                        2
                      </span>
                      <span>
                        Genera domande pertinenti in base ai parametri
                        selezionati
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex justify-center items-center bg-primary rounded-full size-4 font-bold text-primary-foreground text-xs">
                        3
                      </span>
                      <span>
                        Crea un mix bilanciato di domande teoriche, pratiche e
                        sfide di codice
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex justify-center items-center bg-primary rounded-full size-4 font-bold text-primary-foreground text-xs">
                        4
                      </span>
                      <span>
                        Le domande generate compaiono nell&apos;editor: rivedile
                        e salva il quiz solo quando sei soddisfatto
                      </span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
