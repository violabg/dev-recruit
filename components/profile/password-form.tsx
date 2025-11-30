"use client";

import { PasswordField } from "@/components/rhf-inputs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updatePassword } from "@/lib/actions/profile";
import { ChangePasswordFormData, changePasswordSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type PasswordFormProps = {
  className?: string;
} & React.ComponentPropsWithoutRef<"div">;

export const PasswordForm = ({ className, ...props }: PasswordFormProps) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const { handleSubmit, reset } = form;

  const onSubmit = (values: ChangePasswordFormData) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("current_password", values.current_password);
        formData.append("new_password", values.new_password);

        await updatePassword(formData);
        toast.success("Password aggiornata con successo");
        reset();
        router.push("/dashboard/profile");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Errore nell&apos;aggiornamento della password"
        );
      }
    });
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Cambia Password</CardTitle>
          <CardDescription>
            Aggiorna la password del tuo account per mantenere la sicurezza
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            <div className="space-y-4">
              <PasswordField
                control={form.control}
                name="current_password"
                label="Password Attuale"
                required
                placeholder="Inserisci la password attuale"
                disabled={isPending}
              />

              <PasswordField
                control={form.control}
                name="new_password"
                label="Nuova Password"
                required
                placeholder="Inserisci la nuova password"
                disabled={isPending}
              />

              <PasswordField
                control={form.control}
                name="confirm_password"
                label="Conferma Nuova Password"
                required
                placeholder="Conferma la nuova password"
                disabled={isPending}
              />
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Aggiornamento..." : "Aggiorna Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
