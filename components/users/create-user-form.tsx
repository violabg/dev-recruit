"use client";

import { Button } from "@/components/ui/button";
import {
  InputField,
  PasswordField,
  SelectField,
  SwitchField,
} from "@/components/ui/rhf-inputs";
import { createUserAction } from "@/lib/actions/users";
import { createUserSchema, type CreateUserFormData } from "@/lib/schemas";
import { errorMessage, GENERIC_ERROR } from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { USER_ROLE_OPTIONS } from "./user-presentation";

type CreateUserFormInput = z.input<typeof createUserSchema>;

export function CreateUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // A create form: nothing on the server rewrites it, so defaultValues is fine
  const form = useForm<CreateUserFormInput, unknown, CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "user",
      emailVerified: true,
    },
  });

  const onSubmit = (values: CreateUserFormData) => {
    startTransition(async () => {
      try {
        const result = await createUserAction(values);

        if (!result.success) {
          toast.error(errorMessage(result.error));
          return;
        }

        toast.success("Utente creato");
        router.push(`/dashboard/settings/users/${result.userId}`);
      } catch {
        toast.error(GENERIC_ERROR);
      }
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
        <InputField
          control={form.control}
          name="firstName"
          label="Nome"
          autoComplete="off"
          disabled={isPending}
          required
        />
        <InputField
          control={form.control}
          name="lastName"
          label="Cognome"
          autoComplete="off"
          disabled={isPending}
          required
        />
      </div>
      <InputField
        control={form.control}
        name="email"
        type="email"
        label="Email"
        autoComplete="off"
        disabled={isPending}
        required
      />
      <PasswordField
        control={form.control}
        name="password"
        label="Password iniziale"
        autoComplete="new-password"
        disabled={isPending}
        required
      />
      <SelectField
        control={form.control}
        name="role"
        label="Ruolo"
        options={USER_ROLE_OPTIONS}
        triggerProps={{ disabled: isPending }}
        required
      />
      <SwitchField
        control={form.control}
        name="emailVerified"
        label="Email verificata"
        description="Se attiva, l'utente può accedere subito"
        disabled={isPending}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? "Creazione…" : "Crea utente"}
        </Button>
      </div>
    </form>
  );
}
