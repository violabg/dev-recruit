import { TextSkeleton } from "@/components/skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit } from "lucide-react";

const DETAIL_ROWS = [
  ["Titolo:", "w-40"],
  ["Numero di domande:", "w-6"],
  ["Limite di tempo:", "w-20"],
] as const;

/**
 * Mirrors the InterviewClient start screen (first view of a new invite):
 * full-width card with static welcome copy, quiz details, instructions,
 * warning box and the start button. Only quiz data is skeletoned.
 */
export function InterviewSkeleton() {
  return (
    <div className="flex flex-col justify-center items-center p-4 min-h-dvh">
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-center items-center gap-2 text-primary">
            <BrainCircuit className="w-6 h-6" />
            <h2 className="font-bold text-xl">DevRecruit AI</h2>
          </div>
          <CardTitle className="text-2xl text-center">
            Benvenuto al colloquio tecnico
          </CardTitle>
          <CardDescription className="flex justify-center items-center gap-1 text-center">
            Stai per iniziare il quiz per la posizione di
            <Skeleton className="w-32 h-3.5" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium">Dettagli del quiz</h3>
            <div className="space-y-2 mt-2 text-sm">
              {DETAIL_ROWS.map(([label, width]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <TextSkeleton className={width} />
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium">Istruzioni</h3>
            <ul className="space-y-2 mt-2 text-sm">
              <li>• Leggi attentamente ogni domanda prima di rispondere</li>
              <li>
                • Puoi navigare tra le domande utilizzando i pulsanti
                avanti/indietro
              </li>
              <li>• Le tue risposte vengono salvate automaticamente</li>
              <li>
                <TextSkeleton className="w-96 max-w-full" />
              </li>
              <li>
                • Clicca su &quot;Completa&quot; quando hai finito di
                rispondere a tutte le domande
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-300">
              Importante
            </h3>
            <p className="mt-1 text-yellow-800 dark:text-yellow-300 text-sm">
              Non chiudere o aggiornare questa pagina durante il quiz. Farlo
              potrebbe causare la perdita delle tue risposte.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="rounded-lg w-full h-8" />
        </CardFooter>
      </Card>
    </div>
  );
}
