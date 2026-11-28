import { getRecentApplicationIds } from "@/lib/data/applications";
import { Suspense } from "react";
import { ApplicationHeader } from "./application-header";
import { ApplicationSide } from "./application-side";
import { ApplicationStory } from "./application-story";
import {
  ApplicationHeaderSkeleton,
  SideSkeleton,
  StorySkeleton,
} from "./fallbacks";

type ApplicationParams = Promise<{ id: string }>;
type ApplicationSearchParams = Promise<{ tab?: string }>;

export async function generateStaticParams() {
  const applicationIds = await getRecentApplicationIds(100);

  // Cache Components requires at least one result from generateStaticParams
  if (applicationIds.length === 0) {
    return [{ id: "placeholder" }];
  }

  return applicationIds.map((id) => ({ id }));
}

/**
 * Main page of an application: header band, then the vertical story of stops
 * with the side column. The promises are passed un-awaited to the async
 * children, each in its own Suspense boundary.
 */
export default function ApplicationPage({
  params,
  searchParams,
}: {
  params: ApplicationParams;
  searchParams: ApplicationSearchParams;
}) {
  return (
    <div className="flex flex-col">
      <Suspense fallback={<ApplicationHeaderSkeleton />}>
        <ApplicationHeader params={params} />
      </Suspense>

      <div className="flex flex-wrap items-start gap-8">
        <div className="flex-[999_1_36rem] min-w-0">
          <Suspense fallback={<StorySkeleton />}>
            <ApplicationStory params={params} searchParams={searchParams} />
          </Suspense>
        </div>
        <Suspense fallback={<SideSkeleton />}>
          <ApplicationSide params={params} />
        </Suspense>
      </div>
    </div>
  );
}
