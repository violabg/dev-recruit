import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DashboardStatsSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <div className="bg-muted rounded w-24 h-4 animate-pulse" />
        <div className="bg-muted rounded-full w-4 h-4 animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="bg-muted mb-2 rounded w-16 h-8 animate-pulse" />
        <div className="bg-muted rounded w-32 h-3 animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function RecentPositionsSkeleton() {
  return (
    <>
      {/* Recent positions skeleton */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>
            <div className="bg-muted rounded w-32 h-5 animate-pulse" />
          </CardTitle>
          <CardDescription>
            <div className="bg-muted rounded w-40 h-4 animate-pulse" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div>
                  <div className="bg-muted mb-1 rounded w-32 h-4 animate-pulse" />
                  <div className="bg-muted rounded w-20 h-3 animate-pulse" />
                </div>
                <div className="bg-muted rounded w-20 h-8 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent activity skeleton 
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>
              <div className="bg-muted rounded w-32 h-5 animate-pulse" />
            </CardTitle>
            <CardDescription>
              <div className="bg-muted rounded w-40 h-4 animate-pulse" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col justify-center items-center border border-dashed rounded-lg h-[140px]">
              <div className="bg-muted mb-2 rounded w-32 h-4 animate-pulse" />
              <div className="bg-muted rounded w-24 h-3 animate-pulse" />
            </div>
          </CardContent>
        </Card> */}
    </>
  );
}
