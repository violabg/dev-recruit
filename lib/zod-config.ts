/**
 * Global Zod configuration.
 *
 * The UI is in Italian, so Zod's built-in error messages (used whenever a
 * schema doesn't define a custom message) are localized to Italian too.
 * Zod stores its config on `globalThis`, so importing this module once per
 * runtime is enough: see `instrumentation.ts` (server) and
 * `instrumentation-client.ts` (browser).
 */
import { z } from "zod";
import { it } from "zod/locales";

z.config(it());
