"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { LoginFormData, loginSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Field, FieldContent, FieldError, FieldLabel } from "../ui/field";
import PasswordInput from "../ui/password-input";
import { Separator } from "../ui/separator";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });
  const {
    handleSubmit,
    register,
    setError,
    formState: { errors, isValid },
  } = form;
  const emailId = useId();
  const passwordId = useId();

  const handleLogin = async (values: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        callbackURL: `${window.location.origin}/dashboard`,
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Credenziali non valide");
      }

      if (result.data?.redirect && result.data.url) {
        window.location.href = result.data.url;
        return;
      }

      router.push("/dashboard");
    } catch (error: unknown) {
      setError("email", {
        message:
          error instanceof Error
            ? error.message
            : "Si è verificato un errore durante l'accesso",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Accedi</CardTitle>
          <CardDescription>
            Inserisci la tua email per accedere al tuo account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(handleLogin)}
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
            <Field>
              <div className="flex items-center gap-2">
                <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
                <Link
                  href="/auth/forgot-password"
                  className="inline-block ml-auto text-sm hover:underline underline-offset-4"
                >
                  Password dimenticata?
                </Link>
              </div>
              <FieldContent>
                <PasswordInput
                  id={passwordId}
                  autoComplete="current-password"
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
              {isLoading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>
          <Separator className="my-4" />
          <div className="mt-4 text-sm text-center">
            Non hai un account?{" "}
            <Link href="/auth/sign-up" className="underline underline-offset-4">
              Registrati
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
