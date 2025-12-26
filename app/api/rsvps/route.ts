import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set(["GOING", "MAYBE", "DECLINED"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const eventId = String(body?.eventId ?? "");
  const status = String(body?.status ?? "");

  if (!eventId || !ALLOWED.has(status)) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  // ensure event exists (optional but good)
  const exists = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!exists) return NextResponse.json({ message: "Event not found" }, { status: 404 });

  const rsvp = await prisma.rSVP.upsert({
    where: {
      userId_eventId: {
        userId: session.user.id,
        eventId,
      },
    },
    update: { status: status as any },
    create: {
      userId: session.user.id,
      eventId,
      status: status as any,
    },
  });

  return NextResponse.json(rsvp, { status: 200 });
}

// GET /api/rsvps?mine=1
// GET /api/rsvps?eventId=...  (organizer-only attendees list)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine");
  const eventId = searchParams.get("eventId");

  if (mine) {
    const rsvps = await prisma.rSVP.findMany({
      where: { userId: session.user.id },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            startAt: true,
            endAt: true,
            locationName: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(rsvps);
  }

  if (eventId) {
    // organizer-only: verify ownership
    const ev = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!ev) return NextResponse.json({ message: "Event not found" }, { status: 404 });
    if (ev.organizerId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const attendees = await prisma.rSVP.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(attendees);
  }

  return NextResponse.json({ message: "Bad request" }, { status: 400 });
}
