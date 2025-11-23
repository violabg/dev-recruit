import { PresetForm } from "@/components/presets/preset-form";

export default function NewPresetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Create preset</h1>
        <p className="mt-2 text-muted-foreground">
          Define a question generation preset that can be reused across your
          positions.
        </p>
      </div>

      <PresetForm />
    </div>
  );
}
