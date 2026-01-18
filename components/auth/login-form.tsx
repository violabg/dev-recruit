"use client";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { LoginFormData, loginSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { useForm } from "react-hook-form";
import { InputField } from "../rhf-inputs/input-field";
import { PasswordField } from "../rhf-inputs/password-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { FieldLabel } from "../ui/field";
import { Separator } from "../ui/separator";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });
  const { handleSubmit, setError } = form;
  const passwordId = useId();

  const handleLogin = async (values: LoginFormData) => {
    startTransition(async () => {
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
      }
    });
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
            <InputField<LoginFormData>
              type="email"
              label="Email"
              name="email"
              placeholder="m@example.com"
              autoComplete="email"
              control={form.control}
              disabled={isPending}
              required
            />
            <>
              <div className="flex items-center gap-2">
                <FieldLabel htmlFor={passwordId} className="font-bold">
                  Password
                </FieldLabel>
                <Link
                  href="/auth/forgot-password"
                  className="inline-block ml-auto text-sm hover:underline underline-offset-4"
                >
                  Password dimenticata?
                </Link>
              </div>
              <PasswordField<LoginFormData>
                name="password"
                control={form.control}
                placeholder="Password"
                autoComplete="current-password"
                disabled={isPending}
                required
              />
            </>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Accesso in corso..." : "Accedi"}
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
