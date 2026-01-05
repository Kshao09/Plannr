// app/api/events/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function resolveUserId(session: any): Promise<string | null> {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
  const sessionEmail = su?.email as string | undefined;

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
  if (up === "WEEKLY" || up === "MONTHLY" || up === "YEARLY") return up;
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

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session?.user || role !== "ORGANIZER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizerId = await resolveUserId(session);
  if (!organizerId) {
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

  const capRaw = body?.capacity;
  const capacity =
    capRaw === null || capRaw === undefined || capRaw === ""
      ? null
      : Math.max(1, Math.floor(Number(capRaw)));

  if (capacity !== null && !Number.isFinite(capacity)) {
    return NextResponse.json({ error: "Invalid capacity" }, { status: 400 });
  }

  const waitlistEnabled = body?.waitlistEnabled === undefined ? true : Boolean(body.waitlistEnabled);

  const isRecurring = Boolean(body?.isRecurring);
  const recurrence = normalizeRecurrence(body?.recurrence);

  if (isRecurring && !recurrence) {
    return NextResponse.json(
      { error: "Recurrence is required when recurring is enabled" },
      { status: 400 }
    );
  }

  // ✅ Critical validation to prevent calendar explosion:
  // End time must be within ONE recurrence interval.
  if (isRecurring && recurrence) {
    const nextStart = nextOccurrenceStart(startAt, recurrence);
    if (endAt.getTime() > nextStart.getTime()) {
      return NextResponse.json(
        {
          error:
            `For recurring events, End must be before the next occurrence starts. ` +
            `Tip: End is the end time of EACH occurrence (not the series end date).`,
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
      capacity,
      waitlistEnabled,
      isRecurring,
      recurrence: isRecurring ? (recurrence as any) : null,
      organizerId,
    },
    select: { slug: true },
  });

  return NextResponse.json({ slug: event.slug }, { status: 201 });
}
