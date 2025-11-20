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
import { UpdatePasswordFormData, updatePasswordSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Field, FieldContent, FieldError, FieldLabel } from "../ui/field";
import PasswordInput from "../ui/password-input";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "" },
    mode: "onChange",
  });
  const {
    handleSubmit,
    register,
    setError,
    formState: { errors, isValid },
  } = form;
  const passwordId = useId();

  const handleUpdatePassword = async (values: UpdatePasswordFormData) => {
    setIsLoading(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: values.password,
      });

      if (result.error) {
        throw new Error(
          result.error.message ?? "Errore nell'aggiornamento della password"
        );
      }

      router.push("/dashboard");
    } catch (error: unknown) {
      setError("password", {
        message:
          error instanceof Error ? error.message : "Si è verificato un errore",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reimposta la password</CardTitle>
          <CardDescription>
            Inserisci la tua nuova password qui sotto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(handleUpdatePassword)}
            className="space-y-4"
            autoComplete="off"
          >
            <Field>
              <FieldLabel htmlFor={passwordId}>Nuova password</FieldLabel>
              <FieldContent>
                <PasswordInput
                  id={passwordId}
                  placeholder="New password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? `${passwordId}-error` : undefined
                  }
                  {...register("password")}
                />
              </FieldContent>
              <FieldError
                id={`${passwordId}-error`}
                errors={errors.password ? [errors.password] : undefined}
              />
            </Field>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isValid}
            >
              {isLoading ? "Salvataggio..." : "Salva nuova password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
