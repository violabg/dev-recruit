import { ApplicationTimeline } from "@/components/applications/application-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicationDetail } from "@/lib/data/applications";
import { buildApplicationTimeline } from "@/lib/utils/application-timeline";

type Props = {
  params: Promise<{ id: string }>;
};

/** Tab Panoramica: the evidence collected on the application. */
export async function OverviewTab({ params }: Props) {
  const { id } = await params;
  const detail = await getApplicationDetail(id);

  if (!detail) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cronologia</CardTitle>
      </CardHeader>
      <CardContent>
        <ApplicationTimeline entries={buildApplicationTimeline(detail)} />
      </CardContent>
    </Card>
  );
}
