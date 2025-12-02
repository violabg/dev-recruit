import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function QuizHeaderSkeleton() {
  return (
    <>
      <div className="flex items-center gap-2">
        <Skeleton className="w-48 h-8" />
      </div>

      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="mb-2 w-64 h-10" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-24 h-6" />
            <Skeleton className="w-24 h-6" />
            <Skeleton className="w-28 h-6" />
            <Skeleton className="w-32 h-4" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-28 h-10" />
          <Skeleton className="w-36 h-10" />
          <Skeleton className="w-28 h-10" />
        </div>
      </div>
    </>
  );
}

export function QuizQuestionsTabSkeleton() {
  return (
    <>
      {[...Array(3)].map((_, i) => (
        <Card
          key={i}
          className="shadow-md pt-0 border-primary/20 ring-1 ring-primary/5 overflow-hidden"
        >
          <CardHeader className="bg-primary/10 pt-4 pb-4 border-b">
            <CardTitle className="flex justify-between items-center gap-2 text-lg">
              <div className="flex items-center gap-2">
                <Skeleton className="rounded-full w-6 h-6" />
                <Skeleton className="w-40 h-5" />
              </div>
              <Skeleton className="w-8 h-8" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-2">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-full max-w-2xl h-4" />
              <Skeleton className="w-full max-w-xl h-4" />
            </div>
            <div className="space-y-3 pt-2">
              <Skeleton className="w-full max-w-md h-10" />
              <Skeleton className="w-full max-w-md h-10" />
              <Skeleton className="w-full max-w-md h-10" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function QuizSettingsTabSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="w-48 h-6" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="gap-4 grid md:grid-cols-2">
          <div>
            <Skeleton className="mb-2 w-20 h-4" />
            <Skeleton className="w-40 h-4" />
          </div>
          <div>
            <Skeleton className="mb-2 w-28 h-4" />
            <Skeleton className="w-24 h-4" />
          </div>
          <div>
            <Skeleton className="mb-2 w-36 h-4" />
            <Skeleton className="w-8 h-4" />
          </div>
          <div>
            <Skeleton className="mb-2 w-24 h-4" />
            <Skeleton className="w-48 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuizDetailSkeleton() {
  return (
    <div className="space-y-6">
      <QuizHeaderSkeleton />

      <div>
        <div className="flex gap-2 mb-4">
          <Skeleton className="w-32 h-10" />
          <Skeleton className="w-32 h-10" />
          <Skeleton className="w-32 h-10" />
        </div>
        <div className="space-y-6 pt-4">
          <QuizQuestionsTabSkeleton />
        </div>
      </div>
    </div>
  );
}
