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
import { SignUpFormData, signUpSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Field, FieldContent, FieldError, FieldLabel } from "../ui/field";
import PasswordInput from "../ui/password-input";

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
  const {
    handleSubmit,
    register,
    setError,
    formState: { errors, isValid },
  } = form;
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const repeatPasswordId = useId();

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
            <Field>
              <FieldLabel htmlFor={firstNameId}>Nome</FieldLabel>
              <FieldContent>
                <Input
                  id={firstNameId}
                  type="text"
                  placeholder="Mario"
                  autoComplete="given-name"
                  disabled={isLoading}
                  aria-invalid={!!errors.first_name}
                  aria-describedby={
                    errors.first_name ? `${firstNameId}-error` : undefined
                  }
                  {...register("first_name")}
                />
              </FieldContent>
              <FieldError
                id={`${firstNameId}-error`}
                errors={errors.first_name ? [errors.first_name] : undefined}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={lastNameId}>Cognome</FieldLabel>
              <FieldContent>
                <Input
                  id={lastNameId}
                  type="text"
                  placeholder="Rossi"
                  autoComplete="family-name"
                  disabled={isLoading}
                  aria-invalid={!!errors.last_name}
                  aria-describedby={
                    errors.last_name ? `${lastNameId}-error` : undefined
                  }
                  {...register("last_name")}
                />
              </FieldContent>
              <FieldError
                id={`${lastNameId}-error`}
                errors={errors.last_name ? [errors.last_name] : undefined}
              />
            </Field>
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
            <Field>
              <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
              <FieldContent>
                <PasswordInput
                  id={passwordId}
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
            <Field>
              <FieldLabel htmlFor={repeatPasswordId}>
                Ripeti Password
              </FieldLabel>
              <FieldContent>
                <PasswordInput
                  id={repeatPasswordId}
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.repeatPassword}
                  aria-describedby={
                    errors.repeatPassword
                      ? `${repeatPasswordId}-error`
                      : undefined
                  }
                  {...register("repeatPassword")}
                />
              </FieldContent>
              <FieldError
                id={`${repeatPasswordId}-error`}
                errors={
                  errors.repeatPassword ? [errors.repeatPassword] : undefined
                }
              />
            </Field>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isValid}
            >
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
