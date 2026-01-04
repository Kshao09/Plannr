// lib/rateLimit.ts
import "server-only";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

type LimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch seconds
};

export type Limiter = {
  limit: (key: string) => Promise<LimitResult>;
};

function epochSeconds(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

function createFixedWindowLimiter(opts: {
  windowSeconds: number;
  max: number;
  prefix: string;
}): Limiter {
  const { windowSeconds, max, prefix } = opts;

  return {
    async limit(rawKey: string): Promise<LimitResult> {
      // Fail-open if Redis isn't configured
      if (!redis) {
        return {
          ok: true,
          limit: max,
          remaining: max,
          reset: epochSeconds(new Date()) + windowSeconds,
        };
      }

      const now = new Date();
      const windowId = Math.floor(epochSeconds(now) / windowSeconds);
      const key = `${prefix}:${windowId}:${rawKey}`;

      // 2 ops: INCR + TTL (set expiry when first used)
      const p = redis.pipeline();
      p.incr(key);
      p.ttl(key);
      const [count, ttl] = (await p.exec()) as unknown as [number, number];

      if (ttl === -1) {
        // no expiry set yet
        await redis.expire(key, windowSeconds);
      }

      const remaining = Math.max(0, max - count);
      const reset = (windowId + 1) * windowSeconds;

      return {
        ok: count <= max,
        limit: max,
        remaining,
        reset,
      };
    },
  };
}

export const limiters = {
  // ---------------------------------------
  // resend verification
  // ---------------------------------------
  resendIpMinute: createFixedWindowLimiter({
    prefix: "rl:resend:ip",
    windowSeconds: 60,
    max: 10,
  }),
  resendEmailMinute: createFixedWindowLimiter({
    prefix: "rl:resend:email",
    windowSeconds: 60,
    max: 3,
  }),
  resendEmailDaily: createFixedWindowLimiter({
    prefix: "rl:resend:email:day",
    windowSeconds: 86400,
    max: 10,
  }),

  // ---------------------------------------
  // forgot password (NEW)
  // ---------------------------------------
  forgotIpMinute: createFixedWindowLimiter({
    prefix: "rl:forgot:ip",
    windowSeconds: 60,
    max: 10,
  }),
  forgotEmailMinute: createFixedWindowLimiter({
    prefix: "rl:forgot:email",
    windowSeconds: 60,
    max: 3,
  }),
  forgotEmailDaily: createFixedWindowLimiter({
    prefix: "rl:forgot:email:day",
    windowSeconds: 86400,
    max: 5,
  }),

  // ---------------------------------------
  // RSVP spam control
  // ---------------------------------------
  rsvpIpMinute: createFixedWindowLimiter({
    prefix: "rl:rsvp:ip",
    windowSeconds: 60,
    max: 30,
  }),
  rsvpUserMinute: createFixedWindowLimiter({
    prefix: "rl:rsvp:user",
    windowSeconds: 60,
    max: 20,
  }),
  rsvpEventMinute: createFixedWindowLimiter({
    prefix: "rl:rsvp:event",
    windowSeconds: 60,
    max: 120,
  }),
};

export async function enforceRateLimit(opts: {
  limiter: Limiter;
  key: string;
  message: string;
}) {
  const r = await opts.limiter.limit(opts.key);

  const headers = new Headers();
  headers.set("RateLimit-Limit", String(r.limit));
  headers.set("RateLimit-Remaining", String(r.remaining));
  headers.set("RateLimit-Reset", String(r.reset));

  if (!r.ok) {
    const retryAfter = Math.max(1, r.reset - Math.floor(Date.now() / 1000));
    headers.set("Retry-After", String(retryAfter));
    return {
      ok: false as const,
      headers,
      response: NextResponse.json(
        { message: opts.message },
        { status: 429, headers }
      ),
    };
  }

  return { ok: true as const, headers };
}
