import {
  BANNED_USER_MESSAGE,
  EMAIL_NOT_VERIFIED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  loginErrorMessage,
} from "@/lib/utils/auth-errors";
import { describe, expect, it } from "vitest";

describe("loginErrorMessage", () => {
  it("explains a blocked account", () => {
    expect(loginErrorMessage({ code: "BANNED_USER" })).toBe(BANNED_USER_MESSAGE);
    expect(BANNED_USER_MESSAGE).toBe(
      "Il tuo account è bloccato. Rivolgiti a un amministratore."
    );
  });

  it("explains an unverified email", () => {
    expect(loginErrorMessage({ code: "EMAIL_NOT_VERIFIED" })).toBe(
      EMAIL_NOT_VERIFIED_MESSAGE
    );
    expect(EMAIL_NOT_VERIFIED_MESSAGE).toContain(
      "Chiedi a un amministratore di verificarla"
    );
  });

  it("falls back to the generic message for wrong credentials", () => {
    expect(loginErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      INVALID_CREDENTIALS_MESSAGE
    );
    expect(INVALID_CREDENTIALS_MESSAGE).toBe("Credenziali non valide");
  });

  it("falls back to the generic message when no code is present", () => {
    expect(loginErrorMessage(null)).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(loginErrorMessage(undefined)).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(loginErrorMessage({})).toBe(INVALID_CREDENTIALS_MESSAGE);
  });
});
