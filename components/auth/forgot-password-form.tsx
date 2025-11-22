"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { ForgotPasswordFormData, forgotPasswordSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { InputField } from "../rhf-inputs/input-field";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });
  const { handleSubmit, setError } = form;

  const handleForgotPassword = async (values: ForgotPasswordFormData) => {
    startTransition(async () => {
      try {
        const result = await authClient.forgetPassword({
          email: values.email,
          redirectTo: `${window.location.origin}/auth/update-password`,
        });

        if (result.error) {
          throw new Error(
            result.error.message ?? "Errore durante l'invio dell'email"
          );
        }

        setSuccess(true);
      } catch (error: unknown) {
        setError("email", {
          message:
            error instanceof Error ? error.message : "Si è verificato un errore",
        });
      }
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Controlla la tua email</CardTitle>
            <CardDescription>
              Istruzioni per il reset della password inviate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Se ti sei registrato con email e password, riceverai una email per
              il reset della password.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Reimposta la password</CardTitle>
            <CardDescription>
              Inserisci la tua email e ti invieremo un link per reimpostare la
              password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(handleForgotPassword)}
              className="space-y-4"
              autoComplete="off"
            >
              <InputField<ForgotPasswordFormData>
                name="email"
                label="Email"
                control={form.control}
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                disabled={isPending}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Invio in corso..." : "Invia email di reset"}
              </Button>
              <div className="mt-4 text-sm text-center">
                Hai già un account?{" "}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  Accedi
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
