import { PasswordForm } from "@/components/profile/password-form";
import { buttonVariants } from "@/components/ui/button";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ChangePasswordPage() {
  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/profile"
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <ArrowLeft className="size-4" />
        </Link>

        <div className="flex flex-col gap-1">
          <h1 className="font-display font-extrabold text-heading text-[2.125rem] lg:text-[2.5rem] text-balance leading-[2.5rem] lg:leading-[2.875rem] tracking-[-0.03em]">Cambia Password</h1>
          <p className="text-muted-foreground">
            Aggiorna la password del tuo account
          </p>
        </div>
      </div>

      <PasswordForm />
    </div>
  );
}
