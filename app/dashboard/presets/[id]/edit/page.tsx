import { cn } from "cn";
import PageHeader from "@/components/page-header";
import { PresetForm } from "@/components/presets/preset-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  } from "@/components/ui/card";
import { getPresetData } from "@/lib/data/presets";
import { ArrowLeft } from "lucide-react";
import { Route } from "next";
import Link from "next/link";
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
        section="presets"
        title="Modifica preset"
        description={`${preset.name}`}
        actionBtns={
          <Link
            href={`/dashboard/presets/${preset.id}` as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Torna al preset
          </Link>
        }
      />
      <Card>
      <CardContent>
        <PresetForm preset={preset} />
      </CardContent>
      </Card>
    </div>
  );
}
