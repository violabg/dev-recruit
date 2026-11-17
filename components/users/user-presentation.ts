import type { UserRole } from "@/lib/schemas/user";

/**
 * The single presentation module for user role, status and email
 * verification: labels and tint classes used by every users component.
 */

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  user: "Utente",
  admin: "Amministratore",
};

export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "user", label: USER_ROLE_LABEL.user },
  { value: "admin", label: USER_ROLE_LABEL.admin },
];

export const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  user: "bg-muted text-muted-foreground",
  admin: "bg-primary/10 text-primary",
};

export type UserStatus = "active" | "banned";

export const USER_STATUS_PRESENTATION: Record<
  UserStatus,
  { label: string; className: string }
> = {
  active: { label: "Attivo", className: "bg-success/10 text-success" },
  banned: { label: "Bloccato", className: "bg-destructive/10 text-destructive" },
};

export function getUserStatusPresentation(banned: boolean): {
  label: string;
  className: string;
} {
  return USER_STATUS_PRESENTATION[banned ? "banned" : "active"];
}

export const EMAIL_VERIFIED_PRESENTATION: Record<
  "verified" | "unverified",
  { label: string; className: string }
> = {
  verified: { label: "Verificata", className: "bg-success/10 text-success" },
  unverified: { label: "Da verificare", className: "bg-warning/10 text-warning" },
};

export function getEmailVerifiedPresentation(emailVerified: boolean): {
  label: string;
  className: string;
} {
  return EMAIL_VERIFIED_PRESENTATION[emailVerified ? "verified" : "unverified"];
}
