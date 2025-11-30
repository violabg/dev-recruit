"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrainCircuit, CheckCircle } from "lucide-react";

export function InterviewComplete() {
  return (
    <div className="flex flex-col justify-center items-center p-4 min-h-dvh">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center bg-green-100 dark:bg-green-900 mx-auto mb-4 rounded-full w-12 h-12">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
          </div>
          <CardTitle className="text-2xl">Quiz completato</CardTitle>
          <CardDescription>
            Grazie per aver completato il quiz tecnico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p>
            Le tue risposte sono state registrate con successo. Il recruiter
            esaminerà i risultati e ti contatterà per i prossimi passi.
          </p>
          <div className="flex justify-center items-center gap-2 text-primary">
            <BrainCircuit className="w-5 h-5" />
            <span className="font-bold">DevRecruit AI</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
