import { PresetsTable } from "@/components/presets/presets-table";
import type { Preset } from "@/lib/data/presets";

type PresetsClientProps = {
  presets: Preset[];
};

export function PresetsClient({ presets }: PresetsClientProps) {
  return <PresetsTable presets={presets} />;
}
