import PageHeader from "@/components/page-header";
import { SECTIONS } from "@/components/dashboard/sections";
import { Card, CardContent } from "@/components/ui/card";
import { CreateUserForm } from "@/components/users/create-user-form";
import { requireAdminPage } from "@/lib/auth-server";
import { sectionTrail } from "@/lib/utils/breadcrumbs";
import { connection } from "next/server";
import { Suspense } from "react";
import { CreateUserSkeleton } from "../fallbacks";

/** Administrators only: the content renders after the server role check. */
async function NewUserContent() {
  await connection();
  await requireAdminPage();

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        title="Nuovo utente"
        description="Crea un account e comunica a mano la password iniziale"
        breadcrumbs={sectionTrail(SECTIONS.users, { label: "Nuovo utente" })}
      />
      <Card>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewUserPage() {
  return (
    <Suspense fallback={<CreateUserSkeleton />}>
      <NewUserContent />
    </Suspense>
  );
}
