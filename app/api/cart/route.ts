import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function resolveUserId(session: any): Promise<string | null> {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
  const email = (su as any)?.email as string | undefined;

  if (sessionId) return sessionId;
  if (!email) return null;

  const db = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return db?.id ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.cartItem.findMany({
    where: { userId },
    select: {
      quantity: true,
      event: { select: { id: true, slug: true, title: true, priceCents: true, ticketTier: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const eventId = String(body?.eventId ?? "").trim();
  if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

  const ev = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, ticketTier: true, priceCents: true },
  });

  if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (String(ev.ticketTier).toUpperCase() !== "PREMIUM" || ev.priceCents <= 0) {
    return NextResponse.json({ error: "Only premium events can be added to cart." }, { status: 400 });
  }

  await prisma.cartItem.upsert({
    where: { userId_eventId: { userId, eventId } },
    update: { quantity: { increment: 1 } },
    create: { userId, eventId, quantity: 1 },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const eventId = String(body?.eventId ?? "").trim();
  if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

  await prisma.cartItem.deleteMany({ where: { userId, eventId } });
  return NextResponse.json({ ok: true });
}
