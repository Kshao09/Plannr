import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createResetToken, hashResetToken } from "@/lib/passwordReset";
import { getBaseUrlFromRequest } from "@/lib/siteUrl";
import { sendPasswordResetEmail } from "@/lib/emails/passwordReset";

export const runtime = "nodejs";

function isStrongEnough(pw: string) {
  return pw.length >= 8;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const token =
    typeof body.token === "string" ? body.token.trim() : "";
  const password =
    typeof body.password === "string" ? body.password : "";

  // Mode A: request reset link
  const isRequestLink = !!email && !token && !password;

  // Mode B: reset password
  const isReset = !!token && !!password;

  // -------------------------
  // A) REQUEST RESET LINK
  // -------------------------
  if (isRequestLink) {
    // Always return ok (avoid email enumeration)
    if (!email) return NextResponse.json({ ok: true });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user?.id || !user.email) return NextResponse.json({ ok: true });

    // Cleanup old/expired/used tokens
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    });

    const { token, tokenHash } = createResetToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const baseUrl = getBaseUrlFromRequest(req);
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name ?? null,
        resetUrl,
        expiresInMinutes: 60,
      });
    } catch (e) {
      // Keep response ok; don't leak
      console.error("[password-reset] email send failed:", e);
    }

    return NextResponse.json({ ok: true });
  }

  // -------------------------
  // B) RESET PASSWORD
  // -------------------------
  if (isReset) {
    if (!isStrongEnough(password)) {
      return NextResponse.json(
        { ok: false, error: "Password too weak" },
        { status: 400 }
      );
    }

    const tokenHash = hashResetToken(token);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { userId: true, usedAt: true, expiresAt: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, error: "Token expired or invalid" },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          // ✅ YOUR schema uses hashedPassword
          hashedPassword: newHash,
        },
      }),
      prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { ok: false, error: "Invalid request" },
    { status: 400 }
  );
}
