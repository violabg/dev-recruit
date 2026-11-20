import { SECTIONS, type SectionKey } from "@/components/dashboard/sections";
import { PageBackButton } from "@/components/page-back-button";
import { Suspense } from "react";
import { cn } from "cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  info?: React.ReactNode;
  actionBtns?: React.ReactNode;
  /** Dashboard section this page belongs to: colours the title rule */
  section?: SectionKey;
};

/** Vertical rule in the section hue, spanning the title block. */
export function SectionRule({ section }: { section?: SectionKey }) {
  return (
    <span
      aria-hidden
      className={cn(
        "rounded-full w-1.5 shrink-0 self-stretch",
        section ? SECTIONS[section].rule : "bg-primary"
      )}
    />
  );
}

/** Shared title styling (also used by PageHeaderSkeleton). */
export const PAGE_TITLE_CLASS =
  "font-display font-extrabold text-heading text-[2.125rem] lg:text-[2.5rem] text-balance leading-[2.5rem] lg:leading-[2.875rem] tracking-[-0.03em]";

const PageHeader = ({
  title,
  description,
  actionBtns,
  info,
  section,
}: PageHeaderProps) => {
  return (
    <div className="flex lg:flex-row flex-col lg:justify-between lg:items-end gap-4 mb-8 pb-6 border-b">
      <div className="relative flex gap-4 min-w-0">
        <Suspense fallback={null}>
          <PageBackButton />
        </Suspense>
        <SectionRule section={section} />
        <div className="py-0.5 min-w-0">
          <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
          {description && (
            <p className="mt-2 max-w-prose text-muted-foreground text-base">
              {description}
            </p>
          )}
          {info && (
            <div className="flex flex-wrap items-center gap-2 mt-3">{info}</div>
          )}
        </div>
      </div>
      {actionBtns && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actionBtns}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
