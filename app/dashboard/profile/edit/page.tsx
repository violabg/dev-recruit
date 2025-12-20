import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/lib/actions/profile";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function EditProfileSkeleton() {
  return (
    <div className="space-y-6 mx-auto w-full max-w-2xl">
      <div className="flex items-center space-x-4">
        <Skeleton className="rounded w-10 h-10" />
        <div className="flex-1 space-y-1">
          <Skeleton className="w-48 h-10" />
          <Skeleton className="w-64 h-5" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-24 h-12" />
      </div>
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
        <Button
          variant="outline"
          size="icon"
          render={<Link href="/dashboard/profile" />}
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
        </Button>
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
