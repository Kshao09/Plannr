// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/passwordReset";
import { sendEmail } from "@/lib/mailer";
import { getBaseUrlFromRequest } from "@/lib/siteUrl";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();

  // Always return OK (avoid user enumeration)
  const ok = NextResponse.json({ ok: true });

  if (!email) return ok;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user?.email) return ok;

  const { token } = await createPasswordResetToken(user.id);
  const baseUrl = getBaseUrlFromRequest(req);
  const link = `${baseUrl}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your password",
    html: `
      <p>Click the link to reset your password:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 1 hour.</p>
    `,
  });

  return ok;
}
