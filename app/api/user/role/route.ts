// app/api/user/role/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED = new Set(["MEMBER", "ORGANIZER"]);

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const desired = String(body?.role ?? "").toUpperCase();

  if (!ALLOWED.has(desired)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  // never downgrade
  if (current?.role === "ORGANIZER" && desired === "MEMBER") {
    return NextResponse.json({ ok: true, role: "ORGANIZER" }, { status: 200 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: desired as any },
  });

  return NextResponse.json({ ok: true, role: desired }, { status: 200 });
}
