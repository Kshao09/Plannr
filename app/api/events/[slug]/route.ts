// app/api/events/[slug]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getBaseUrlFromRequest } from "@/lib/siteUrl";
import { emailEventCancelled, emailEventUpdated } from "@/lib/rsvpEmails";
import { beginIdempotency, finishIdempotency } from "@/lib/idempotency";
import { sendEmailOnce } from "@/lib/emailOutbox";

export const runtime = "nodejs";

async function resolveUser(session: any): Promise<{ userId: string | null; role: string | null }> {
  const su = session?.user ?? {};
  const sessionId = su?.id as string | undefined;
  const sessionEmail = su?.email as string | undefined;
  const sessionRole = (su as any)?.role as string | undefined;

  if (sessionId && sessionRole) return { userId: sessionId, role: sessionRole };

  if (sessionEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, role: true },
    });
    return { userId: dbUser?.id ?? sessionId ?? null, role: sessionRole ?? dbUser?.role ?? null };
  }

  return { userId: sessionId ?? null, role: sessionRole ?? null };
}

function has(obj: any, key: string) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

function isValidDate(d: any) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function toTrimmedOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function fmtIsoOrEmpty(d: Date | null) {
  return d ? d.toISOString() : "";
}

// "123 Main St, Miami, FL"
function buildAddressLine(street: string | null | undefined, city: string | null | undefined, state: string | null | undefined) {
  const parts = [street, city, state].map((x) => (x ?? "").trim()).filter(Boolean);
  return parts.join(", ");
}

function buildLocation(locName: string | null, addressLine: string | null) {
  const a = (locName ?? "").trim();
  const b = (addressLine ?? "").trim();
  if (a && b) return `${a} — ${b}`;
  if (a) return a;
  if (b) return b;
  return "";
}

function fmtCap(v: number | null) {
  return v === null ? "(no limit)" : String(v);
}

type EventSnapshot = {
  startAt: Date | null;
  endAt: Date | null;
  locationName: string | null;
  addressLine: string | null;
  capacity: number | null;
  waitlistEnabled: boolean;
};

type Change = {
  field: "time" | "location" | "capacity" | "waitlistEnabled";
  from: string;
  to: string;
};

function diffEvent(before: EventSnapshot, after: EventSnapshot): Change[] {
  const changes: Change[] = [];

  const beforeLoc = buildLocation(before.locationName, before.addressLine);
  const afterLoc = buildLocation(after.locationName, after.addressLine);
  if (beforeLoc !== afterLoc) {
    changes.push({ field: "location", from: beforeLoc || "(empty)", to: afterLoc || "(empty)" });
  }

  const beforeStart = fmtIsoOrEmpty(before.startAt);
  const afterStart = fmtIsoOrEmpty(after.startAt);
  const beforeEnd = fmtIsoOrEmpty(before.endAt);
  const afterEnd = fmtIsoOrEmpty(after.endAt);
  if (beforeStart !== afterStart || beforeEnd !== afterEnd) {
    changes.push({
      field: "time",
      from: `${beforeStart || "(empty)"} → ${beforeEnd || "(empty)"}`,
      to: `${afterStart || "(empty)"} → ${afterEnd || "(empty)"}`,
    });
  }

  if ((before.capacity ?? null) !== (after.capacity ?? null)) {
    changes.push({ field: "capacity", from: fmtCap(before.capacity), to: fmtCap(after.capacity) });
  }

  if (before.waitlistEnabled !== after.waitlistEnabled) {
    changes.push({
      field: "waitlistEnabled",
      from: before.waitlistEnabled ? "Enabled" : "Disabled",
      to: after.waitlistEnabled ? "Enabled" : "Disabled",
    });
  }

  return changes;
}

async function getRsvpRecipients(eventId: string) {
  const rows = await prisma.rSVP.findMany({
    where: { eventId, status: { in: ["GOING", "MAYBE"] } },
    select: { user: { select: { email: true, name: true } } },
  });

  const map = new Map<string, { email: string; name?: string | null }>();
  for (const r of rows) {
    const raw = r.user?.email?.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!map.has(key)) map.set(key, { email: raw, name: r.user?.name ?? null });
  }
  return [...map.values()];
}

