import { PositionFormWithData } from "@/components/positions/position-form-with-data";
import { Button } from "@/components/ui/button";
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
        <Button className="mt-4" asChild>
          <Link href="/dashboard/positions">Torna alle posizioni</Link>
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/positions/${params.id}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
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
