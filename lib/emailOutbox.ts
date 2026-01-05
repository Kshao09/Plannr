// lib/emailOutbox.ts
import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { SendEmailResult } from "@/lib/mailer";

function idemKeyFromDedupeKey(dedupeKey: string) {
  const k = dedupeKey.trim();
  if (!k) return crypto.randomUUID();

  // Resend max is 256 chars — if longer, hash it (stable).
  if (k.length <= 256) return k;

  return crypto.createHash("sha256").update(k).digest("hex");
}

function isUniqueViolation(e: any) {
  return e?.code === "P2002";
}

/**
 * Exactly-once-ish email sending.
 * - Creates an EmailLog row (unique dedupeKey).
 * - If SENT already, returns skipped=true.
 * - If PENDING, returns skipped=true (another request is sending).
 * - If FAILED, tries to claim and retry.
 */
export async function sendEmailOnce(opts: {
  dedupeKey: string;
  kind: string;
  to: string;
  meta?: any;

  // called only after we successfully "claim" the send
  send: (idempotencyKey: string) => Promise<SendEmailResult>;
}): Promise<SendEmailResult> {
  const dedupeKey = String(opts.dedupeKey || "").trim();
  if (!dedupeKey) throw new Error("sendEmailOnce: missing dedupeKey");

  // 1) Try to create a fresh PENDING record (fast path)
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
      console.warn("[emailOutbox] create failed:", e?.message ?? e);
      // fail-open: still attempt send (better UX), but without dedupe guarantees
      return opts.send(idemKeyFromDedupeKey(dedupeKey));
    }

    // Unique violation: row exists already
    const existing = await prisma.emailLog.findUnique({
      where: { dedupeKey },
      select: { status: true, providerId: true },
    });

    if (existing?.status === "SENT") {
      return { ok: true, skipped: true, id: existing.providerId ?? undefined };
    }

    if (existing?.status === "PENDING") {
      return { ok: true, skipped: true };
    }

    // FAILED or unknown: attempt to claim by flipping FAILED -> PENDING
    const claimed = await prisma.emailLog.updateMany({
      where: { dedupeKey, status: "FAILED" },
      data: { status: "PENDING", error: null, meta: opts.meta ?? undefined },
    });

    if (claimed.count === 0) {
      // Someone else claimed, or status changed
      return { ok: true, skipped: true };
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
        data: {
          status: "SENT",
          providerId: result.id ?? null,
          sentAt: new Date(),
          error: null,
        },
      });
    } else if (result.skipped) {
      // If provider disabled (missing API key), keep it FAILED so it can retry later
      await prisma.emailLog.update({
        where: { dedupeKey },
        data: {
          status: "FAILED",
          error: result.error ?? "Skipped",
        },
      });
    } else {
      await prisma.emailLog.update({
        where: { dedupeKey },
        data: {
          status: "FAILED",
          error: result.error ?? "Send failed",
        },
      });
    }
  } catch (e: any) {
    console.warn("[emailOutbox] update failed:", e?.message ?? e);
  }

  return result;
}
