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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PasswordField } from "../rhf-inputs/password-field";

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
  const { handleSubmit, setError } = form;

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
            <PasswordField<UpdatePasswordFormData>
              control={form.control}
              name="password"
              label="Nuova password"
              placeholder="New password"
              autoComplete="new-password"
              disabled={isLoading}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Salvataggio..." : "Salva nuova password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
