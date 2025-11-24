import { PresetForm } from "@/components/presets/preset-form";
import { getPresetAction } from "@/lib/actions/presets";
import { notFound } from "next/navigation";

type EditPresetPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPresetPage({ params }: EditPresetPageProps) {
  const { id } = await params;
  const result = await getPresetAction(id);

  if (!result.success || !result.preset) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Modifica preset</h1>
        <p className="mt-2 text-muted-foreground">
          Aggiorna la configurazione di questo preset prima di riutilizzarlo nei
          tuoi colloqui.
        </p>
      </div>

      <PresetForm preset={result.preset} />
    </div>
  );
}
