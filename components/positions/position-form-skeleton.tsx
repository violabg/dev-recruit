import { ButtonSkeleton, FieldSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Briefcase, Sparkles } from "lucide-react";

/**
 * Mirrors <PositionForm>: 12-col grid with "Dettagli Posizione" and
 * "Descrizione IA" cards on the left (8), sticky "Competenze" card (4).
 */
export function PositionFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="size-5 text-primary" />
                Dettagli Posizione
              </CardTitle>
            </CardHeader>
            <CardContent className="gap-6 grid grid-cols-1 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldSkeleton label="Titolo della posizione" required />
              </div>
              <FieldSkeleton label="Tipo di contratto" />
              <FieldSkeleton label="Livello di esperienza" required />
            </CardContent>
          </Card>

          <Card className="relative bg-primary/5 dark:bg-primary/10 border-primary/20 overflow-hidden">
            <div className="top-0 right-0 absolute opacity-10 p-4">
              <Sparkles className="size-24 text-primary" />
            </div>
            <CardHeader className="z-10 relative pb-0">
              <CardTitle className="flex items-center gap-2 text-primary text-lg">
                <Sparkles className="size-5" />
                Descrizione IA
              </CardTitle>
            </CardHeader>
            <CardContent className="z-10 relative space-y-4 pt-4">
              <FieldSkeleton
                label="Job Description"
                controlClassName="h-auto min-h-48"
              />
              <div className="flex justify-end">
                <ButtonSkeleton size="sm" className="w-32" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card className="top-6 sticky">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="size-5 text-primary" />
                Competenze
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FieldSkeleton label="Tech Stack" required />
              <FieldSkeleton label="Soft Skills" />
              <div className="flex flex-col gap-3 pt-6 border-t">
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
