import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/actions/profile";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EditProfilePage() {
  const { profile, user, error } = await getProfile();

  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6 mx-auto w-full max-w-2xl">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/profile">
            <ArrowLeft className="w-4 h-4" />
          </Link>
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
