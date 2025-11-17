import { AccountInfo } from "@/components/profile/account-info";
import { getProfile } from "@/lib/actions/profile";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
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
