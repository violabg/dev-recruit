import { PresetsTable } from "@/components/presets/presets-table";
import { Card, CardContent } from "@/components/ui/card";
import type { Preset } from "@/lib/schemas";

type PresetsClientProps = {
  presets: Preset[];
};

export function PresetsClient({ presets }: PresetsClientProps) {
  return (
    <Card className="w-full">
      <CardContent>
        <PresetsTable presets={presets} />
      </CardContent>
    </Card>
  );
}
