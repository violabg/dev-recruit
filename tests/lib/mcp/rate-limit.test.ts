import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    rateLimitBucket: { upsert: vi.fn(), deleteMany: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/mcp/rate-limit";

const db = prisma as any;

beforeEach(() => {
  db.rateLimitBucket.deleteMany.mockResolvedValue({ count: 0 });
});

describe("checkRateLimit", () => {
  it("increments the bucket of the current window atomically", async () => {
    db.rateLimitBucket.upsert.mockResolvedValue({ count: 1 });
    const before = Date.now();

    await checkRateLimit("oauth:ip:1.2.3.4", 20);

    const args = db.rateLimitBucket.upsert.mock.calls[0][0];
    const windowStart: Date = args.where.key_windowStart.windowStart;
    expect(args.where.key_windowStart.key).toBe("oauth:ip:1.2.3.4");
    expect(windowStart.getTime() % 60_000).toBe(0);
    expect(windowStart.getTime()).toBeLessThanOrEqual(before);
    expect(args.create).toEqual({
      key: "oauth:ip:1.2.3.4",
      windowStart,
      count: 1,
    });
    expect(args.update).toEqual({ count: { increment: 1 } });
  });

  it("allows requests up to the limit", async () => {
    db.rateLimitBucket.upsert.mockResolvedValue({ count: 20 });

    const result = await checkRateLimit("oauth:ip:1.2.3.4", 20);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("refuses over the limit with the seconds until the window ends", async () => {
    db.rateLimitBucket.upsert.mockResolvedValue({ count: 21 });

    const result = await checkRateLimit("oauth:user:u1", 20);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("uses the given window length", async () => {
    db.rateLimitBucket.upsert.mockResolvedValue({ count: 1 });

    const result = await checkRateLimit("mcp:ip:x", 5, 10);

    const windowStart: Date = db.rateLimitBucket.upsert.mock.calls[0][0].where
      .key_windowStart.windowStart;
    expect(windowStart.getTime() % 10_000).toBe(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(10);
    expect(result.remaining).toBe(4);
  });

  it("propagates a database error to the caller", async () => {
    db.rateLimitBucket.upsert.mockRejectedValue(new Error("db down"));

    await expect(checkRateLimit("oauth:ip:x", 20)).rejects.toThrow("db down");
  });
});

describe("clientIp", () => {
  const request = (headers: Record<string, string>) =>
    new Request("http://localhost/api/auth/oauth2/token", { headers });

  it("takes the first x-forwarded-for entry", () => {
    expect(clientIp(request({ "x-forwarded-for": " 1.2.3.4 , 10.0.0.1" }))).toBe(
      "1.2.3.4",
    );
  });

  it("falls back to x-real-ip, then to unknown", () => {
    expect(clientIp(request({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(request({}))).toBe("unknown");
  });
});
