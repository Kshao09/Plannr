import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/passwordReset";

import { getClientIp } from "@/lib/ip";
import { enforceRateLimit, limiters } from "@/lib/rateLimit";
import { beginIdempotency, finishIdempotency } from "@/lib/idempotency";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "");
  const password = String(body?.password || "");

  if (!token || password.length < 8) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Rate limit brute-force attempts (reuse forgot-password IP limiter)
  const rl = await enforceRateLimit({
    limiter: limiters.forgotIpMinute,
    key: `reset:ip:${ip}`,
    message: "Too many attempts. Try again later.",
  });
  if (!rl.ok) return rl.response;

  // Idempotency (key optional; route includes token)
  const idem = await beginIdempotency({
    req,
    route: `POST:/api/reset-password:${token}`,
    ttlSeconds: 5 * 60,
  });

  if (idem.kind === "replay" || idem.kind === "inflight") {
    rl.headers.forEach((v, k) => idem.response.headers.set(k, v));
    return idem.response;
  }

  const respond = async (payload: any, statusCode: number) => {
    await finishIdempotency({
      recordId: idem.kind === "claimed" ? idem.recordId : undefined,
      statusCode,
      response: payload,
    });
    return NextResponse.json(payload, { status: statusCode, headers: rl.headers });
  };

  const consumed = await consumePasswordResetToken(token);
  if (!consumed.ok) {
    return respond({ error: "Token expired or invalid" }, 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: consumed.userId },
    data: { hashedPassword },
  });

  return respond({ ok: true }, 200);
}
