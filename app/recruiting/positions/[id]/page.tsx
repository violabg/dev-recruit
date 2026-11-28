import { ApplyForm } from "@/components/recruiting/apply-form";
import {
  PositionDetails,
  positionMeta,
} from "@/components/recruiting/position-details";
import { PublicBody, PublicHeader } from "@/components/recruiting/public-header";
import { buttonVariants } from "@/components/ui/button";
import { getPublicPositionById } from "@/lib/data/positions";
import { cn } from "cn";
import Link from "next/link";
import { Suspense } from "react";
import { PositionApplySkeleton } from "./fallbacks";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Apply page of a single position: a shared link that cannot pick another. */
export default function PositionApplyPage({ params }: PageProps) {
  return (
    <div className="bg-background min-h-dvh">
      <Suspense fallback={<PositionApplySkeleton />}>
        <PositionApplyContent params={params} />
      </Suspense>
    </div>
  );
}

async function PositionApplyContent({ params }: PageProps) {
  const { id } = await params;
  const position = await getPublicPositionById(id);

  // A draft is not public: same answer as a missing position
  if (!position || position.status === "draft") {
    return (
      <Unavailable
        title="Posizione non trovata"
        text="Il link non corrisponde a nessuna posizione. Controlla di averlo copiato per intero, oppure guarda le posizioni aperte."
      />
    );
  }

  if (position.status === "closed") {
    return (
      <Unavailable
        title={position.title}
        text="Questa posizione è chiusa e non accetta più candidature."
      />
    );
  }

  return (
    <>
      <PublicHeader title={position.title}>
        <span className="text-muted-foreground">{positionMeta(position)}</span>
        <Link href="/recruiting" className="text-primary hover:underline">
          Vedi tutte le posizioni aperte
        </Link>
      </PublicHeader>
      <PublicBody>
        <div className="items-start gap-8 grid grid-cols-1 lg:grid-cols-12">
          <section
            aria-labelledby="position-details"
            className="bg-card p-5 sm:p-6 border rounded-xl lg:col-span-7"
          >
            <h2
              id="position-details"
              className="mb-4 font-display font-bold text-heading text-xl"
            >
              La posizione
            </h2>
            <PositionDetails position={position} />
          </section>
          <section className="lg:top-6 lg:sticky bg-card p-5 sm:p-6 border rounded-xl lg:col-span-5">
            <ApplyForm
              positionIds={[position.id]}
              header={
                <h2 className="font-display font-bold text-heading text-xl">
                  Candidati
                </h2>
              }
            />
          </section>
        </div>
      </PublicBody>
    </>
  );
}

function Unavailable({ title, text }: { title: string; text: string }) {
  return (
    <>
      <PublicHeader title={title} />
      <PublicBody>
        <div className="bg-card px-6 py-10 border rounded-xl max-w-2xl">
          <p className="text-foreground">{text}</p>
          <Link
            href="/recruiting"
            className={cn(buttonVariants(), "mt-6")}
          >
            Vedi le posizioni aperte
          </Link>
        </div>
      </PublicBody>
    </>
  );
}
