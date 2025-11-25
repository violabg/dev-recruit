"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

export type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type UrlPaginationProps = {
  pagination: PaginationInfo;
  className?: string;
  /** Number of page links to show around current page */
  siblingCount?: number;
  /** Show total count label */
  showCount?: boolean;
  /** Label for items (singular) */
  itemLabel?: string;
  /** Label for items (plural) */
  itemLabelPlural?: string;
};

/**
 * URL-synced pagination component that preserves all existing query params.
 * Uses shadcn/ui pagination primitives with Next.js router integration.
 */
export function UrlPagination({
  pagination,
  className,
  siblingCount = 1,
  showCount = true,
  itemLabel = "elemento",
  itemLabelPlural = "elementi",
}: UrlPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { currentPage, totalPages, totalCount, hasNextPage, hasPrevPage } =
    pagination;

  // Don't render if there's only one page
  if (totalPages <= 1) {
    return showCount && totalCount > 0 ? (
      <div className={cn("text-muted-foreground text-sm", className)}>
        {totalCount} {totalCount === 1 ? itemLabel : itemLabelPlural}
      </div>
    ) : null;
  }

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", page.toString());
    }
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };

  const navigateToPage = (page: number) => {
    startTransition(() => {
      router.push(createPageUrl(page));
    });
  };

  // Generate page numbers to display
  const generatePageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftEllipsis = leftSiblingIndex > 2;
    const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      // Show first pages + ellipsis + last
      const leftRange = 1 + 2 * siblingCount;
      for (let i = 1; i <= Math.min(leftRange, totalPages); i++) {
        pages.push(i);
      }
      if (leftRange < totalPages - 1) {
        pages.push("ellipsis");
      }
      if (leftRange < totalPages) {
        pages.push(totalPages);
      }
    } else if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
      // Show first + ellipsis + last pages
      pages.push(1);
      const rightRange = totalPages - 2 * siblingCount;
      if (rightRange > 2) {
        pages.push("ellipsis");
      }
      for (let i = Math.max(rightRange, 2); i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      // Show first + ellipsis + middle + ellipsis + last
      pages.push(1);
      pages.push("ellipsis");
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        pages.push(i);
      }
      pages.push("ellipsis");
      pages.push(totalPages);
    } else {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pages = generatePageNumbers();

  return (
    <div
      className={cn(
        "flex sm:flex-row flex-col justify-between items-center gap-4",
        className
      )}
    >
      {showCount && (
        <div className="text-muted-foreground text-sm">
          {totalCount} {totalCount === 1 ? itemLabel : itemLabelPlural} • Pagina{" "}
          {currentPage} di {totalPages}
        </div>
      )}

      <Pagination className={cn(isPending && "opacity-50 pointer-events-none")}>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={createPageUrl(currentPage - 1)}
              onClick={(e) => {
                e.preventDefault();
                if (hasPrevPage) navigateToPage(currentPage - 1);
              }}
              aria-disabled={!hasPrevPage}
              className={cn(!hasPrevPage && "pointer-events-none opacity-50")}
            />
          </PaginationItem>

          {pages.map((page, index) => (
            <PaginationItem key={`${page}-${index}`}>
              {page === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href={createPageUrl(page)}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToPage(page);
                  }}
                  isActive={page === currentPage}
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href={createPageUrl(currentPage + 1)}
              onClick={(e) => {
                e.preventDefault();
                if (hasNextPage) navigateToPage(currentPage + 1);
              }}
              aria-disabled={!hasNextPage}
              className={cn(!hasNextPage && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

// Re-export from shared constants for backward compatibility
export { DEFAULT_PAGE_SIZE } from "@/lib/constants";

/**
 * Helper to normalize page/pageSize values from search params
 */
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
export const normalizePaginationParams = (
  page?: string,
  pageSize?: string
): { page: number; pageSize: number } => {
  const normalizedPage = Math.max(1, page ? Math.floor(Number(page)) || 1 : 1);
  const normalizedPageSize = Math.max(
    1,
    pageSize
      ? Math.floor(Number(pageSize)) || DEFAULT_PAGE_SIZE
      : DEFAULT_PAGE_SIZE
  );
  return { page: normalizedPage, pageSize: normalizedPageSize };
};
