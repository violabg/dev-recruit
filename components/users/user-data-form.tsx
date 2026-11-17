"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputField } from "@/components/ui/rhf-inputs";
import { updateUserAction } from "@/lib/actions/users";
import type { UserDetail } from "@/lib/data/users";
import { userDataSchema, type UserDataFormData } from "@/lib/schemas";
import { errorMessage, GENERIC_ERROR } from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

/**
 * Form values from the stored user. Accounts created by the sign-up form
 * store only `name`: first name is the part before the first space, last
 * name the rest.
 */
function toFormValues(user: UserDetail): UserDataFormData {
  if (user.firstName !== null || user.lastName !== null) {
    return {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      email: user.email,
    };
  }

  const name = user.name.trim();
  const spaceIndex = name.indexOf(" ");
  return {
    firstName: spaceIndex === -1 ? name : name.slice(0, spaceIndex),
    lastName: spaceIndex === -1 ? "" : name.slice(spaceIndex + 1).trim(),
    email: user.email,
  };
}

export function UserDataForm({ user }: { user: UserDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // `values`, not defaultValues: the form follows the server data after a save
  const form = useForm<UserDataFormData>({
    resolver: zodResolver(userDataSchema),
    values: toFormValues(user),
  });

  const onSubmit = (values: UserDataFormData) => {
    startTransition(async () => {
      try {
        const result = await updateUserAction(user.id, values);

        if (!result.success) {
          toast.error(errorMessage(result.error));
          return;
        }

        toast.success("Dati salvati");
        router.refresh();
      } catch {
        toast.error(GENERIC_ERROR);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dati</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
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
          <InputField
            control={form.control}
            name="email"
            type="email"
            label="Email"
            autoComplete="off"
            disabled={isPending}
            required
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Salva modifiche
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
