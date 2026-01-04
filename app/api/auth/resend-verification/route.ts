// app/api/auth/resend-verification/route.ts
import crypto from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer";
import { getClientIp } from "@/lib/ip";
import { enforceRateLimit, limiters } from "@/lib/rateLimit";
import { beginIdempotency, finishIdempotency } from "@/lib/idempotency";
import { sendEmailOnce } from "@/lib/emailOutbox";

export const runtime = "nodejs";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function minuteBucket() {
  return Math.floor(Date.now() / 60_000);
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();

  // Always return OK-ish to avoid user enumeration
  const okResponse = (payload: any, status = 200, headers?: Headers) =>
    NextResponse.json(payload, { status, headers });

  if (!email || !isValidEmail(email)) {
    return okResponse({ ok: true });
  }

  // ---------- Rate limits ----------
  const r1 = await enforceRateLimit({
    limiter: limiters.resendIpMinute,
    key: `resend:ip:${ip}`,
    message: "Too many resend attempts. Try again later.",
  });
  if (!r1.ok) return r1.response;

  const r2 = await enforceRateLimit({
    limiter: limiters.resendEmailMinute,
    key: `resend:email:${email}`,
    message: "Please wait before requesting another email.",
  });
  if (!r2.ok) return r2.response;

  const r3 = await enforceRateLimit({
    limiter: limiters.resendEmailDaily,
    key: `resend:email:daily:${email}`,
    message: "Daily resend limit reached. Try again tomorrow.",
  });
  if (!r3.ok) return r3.response;

  const mergedHeaders = new Headers();
  r1.headers.forEach((v, k) => mergedHeaders.set(k, v));
  r2.headers.forEach((v, k) => mergedHeaders.set(k, v));
  r3.headers.forEach((v, k) => mergedHeaders.set(k, v));

  // ---------- Idempotency (optional header) ----------
  const idem = await beginIdempotency({
    req,
    route: `POST:/api/auth/resend-verification:${email}`,
    ttlSeconds: 5 * 60,
  });

  if (idem.kind === "replay" || idem.kind === "inflight") {
    mergedHeaders.forEach((v, k) => idem.response.headers.set(k, v));
    return idem.response;
  }

  const respond = async (payload: any, statusCode: number) => {
    await finishIdempotency({
      recordId: idem.kind === "claimed" ? idem.recordId : undefined,
      statusCode,
      response: payload,
    });
    return NextResponse.json(payload, { status: statusCode, headers: mergedHeaders });
  };

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });

    // If user doesn’t exist or already verified, do nothing (no enumeration)
    if (!user?.id || user.emailVerified) {
      return respond({ ok: true }, 200);
    }

    // Cooldown: if we created one in the last 60s, skip sending (still OK)
    const last = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, token: true, expiresAt: true },
    });

    if (last && Date.now() - last.createdAt.getTime() < 60_000 && last.expiresAt > new Date()) {
      // Don’t generate a new token; don’t send. Keeps the last emailed token valid.
      return respond({ ok: true }, 200);
    }

    // Create token (keep old tokens; they expire soon anyway)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // DB dedupe: at most 1 send per user per minute even under retries/races
    const dedupeKey = `resend-verify:${user.id}:${minuteBucket()}`;

    await sendEmailOnce({
      dedupeKey,
      kind: "resend-verification",
      to: email,
      meta: { userId: user.id },
      send: () => sendVerificationEmail({ to: email, token }),
    }).catch(() => null);

    return respond({ ok: true }, 200);
  } catch {
    // Still avoid leaking details
    return respond({ ok: true }, 200);
  }
}
