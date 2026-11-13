import { PresetForm } from "@/components/presets/preset-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPresetAction } from "@/lib/actions/presets";
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
  const result = await getPresetAction(id);

  if (!result.success || !result.preset) {
    notFound();
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-4">
        <Link
          href={
            `/dashboard/presets/${result.preset.id}` as Route<`/dashboard/presets/${string}`>
          }
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
          })}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <CardTitle className="text-2xl">Modifica preset</CardTitle>
          <CardDescription>
            Aggiorna la configurazione di questo preset prima di riutilizzarlo
            nei tuoi colloqui.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <PresetForm preset={result.preset} />
      </CardContent>
    </Card>
  );
}
