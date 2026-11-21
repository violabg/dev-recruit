import PageHeader from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  DEFAULT_PAGE_SIZE,
  UrlPagination,
} from "@/components/ui/url-pagination";
import { UsersTable } from "@/components/users/users-table";
import { requireAdminPage } from "@/lib/auth-server";
import { getUsersActivity, getUsersPage } from "@/lib/data/users";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { UsersListSkeleton } from "./fallbacks";
import { SearchUsers } from "./search-users";

type UsersSearchParams = Promise<{
  search?: string;
  page?: string;
}>;

/**
 * Administrators only: everything, header included, renders after the server
 * role check, so a non-admin gets the not-found page and no user data.
 */
async function UsersContent({
  searchParams,
}: {
  searchParams: UsersSearchParams;
}) {
  // A request value first, then the session read (requireAdminPage)
  const params = await searchParams;
  await requireAdminPage();

  const search = params.search?.trim();
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);

  const data = await getUsersPage({
    search,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const activity = await getUsersActivity(data.users.map((user) => user.id));

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        title="Utenti"
        description="Gestisci chi accede all'applicazione"
        actionBtns={
          <Link
            href="/dashboard/settings/users/new"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            <Plus className="mr-1 size-4" />
            Nuovo utente
          </Link>
        }
      />
      <div className="flex flex-col gap-6">
        <SearchUsers />
        {data.users.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nessun utente trovato</p>
        ) : (
          <UsersTable users={data.users} activity={activity} />
        )}
        <UrlPagination
          pagination={{
            currentPage: data.currentPage,
            totalPages: data.totalPages,
            totalCount: data.totalCount,
            hasNextPage: data.hasNextPage,
            hasPrevPage: data.hasPrevPage,
          }}
          itemLabel="utente"
          itemLabelPlural="utenti"
        />
      </div>
    </div>
  );
}

export default function UsersPage({
  searchParams,
}: {
  searchParams: UsersSearchParams;
}) {
  return (
    <Suspense fallback={<UsersListSkeleton />}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}
