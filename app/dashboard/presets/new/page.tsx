import { PresetForm } from "@/components/presets/preset-form";

export default function NewPresetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Crea preset</h1>
        <p className="mt-2 text-muted-foreground">
          Definisci un preset per la generazione di domande che può essere
          riutilizzato nelle tue posizioni.
        </p>
      </div>

      <PresetForm />
    </div>
  );
}
