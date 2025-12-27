import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set(["GOING", "MAYBE", "DECLINED"]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const session = await auth();
  const userId = session?.user ? (session.user as any).id : null;
  if (!userId) return NextResponse.json({ status: null }, { status: 200 });

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const rsvp = await prisma.rSVP.findUnique({
    where: { userId_eventId: { userId, eventId: event.id } },
    select: { status: true },
  });

  return NextResponse.json({ status: rsvp?.status ?? null }, { status: 200 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const session = await auth();
  const userId = session?.user ? (session.user as any).id : null;
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const status = String(body?.status ?? "");

  if (!ALLOWED.has(status)) {
    return NextResponse.json({ message: "Invalid RSVP status" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const saved = await prisma.rSVP.upsert({
    where: { userId_eventId: { userId, eventId: event.id } },
    create: { userId, eventId: event.id, status: status as any },
    update: { status: status as any },
    select: { status: true, updatedAt: true },
  });

  return NextResponse.json(saved, { status: 200 });
}
