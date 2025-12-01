import { PositionForm } from "@/components/positions/position-form";
import { Button } from "@/components/ui/button";
import { getPositionById } from "@/lib/data/positions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditPositionPage({
  params: incomingParams,
}: {
  params: { id: string };
}) {
  const params = await incomingParams;

  const position = await getPositionById(params.id);

  if (!position) {
    return (
      <div className="flex flex-col justify-center items-center h-[400px]">
        <p className="font-medium text-lg">Posizione non trovata</p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/positions">Torna alle posizioni</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/positions/${params.id}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-bold text-3xl">Modifica Posizione</h1>
          <p className="text-muted-foreground">
            Modifica i dettagli della posizione &ldquo;{position.title}&rdquo;
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="p-6 border rounded-md">
          <h2 className="mb-4 font-semibold text-xl">Dettagli posizione</h2>
          <PositionForm position={position} />
        </div>
      </div>
    </div>
  );
}
