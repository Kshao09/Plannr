// app/api/events/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RecurrenceFrequency } from "@prisma/client";

export const runtime = "nodejs";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toTrimmedOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function parseCapacity(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null; // reject NaN / Infinity
  return Math.max(1, Math.floor(n));
}

function parseImages(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  if (!Array.isArray(v)) return [];
  const cleaned = v
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);

  // DB limit is 5 (cover is separate)
  return cleaned.slice(0, 5);
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

const RECURRENCE_SET = new Set<RecurrenceFrequency>([
  RecurrenceFrequency.WEEKLY,
  RecurrenceFrequency.MONTHLY,
  RecurrenceFrequency.YEARLY,
]);

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
  const description = toTrimmedOrNull(body?.description);

  const startAtRaw = String(body?.startAt ?? "");
  const endAtRaw = String(body?.endAt ?? "");
  const startAt = startAtRaw ? new Date(startAtRaw) : null;
  const endAt = endAtRaw ? new Date(endAtRaw) : null;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "Start and end are required" }, { status: 400 });
  }
  if (endAt.getTime() <= startAt.getTime()) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }

  const locationName = toTrimmedOrNull(body?.locationName);

  // ✅ New separated address fields
  const address = toTrimmedOrNull(body?.address);
  const city = toTrimmedOrNull(body?.city);

  // If you want strict 2-letter US state codes:
  const stateRaw = toTrimmedOrNull(body?.state);
  const state = stateRaw ? stateRaw.toUpperCase().slice(0, 2) : null;

  const category = toTrimmedOrNull(body?.category);

  const capacity = parseCapacity(body?.capacity);
  if (body?.capacity !== null && body?.capacity !== undefined && body?.capacity !== "" && capacity === null) {
    return NextResponse.json({ error: "Invalid capacity" }, { status: 400 });
  }

  const waitlistEnabled = body?.waitlistEnabled === undefined ? true : Boolean(body.waitlistEnabled);

  // ✅ Recurrence
  const isRecurring = Boolean(body?.isRecurring);

  let recurrence: RecurrenceFrequency | null = null;
  if (isRecurring) {
    const raw = String(body?.recurrence ?? "").toUpperCase().trim();
    if (!raw) {
      return NextResponse.json(
        { error: "Recurrence is required when recurring is enabled" },
        { status: 400 }
      );
    }
    if (!RECURRENCE_SET.has(raw as RecurrenceFrequency)) {
      return NextResponse.json(
        { error: "Invalid recurrence (WEEKLY, MONTHLY, YEARLY)" },
        { status: 400 }
      );
    }
    recurrence = raw as RecurrenceFrequency;
  }

  // ✅ Optional: allow create to accept images directly (even if your form PATCHes later)
  const image = toTrimmedOrNull(body?.image);
  const images = parseImages(body?.images);

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
      recurrence,

      image,
      images,

      organizerId,
    },
    select: { slug: true },
  });

  return NextResponse.json({ slug: event.slug }, { status: 201 });
}