const RECURRENCE_VALUES = new Set(["WEEKLY", "MONTHLY", "YEARLY"] as const);
type RecurrenceValue = (typeof RECURRENCE_VALUES extends Set<infer T> ? T : never) & string;

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await resolveUser(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "ORGANIZER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Optional HTTP idempotency for organizer edits
  const idem = await beginIdempotency({
    req,
    route: `PATCH:/api/events/${slug}`,
    userId,
    ttlSeconds: 10 * 60,
  });
  if (idem.kind === "replay" || idem.kind === "inflight") return idem.response;
  const recordId = idem.kind === "claimed" ? idem.recordId : undefined;

  try {
    const body = await req.json().catch(() => ({}));

    const event = await prisma.event.findFirst({
      where: { slug },
      select: {
        id: true,
        slug: true,
        organizerId: true,
        title: true,
        startAt: true,
        endAt: true,
        locationName: true,
        address: true,
        city: true,
        state: true,
        capacity: true,
        waitlistEnabled: true,
        image: true,
        images: true,
        isRecurring: true,
        recurrence: true,
      },
    });

    if (!event) {
      const res = NextResponse.json({ error: "Not found" }, { status: 404 });
      await finishIdempotency({ recordId, statusCode: 404, response: { error: "Not found" } });
      return res;
    }
    if (event.organizerId !== userId) {
      const res = NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await finishIdempotency({ recordId, statusCode: 403, response: { error: "Forbidden" } });
      return res;
    }

    const before: EventSnapshot = {
      startAt: event.startAt,
      endAt: event.endAt,
      locationName: event.locationName,
      addressLine: buildAddressLine(event.address, event.city, event.state),
      capacity: event.capacity,
      waitlistEnabled: event.waitlistEnabled,
    };

    const data: any = {};

    if (has(body, "title")) {
      const t = String(body.title ?? "").trim();
      if (!t) {
        const res = NextResponse.json({ error: "Title is required" }, { status: 400 });
        await finishIdempotency({ recordId, statusCode: 400, response: { error: "Title is required" } });
        return res;
      }
      data.title = t;
    }
    if (has(body, "description")) data.description = body.description ? String(body.description) : null;

    if (has(body, "startAt")) {
      if (!body.startAt) {
        const res = NextResponse.json({ error: "startAt is required" }, { status: 400 });
        await finishIdempotency({ recordId, statusCode: 400, response: { error: "startAt is required" } });
        return res;
      }
      const d = new Date(body.startAt);
      if (!isValidDate(d)) {
        const res = NextResponse.json({ error: "Invalid startAt" }, { status: 400 });
        await finishIdempotency({ recordId, statusCode: 400, response: { error: "Invalid startAt" } });
        return res;
      }
      data.startAt = d;
    }

    if (has(body, "endAt")) {
      if (!body.endAt) {
        const res = NextResponse.json({ error: "endAt is required" }, { status: 400 });
        await finishIdempotency({ recordId, statusCode: 400, response: { error: "endAt is required" } });
        return res;
      }
      const d = new Date(body.endAt);
      if (!isValidDate(d)) {
        const res = NextResponse.json({ error: "Invalid endAt" }, { status: 400 });
        await finishIdempotency({ recordId, statusCode: 400, response: { error: "Invalid endAt" } });
        return res;
      }
      data.endAt = d;
    }

    if (has(body, "locationName")) data.locationName = toTrimmedOrNull(body.locationName);
    if (has(body, "address")) data.address = toTrimmedOrNull(body.address);
    if (has(body, "city")) data.city = toTrimmedOrNull(body.city);
    if (has(body, "state")) data.state = toTrimmedOrNull(body.state);
    if (has(body, "category")) data.category = toTrimmedOrNull(body.category);

    if (has(body, "image")) data.image = toTrimmedOrNull(body.image);

    if (has(body, "images")) {
      if (body.images === null) {
        data.images = [];
      } else if (!Array.isArray(body.images)) {
        const res = NextResponse.json({ error: "images must be an array" }, { status: 400 });
        await finishIdempotency({ recordId, statusCode: 400, response: { error: "images must be an array" } });
        return res;
      } else {
        const cleaned = body.images.map((x: any) => String(x ?? "").trim()).filter(Boolean);
        if (cleaned.length > 5) {
          const res = NextResponse.json({ error: "Max 5 gallery images" }, { status: 400 });
          await finishIdempotency({ recordId, statusCode: 400, response: { error: "Max 5 gallery images" } });
          return res;
        }
        data.images = cleaned;
      }
    }

    if (has(body, "isRecurring")) data.isRecurring = !!body.isRecurring;

    if (has(body, "recurrence")) {
      if (body.recurrence === null || body.recurrence === "") {
        data.recurrence = null;
      } else {
        const val = String(body.recurrence).toUpperCase();
        if (!RECURRENCE_VALUES.has(val as RecurrenceValue)) {
          const res = NextResponse.json({ error: "Invalid recurrence (WEEKLY, MONTHLY, YEARLY)" }, { status: 400 });
          await finishIdempotency({ recordId, statusCode: 400, response: { error: "Invalid recurrence" } });
          return res;
        }
        data.recurrence = val;
      }
    }

    if (has(body, "isRecurring") && data.isRecurring === false) {
      data.recurrence = null;
    }

    if (has(body, "capacity")) {
      if (body.capacity === null || body.capacity === "") {
        data.capacity = null;
      } else {
        const n = Number(body.capacity);
        if (!Number.isFinite(n)) {
          const res = NextResponse.json({ error: "Invalid capacity" }, { status: 400 });
          await finishIdempotency({ recordId, statusCode: 400, response: { error: "Invalid capacity" } });
          return res;
        }
        data.capacity = Math.max(1, Math.floor(n));
      }
    }

    if (has(body, "waitlistEnabled")) data.waitlistEnabled = !!body.waitlistEnabled;

    const updated = await prisma.event.update({
      where: { id: event.id },
      data,
      select: {
        id: true,
        slug: true,
        title: true,
        startAt: true,
        endAt: true,
        locationName: true,
        address: true,
        city: true,
        state: true,
        capacity: true,
        waitlistEnabled: true,
        image: true,
        images: true,
        isRecurring: true,
        recurrence: true,
        updatedAt: true, // ✅ used for dedupe key
      },
    });

    const after: EventSnapshot = {
      startAt: updated.startAt,
      endAt: updated.endAt,
      locationName: updated.locationName,
      addressLine: buildAddressLine(updated.address, updated.city, updated.state),
      capacity: updated.capacity,
      waitlistEnabled: updated.waitlistEnabled,
    };

    const changes = diffEvent(before, after);

    if (changes.length > 0) {
      const baseUrl = getBaseUrlFromRequest(req);
      const eventUrl = `${baseUrl}/public/events/${updated.slug}`;
      const recipients = await getRsvpRecipients(event.id);
      const addressLine = after.addressLine || null;

      await Promise.allSettled(
        recipients.map((r) =>
          sendEmailOnce({
            dedupeKey: `email:eventUpdated:${updated.id}:${updated.updatedAt.toISOString()}:${r.email.toLowerCase()}`,
            kind: "event_updated",
            to: r.email,
            meta: { eventId: updated.id, slug: updated.slug, changes },
            send: (idempotencyKey) =>
              emailEventUpdated({
                to: r.email,
                name: r.name,
                eventTitle: updated.title,
                eventUrl,
                changes,
                startAt: updated.startAt,
                endAt: updated.endAt,
                locationName: updated.locationName,
                address: addressLine,
                idempotencyKey,
              }),
          })
        )
      );
    }

    revalidatePath("/public/events");
    revalidatePath(`/public/events/${slug}`);
    revalidatePath(`/public/events/${updated.slug}`);

    const payload = { ok: true, slug: updated.slug };
    await finishIdempotency({ recordId, statusCode: 200, response: payload });
    return NextResponse.json(payload);
  } catch (e: any) {
    console.error("[events/:slug PATCH] failed:", e?.message ?? e);
    const payload = { error: "Failed to update event" };
    await finishIdempotency({ recordId, statusCode: 500, response: payload });
    return NextResponse.json(payload, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return PATCH(req, ctx);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await resolveUser(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "ORGANIZER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Optional HTTP idempotency for organizer deletes
  const idem = await beginIdempotency({
    req,
    route: `DELETE:/api/events/${slug}`,
    userId,
    ttlSeconds: 10 * 60,
  });
  if (idem.kind === "replay" || idem.kind === "inflight") return idem.response;
  const recordId = idem.kind === "claimed" ? idem.recordId : undefined;

  try {
    const event = await prisma.event.findFirst({
      where: { slug },
      select: {
        id: true,
        slug: true,
        organizerId: true,
        title: true,
        startAt: true,
        endAt: true,
        locationName: true,
        address: true,
        city: true,
        state: true,
      },
    });

    if (!event) {
      const res = NextResponse.json({ error: "Not found" }, { status: 404 });
      await finishIdempotency({ recordId, statusCode: 404, response: { error: "Not found" } });
      return res;
    }
    if (event.organizerId !== userId) {
      const res = NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await finishIdempotency({ recordId, statusCode: 403, response: { error: "Forbidden" } });
      return res;
    }

    const baseUrl = getBaseUrlFromRequest(req);
    const listUrl = `${baseUrl}/public/events`;

    const recipients = await getRsvpRecipients(event.id);
    const addressLine = buildAddressLine(event.address, event.city, event.state) || null;

    if (recipients.length > 0) {
      await Promise.allSettled(
        recipients.map((r) =>
          sendEmailOnce({
            dedupeKey: `email:eventCancelled:${event.id}:${event.startAt.toISOString()}:${r.email.toLowerCase()}`,
            kind: "event_cancelled",
            to: r.email,
            meta: { eventId: event.id, slug: event.slug },
            send: (idempotencyKey) =>
              emailEventCancelled({
                to: r.email,
                name: r.name,
                eventTitle: event.title,
                listUrl,
                startAt: event.startAt,
                endAt: event.endAt,
                locationName: event.locationName,
                address: addressLine,
                idempotencyKey,
              }),
          })
        )
      );
    }

    await prisma.event.delete({ where: { id: event.id } });

    revalidatePath("/public/events");
    revalidatePath(`/public/events/${slug}`);

    const payload = { ok: true };
    await finishIdempotency({ recordId, statusCode: 200, response: payload });
    return NextResponse.json(payload);
  } catch (e: any) {
    console.error("[events/:slug DELETE] failed:", e?.message ?? e);
    const payload = { error: "Failed to delete event" };
    await finishIdempotency({ recordId, statusCode: 500, response: payload });
    return NextResponse.json(payload, { status: 500 });
  }
}
