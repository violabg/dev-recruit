import { PresetsClient } from "@/components/presets/presets-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPresetsAction } from "@/lib/actions/presets";
import { type Preset } from "@/lib/schemas";
import { Suspense } from "react";

async function PresetsContent() {
  const result = await getPresetsAction();

  if (!result.success) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return <PresetsClient presets={result.presets as Preset[]} />;
}

export default async function PresetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Preset Management</h1>
        <p className="mt-2 text-muted-foreground">
          Create and manage question generation presets for your positions
        </p>
      </div>

      <Suspense
        fallback={
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="w-full h-10" />
              <Skeleton className="w-full h-10" />
              <Skeleton className="w-full h-10" />
            </CardContent>
          </Card>
        }
      >
        <PresetsContent />
      </Suspense>
    </div>
  );
}
