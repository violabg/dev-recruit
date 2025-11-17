import { Skeleton } from "@/components/ui/skeleton";

export default function InterviewLoading() {
  return (
    <div className="p-4 w-full min-h-dvh">
      <div className="space-y-2 mb-6">
        <Skeleton className="w-3/4 h-8" /> {/* Quiz Title */}
        <div className="flex justify-between items-center">
          <Skeleton className="w-1/4 h-4" /> {/* Question count */}
          <Skeleton className="w-1/4 h-4" /> {/* Candidate Name */}
        </div>
        <Skeleton className="w-full h-2" /> {/* Progress bar */}
      </div>

      {/* Skeleton for InterviewQuestion component */}
      <div className="bg-card shadow-sm p-6 border rounded-lg">
        {" "}
        {/* Mimicking Card structure */}
        <div className="space-y-2 mb-4">
          <Skeleton className="w-4/5 h-6" /> {/* Question title/text line 1 */}
          <Skeleton className="w-full h-6" /> {/* Question title/text line 2 */}
          <Skeleton className="w-3/5 h-6" /> {/* Question title/text line 3 */}
        </div>
        {/* Skeleton for answer options (e.g., multiple choice) */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Skeleton className="rounded-full w-5 h-5" />{" "}
            {/* Radio button skeleton */}
            <Skeleton className="flex-1 h-5" /> {/* Option text skeleton */}
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="rounded-full w-5 h-5" />
            <Skeleton className="flex-1 h-5" />
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="rounded-full w-5 h-5" />
            <Skeleton className="flex-1 h-5" />
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="rounded-full w-5 h-5" />
            <Skeleton className="flex-1 h-5" />
          </div>
        </div>
        {/* 
              Alternatively, for a code editor or textarea:
              <Skeleton className="mt-4 w-full h-40" /> // For code editor
              <Skeleton className="mt-4 w-full h-24" /> // For textarea
            */}
      </div>

      <div className="flex justify-between mt-6">
        <Skeleton className="w-24 h-10" /> {/* Previous Button */}
        <Skeleton className="w-24 h-10" /> {/* Next/Complete Button */}
      </div>
    </div>
  );
}
