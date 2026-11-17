import { cn } from "cn";
import PageHeader from "@/components/page-header";
import { PasswordForm } from "@/components/profile/password-form";
import { buttonVariants } from "@/components/ui/button";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ChangePasswordPage() {
  return (
    <div className="flex flex-col gap-6 mx-auto w-full max-w-2xl">
      <PageHeader
        title="Cambia password"
        description="Aggiorna la password del tuo account"
        actionBtns={
          <Link
            href={"/dashboard/profile" as never}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "inline-flex",
            )}
          >
            <ArrowLeft className="size-4" />
            Profilo
          </Link>
        }
      />

      <PasswordForm />
    </div>
  );
}
