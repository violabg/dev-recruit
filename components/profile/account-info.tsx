"use client";

import { CurrentUserAvatar } from "@/components/auth/current-user-avatar";
import { LogoutButton } from "@/components/auth/logout-button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Profile } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Edit, Lock } from "lucide-react";
import Link from "next/link";

type AccountInfoProps = {
  profile: Profile;
  user: {
    id: string;
    email: string | null;
    name: string | null;
  } | null;
  className?: string;
} & React.ComponentPropsWithoutRef<"div">;

export const AccountInfo = ({
  profile,
  user,
  className,
  ...props
}: AccountInfoProps) => {
  const createdAt = profile?.createdAt
    ? format(new Date(profile.createdAt), "dd MMMM yyyy", { locale: it })
    : "Data non disponibile";

  const lastUpdated = profile?.updatedAt
    ? format(new Date(profile.updatedAt), "dd MMMM yyyy 'alle' HH:mm", {
        locale: it,
      })
    : "Mai aggiornato";

  return (
    <div className={cn("w-full", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Account</CardTitle>
          <CardDescription>
            Dettagli del tuo account e impostazioni
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <CurrentUserAvatar />
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">
                {profile?.fullName ||
                  user?.name ||
                  user?.email ||
                  "Nome non disponibile"}
              </h3>
              <p className="text-muted-foreground text-sm">
                @{profile?.userName || user?.email?.split("@")[0] || "username"}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm">Email</h4>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
            </div>

            <div>
              <h4 className="font-medium text-sm">Account creato</h4>
              <p className="text-muted-foreground text-sm">{createdAt}</p>
            </div>

            <div>
              <h4 className="font-medium text-sm">Ultimo aggiornamento</h4>
              <p className="text-muted-foreground text-sm">{lastUpdated}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Gestione Profilo</h4>
            <div className="space-y-2">
              <Link
                href="/dashboard/profile/edit"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                })}
              >
                <Edit className="mr-1 size-4" />
                Modifica Profilo
              </Link>
              <Link
                href="/dashboard/profile/change-password"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                })}
              >
                <Lock className="mr-1 size-4" />
                Cambia Password
              </Link>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Azioni Account</h4>
            <div className="space-y-2">
              <LogoutButton variant="outline" className="w-full">
                Logout
              </LogoutButton>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
