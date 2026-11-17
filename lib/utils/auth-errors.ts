// Sign-in error messages, safe for client and server (no server imports).

export const BANNED_USER_MESSAGE =
  "Il tuo account è bloccato. Rivolgiti a un amministratore.";

export const EMAIL_NOT_VERIFIED_MESSAGE =
  "La tua email non è ancora verificata. Chiedi a un amministratore di verificarla per poter accedere.";

export const INVALID_CREDENTIALS_MESSAGE = "Credenziali non valide";

/** Maps a better-auth sign-in error code to the Italian message shown to the user. */
export function loginErrorMessage(
  error: { code?: string | null } | null | undefined
): string {
  switch (error?.code) {
    case "BANNED_USER":
      return BANNED_USER_MESSAGE;
    case "EMAIL_NOT_VERIFIED":
      return EMAIL_NOT_VERIFIED_MESSAGE;
    default:
      return INVALID_CREDENTIALS_MESSAGE;
  }
}
