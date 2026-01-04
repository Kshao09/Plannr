// lib/prisma.ts
import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function num(env: string | undefined, fallback: number) {
  const n = Number(env);
  return Number.isFinite(n) ? n : fallback;
}

const g = globalThis as any;

const pool: Pool =
  g.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: num(process.env.PG_POOL_MAX, process.env.NODE_ENV === "production" ? 5 : 10),
    idleTimeoutMillis: num(process.env.PG_POOL_IDLE_MS, 10_000),
    connectionTimeoutMillis: num(process.env.PG_POOL_CONN_TIMEOUT_MS, 10_000),
  });

if (process.env.NODE_ENV !== "production") g.__pgPool = pool;

function makeClient() {
  const enableQueryLog = process.env.LOG_PRISMA_QUERIES === "1";
  const slowMs = num(process.env.PRISMA_SLOW_MS, 250);

  const base = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: enableQueryLog ? (["query", "warn", "error"] as any) : (["warn", "error"] as any),
  });

  // ✅ Prisma v7+ safe hook: use $extends instead of $use
  const client = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const start = Date.now();
          try {
            return await query(args);
          } finally {
            const durationMs = Date.now() - start;
            if (durationMs >= slowMs) {
              console.warn("[prisma] SLOW", {
                durationMs,
                model: model ?? null,
                action: operation ?? null,
              });
            }
          }
        },
      },
    },
  });

  // Optional: query event logging (only when enabled)
  if (enableQueryLog && (client as any).$on) {
    (client as any).$on("query", (e: any) => {
      if (typeof e?.duration === "number" && e.duration >= slowMs) {
        console.warn("[prisma] SLOW QUERY EVENT", {
          durationMs: e.duration,
          target: e.target,
        });
      }
    });
  }

  return client;
}

export const prisma = g.__prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") g.__prisma = prisma;
