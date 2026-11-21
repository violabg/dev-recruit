/**
 * Fixed-window rate limiter backed by Postgres (RateLimitBucket). Keys:
 * 'mcp:user:<id>', 'mcp:ip:<ip>', 'oauth:ip:<ip>', 'oauth:user:<id>'.
 * A database error propagates: the caller decides to fail closed.
 */

import prisma from "@/lib/prisma";
import { logger } from "@/lib/services/logger";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Windows older than this are deleted opportunistically */
const RETENTION_MS = 10 * 60 * 1000;
const CLEANUP_PROBABILITY = 0.01;

function cleanupOldWindows(now: number): void {
  prisma.rateLimitBucket
    .deleteMany({ where: { windowStart: { lt: new Date(now - RETENTION_MS) } } })
    .catch((error: unknown) => {
      logger.warn("Pulizia dei contatori di rate limit non riuscita", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

/**
 * Counts one request for `key` in the current window and tells whether it is
 * within `limit`.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);

  const bucket = await prisma.rateLimitBucket.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  if (Math.random() < CLEANUP_PROBABILITY) cleanupOldWindows(now);

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowStartMs + windowMs - now) / 1000),
    ),
  };
}

/** Client IP: first x-forwarded-for entry, else x-real-ip, else 'unknown' */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}
