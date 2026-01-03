import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumePasswordResetToken } from "@/lib/passwordReset";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "");
  const password = String(body?.password || "");

  if (!token || password.length < 8) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const consumed = await consumePasswordResetToken(token);
  if (!consumed.ok) {
    return NextResponse.json({ error: "Token expired or invalid" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: consumed.userId },
    data: { hashedPassword }, // matches your schema
  });

  return NextResponse.json({ ok: true });
}
