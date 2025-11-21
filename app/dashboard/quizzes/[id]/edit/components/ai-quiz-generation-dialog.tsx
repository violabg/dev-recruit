"use client";

import {
  Position,
  QuizForm,
  SaveQuizResult,
} from "@/app/dashboard/positions/[id]/quiz/new/QuizForm";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrainCircuit } from "lucide-react";
import { useRouter } from "next/navigation";

type DialogPosition = {
  id: string;
  title: string;
  experience_level?: string;
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
};

export const AIQuizGenerationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  position,
}: AIGenerationDialogProps) => {
  const router = useRouter();

  const experienceLabel =
    position.experienceLevel ?? position.experience_level ?? "—";

  const quizFormPosition: Position = {
    id: position.id,
    title: position.title,
    description: position.description ?? null,
    experienceLevel: experienceLabel,
    skills: position.skills,
  };

  const handleSuccess = (result: SaveQuizResult) => {
    onOpenChange(false);
    if (!result?.id) {
      return;
    }
    router.push(`/dashboard/quizzes/${result.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pr-2">
          <div className="gap-6 grid md:grid-cols-2">
            <div className="bg-panel p-6 border border-border rounded-2xl">
              <QuizForm
                position={quizFormPosition}
                onCancel={() => onOpenChange(false)}
                onSuccess={handleSuccess}
              />
            </div>
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2 font-semibold text-lg">
                  <BrainCircuit className="w-5 h-5 text-primary" />
                  <span>Informazioni sulla posizione</span>
                </div>
                <div className="space-y-2 text-muted-foreground text-sm">
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
                  <ul className="space-y-2 mt-2">
                    <li className="flex items-start gap-2">
                      <span className="flex justify-center items-center bg-primary rounded-full w-4 h-4 font-bold text-primary-foreground text-xs">
                        1
                      </span>
                      <span>
                        L&apos;AI analizza le competenze e il livello richiesti
                        per la posizione
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex justify-center items-center bg-primary rounded-full w-4 h-4 font-bold text-primary-foreground text-xs">
                        2
                      </span>
                      <span>
                        Genera domande pertinenti in base ai parametri
                        selezionati
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex justify-center items-center bg-primary rounded-full w-4 h-4 font-bold text-primary-foreground text-xs">
                        3
                      </span>
                      <span>
                        Crea un mix bilanciato di domande teoriche, pratiche e
                        sfide di codice
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex justify-center items-center bg-primary rounded-full w-4 h-4 font-bold text-primary-foreground text-xs">
                        4
                      </span>
                      <span>
                        Puoi modificare il quiz generato prima di associarlo ai
                        candidati
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
