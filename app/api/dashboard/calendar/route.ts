import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RSVPStatusLite = "GOING" | "MAYBE" | "DECLINED";

type CalendarItem = {
  id: string;
  title: string;
  slug: string;
  startAt: string;
  endAt: string;
  locationName: string | null;
  category: string | null;
  image: string | null;
  kind: "organized" | "attending";
  rsvpStatus?: RSVPStatusLite;
};

function parseISODate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function resolveUserId(session: any) {
  const sessionUser = session?.user ?? {};
  const sessionId = sessionUser?.id as string | undefined;
  const sessionEmail = sessionUser?.email as string | undefined;

  if (sessionId) return sessionId;

  if (sessionEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true },
    });
    return dbUser?.id ?? null;
  }

  return null;
}

// GET /api/dashboard/calendar?start=...&end=...
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = parseISODate(searchParams.get("start"));
  const end = parseISODate(searchParams.get("end"));

  if (!start || !end) {
    return NextResponse.json({ error: "Missing start/end" }, { status: 400 });
  }

  // Safety: limit range (max 93 days)
  const maxRangeMs = 93 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxRangeMs) {
    return NextResponse.json({ error: "Range too large" }, { status: 400 });
  }

  const organized = await prisma.event.findMany({
    where: {
      organizerId: userId,
      startAt: { lt: end },
      endAt: { gt: start },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      startAt: true,
      endAt: true,
      locationName: true,
      category: true,
      image: true,
    },
    orderBy: { startAt: "asc" },
  });

  const rsvps = await prisma.rSVP.findMany({
    where: {
      userId,
      status: { in: ["GOING", "MAYBE"] },
      event: {
        startAt: { lt: end },
        endAt: { gt: start },
      },
    },
    select: {
      status: true,
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startAt: true,
          endAt: true,
          locationName: true,
          category: true,
          image: true,
          organizerId: true,
        },
      },
    },
    orderBy: { event: { startAt: "asc" } },
  });

  // ✅ IMPORTANT: explicitly type the Map so TS allows optional fields like rsvpStatus
  const map = new Map<string, CalendarItem>();

  for (const e of organized) {
    map.set(e.id, {
      id: e.id,
      title: e.title,
      slug: e.slug,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      locationName: e.locationName ?? null,
      category: e.category ?? null,
      image: e.image ?? null,
      kind: "organized",
    });
  }

  for (const r of rsvps) {
    const e = r.event;
    if (e.organizerId === userId) continue; // already included from organized

    if (!map.has(e.id)) {
      map.set(e.id, {
        id: e.id,
        title: e.title,
        slug: e.slug,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt.toISOString(),
        locationName: e.locationName ?? null,
        category: e.category ?? null,
        image: e.image ?? null,
        kind: "attending",
        // r.status is Prisma enum type, safe to cast since query already filtered
        rsvpStatus: r.status as RSVPStatusLite,
      });
    }
  }

  return NextResponse.json({ events: Array.from(map.values()) });
}
