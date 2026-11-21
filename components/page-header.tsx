import {
  SectionMark,
  SectionMarkPlaceholder,
} from "@/components/dashboard/section-mark";
import { PageBackButton } from "@/components/page-back-button";
import { Suspense, type ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  info?: ReactNode;
  actionBtns?: ReactNode;
  /**
   * Under the title row, inside the band: where the page stands in its flow
   * (a station track, the next action, a queue summary).
   */
  children?: ReactNode;
};

/** Shared title styling (also used by PageHeaderSkeleton). */
export const PAGE_TITLE_CLASS =
  "font-display font-extrabold text-heading text-[1.875rem] lg:text-[2.125rem] text-balance leading-[2.25rem] lg:leading-[2.5rem] tracking-[-0.025em]";

/**
 * The white band at the top of a page: spans the content area (globals.css).
 * Relative: SectionMark draws the section stripe along its top edge.
 */
export const PAGE_BAND_CLASS =
  "page-band relative flex flex-col gap-6 bg-band mb-8 pt-6 md:pt-8 pb-6 border-b";

/**
 * Page header band: section mark (stripe + eyebrow in the section's hue),
 * back button (inner pages), title, context and actions,
 * then the optional flow content. Actions: next step first, delete last.
 */
const PageHeader = ({
  title,
  description,
  actionBtns,
  info,
  children,
}: PageHeaderProps) => {
  return (
    <header className={PAGE_BAND_CLASS}>
      <div className="flex lg:flex-row flex-col lg:justify-between lg:items-start gap-4">
        <div className="min-w-0">
          <Suspense fallback={<SectionMarkPlaceholder />}>
            <SectionMark />
          </Suspense>
          <div className="relative">
            <Suspense fallback={null}>
              <PageBackButton />
            </Suspense>
            <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
          </div>
          {description && (
            <p className="mt-1.5 max-w-prose text-muted-foreground text-base">
              {description}
            </p>
          )}
          {info && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2.5 text-sm">
              {info}
            </div>
          )}
        </div>
        {actionBtns && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actionBtns}
          </div>
        )}
      </div>
      {children}
    </header>
  );
};

export default PageHeader;
