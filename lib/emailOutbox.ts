// lib/emailOutbox.ts
import "server-only";
import { prisma } from "@/lib/prisma";
import type { SendEmailResult } from "@/lib/mailer";

function isUniqueViolation(e: any) {
  return e?.code === "P2002";
}

type SendOnceArgs = {
  dedupeKey: string;
  kind: string;
  to: string;
  meta?: any;
  send: () => Promise<SendEmailResult>;
};

/**
 * DB-backed email dedupe.
 * - Creates an EmailLog row with unique dedupeKey.
 * - If it already exists, we skip sending.
 * - Otherwise we send and record SENT/FAILED.
 */
export async function sendEmailOnce(args: SendOnceArgs): Promise<SendEmailResult & { deduped?: boolean }> {
  try {
    await prisma.emailLog.create({
      data: {
        dedupeKey: args.dedupeKey,
        kind: args.kind,
        to: args.to,
        meta: args.meta ?? undefined,
        status: "PENDING",
      },
    });
  } catch (e: any) {
    if (isUniqueViolation(e)) {
      // Already processed (or currently processing) this dedupeKey
      return { ok: true, skipped: true, deduped: true };
    }
    // Fail-open: don't break product flow if logging fails
    console.warn("[emailOutbox] create failed (fail-open):", e?.message ?? e);
  }

  const result = await args.send().catch((err: any) => {
    return { ok: false, error: err?.message ?? String(err) } satisfies SendEmailResult;
  });

  // Best-effort update
  try {
    await prisma.emailLog.update({
      where: { dedupeKey: args.dedupeKey },
      data: result.ok
        ? { status: "SENT", providerId: result.id ?? null, sentAt: new Date(), error: null }
        : { status: "FAILED", error: result.error ?? "Unknown error" },
    });
  } catch (e: any) {
    console.warn("[emailOutbox] update failed (ignored):", e?.message ?? e);
  }

  return result;
}
