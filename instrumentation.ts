// Runs once when the Next.js server starts.
export async function register() {
  await import("@/lib/zod-config");
}
