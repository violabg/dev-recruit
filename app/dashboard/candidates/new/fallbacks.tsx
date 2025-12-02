import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CandidateFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          <Skeleton className="w-48 h-8" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="w-72 h-5" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* First name and Last name - 2 column grid */}
          <div className="gap-4 grid sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="w-12 h-4" />
              <Skeleton className="w-full h-10" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-16 h-4" />
              <Skeleton className="w-full h-10" />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Skeleton className="w-12 h-4" />
            <Skeleton className="w-full h-10" />
          </div>

          {/* Date of birth */}
          <div className="space-y-2">
            <Skeleton className="w-28 h-4" />
            <Skeleton className="w-40 h-10" />
          </div>

          {/* Position select */}
          <div className="space-y-2">
            <Skeleton className="w-20 h-4" />
            <Skeleton className="w-full h-10" />
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-full h-32" />
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <Skeleton className="w-20 h-9" />
            <Skeleton className="w-32 h-10" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
