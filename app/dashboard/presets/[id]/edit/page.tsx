import { cn } from "cn";
import PageHeader from "@/components/page-header";
import { PresetForm } from "@/components/presets/preset-form";
import { SECTIONS } from "@/components/dashboard/sections";
import {
  Card,
  CardContent,
  } from "@/components/ui/card";
import { getPresetData } from "@/lib/data/presets";
import { sectionTrail } from "@/lib/utils/breadcrumbs";
import { Route } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditPresetSkeleton } from "../fallbacks";

type EditPresetPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Static shell: the route `params` are only read inside the Suspense
 * boundary, so navigations into this page are instant (see
 * https://nextjs.org/docs/messages/instant-shell-url-data).
 */
export default function EditPresetPage(
  props: Parameters<typeof EditPresetContent>[0]
) {
  return (
    <Suspense fallback={<EditPresetSkeleton />}>
      <EditPresetContent {...props} />
    </Suspense>
  );
}

async function EditPresetContent({ params }: EditPresetPageProps) {
  const { id } = await params;
  const preset = await getPresetData(id);

  if (!preset) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Modifica preset"
        description={`${preset.name}`}
        breadcrumbs={sectionTrail(
          SECTIONS.presets,
          { label: preset.name, href: `/dashboard/presets/${preset.id}` },
          { label: "Modifica" },
        )}
      />
      <Card>
      <CardContent>
        <PresetForm preset={preset} />
      </CardContent>
      </Card>
    </div>
  );
}
