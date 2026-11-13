import { SECTIONS, type SectionKey } from "@/components/dashboard/sections";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  info?: React.ReactNode;
  actionBtns?: React.ReactNode;
  /** Dashboard section this page belongs to: shows its tinted icon tile */
  section?: SectionKey;
};

/** Tinted icon tile identifying a dashboard section (shared with skeletons). */
export function SectionTile({
  section,
  className,
}: {
  section: SectionKey;
  className?: string;
}) {
  const { icon: Icon, tile, text } = SECTIONS[section];
  return (
    <div
      aria-hidden
      className={cn(
        "flex justify-center items-center rounded-lg ring-1 ring-inset size-9 shrink-0",
        tile,
        text,
        className
      )}
    >
      <Icon className="size-5" />
    </div>
  );
}

const PageHeader = ({
  title,
  description,
  actionBtns,
  info,
  section,
}: PageHeaderProps) => {
  return (
    <div className="flex md:flex-row flex-col md:justify-between md:items-start gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {section && <SectionTile section={section} />}
        <div className="min-w-0">
          <h1 className="font-bold text-heading text-3xl text-balance tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="max-w-prose text-muted-foreground text-sm">
              {description}
            </p>
          )}
          {info && (
            <div className="flex flex-wrap items-center gap-2 mt-2">{info}</div>
          )}
        </div>
      </div>
      {actionBtns && (
        <div className="flex flex-wrap items-center gap-2 md:pt-1">
          {actionBtns}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
