import PageHeader from "@/components/page-header";
import { AccountInfo } from "@/components/profile/account-info";
import { ButtonSkeleton, TextSkeleton } from "@/components/skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/lib/data/profile";
import { redirect } from "next/navigation";
import { Suspense } from "react";

/** Mirrors ProfileContent: static heading + AccountInfo card. */
function ProfileSkeleton() {
  const infoRows = ["Email", "Account creato", "Ultimo aggiornamento"];
  return (
    <div className="space-y-6 mx-auto w-full max-w-2xl">
      <PageHeader
        title="Profilo"
        description="Gestisci le impostazioni del tuo profilo e account"
      />

      <Card>
        <CardHeader>
          <CardTitle>Informazioni Account</CardTitle>
          <CardDescription>Dettagli del tuo account e impostazioni</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="rounded-full size-8" />
            <div className="space-y-1">
              <TextSkeleton lineClassName="h-7" className="w-40 h-5" />
              <TextSkeleton className="w-24" />
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            {infoRows.map((label) => (
              <div key={label}>
                <h4 className="font-medium text-sm">{label}</h4>
                <TextSkeleton className="w-40" />
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Gestione Profilo</h4>
            <div className="space-y-2">
              <ButtonSkeleton size="sm" className="w-36" />
              <ButtonSkeleton size="sm" className="w-36" />
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Azioni Account</h4>
            <div className="space-y-2">
              <Skeleton className="rounded-lg w-full h-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function ProfileContent() {
  const { profile, user, error } = await getProfile();

  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6 mx-auto w-full max-w-2xl">
      <PageHeader
        title="Profilo"
        description="Gestisci le impostazioni del tuo profilo e account"
      />

      <AccountInfo profile={profile} user={user} />
    </div>
  );
}

export default async function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
