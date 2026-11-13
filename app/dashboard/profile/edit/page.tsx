import { ProfileForm } from "@/components/profile/profile-form";
import { buttonVariants } from "@/components/ui/button";

import { FieldSkeleton } from "@/components/skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/lib/actions/profile";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

/** Mirrors EditProfileContent: back button + static heading + ProfileForm. */
function EditProfileSkeleton() {
  return (
    <div className="space-y-6 mx-auto w-full max-w-2xl">
      <div className="flex items-center space-x-4">
        <Skeleton className="rounded-lg size-8" />
        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">Modifica Profilo</h1>
          <p className="text-muted-foreground">
            Aggiorna le informazioni del tuo profilo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informazioni Profilo</CardTitle>
          <CardDescription>
            Gestisci le informazioni del tuo profilo personale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
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
  const { profile, user, error } = await getProfile();

  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6 mx-auto w-full max-w-2xl">
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/profile"
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <ArrowLeft className="size-4" />
        </Link>

        <div className="space-y-1">
          <h1 className="font-bold text-3xl tracking-tight">
            Modifica Profilo
          </h1>
          <p className="text-muted-foreground">
            Aggiorna le informazioni del tuo profilo
          </p>
        </div>
      </div>

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
