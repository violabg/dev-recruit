import { PAGE_TITLE_CLASS } from "@/components/page-header";
import type { ReactNode } from "react";

/**
 * Header band of the public apply pages: same white band, brand stripe and
 * title type as the dashboard's PageHeader, without the dashboard chrome.
 */
export function PublicHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Under the description: counts, badges, a back link */
  children?: ReactNode;
}) {
  return (
    <header className="bg-band border-b border-t-4 border-t-primary">
      <div className="mx-auto px-4 sm:px-8 pt-6 md:pt-8 pb-8 w-full max-w-6xl">
        <p className="flex items-center gap-2 font-display font-bold text-heading text-sm">
          <span aria-hidden className="bg-primary rounded-md size-5" />
          DevRecruit
        </p>
        <h1 className={`${PAGE_TITLE_CLASS} mt-6`}>{title}</h1>
        {description && (
          <p className="mt-2 max-w-prose text-muted-foreground text-base">
            {description}
          </p>
        )}
        {children && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}

/** Body column of the public apply pages, aligned with the header. */
export function PublicBody({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto px-4 sm:px-8 py-8 w-full max-w-6xl">
      {children}
    </main>
  );
}
