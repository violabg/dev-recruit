import { PasswordForm } from "@/components/profile/password-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ChangePasswordPage() {
  return (
    <div className="space-y-6 mx-auto w-full max-w-2xl">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/profile">
            <ArrowLeft className="size-4" />
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
