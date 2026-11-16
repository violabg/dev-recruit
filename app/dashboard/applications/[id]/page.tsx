import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRecentApplicationIds } from "@/lib/data/applications";
import { Suspense } from "react";
import { ApplicationHeader } from "./application-header";
import { AssessmentsTab } from "./assessments-tab";
import { DecisionTab } from "./decision-tab";
import {
  ApplicationHeaderSkeleton,
  ApplicationTabSkeleton,
  NextActionSkeleton,
} from "./fallbacks";
import { InterviewsTab } from "./interviews-tab";
import { NextActionSection } from "./next-action-section";
import { OverviewTab } from "./overview-tab";
import { ResumeTab } from "./resume-tab";

type ApplicationParams = Promise<{ id: string }>;
type ApplicationSearchParams = Promise<{ tab?: string }>;

const TABS = ["panoramica", "cv", "test", "colloqui", "decisione"] as const;
type ApplicationTab = (typeof TABS)[number];

export async function generateStaticParams() {
  const applicationIds = await getRecentApplicationIds(100);

  // Cache Components requires at least one result from generateStaticParams
  if (applicationIds.length === 0) {
    return [{ id: "placeholder" }];
  }

  return applicationIds.map((id) => ({ id }));
}

/**
 * Main page of an application. The promises are passed un-awaited to the
 * async children, each in its own Suspense boundary.
 */
export default function ApplicationPage({
  params,
  searchParams,
}: {
  params: ApplicationParams;
  searchParams: ApplicationSearchParams;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<ApplicationHeaderSkeleton />}>
        <ApplicationHeader params={params} />
      </Suspense>

      <Suspense fallback={<NextActionSkeleton />}>
        <NextActionSection params={params} />
      </Suspense>

      <Suspense fallback={<ApplicationTabSkeleton />}>
        <ApplicationTabs params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** The five tabs; the URL param `tab` chooses the one opened first. */
async function ApplicationTabs({
  params,
  searchParams,
}: {
  params: ApplicationParams;
  searchParams: ApplicationSearchParams;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: ApplicationTab = TABS.includes(rawTab as ApplicationTab)
    ? (rawTab as ApplicationTab)
    : "panoramica";

  return (
    <Tabs key={tab} defaultValue={tab}>
      <TabsList variant="line">
        <TabsTrigger value="panoramica">Panoramica</TabsTrigger>
        <TabsTrigger value="cv">CV</TabsTrigger>
        <TabsTrigger value="test">Test</TabsTrigger>
        <TabsTrigger value="colloqui">Colloqui</TabsTrigger>
        <TabsTrigger value="decisione">Decisione</TabsTrigger>
      </TabsList>
      <TabsContent value="panoramica" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<ApplicationTabSkeleton />}>
          <OverviewTab params={params} />
        </Suspense>
      </TabsContent>
      <TabsContent value="cv" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<ApplicationTabSkeleton />}>
          <ResumeTab params={params} />
        </Suspense>
      </TabsContent>
      <TabsContent value="test" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<ApplicationTabSkeleton />}>
          <AssessmentsTab params={params} />
        </Suspense>
      </TabsContent>
      <TabsContent value="colloqui" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<ApplicationTabSkeleton />}>
          <InterviewsTab params={params} />
        </Suspense>
      </TabsContent>
      <TabsContent value="decisione" className="flex flex-col gap-4 pt-4">
        <Suspense fallback={<ApplicationTabSkeleton />}>
          <DecisionTab params={params} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
