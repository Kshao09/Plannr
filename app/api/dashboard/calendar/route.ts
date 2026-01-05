// app/api/dashboard/calendar/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RSVPStatusLite = "GOING" | "MAYBE" | "DECLINED";
type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

type CalendarItem = {
  id: string; // unique per occurrence
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

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

function addWeeks(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n * 7);
  return x;
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
function addYears(d: Date, n: number) {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + n);
  return x;
}

function stepByFrequency(d: Date, freq: RecurrenceFrequency) {
  if (freq === "WEEKLY") return addWeeks(d, 1);
  if (freq === "MONTHLY") return addMonths(d, 1);
  return addYears(d, 1);
}

function jumpNearRangeStart(baseStart: Date, freq: RecurrenceFrequency, rangeStart: Date) {
  if (rangeStart.getTime() <= baseStart.getTime()) return baseStart;

  if (freq === "WEEKLY") {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const diffWeeks = Math.floor((rangeStart.getTime() - baseStart.getTime()) / weekMs);
    const n = Math.max(0, diffWeeks - 1); // step back 1 to catch overlaps
    return addWeeks(baseStart, n);
  }

  if (freq === "MONTHLY") {
    const baseYM = baseStart.getFullYear() * 12 + baseStart.getMonth();
    const rangeYM = rangeStart.getFullYear() * 12 + rangeStart.getMonth();
    const diffMonths = Math.max(0, rangeYM - baseYM - 1);
    return addMonths(baseStart, diffMonths);
  }

  const diffYears = Math.max(0, rangeStart.getFullYear() - baseStart.getFullYear() - 1);
  return addYears(baseStart, diffYears);
}

function expandOccurrencesIntoRange(args: {
  eventId: string;
  title: string;
  slug: string;
  startAt: Date;
  endAt: Date;
  locationName: string | null;
  category: string | null;
  image: string | null;
  isRecurring: boolean;
  recurrence: RecurrenceFrequency | null;
  rangeStart: Date;
  rangeEnd: Date;
  kind: "organized" | "attending";
  rsvpStatus?: RSVPStatusLite;
}) {
  const {
    eventId,
    title,
    slug,
    startAt,
    endAt,
    locationName,
    category,
    image,
    isRecurring,
    recurrence,
    rangeStart,
    rangeEnd,
    kind,
    rsvpStatus,
  } = args;

  const out: CalendarItem[] = [];

  // Non-recurring
  if (!isRecurring || !recurrence) {
    if (overlaps(startAt, endAt, rangeStart, rangeEnd)) {
      const key = `${eventId}:${startAt.toISOString()}`;
      out.push({
        id: key,
        title,
        slug,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        locationName: locationName ?? null,
        category: category ?? null,
        image: image ?? null,
        kind,
        ...(rsvpStatus ? { rsvpStatus } : {}),
      });
    }
    return out;
  }

  const durationMs = endAt.getTime() - startAt.getTime();
  if (durationMs <= 0) return out;

  // Range-based cap (prevents runaway)
  const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
  const roughIntervalMs =
    recurrence === "WEEKLY"
      ? 7 * 24 * 60 * 60 * 1000
      : recurrence === "MONTHLY"
      ? 31 * 24 * 60 * 60 * 1000
      : 366 * 24 * 60 * 60 * 1000;

  const MAX_INSTANCES = Math.min(200, Math.ceil(rangeMs / roughIntervalMs) + 6);

  let curStart = jumpNearRangeStart(startAt, recurrence, rangeStart);

  for (let i = 0; i < MAX_INSTANCES; i++) {
    const curEnd = new Date(curStart.getTime() + durationMs);

    if (curStart.getTime() >= rangeEnd.getTime()) break;

    if (overlaps(curStart, curEnd, rangeStart, rangeEnd)) {
      const key = `${eventId}:${curStart.toISOString()}`;
      out.push({
        id: key,
        title,
        slug,
        startAt: curStart.toISOString(),
        endAt: curEnd.toISOString(),
        locationName: locationName ?? null,
        category: category ?? null,
        image: image ?? null,
        kind,
        ...(rsvpStatus ? { rsvpStatus } : {}),
      });
    }

    curStart = stepByFrequency(curStart, recurrence);
  }

  return out;
}

// GET /api/dashboard/calendar?start=...&end=...
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = parseISODate(searchParams.get("start"));
  const end = parseISODate(searchParams.get("end"));

  if (!start || !end) return NextResponse.json({ error: "Missing start/end" }, { status: 400 });

  // Safety: limit range (max 93 days)
  const maxRangeMs = 93 * 24 * 60 * 60 * 1000;
  if (end.getTime() - start.getTime() > maxRangeMs) {
    return NextResponse.json({ error: "Range too large" }, { status: 400 });
  }

  const organized = await prisma.event.findMany({
    where: {
      organizerId: userId,
      OR: [
        { isRecurring: false, startAt: { lt: end }, endAt: { gt: start } },
        { isRecurring: true, startAt: { lt: end } },
      ],
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
      isRecurring: true,
      recurrence: true,
    },
    orderBy: { startAt: "asc" },
  });

  const rsvps = await prisma.rSVP.findMany({
    where: {
      userId,
      status: { in: ["GOING", "MAYBE"] },
      event: {
        OR: [
          { isRecurring: false, startAt: { lt: end }, endAt: { gt: start } },
          { isRecurring: true, startAt: { lt: end } },
        ],
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
          isRecurring: true,
          recurrence: true,
        },
      },
    },
    orderBy: { event: { startAt: "asc" } },
  });

  const map = new Map<string, CalendarItem>();

  for (const e of organized) {
    const items = expandOccurrencesIntoRange({
      eventId: e.id,
      title: e.title,
      slug: e.slug,
      startAt: e.startAt,
      endAt: e.endAt,
      locationName: e.locationName ?? null,
      category: e.category ?? null,
      image: e.image ?? null,
      isRecurring: e.isRecurring,
      recurrence: (e.recurrence as any) as RecurrenceFrequency | null,
      rangeStart: start,
      rangeEnd: end,
      kind: "organized",
    });
    for (const it of items) map.set(it.id, it);
  }

  for (const r of rsvps) {
    const e = r.event;
    if (e.organizerId === userId) continue;

    const items = expandOccurrencesIntoRange({
      eventId: e.id,
      title: e.title,
      slug: e.slug,
      startAt: e.startAt,
      endAt: e.endAt,
      locationName: e.locationName ?? null,
      category: e.category ?? null,
      image: e.image ?? null,
      isRecurring: e.isRecurring,
      recurrence: (e.recurrence as any) as RecurrenceFrequency | null,
      rangeStart: start,
      rangeEnd: end,
      kind: "attending",
      rsvpStatus: r.status as RSVPStatusLite,
    });

    for (const it of items) if (!map.has(it.id)) map.set(it.id, it);
  }

  return NextResponse.json({ events: Array.from(map.values()) });
}
