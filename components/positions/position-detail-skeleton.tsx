import { BadgeSkeleton, TextSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CalendarIcon, CodeIcon, HeartIcon } from "lucide-react";

/** Mirrors PositionDetailCardClient: static section headings, skeleton data. */
export function PositionDetailSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3">
          <TextSkeleton lineClassName="h-8" className="w-2/3 h-6" />
          <div className="flex items-center gap-2">
            <BadgeSkeleton className="w-24" />
            <BadgeSkeleton className="w-28" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-6 pb-6 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-foreground text-sm">Descrizione</h3>
          <div className="flex flex-col gap-1.5">
            <TextSkeleton className="w-full" />
            <TextSkeleton className="w-full" />
            <TextSkeleton className="w-11/12" />
            <TextSkeleton className="w-2/3" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CodeIcon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Competenze Tecniche</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {["w-20", "w-24", "w-16", "w-20"].map((w, i) => (
              <BadgeSkeleton key={i} className={w} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <HeartIcon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Soft Skills</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <BadgeSkeleton className="w-24" />
            <BadgeSkeleton className="w-20" />
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <CalendarIcon className="w-3 h-3" />
            <TextSkeleton lineClassName="h-4" className="w-36 h-3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
