import { PresetsClient } from "@/components/presets/presets-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_PAGE_SIZE,
  UrlPagination,
} from "@/components/ui/url-pagination";
import { getPresetsAction } from "@/lib/actions/presets";
import { type Preset } from "@/lib/data/presets";
import { Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
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
    <div className="space-y-4">
      <SearchPresets defaultValue={search} />
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
                  <Button asChild variant="default" size="sm">
                    <Link href="/dashboard/presets/new">
                      <Plus className="mr-1 size-4" />
                      Nuovo preset
                    </Link>
                  </Button>
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
    </div>
  );
}

export default async function PresetsPage({
  searchParams,
}: {
  searchParams: PresetsSearchParams;
}) {
  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-wrap items-center gap-2 w-full">
        <div className="flex-1">
          <h1 className="font-bold text-3xl tracking-tight">Gestione Preset</h1>
          <p className="mt-2 text-muted-foreground">
            Crea e gestisci preset per la generazione di domande per le tue
            posizioni
          </p>
        </div>
        <Button asChild variant="default" size="sm">
          <Link href="/dashboard/presets/new">
            <Plus className="mr-1 size-4" />
            Nuovo preset
          </Link>
        </Button>
      </div>

      <Suspense
        fallback={
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="w-full h-10" />
              <Skeleton className="w-full h-10" />
              <Skeleton className="w-full h-10" />
            </CardContent>
          </Card>
        }
      >
        <PresetsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
