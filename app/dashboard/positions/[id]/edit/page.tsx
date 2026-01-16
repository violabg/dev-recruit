import { PositionFormWithData } from "@/components/positions/position-form-with-data";
import { buttonVariants } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div className="flex flex-col justify-center items-center h-100">
        <p className="font-medium text-lg">Posizione non trovata</p>
        <Link
          href="/dashboard/positions"
          className={`mt-4 ${buttonVariants({ variant: "default" })}`}
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
