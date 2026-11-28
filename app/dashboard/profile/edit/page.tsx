import { PageHeaderSkeleton } from "@/components/skeletons";
import PageHeader from "@/components/page-header";
import { ProfileForm } from "@/components/profile/profile-form";

import { FieldSkeleton } from "@/components/skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/lib/data/profile";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

/** Mirrors EditProfileContent: back button + static heading + ProfileForm. */
function EditProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton description />

      <Card>
        <CardHeader>
          <CardTitle>Informazioni Profilo</CardTitle>
          <CardDescription>
            Gestisci le informazioni del tuo profilo personale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="font-medium text-sm">Email</span>
                <Skeleton className="rounded-lg w-full h-9" />
                <p className="text-muted-foreground text-xs">
                  L&apos;email non può essere modificata
                </p>
              </div>
              <FieldSkeleton label="Nome Completo" />
              <FieldSkeleton label="Nome Utente" />
            </div>
            <Skeleton className="rounded-lg w-full h-8" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function EditProfileContent() {
  // The session is read per request, after connection(), never while the
  // route is prerendered
  await connection();
  const { profile, user, error } = await getProfile();

  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-2xl">
      <PageHeader
        title="Modifica profilo"
        description="Aggiorna le informazioni del tuo profilo"
        breadcrumbs={[
          { label: "Profilo", href: "/dashboard/profile" },
          { label: "Modifica" },
        ]}
      />

      <ProfileForm profile={profile} userEmail={user.email} />
    </div>
  );
}

export default async function EditProfilePage() {
  return (
    <Suspense fallback={<EditProfileSkeleton />}>
      <EditProfileContent />
    </Suspense>
  );
}
