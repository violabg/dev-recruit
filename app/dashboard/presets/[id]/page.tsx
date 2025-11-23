import { PresetDetailsActions } from "@/components/presets/preset-details-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPresetAction } from "@/lib/actions/presets";
import { notFound } from "next/navigation";

type PresetDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PresetDetailPage({
  params,
}: PresetDetailPageProps) {
  const { id } = await params;
  const result = await getPresetAction(id);

  if (!result.success || !result.preset) {
    notFound();
  }

  const preset = result.preset;

  return (
    <div className="space-y-6">
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-start gap-4">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Preset details
          </p>
          <h1 className="font-bold text-3xl tracking-tight">{preset.label}</h1>
          <p className="mt-2 text-muted-foreground">
            {preset.description || "No description provided."}
          </p>
        </div>
        <PresetDetailsActions presetId={preset.id} />
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Essential metadata captured inside this preset.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">
                {preset.questionType.replace(/_/g, " ")}
              </Badge>
              <Badge variant="secondary">Level {preset.difficulty}</Badge>
              {preset.isDefault && <Badge variant="default">Default</Badge>}
            </div>

            <div className="gap-4 grid sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">Identifier</p>
                <p className="font-medium">{preset.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Icon</p>
                <p className="font-medium">{preset.icon}</p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Tags</p>
              {preset.tags.length === 0 ? (
                <p className="mt-2 text-muted-foreground text-sm">
                  No tags configured for this preset.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {preset.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
