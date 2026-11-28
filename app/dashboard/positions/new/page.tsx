import PageHeader from "@/components/page-header";
import { PositionFormLoading } from "@/components/positions/position-form-with-data";
import { SECTIONS } from "@/components/dashboard/sections";
import {
  Card,
  CardContent,
  } from "@/components/ui/card";
import { sectionTrail } from "@/lib/utils/breadcrumbs";

// Server component for new position page
export default async function NewPositionPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuova posizione"
        description="Compila il modulo sottostante per creare una nuova posizione"
        breadcrumbs={sectionTrail(SECTIONS.positions, { label: "Nuova posizione" })}
      />
      <Card>
      <CardContent>
        <PositionFormLoading />
      </CardContent>
      </Card>
    </div>
  );
}
