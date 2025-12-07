import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPositionById } from "@/lib/data/positions";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PositionDetailsContent({ params }: Props) {
  const { id } = await params;
  const position = await getPositionById(id);

  if (!position) {
    return null;
  }

  return (
    <div className="gap-4 grid md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Descrizione</CardTitle>
        </CardHeader>
        <CardContent>
          {position.description ? (
            <p className="whitespace-pre-line">{position.description}</p>
          ) : (
            <p className="text-muted-foreground">
              Nessuna descrizione disponibile
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Competenze tecniche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {position.skills.map((skill, index) => (
                <Badge key={index}>{skill}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {position.softSkills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Soft skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {position.softSkills.map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
