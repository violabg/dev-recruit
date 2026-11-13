import { CandidateFormBodySkeleton } from "@/components/candidates/candidate-form-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const HEADERS = {
  new: {
    title: "Nuovo Candidato",
    description: "Inserisci i dati del candidato da aggiungere",
  },
  edit: {
    title: "Modifica Candidato",
    description: "Aggiorna i dati per mantenere le informazioni sincronizzate.",
  },
} as const;

/**
 * Mirrors the new/edit candidate pages: outer Card with the (static) header
 * and the CandidateForm grid inside CardContent.
 */
export function CandidateFormSkeleton({
  mode = "new",
}: {
  mode?: "new" | "edit";
}) {
  const { title, description } = HEADERS[mode];
  const heading = (
    <>
      <CardTitle className="text-2xl">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </>
  );

  return (
    <Card>
      {mode === "edit" ? (
        <CardHeader className="flex items-center gap-4">
          {/* ghost icon back button */}
          <Skeleton className="rounded-lg size-8" />
          <div>{heading}</div>
        </CardHeader>
      ) : (
        <CardHeader>{heading}</CardHeader>
      )}
      <CardContent>
        <CandidateFormBodySkeleton mode={mode} />
      </CardContent>
    </Card>
  );
}
