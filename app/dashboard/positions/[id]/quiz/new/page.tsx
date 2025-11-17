import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth-server";
import { getUserPositionById } from "@/lib/data/positions";
import { BrainCircuit } from "lucide-react";
import { redirect } from "next/navigation";
import { QuizForm } from "./QuizForm";

export default async function GenerateQuizPage({
  params: incomingParams,
}: {
  params: { id: string };
}) {
  // await new Promise((resolve) => setTimeout(resolve, 10000));
  const { id } = await incomingParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/dashboard/positions");
  }

  const position = await getUserPositionById(user.id, id);

  if (!position) {
    redirect("/dashboard/positions");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl">Genera Quiz AI</h1>
        <p className="text-muted-foreground">
          Crea un quiz personalizzato per la posizione {position.title}
        </p>
      </div>

      <div className="gap-6 grid md:grid-cols-2">
        <div>
          <QuizForm position={position} />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <BrainCircuit className="w-5 h-5 text-primary" />
                <span>Informazioni sulla posizione</span>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="font-medium">Titolo:</span> {position.title}
                </div>
                <div>
                  <span className="font-medium">Livello:</span>{" "}
                  {position.experienceLevel}
                </div>
                <div>
                  <span className="font-medium">Competenze:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {position.skills.map((skill: string, index: number) => (
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

              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-medium">Come funziona la generazione AI</h3>
                <ul className="space-y-2 mt-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="flex justify-center items-center bg-primary mt-0.5 rounded-full w-4 h-4 font-bold text-primary-foreground text-xs">
                      1
                    </span>
                    <span>
                      L&apos;AI analizza le competenze e il livello richiesti
                      per la posizione
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex justify-center items-center bg-primary mt-0.5 rounded-full w-4 h-4 font-bold text-primary-foreground text-xs">
                      2
                    </span>
                    <span>
                      Genera domande pertinenti in base ai parametri selezionati
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex justify-center items-center bg-primary mt-0.5 rounded-full w-4 h-4 font-bold text-primary-foreground text-xs">
                      3
                    </span>
                    <span>
                      Crea un mix bilanciato di domande teoriche, pratiche e
                      sfide di codice
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex justify-center items-center bg-primary mt-0.5 rounded-full w-4 h-4 font-bold text-primary-foreground text-xs">
                      4
                    </span>
                    <span>
                      Puoi modificare il quiz generato prima di associarlo ai
                      candidati
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
