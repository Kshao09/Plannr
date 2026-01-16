// app/api/events/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";
type TicketTier = "FREE" | "PREMIUM";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function resolveUser(session: any): Promise<{ userId: string | null; role: string | null }> {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
  const sessionRole = (su as any)?.role as string | undefined;
  const sessionEmail = su?.email as string | undefined;

  if (sessionId && sessionRole) return { userId: sessionId, role: sessionRole };

  if (sessionEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, role: true },
    });
    return {
      userId: dbUser?.id ?? sessionId ?? null,
      role: sessionRole ?? (dbUser?.role as any) ?? null,
    };
  }

  return { userId: sessionId ?? null, role: sessionRole ?? null };
}

async function makeUniqueSlug(title: string) {
  const base = slugify(title) || "event";
  let slug = base;
  let i = 2;

  while (await prisma.event.findUnique({ where: { slug }, select: { slug: true } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

function toTrimmedOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function parseDateOrNull(v: unknown) {
  const s = toTrimmedOrNull(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeState(v: unknown) {
  const s = toTrimmedOrNull(v);
  if (!s) return null;
  return s.toUpperCase().slice(0, 2);
}

function normalizeRecurrence(v: unknown): RecurrenceFrequency | null {
  const s = toTrimmedOrNull(v);
  if (!s) return null;
  const up = s.toUpperCase();
  if (up === "WEEKLY" || up === "MONTHLY" || up === "YEARLY") return up as RecurrenceFrequency;
  return null;
}

function normalizeTicketTier(v: unknown): TicketTier | null {
  const s = toTrimmedOrNull(v);
  if (!s) return null;
  const up = s.toUpperCase();
  if (up === "FREE" || up === "PREMIUM") return up as TicketTier;
  return null;
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

function nextOccurrenceStart(startAt: Date, freq: RecurrenceFrequency) {
  if (freq === "WEEKLY") return addWeeks(startAt, 1);
  if (freq === "MONTHLY") return addMonths(startAt, 1);
  return addYears(startAt, 1);
}

/**
 * GET /api/events?city=Miami&state=FL&take=12&skip=0&category=Tech&upcoming=1
 * Public listing endpoint.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const city = toTrimmedOrNull(url.searchParams.get("city"));
  const state = normalizeState(url.searchParams.get("state"));
  const category = toTrimmedOrNull(url.searchParams.get("category"));

  const takeRaw = url.searchParams.get("take");
  const skipRaw = url.searchParams.get("skip");

  const take = Math.min(
    50,
    Math.max(1, Number.isFinite(Number(takeRaw)) ? Math.floor(Number(takeRaw)) : 12)
  );
  const skip = Math.max(0, Number.isFinite(Number(skipRaw)) ? Math.floor(Number(skipRaw)) : 0);

  const upcoming = url.searchParams.get("upcoming") === "1";

  const where: any = {};
  if (city) where.city = city;
  if (state) where.state = state;
  if (category) where.category = category;
  if (upcoming) where.startAt = { gte: new Date() };

  const events = await prisma.event.findMany({
    where,
    orderBy: { startAt: "asc" },
    skip,
    take,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      locationName: true,
      address: true,
      city: true,
      state: true,
      category: true,
      image: true,
      images: true,
      ticketTier: true,
      isRecurring: true,
      recurrence: true,
      organizerId: true,
      capacity: true,
      waitlistEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ events }, { status: 200 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: organizerId, role } = await resolveUser(session);
  if (!organizerId || role !== "ORGANIZER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const startAt = parseDateOrNull(body?.startAt);
  const endAt = parseDateOrNull(body?.endAt);

  if (!startAt || !endAt) {
    return NextResponse.json({ error: "Start and end are required" }, { status: 400 });
  }
  if (endAt.getTime() <= startAt.getTime()) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }

  const description = toTrimmedOrNull(body?.description);
  const locationName = toTrimmedOrNull(body?.locationName);
  const address = toTrimmedOrNull(body?.address);
  const city = toTrimmedOrNull(body?.city);
  const state = normalizeState(body?.state);
  const category = toTrimmedOrNull(body?.category);

  const ticketTier = normalizeTicketTier(body?.ticketTier) ?? "FREE";

  const capRaw = body?.capacity;
  let capacity: number | null = null;
  if (!(capRaw === null || capRaw === undefined || capRaw === "")) {
    const capNum = Number(capRaw);
    if (!Number.isFinite(capNum)) {
      return NextResponse.json({ error: "Invalid capacity" }, { status: 400 });
    }
    capacity = Math.max(1, Math.floor(capNum));
  }

  const waitlistEnabled =
    body?.waitlistEnabled === undefined ? true : Boolean(body.waitlistEnabled);

  const isRecurring = Boolean(body?.isRecurring);
  const recurrence = normalizeRecurrence(body?.recurrence);

  if (isRecurring && !recurrence) {
    return NextResponse.json(
      { error: "Recurrence is required when recurring is enabled" },
      { status: 400 }
    );
  }

  if (isRecurring && recurrence) {
    const nextStart = nextOccurrenceStart(startAt, recurrence);
    if (endAt.getTime() > nextStart.getTime()) {
      return NextResponse.json(
        {
          error:
            `For recurring events, End must be before the next occurrence starts. ` +
            `End is the end time of EACH occurrence (not the series end date).`,
        },
        { status: 400 }
      );
    }
  }

  const slug = await makeUniqueSlug(title);

  const event = await prisma.event.create({
    data: {
      slug,
      title,
      description,
      startAt,
      endAt,
      locationName,
      address,
      city,
      state,
      category,
      ticketTier,
      capacity,
      waitlistEnabled,
      isRecurring,
      recurrence: isRecurring ? (recurrence as any) : null,
      organizerId,
    } as any,
    select: { slug: true },
  });

  return NextResponse.json({ slug: event.slug }, { status: 201 });
}
