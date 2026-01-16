import PageHeader from "@/components/page-header";
import { PresetsClient } from "@/components/presets/presets-client";
import { buttonVariants } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DEFAULT_PAGE_SIZE,
  UrlPagination,
} from "@/components/ui/url-pagination";
import { getPresetsAction } from "@/lib/actions/presets";
import { type Preset } from "@/lib/data/presets";
import { Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PresetsListSkeleton } from "./fallbacks";
import { SearchPresets } from "./search-presets";

type PresetsSearchParams = Promise<{
  search?: string;
  page?: string;
}>;

async function PresetsContent({
  searchParams,
}: {
  searchParams: PresetsSearchParams;
}) {
  const params = await searchParams;
  const search = params.search?.trim();
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);

  const result = await getPresetsAction({
    search,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  if (!result.success) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  const {
    presets,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = result;

  return (
    <>
      {presets.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Settings2 />
                </EmptyMedia>
                <EmptyTitle>
                  {search ? "Nessun preset trovato" : "Nessun preset ancora"}
                </EmptyTitle>
                <EmptyDescription>
                  {search
                    ? `Nessun preset trovato per "${search}". Prova a modificare i criteri di ricerca.`
                    : "Non hai ancora creato preset. Crea il tuo primo preset per iniziare."}
                </EmptyDescription>
              </EmptyHeader>
              {!search && (
                <EmptyContent>
                  <Link
                    href="/dashboard/presets/new"
                    className={buttonVariants({
                      variant: "default",
                      size: "sm",
                    })}
                  >
                    <Plus className="mr-1 size-4" />
                    Nuovo preset
                  </Link>
                </EmptyContent>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <>
          <PresetsClient presets={presets as Preset[]} />
          <UrlPagination
            pagination={{
              currentPage,
              totalPages,
              totalCount,
              hasNextPage,
              hasPrevPage,
            }}
            itemLabel="preset"
            itemLabelPlural="preset"
          />
        </>
      )}
    </>
  );
}

export default async function PresetsPage({
  searchParams,
}: {
  searchParams: PresetsSearchParams;
}) {
  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Preset"
        description="Crea e gestisci preset per la generazione di domande per le tue
            posizioni"
        actionBtns={
          <Link
            href="/dashboard/presets/new"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            <Plus className="mr-1 size-4" />
            Nuovo preset
          </Link>
        }
      />
      <div className="space-y-6">
        <SearchPresets />
        <Suspense fallback={<PresetsListSkeleton />}>
          <PresetsContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
