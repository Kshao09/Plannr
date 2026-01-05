// lib/cache.ts
import "server-only";
import { redis } from "@/lib/redis";

export async function cacheGet<T>(key: string): Promise<T | null> {
  // Fail-open if Redis isn't configured
  if (!redis) return null;

  try {
    return await redis.get<T>(key);
  } catch (err) {
    console.error("[cacheGet] failed:", err);
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number) {
  if (!redis) return; // fail-open

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error("[cacheSet] failed:", err);
  }
}

export async function cacheDel(key: string) {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.error("[cacheDel] failed:", err);
  }
}
