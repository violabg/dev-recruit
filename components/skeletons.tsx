/**
 * Layout-faithful skeleton building blocks.
 *
 * Rules every Suspense fallback in the app follows:
 * - Same wrappers, paddings, gaps, grid/flex breakpoints and control heights
 *   as the real component (Input/Select h-9, Button h-8, TabsList h-8,
 *   Badge h-5, TableHead h-10, TableCell p-2), so nothing shifts on swap.
 * - Static text (titles, labels, column headers, icons) is rendered for real;
 *   only data-dependent content is a <Skeleton>.
 * - Text skeletons sit inside a box with the real line-height (text-sm →
 *   h-5, text-base → h-6, text-2xl → h-8, text-3xl → h-9) so the vertical
 *   rhythm matches.
 */
import type { SectionKey } from "@/components/dashboard/sections";
import { PAGE_TITLE_CLASS, SectionRule } from "@/components/page-header";
import { SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "cn";

/** A text-line placeholder with the real line-height of its font size. */
export function TextSkeleton({
  className,
  lineClassName = "h-5",
}: {
  /** width / skeleton bar height overrides */
  className?: string;
  /** line box height, e.g. h-5 for text-sm, h-6 for text-base */
  lineClassName?: string;
}) {
  return (
    <div className={cn("flex items-center", lineClassName)}>
      <Skeleton className={cn("w-24 h-3.5", className)} />
    </div>
  );
}

/**
 * Mirrors the search + select filter bars
 * (`@container` → `flex @[800px]:flex-row flex-col gap-4`).
 */
export function FilterBarSkeleton({
  selects,
  selectClassName = "@[800px]:w-40 w-full",
}: {
  selects: number;
  selectClassName?: string;
}) {
  return (
    <div className="@container">
      <div className="flex @[800px]:flex-row flex-col gap-4">
        <Skeleton className="flex-1 rounded-lg h-9" />
        {Array.from({ length: selects }, (_, i) => (
          <Skeleton key={i} className={cn("rounded-lg h-9", selectClassName)} />
        ))}
      </div>
    </div>
  );
}

export type TableSkeletonColumn = {
  /** Real header label (static text, rendered as-is) */
  header: React.ReactNode;
  headClassName?: string;
  /** Cell placeholder shape */
  cell?: "text" | "muted" | "badge" | "stacked" | "textBadge" | "action";
  cellClassName?: string;
  /** Custom placeholder, overrides `cell` */
  content?: React.ReactNode;
  /** Number of icon buttons for `cell: "action"` (default 1) */
  actionCount?: number;
};

/** Mirrors a shadcn <Table> inside the `border rounded-md` wrapper. */
export function TableSkeleton({
  columns,
  rows = 5,
  className,
  bordered = true,
}: {
  columns: TableSkeletonColumn[];
  rows?: number;
  className?: string;
  /** Wrap in the `border rounded-md` container most tables use */
  bordered?: boolean;
}) {
  return (
    <div className={cn(bordered && "border rounded-md", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => (
              <TableHead key={i} className={col.headClassName}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, r) => (
            <TableRow key={r}>
              {columns.map((col, c) => (
                <TableCell key={c} className={col.cellClassName}>
                  {col.content ?? (
                    <CellSkeleton
                      kind={col.cell ?? "text"}
                      actionCount={col.actionCount}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CellSkeleton({
  kind,
  actionCount = 1,
}: {
  kind: NonNullable<TableSkeletonColumn["cell"]>;
  actionCount?: number;
}) {
  switch (kind) {
    case "badge":
      return <Skeleton className="rounded-4xl w-20 h-5" />;
    case "stacked":
      return (
        <div className="flex flex-col gap-1">
          <TextSkeleton className="w-28" />
          <TextSkeleton lineClassName="h-4" className="w-16 h-3" />
        </div>
      );
    case "textBadge":
      return (
        <div className="flex flex-col gap-1">
          <TextSkeleton className="w-28" />
          <Skeleton className="rounded-4xl w-16 h-5" />
        </div>
      );
    case "action":
      return (
        <div className="inline-flex gap-1">
          {Array.from({ length: actionCount }, (_, i) => (
            <Skeleton key={i} className="rounded-lg size-8" />
          ))}
        </div>
      );
    case "muted":
      return <TextSkeleton className="w-20" />;
    default:
      return <TextSkeleton className="w-32" />;
  }
}

/** Mirrors <UrlPagination>: count text + prev / pages / next (h-8 controls). */
export function PaginationSkeleton() {
  return (
    <div className="flex sm:flex-row flex-col justify-between items-center gap-4">
      <div className="flex justify-center items-center gap-2 mx-auto w-full">
        <TextSkeleton className="w-40" />
        <div className="flex items-center gap-0.5">
          <Skeleton className="rounded-lg w-8 sm:w-24 h-8" />
          <Skeleton className="rounded-lg size-8" />
          <Skeleton className="rounded-lg w-8 sm:w-24 h-8" />
        </div>
      </div>
    </div>
  );
}

/**
 * Mirrors <PageHeader>: section rule, display title (38px line), optional
 * description (text-base, h-6, mt-2), bottom divider or info row (mt-3), and the actions row.
 */
export function PageHeaderSkeleton({
  title,
  titleClassName = "w-64",
  description,
  info,
  actions,
  section,
}: {
  /** Real title when it's static; otherwise a skeleton is shown */
  title?: string;
  titleClassName?: string;
  /** `true` → skeleton line, string → real text */
  description?: boolean | string;
  info?: React.ReactNode;
  actions?: React.ReactNode;
  section?: SectionKey;
}) {
  return (
    <div className="flex lg:flex-row flex-col lg:justify-between lg:items-end gap-4 mb-8 pb-6 border-b">
      <div className="flex gap-4 min-w-0">
        <SectionRule section={section} />
        <div className="py-0.5 min-w-0">
          {title ? (
            <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
          ) : (
            <TextSkeleton
              lineClassName="h-10 lg:h-[2.875rem]"
              className={cn("h-7", titleClassName)}
            />
          )}
          {typeof description === "string" ? (
            <p className="mt-2 max-w-prose text-muted-foreground text-base">
              {description}
            </p>
          ) : description ? (
            <TextSkeleton lineClassName="mt-2 h-6" className="w-72 h-4" />
          ) : null}
          {info && (
            <div className="flex flex-wrap items-center gap-2 mt-3">{info}</div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/** Button-shaped placeholder: default h-8, sm h-7, lg h-9. */
export function ButtonSkeleton({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}) {
  return (
    <Skeleton
      className={cn(
        "rounded-lg",
        size === "sm" && "h-7 w-20",
        size === "default" && "h-8 w-24",
        size === "lg" && "h-9 w-28",
        size === "icon" && "size-8",
        className,
      )}
    />
  );
}

/** Badge-shaped placeholder (h-5, pill). */
export function BadgeSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-4xl w-16 h-5", className)} />;
}

/**
 * Mirrors a form Field (label + control, `flex-col gap-2`). The label is real
 * static text; the control is an h-9 input/select placeholder by default.
 */
export function FieldSkeleton({
  label,
  required,
  controlClassName,
}: {
  label: React.ReactNode;
  required?: boolean;
  controlClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <span className="font-medium text-sm leading-snug">
        {label}
        {required && (
          <span aria-hidden className="ps-1 text-destructive">
            *
          </span>
        )}
      </span>
      <Skeleton className={cn("rounded-lg w-full h-9", controlClassName)} />
    </div>
  );
}

/**
 * Fallback for server-rendered <SelectItem> lists passed into client Selects
 * (donut slot). Renders as a disabled option inside the open listbox, matching
 * the item row, instead of a bare <div>.
 */
export function SelectOptionsSkeleton() {
  return (
    <SelectItem value="__loading" disabled>
      Caricamento...
    </SelectItem>
  );
}
