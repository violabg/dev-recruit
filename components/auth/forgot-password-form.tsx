"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { ForgotPasswordFormData, forgotPasswordSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Field, FieldContent, FieldError, FieldLabel } from "../ui/field";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });
  const {
    handleSubmit,
    register,
    setError,
    formState: { errors, isValid },
  } = form;
  const emailId = useId();

  const handleForgotPassword = async (values: ForgotPasswordFormData) => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
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
              <Field>
                <FieldLabel htmlFor={emailId}>Email</FieldLabel>
                <FieldContent>
                  <Input
                    id={emailId}
                    type="email"
                    placeholder="m@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? `${emailId}-error` : undefined
                    }
                    {...register("email")}
                  />
                </FieldContent>
                <FieldError
                  id={`${emailId}-error`}
                  errors={errors.email ? [errors.email] : undefined}
                />
              </Field>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isValid}
              >
                {isLoading ? "Invio in corso..." : "Invia email di reset"}
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
