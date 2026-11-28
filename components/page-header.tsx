import {
  SectionMark,
  SectionMarkPlaceholder,
} from "@/components/dashboard/section-mark";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Fragment, Suspense, type ReactNode } from "react";

/** One step of a page trail: a real name, with a link unless it is the page. */
export type Crumb = { label: string; href?: string };

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
  /**
   * Trail of real names above the section eyebrow. Only inner pages pass it:
   * a section's main page is already marked by the sidebar.
   */
  breadcrumbs?: Crumb[];
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
 * Page header band: breadcrumbs (inner pages), section mark (stripe + eyebrow
 * in the section's hue), title, context and actions, then the optional flow
 * content. Actions: next step first, delete last.
 */
const PageHeader = ({
  title,
  description,
  actionBtns,
  info,
  children,
  breadcrumbs,
}: PageHeaderProps) => {
  return (
    <header className={PAGE_BAND_CLASS}>
      <div className="flex lg:flex-row flex-col lg:justify-between lg:items-start gap-4">
        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb
              aria-label="Percorso"
              className="mb-2 text-sm text-muted-foreground"
            >
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <Fragment key={`${crumb.label}-${index}`}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        ) : crumb.href ? (
                          <BreadcrumbLink
                            render={<Link href={crumb.href as never} />}
                          >
                            {crumb.label}
                          </BreadcrumbLink>
                        ) : (
                          <span className="text-muted-foreground">
                            {crumb.label}
                          </span>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <Suspense fallback={<SectionMarkPlaceholder />}>
            <SectionMark />
          </Suspense>
          <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
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
