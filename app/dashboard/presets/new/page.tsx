import PageHeader from "@/components/page-header";
import { PresetForm } from "@/components/presets/preset-form";
import { SECTIONS } from "@/components/dashboard/sections";
import {
  Card,
  CardContent,
  } from "@/components/ui/card";
import { sectionTrail } from "@/lib/utils/breadcrumbs";

export default function NewPresetPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuovo preset"
        description="Definisci un preset per la generazione di domande che può essere riutilizzato nelle tue posizioni."
        breadcrumbs={sectionTrail(SECTIONS.presets, { label: "Nuovo preset" })}
      />
      <Card>
      <CardContent>
        <PresetForm />
      </CardContent>
      </Card>
    </div>
  );
}
