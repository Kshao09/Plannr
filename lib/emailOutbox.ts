// lib/emailOutbox.ts
import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { SendEmailResult } from "@/lib/mailer";

export type SendEmailOnceResult = SendEmailResult & {
  outboxStatus: "SENT" | "PENDING" | "CLAIMED" | "FAILED" | "FAIL_OPEN";
};

function idemKeyFromDedupeKey(dedupeKey: string) {
  const k = dedupeKey.trim();
  if (!k) return crypto.randomUUID();

  // Resend idempotency key max ~256 chars; hash if longer (stable)
  if (k.length <= 256) return k;

  return crypto.createHash("sha256").update(k).digest("hex");
}

function isUniqueViolation(e: any) {
  return e?.code === "P2002";
}

/**
 * Exactly-once-ish email sending (Outbox).
 * - Creates EmailLog(dedupeKey) as PENDING.
 * - If exists:
 *    - SENT -> skipped (outboxStatus=SENT)
 *    - PENDING -> skipped (outboxStatus=PENDING)
 *    - FAILED -> claim and retry
 */
export async function sendEmailOnce(opts: {
  dedupeKey: string;
  kind: string;
  to: string;
  meta?: any;
  send: (idempotencyKey: string) => Promise<SendEmailResult>;
}): Promise<SendEmailOnceResult> {
  const dedupeKey = String(opts.dedupeKey || "").trim();
  if (!dedupeKey) throw new Error("sendEmailOnce: missing dedupeKey");

  // 1) Try create new PENDING (fast path)
  try {
    await prisma.emailLog.create({
      data: {
        dedupeKey,
        kind: opts.kind,
        to: opts.to,
        status: "PENDING",
        meta: opts.meta ?? undefined,
      },
      select: { id: true },
    });
  } catch (e: any) {
    if (!isUniqueViolation(e)) {
      console.warn("[emailOutbox] create failed (fail-open):", e?.message ?? e);
      const r = await opts.send(idemKeyFromDedupeKey(dedupeKey));
      return { ...r, outboxStatus: "FAIL_OPEN" };
    }

    const existing = await prisma.emailLog.findUnique({
      where: { dedupeKey },
      select: { status: true, providerId: true },
    });

    if (existing?.status === "SENT") {
      return { ok: true, skipped: true, id: existing.providerId ?? undefined, outboxStatus: "SENT" };
    }

    if (existing?.status === "PENDING") {
      return { ok: true, skipped: true, outboxStatus: "PENDING" };
    }

    // FAILED (or unknown): attempt to claim FAILED -> PENDING
    const claimed = await prisma.emailLog.updateMany({
      where: { dedupeKey, status: "FAILED" },
      data: { status: "PENDING", error: null, meta: opts.meta ?? undefined },
    });

    if (claimed.count === 0) {
      // someone else claimed or state changed
      return { ok: true, skipped: true, outboxStatus: "PENDING" };
    }
  }

  // 2) We own the send
  const idempotencyKey = idemKeyFromDedupeKey(dedupeKey);
  const result = await opts.send(idempotencyKey);

  // 3) Persist outcome
  try {
    if (result.ok) {
      await prisma.emailLog.update({
        where: { dedupeKey },
        data: { status: "SENT", providerId: result.id ?? null, sentAt: new Date(), error: null },
      });
      return { ...result, outboxStatus: "SENT" };
    }

    await prisma.emailLog.update({
      where: { dedupeKey },
      data: { status: "FAILED", error: result.error ?? (result.skipped ? "Skipped" : "Send failed") },
    });

    return { ...result, outboxStatus: "FAILED" };
  } catch (e: any) {
    console.warn("[emailOutbox] update failed:", e?.message ?? e);
    return { ...result, outboxStatus: result.ok ? "SENT" : "FAILED" };
  }
}
