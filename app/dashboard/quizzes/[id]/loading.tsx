import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QuizDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="h-10 w-64 rounded bg-muted animate-pulse mb-2" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-24 rounded bg-muted animate-pulse" />
            <div className="h-6 w-24 rounded bg-muted animate-pulse" />
            <div className="h-6 w-28 rounded bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded bg-muted animate-pulse" />
          <div className="h-10 w-36 rounded bg-muted animate-pulse" />
          <div className="h-10 w-28 rounded bg-muted animate-pulse" />
        </div>
      </div>

      <div>
        <div className="flex gap-2 mb-4">
          <div className="h-10 w-32 rounded bg-muted animate-pulse" />
          <div className="h-10 w-32 rounded bg-muted animate-pulse" />
          <div className="h-10 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
                  <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-24 rounded bg-muted animate-pulse mb-1" />
                  <div className="h-4 w-64 rounded bg-muted animate-pulse" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-20 rounded bg-muted animate-pulse mb-1" />
                  <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
