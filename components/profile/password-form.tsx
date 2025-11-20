"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import PasswordInput from "@/components/ui/password-input";
import { updatePassword } from "@/lib/actions/profile";
import { ChangePasswordFormData, changePasswordSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <Controller
                control={form.control}
                name="current_password"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Password Attuale</FieldLabel>
                    <FieldContent>
                      <PasswordInput
                        placeholder="Inserisci la password attuale"
                        {...field}
                        disabled={isPending}
                      />
                    </FieldContent>
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : undefined}
                    />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="new_password"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Nuova Password</FieldLabel>
                    <FieldContent>
                      <PasswordInput
                        placeholder="Inserisci la nuova password"
                        {...field}
                        disabled={isPending}
                      />
                    </FieldContent>
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : undefined}
                    />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="confirm_password"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Conferma Nuova Password</FieldLabel>
                    <FieldContent>
                      <PasswordInput
                        placeholder="Conferma la nuova password"
                        {...field}
                        disabled={isPending}
                      />
                    </FieldContent>
                    <FieldError
                      errors={fieldState.error ? [fieldState.error] : undefined}
                    />
                  </Field>
                )}
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
