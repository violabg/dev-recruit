import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCandidateWithDetails } from "@/lib/data/candidates";

type Props = {
  params: Promise<{ id: string }>;
};

export async function CandidateInterviewsContent({ params }: Props) {
  const { id } = await params;
  const candidate = await getCandidateWithDetails(id);

  if (!candidate || candidate.interviews.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Colloqui</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {candidate.interviews.map((interview) => (
            <div
              key={interview.id}
              className="flex justify-between items-center pb-2 last:pb-0 border-b last:border-b-0"
            >
              <div>
                <div className="font-medium">{interview.status}</div>
                {interview.createdAt && (
                  <div className="text-muted-foreground text-sm">
                    {new Date(interview.createdAt).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="font-semibold">
                {interview.score !== null
                  ? `Punteggio: ${interview.score}`
                  : "-"}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
