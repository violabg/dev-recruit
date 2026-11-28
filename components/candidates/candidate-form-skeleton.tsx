import { FieldSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, User } from "lucide-react";

/**
 * Mirrors <CandidateForm>: 12-col grid, "Dati Personali" + "Curriculum Vitae"
 * cards on the left (8), sticky "Candidatura" card on the right (4).
 */
export function CandidateFormBodySkeleton({
  mode = "new",
}: {
  mode?: "new" | "edit";
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="size-5 text-primary" />
                Dati Personali
              </CardTitle>
            </CardHeader>
            <CardContent className="gap-6 grid grid-cols-1 md:grid-cols-2">
              <FieldSkeleton label="Nome" required />
              <FieldSkeleton label="Cognome" required />
              <FieldSkeleton label="Email" required />
              <FieldSkeleton label="Data di nascita" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-primary">📄</span> Curriculum Vitae
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* FileUpload empty dropzone (py-4, icon + 2 text lines) */}
              <Skeleton className="rounded-lg w-full h-29" />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card className="top-6 sticky">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="size-5 text-primary" />
                Candidatura
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <FieldSkeleton label="Posizioni" required />
              {mode === "edit" && <FieldSkeleton label="Stato candidatura" />}
              <div className="flex flex-col gap-3 pt-4 border-t">
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
