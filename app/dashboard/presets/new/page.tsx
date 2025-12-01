import { PresetForm } from "@/components/presets/preset-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewPresetPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Gestione preset</CardTitle>
        <CardDescription>
          Definisci un preset per la generazione di domande che può essere
          riutilizzato nelle tue posizioni.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PresetForm />
      </CardContent>
    </Card>
  );
}
