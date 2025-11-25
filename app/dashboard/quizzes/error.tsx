"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function QuizzesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Quizzes page error:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Quiz</h1>
        <p className="text-muted-foreground">
          Gestisci i quiz per le tue posizioni aperte
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col justify-center items-center py-12">
          <div className="flex flex-col items-center max-w-md text-center">
            <div className="flex justify-center items-center bg-destructive/10 mb-4 rounded-full w-12 h-12">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="mb-2 font-semibold text-lg">
              Errore nel caricamento dei quiz
            </h2>
            <p className="mb-6 text-muted-foreground text-sm">
              Si è verificato un errore durante il caricamento della pagina.
              Riprova o contatta il supporto se il problema persiste.
            </p>
            {error.digest && (
              <p className="mb-4 font-mono text-muted-foreground text-xs">
                Codice errore: {error.digest}
              </p>
            )}
            <Button onClick={reset} variant="default" size="sm">
              <RefreshCw className="mr-2 w-4 h-4" />
              Riprova
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
