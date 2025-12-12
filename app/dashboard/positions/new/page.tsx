import { PositionFormLoading } from "@/components/positions/position-form-with-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Server component for new position page
export default async function NewPositionPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Nuova Posizione</CardTitle>
        <CardDescription>
          Compila il modulo sottostante per creare una nuova posizione
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PositionFormLoading />
      </CardContent>
    </Card>
  );
}
