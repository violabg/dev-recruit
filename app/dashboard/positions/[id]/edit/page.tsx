import PageHeader from "@/components/page-header";
import { PageHeaderSkeleton } from "@/components/skeletons";
import { cn } from "cn";
import { PositionFormWithData } from "@/components/positions/position-form-with-data";
import { buttonVariants } from "@/components/ui/button";

import {
  Card,
  CardContent,
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
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton section="positions" description />
      <Card>
        <CardContent>
          <PositionFormSkeleton />
        </CardContent>
      </Card>
    </div>
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
    <div className="flex flex-col gap-6">
      <PageHeader
        section="positions"
        title="Modifica posizione"
        description={`${position.title}`}
        actionBtns={
          <Link
            href={`/dashboard/positions/${params.id}` as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Torna alla posizione
          </Link>
        }
      />
      <Card>
      <CardContent>
        <PositionFormWithData position={position} />
      </CardContent>
      </Card>
    </div>
  );
}
