"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateProfile, type Profile } from "@/lib/actions/profile";
import { ProfileFormData, profileSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type ProfileFormValues = ProfileFormData;

type ProfileFormProps = {
  profile: Profile | null;
  userEmail?: string | null;
  className?: string;
} & React.ComponentPropsWithoutRef<"div">;

export const ProfileForm = ({
  profile,
  userEmail,
  className,
  ...props
}: ProfileFormProps) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.fullName || "",
      user_name: profile?.userName || "",
    },
  });

  const { handleSubmit } = form;

  const onSubmit = (values: ProfileFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("full_name", values.full_name);
        formData.append("user_name", values.user_name);

        await updateProfile(formData);
        toast.success("Profilo aggiornato con successo");
        router.push("/dashboard/profile");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Errore nell'aggiornamento del profilo"
        );
      }
    });
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Profilo</CardTitle>
          <CardDescription>
            Gestisci le informazioni del tuo profilo personale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="font-medium text-sm">Email</label>
                  <Input
                    value={userEmail || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-muted-foreground text-xs">
                    L&apos;email non può essere modificata
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Il tuo nome completo"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="user_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Utente</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Il tuo nome utente"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Aggiornamento..." : "Aggiorna Profilo"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
