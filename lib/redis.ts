// lib/redis.ts
import "server-only";
import { Redis } from "@upstash/redis";

// Fail-open: if env vars missing, export null and let callers handle it.
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;
