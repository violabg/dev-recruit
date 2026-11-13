import {
  BadgeSkeleton,
  ButtonSkeleton,
  PageHeaderSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Mirrors InterviewDetailContent: header (title + position/status badges +
 * delete button), the three summary cards (static titles, data as skeletons)
 * and the results card.
 */
export function InterviewDetailSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton
        section="interviews"
        titleClassName="w-96 max-w-full"
        info={
          <>
            <BadgeSkeleton className="w-32" />
            <BadgeSkeleton className="w-20" />
          </>
        }
        actions={<ButtonSkeleton size="sm" className="w-36" />}
      />
      <div className="gap-4 grid md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Candidato</CardTitle>
          </CardHeader>
          <CardContent>
            <TextSkeleton lineClassName="h-6" className="w-32 h-4" />
            <TextSkeleton className="w-44" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Stato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Inizio:</span>
                <TextSkeleton lineClassName="h-6" className="w-28" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Fine:</span>
                <TextSkeleton lineClassName="h-6" className="w-28" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Durata</CardTitle>
          </CardHeader>
          <CardContent>
            <TextSkeleton lineClassName="h-6" className="w-16" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 pt-4">
        <Card>
          <CardHeader>
            <TextSkeleton lineClassName="h-7" className="w-56 h-5" />
            <TextSkeleton className="w-80 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-2">
            <TextSkeleton lineClassName="h-6" className="w-full" />
            <TextSkeleton lineClassName="h-6" className="w-2/3" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
