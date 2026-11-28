import PageHeader from "@/components/page-header";
import { SECTIONS } from "@/components/dashboard/sections";
import { UserAccessCard } from "@/components/users/user-access-card";
import { UserDataForm } from "@/components/users/user-data-form";
import { UserSessionsCard } from "@/components/users/user-sessions-card";
import { requireAdminPage } from "@/lib/auth-server";
import {
  getUserDetail,
  getUserSessions,
  getUsersActivity,
} from "@/lib/data/users";
import { sectionTrail } from "@/lib/utils/breadcrumbs";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { UserDetailSkeleton } from "../fallbacks";

type UserDetailPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Administrators only: everything renders after the server role check.
 * Sessions and last access are live reads, never cached.
 */
async function UserDetailContent({ params }: UserDetailPageProps) {
  const { id } = await params;
  await connection();
  const actor = await requireAdminPage();

  const user = await getUserDetail(id);
  if (!user) {
    notFound();
  }

  const [sessions, activity] = await Promise.all([
    getUserSessions(id),
    getUsersActivity([id]),
  ]);
  const lastLoginAt = activity[id]?.lastLoginAt ?? null;
  const isSelf = actor.id === id;

  const createdAt = new Date(user.createdAt).toLocaleDateString("it-IT");
  const lastLogin = lastLoginAt
    ? new Date(lastLoginAt).toLocaleString("it-IT", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        title={user.name}
        description={user.email}
        breadcrumbs={sectionTrail(SECTIONS.users, { label: user.name })}
        info={
          <span className="text-muted-foreground text-sm">
            Creato il {createdAt} · Ultimo accesso {lastLogin}
          </span>
        }
      />
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
        <UserDataForm user={user} />
        <UserAccessCard user={user} isSelf={isSelf} />
      </div>
      <UserSessionsCard userId={id} sessions={sessions} />
    </div>
  );
}

export default function UserDetailPage(props: UserDetailPageProps) {
  return (
    <Suspense fallback={<UserDetailSkeleton />}>
      <UserDetailContent {...props} />
    </Suspense>
  );
}
