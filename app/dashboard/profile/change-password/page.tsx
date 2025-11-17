import { PasswordForm } from "@/components/profile/password-form";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/actions/profile";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ChangePasswordPage() {
  const { user, error } = await getProfile();

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
          <h1 className="font-bold text-3xl tracking-tight">Cambia Password</h1>
          <p className="text-muted-foreground">
            Aggiorna la password del tuo account
          </p>
        </div>
      </div>

      <PasswordForm />
    </div>
  );
}
