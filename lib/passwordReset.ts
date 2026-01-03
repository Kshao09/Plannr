// lib/passwordReset.ts
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // optional: delete existing tokens for this user to keep it clean
  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  await prisma.passwordResetToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return { token, expiresAt };
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = sha256(token);

  const rec = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true, tokenHash: true },
  });

  if (!rec) return { ok: false as const, reason: "invalid" as const };
  if (rec.expiresAt < new Date()) return { ok: false as const, reason: "expired" as const };

  // one-time use
  await prisma.passwordResetToken.delete({ where: { tokenHash } });

  return { ok: true as const, userId: rec.userId };
}
