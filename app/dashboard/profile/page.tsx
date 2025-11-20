import { AccountInfo } from "@/components/profile/account-info";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/lib/actions/profile";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function ProfileSkeleton() {
  return (
    <div className="space-y-6 mx-auto w-full max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="w-32 h-10" />
        <Skeleton className="w-64 h-5" />
      </div>
      <div className="space-y-4">
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
      </div>
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
      <div className="space-y-2">
        <h1 className="font-bold text-3xl tracking-tight">Profilo</h1>
        <p className="text-muted-foreground">
          Gestisci le impostazioni del tuo profilo e account
        </p>
      </div>

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
