/**
 * A failure the user can understand and act on (record not found, rule
 * violated, input refused). Its message is shown to the user as is, so write
 * it in Italian. Server actions turn it into `{ success: false, error }`;
 * anything else thrown is logged and reported with a generic message.
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}
