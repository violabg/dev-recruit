import { cn } from "@/lib/utils";
import { PositionFormWithData } from "@/components/positions/position-form-with-data";
import { buttonVariants } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PositionFormSkeleton } from "@/components/positions/position-form-skeleton";
import { TextSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { getPositionById } from "@/lib/data/positions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

type EditPositionPageProps = {
  params: Promise<{ id: string }>;
};

/** Mirrors EditPositionContent: card header (back + title) and the form. */
function EditPositionSkeleton() {
  return (
    <Card>
      <CardHeader className="flex items-center gap-4">
        <Skeleton className="rounded-lg size-8" />
        <div>
          <CardTitle className="text-2xl"> Posizione</CardTitle>
          <TextSkeleton className="w-72" />
        </div>
      </CardHeader>
      <CardContent>
        <PositionFormSkeleton />
      </CardContent>
    </Card>
  );
}

export default function EditPositionPage({ params }: EditPositionPageProps) {
  return (
    <Suspense fallback={<EditPositionSkeleton />}>
      <EditPositionContent params={params} />
    </Suspense>
  );
}

async function EditPositionContent({
  params: incomingParams,
}: EditPositionPageProps) {
  const params = await incomingParams;
  const position = await getPositionById(params.id);

  if (!position) {
    return (
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Posizione non trovata</p>
        <Link
          href="/dashboard/positions"
          className={cn("mt-4", buttonVariants({ variant: "default" }))}
        >
          Torna alle posizioni
        </Link>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-4">
        <Link
          href={`/dashboard/positions/${params.id}`}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="size-4" />
        </Link>

        <div>
          <CardTitle className="text-2xl"> Posizione</CardTitle>
          <CardDescription>
            Modifica i dettagli della posizione&ldquo;{position.title}&rdquo;
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <PositionFormWithData position={position} />
      </CardContent>
    </Card>
  );
}
