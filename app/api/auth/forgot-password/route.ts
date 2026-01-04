// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/passwordReset";
import { getBaseUrlFromRequest } from "@/lib/siteUrl";
import { sendPasswordResetEmail } from "@/lib/emails/passwordReset";

import { getClientIp } from "@/lib/ip";
import { enforceRateLimit, limiters } from "@/lib/rateLimit";
import { beginIdempotency, finishIdempotency } from "@/lib/idempotency";

export const runtime = "nodejs";

function ok(headers?: Headers) {
  return NextResponse.json({ ok: true }, { headers });
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();

  // Always return OK (avoid user enumeration)
  if (!email) return ok();

  // rate limit
  const r1 = await enforceRateLimit({
    limiter: limiters.forgotIpMinute,
    key: `forgot:ip:${ip}`,
    message: "Too many attempts. Try again later.",
  });
  if (!r1.ok) return r1.response;

  const r2 = await enforceRateLimit({
    limiter: limiters.forgotEmailMinute,
    key: `forgot:email:${email}`,
    message: "Please wait before requesting another reset email.",
  });
  if (!r2.ok) return r2.response;

  const r3 = await enforceRateLimit({
    limiter: limiters.forgotEmailDaily,
    key: `forgot:email:daily:${email}`,
    message: "Daily reset limit reached. Try again tomorrow.",
  });
  if (!r3.ok) return r3.response;

  const mergedHeaders = new Headers();
  r1.headers.forEach((v, k) => mergedHeaders.set(k, v));
  r2.headers.forEach((v, k) => mergedHeaders.set(k, v));
  r3.headers.forEach((v, k) => mergedHeaders.set(k, v));

  // idempotency
  const idem = await beginIdempotency({
    req,
    route: `POST:/api/auth/forgot-password:${email}`,
    ttlSeconds: 5 * 60,
  });

  if (idem.kind === "replay" || idem.kind === "inflight") {
    mergedHeaders.forEach((v, k) => idem.response.headers.set(k, v));
    return idem.response;
  }

  const respond = async () => {
    await finishIdempotency({
      recordId: idem.kind === "claimed" ? idem.recordId : undefined,
      statusCode: 200,
      response: { ok: true },
    });
    return ok(mergedHeaders);
  };

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user?.email) return respond();

    const { token, expiresAt } = await createPasswordResetToken(user.id);
    const baseUrl = getBaseUrlFromRequest(req);
    const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const expiresInMinutes = Math.max(1, Math.round((expiresAt.getTime() - Date.now()) / 60000));

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl: link,
      expiresInMinutes,
    }).catch(() => null);

    return respond();
  } catch {
    return respond();
  }
}
