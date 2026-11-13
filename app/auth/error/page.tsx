import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

type ErrorSearchParams = Promise<{ error?: string }>;

/**
 * Static shell: only the error code reads `searchParams`, so it streams in
 * behind a same-height placeholder and the rest of the card renders instantly.
 */
export default function Page({
  searchParams,
}: {
  searchParams: ErrorSearchParams;
}) {
  return (
    <div className="flex justify-center items-center p-6 md:p-10 w-full min-h-dvh">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Sorry, something went wrong.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="flex items-center h-5">
                    <Skeleton className="w-40 h-3.5" />
                  </div>
                }
              >
                <ErrorCode searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function ErrorCode({ searchParams }: { searchParams: ErrorSearchParams }) {
  const params = await searchParams;
  return (
    <p className="text-muted-foreground text-sm">
      {params?.error
        ? `Code error: ${params.error}`
        : "An unspecified error occurred."}
    </p>
  );
}
