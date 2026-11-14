"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";

/**
 * Error boundary for every dashboard section. A section can add its own
 * error.tsx (see quizzes/) when it needs a more specific message.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col justify-center items-center py-12">
        <div className="flex flex-col items-center max-w-md text-center">
          <div className="flex justify-center items-center bg-destructive/10 mb-4 rounded-full size-12">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <h2 className="mb-2 font-semibold text-lg">
            Si è verificato un errore
          </h2>
          <p className="mb-6 text-muted-foreground text-sm">
            Non è stato possibile caricare questa pagina. Riprova o contatta il
            supporto se il problema persiste.
          </p>
          {error.digest && (
            <p className="mb-4 font-mono text-muted-foreground text-xs">
              Codice errore: {error.digest}
            </p>
          )}
          <Button onClick={reset} size="sm">
            <RefreshCw className="mr-2 size-4" />
            Riprova
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
