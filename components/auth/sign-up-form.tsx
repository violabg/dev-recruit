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
import { SignUpFormData, signUpSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { InputField } from "../rhf-inputs/input-field";
import { PasswordField } from "../rhf-inputs/password-field";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      repeatPassword: "",
    },
    mode: "onChange",
  });
  const { handleSubmit, setError } = form;

  const handleSignUp = async (values: SignUpFormData) => {
    setIsLoading(true);
    try {
      const result = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: `${values.first_name} ${values.last_name}`,
        callbackURL: `${window.location.origin}/dashboard`,
      });

      if (result.error) {
        throw new Error(
          result.error.message ?? "Errore durante la registrazione"
        );
      }

      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError("email", {
        message:
          error instanceof Error
            ? error.message
            : "Si è verificato un errore durante la registrazione",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Registrati</CardTitle>
          <CardDescription>Crea un nuovo account</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(handleSignUp)}
            className="space-y-4"
            autoComplete="off"
          >
            <InputField<SignUpFormData>
              name="first_name"
              control={form.control}
              label="Nome"
              type="text"
              placeholder="Mario"
              autoComplete="given-name"
              disabled={isLoading}
            />
            <InputField<SignUpFormData>
              name="last_name"
              control={form.control}
              label="Cognome"
              type="text"
              placeholder="Rossi"
              autoComplete="family-name"
              disabled={isLoading}
            />
            <InputField<SignUpFormData>
              name="email"
              control={form.control}
              label="Email"
              type="email"
              placeholder="m@example.com"
              autoComplete="email"
              disabled={isLoading}
            />
            <PasswordField<SignUpFormData>
              name="password"
              label="Password"
              control={form.control}
              autoComplete="new-password"
              disabled={isLoading}
            />
            <PasswordField<SignUpFormData>
              name="repeatPassword"
              label="Ripeti Password"
              control={form.control}
              autoComplete="new-password"
              disabled={isLoading}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creazione account..." : "Registrati"}
            </Button>
            <div className="mt-4 text-sm text-center">
              Hai già un account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Accedi
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
