import { PresetForm } from "@/components/presets/preset-form";
import { getPresetAction } from "@/lib/actions/presets";
import { notFound } from "next/navigation";

type EditPresetPageProps = {
  params: {
    id: string;
  };
};

export default async function EditPresetPage({ params }: EditPresetPageProps) {
  const result = await getPresetAction(params.id);

  if (!result.success || !result.preset) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Edit preset</h1>
        <p className="mt-2 text-muted-foreground">
          Update the configuration for this preset before reusing it in your
          interviews.
        </p>
      </div>

      <PresetForm preset={result.preset} />
    </div>
  );
}
