import {
  EMAIL_VERIFIED_PRESENTATION,
  getEmailVerifiedPresentation,
  getUserStatusPresentation,
  ROLE_BADGE_CLASS,
  USER_ROLE_LABEL,
  USER_ROLE_OPTIONS,
  USER_STATUS_PRESENTATION,
} from "@/components/users/user-presentation";
import { describe, expect, it } from "vitest";

describe("user role presentation", () => {
  it("labels both roles in Italian", () => {
    expect(USER_ROLE_LABEL).toEqual({
      user: "Utente",
      admin: "Amministratore",
    });
    expect(ROLE_BADGE_CLASS.user).toBe("bg-muted text-muted-foreground");
    expect(ROLE_BADGE_CLASS.admin).toBe("bg-primary/10 text-primary");
  });

  it("offers the roles in a fixed order", () => {
    expect(USER_ROLE_OPTIONS).toEqual([
      { value: "user", label: "Utente" },
      { value: "admin", label: "Amministratore" },
    ]);
  });
});

describe("user status presentation", () => {
  it("maps active and banned to label and tint", () => {
    expect(USER_STATUS_PRESENTATION.active).toEqual({
      label: "Attivo",
      className: "bg-success/10 text-success",
    });
    expect(USER_STATUS_PRESENTATION.banned).toEqual({
      label: "Bloccato",
      className: "bg-destructive/10 text-destructive",
    });
    expect(getUserStatusPresentation(false)).toBe(
      USER_STATUS_PRESENTATION.active
    );
    expect(getUserStatusPresentation(true)).toBe(
      USER_STATUS_PRESENTATION.banned
    );
  });
});

describe("email verification presentation", () => {
  it("maps verified and unverified to label and tint", () => {
    expect(EMAIL_VERIFIED_PRESENTATION.verified).toEqual({
      label: "Verificata",
      className: "bg-success/10 text-success",
    });
    expect(EMAIL_VERIFIED_PRESENTATION.unverified).toEqual({
      label: "Da verificare",
      className: "bg-warning/10 text-warning",
    });
    expect(getEmailVerifiedPresentation(true)).toBe(
      EMAIL_VERIFIED_PRESENTATION.verified
    );
    expect(getEmailVerifiedPresentation(false)).toBe(
      EMAIL_VERIFIED_PRESENTATION.unverified
    );
  });
});
