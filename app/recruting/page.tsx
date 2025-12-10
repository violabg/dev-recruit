import { ApplyFormWrapper } from "@/components/recruting/apply-form-wrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPositionsForSelect } from "@/lib/data/positions";
import { Suspense } from "react";
import { ApplyFormSkeleton } from "./fallbacks";

type PageProps = {
  searchParams: Promise<{ positionId?: string }>;
};

export default async function ApplyPage({ searchParams }: PageProps) {
  return (
    <div className="flex flex-col justify-center items-center bg-background px-4 py-8 min-h-dvh">
      <div className="w-full max-w-6xl">
        {/* Header Card */}
        <Card className="mb-6 w-full">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <div className="flex justify-center items-center bg-primary/10 rounded-full w-14 h-14">
                <svg
                  className="w-7 h-7 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">
                Unisciti al nostro team! 🚀
              </CardTitle>
              <CardDescription className="text-muted-foreground/90 text-base">
                Cerchiamo talenti come te. Compila il modulo, scegli la
                posizione che fa per te e allega il tuo CV. Ti ricontatteremo
                presto!
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        {/* Form and Details */}
        <Suspense fallback={<ApplyFormSkeleton />}>
          <ApplyFormContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ApplyFormContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const positionId = params.positionId;

  const positions = await getPositionsForSelect();

  // Validate that the positionId exists if provided
  const validPositionId =
    positionId && positions.some((p) => p.id === positionId)
      ? positionId
      : undefined;

  if (positions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-muted-foreground text-center">
          <p>Al momento non ci sono posizioni aperte.</p>
          <p className="mt-2 text-sm">Torna a trovarci presto!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ApplyFormWrapper
      positions={positions}
      defaultPositionId={validPositionId}
    />
  );
}
