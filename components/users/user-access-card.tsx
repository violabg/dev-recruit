"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PasswordField, TextareaField } from "@/components/ui/rhf-inputs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  banUserAction,
  setUserEmailVerifiedAction,
  setUserPasswordAction,
  setUserRoleAction,
  unbanUserAction,
} from "@/lib/actions/users";
import type { UserDetail } from "@/lib/data/users";
import {
  banUserSchema,
  setUserPasswordSchema,
  userRoleSchema,
  type BanUserFormData,
  type SetUserPasswordFormData,
} from "@/lib/schemas";
import {
  errorMessage,
  GENERIC_ERROR,
  type ActionResult,
} from "@/lib/utils/action-result";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  getUserStatusPresentation,
  USER_ROLE_OPTIONS,
} from "./user-presentation";

const BADGE_CLASS = "rounded-full px-2 py-1 text-xs font-medium";

type UserAccessCardProps = {
  user: UserDetail;
  /** The viewed user is the signed-in administrator */
  isSelf: boolean;
};

/**
 * Role, email verification, password reset and block/unblock of one user.
 * On one's own record role, verification and block are disabled (the server
 * refuses them too).
 */
export function UserAccessCard({ user, isSelf }: UserAccessCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const roleId = useId();
  const verifiedId = useId();
  const status = getUserStatusPresentation(user.banned);

  const run = (
    call: () => Promise<ActionResult>,
    successMessage: string,
    onSuccess?: () => void,
  ) => {
    startTransition(async () => {
      try {
        const result = await call();

        if (!result.success) {
          toast.error(errorMessage(result.error));
          return;
        }

        toast.success(successMessage);
        onSuccess?.();
        router.refresh();
      } catch {
        toast.error(GENERIC_ERROR);
      }
    });
  };

  const handleRoleChange = (value: string | null) => {
    const parsed = userRoleSchema.safeParse(value);
    if (!parsed.success || parsed.data === user.role) return;
    run(() => setUserRoleAction(user.id, parsed.data), "Ruolo aggiornato");
  };

  const handleVerifiedChange = (checked: boolean) => {
    run(
      () => setUserEmailVerifiedAction(user.id, checked),
      "Verifica aggiornata",
    );
  };

  const handleUnban = () => {
    run(() => unbanUserAction(user.id), "Utente sbloccato");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accesso</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Stato</span>
            <span className={cn(BADGE_CLASS, status.className)}>
              {status.label}
            </span>
          </div>
          {user.banned && user.banReason && (
            <p className="text-muted-foreground text-sm">
              Motivo: {user.banReason}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={roleId} className="font-bold">
            Ruolo
          </Label>
          <Select
            items={USER_ROLE_OPTIONS}
            value={user.role}
            onValueChange={handleRoleChange}
            disabled={isSelf || isPending}
          >
            <SelectTrigger id={roleId} className="w-full sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 p-3 border rounded-lg">
          <div className="flex justify-between items-center gap-4">
            <Label htmlFor={verifiedId} className="text-base">
              Email verificata
            </Label>
            <Switch
              id={verifiedId}
              checked={user.emailVerified}
              onCheckedChange={handleVerifiedChange}
              disabled={isSelf || isPending}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            Senza email verificata l&apos;utente non può accedere; le sessioni
            aperte restano finché non le chiudi
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setPasswordOpen(true)}
          >
            Reimposta password
          </Button>
          {user.banned ? (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={handleUnban}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Sblocca utente
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              disabled={isSelf || isPending}
              onClick={() => setBanOpen(true)}
            >
              Blocca utente
            </Button>
          )}
        </div>

        {isSelf && (
          <p className="text-muted-foreground text-sm">
            Non puoi modificare il tuo ruolo, la verifica della tua email o
            bloccare il tuo account
          </p>
        )}
      </CardContent>

      <ResetPasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        isPending={isPending}
        onSubmit={(values, reset) =>
          run(
            () => setUserPasswordAction(user.id, values),
            "Password reimpostata: comunicala all'utente",
            () => {
              reset();
              setPasswordOpen(false);
            },
          )
        }
      />
      <BanUserDialog
        open={banOpen}
        onOpenChange={setBanOpen}
        isPending={isPending}
        onSubmit={(values, reset) =>
          run(() => banUserAction(user.id, values), "Utente bloccato", () => {
            reset();
            setBanOpen(false);
          })
        }
      />
    </Card>
  );
}

function ResetPasswordDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (values: SetUserPasswordFormData, reset: () => void) => void;
}) {
  const form = useForm<SetUserPasswordFormData>({
    resolver: zodResolver(setUserPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reimposta password</DialogTitle>
          <DialogDescription>
            Scegli una nuova password e comunicala a mano all&apos;utente:
            l&apos;app non invia email.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) =>
            onSubmit(values, () => form.reset()),
          )}
          className="flex flex-col gap-4"
          noValidate
        >
          <PasswordField
            control={form.control}
            name="password"
            label="Nuova password"
            autoComplete="new-password"
            disabled={isPending}
            required
          />
          <PasswordField
            control={form.control}
            name="confirmPassword"
            label="Conferma password"
            autoComplete="new-password"
            disabled={isPending}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Reimposta password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BanUserDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (values: BanUserFormData, reset: () => void) => void;
}) {
  const form = useForm<BanUserFormData>({
    resolver: zodResolver(banUserSchema),
    defaultValues: { reason: "" },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Blocca utente</DialogTitle>
          <DialogDescription>
            Il blocco chiude tutte le sessioni dell&apos;utente.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((values) =>
            onSubmit(values, () => form.reset()),
          )}
          className="flex flex-col gap-4"
          noValidate
        >
          <TextareaField
            control={form.control}
            name="reason"
            label="Motivo"
            disabled={isPending}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Blocca utente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
