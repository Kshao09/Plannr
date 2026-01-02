import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emailEventCancelled, emailEventUpdated } from "@/lib/rsvpEmails";

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
    return {
      userId: dbUser?.id ?? sessionId ?? null,
      role: sessionRole ?? dbUser?.role ?? null,
    };
  }

  return { userId: sessionId ?? null, role: sessionRole ?? null };
}

function has(obj: any, key: string) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

function getBaseUrlFromRequest(req: Request) {
  // Works on Vercel and locally
  const h = new Headers(req.headers);
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function isValidDate(d: any) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function asTrimmedString(v: any) {
  return String(v ?? "").trim();
}

type EventSnapshot = {
  title: string;
  startAt: Date | null;
  endAt: Date | null;
  locationName: string | null;
  address: string | null;
};

type Change = { field: "title" | "time" | "location"; from: string; to: string };

function fmtIsoOrEmpty(d: Date | null) {
  return d ? d.toISOString() : "";
}

function buildLocation(locName: string | null, addr: string | null) {
  const a = (locName ?? "").trim();
  const b = (addr ?? "").trim();
  if (a && b) return `${a} — ${b}`;
  if (a) return a;
  if (b) return b;
  return "";
}

function diffEvent(before: EventSnapshot, after: EventSnapshot): Change[] {
  const changes: Change[] = [];

  if ((before.title ?? "") !== (after.title ?? "")) {
    changes.push({ field: "title", from: before.title ?? "", to: after.title ?? "" });
  }

  const beforeLoc = buildLocation(before.locationName, before.address);
  const afterLoc = buildLocation(after.locationName, after.address);
  if (beforeLoc !== afterLoc) {
    changes.push({ field: "location", from: beforeLoc, to: afterLoc });
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

  return changes;
}

async function getRsvpRecipients(eventId: string) {
  // Excludes DECLINED; adjust if you want to notify declined too
  const rows = await prisma.rSVP.findMany({
    where: { eventId, status: { not: "DECLINED" } },
    select: { user: { select: { email: true, name: true } } },
  });

  const map = new Map<string, { email: string; name?: string | null }>();
  for (const r of rows) {
    const email = r.user?.email?.toLowerCase().trim();
    if (!email) continue;
    if (!map.has(email)) map.set(email, { email, name: r.user?.name ?? null });
  }

  return [...map.values()];
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await resolveUser(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "ORGANIZER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.organizerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const before: EventSnapshot = {
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    locationName: event.locationName,
    address: event.address,
  };

  // ✅ Build update object WITHOUT wiping fields.
  // If a key is not present, we leave it unchanged (use undefined, not null).
  const data: any = {};

  if (has(body, "title")) data.title = asTrimmedString(body.title);
  if (has(body, "description")) data.description = body.description ? String(body.description) : null;

  if (has(body, "startAt")) {
    if (!body.startAt) {
      data.startAt = undefined;
    } else {
      const d = new Date(body.startAt);
      if (!isValidDate(d)) return NextResponse.json({ error: "Invalid startAt" }, { status: 400 });
      data.startAt = d;
    }
  }

  if (has(body, "endAt")) {
    if (!body.endAt) {
      data.endAt = undefined;
    } else {
      const d = new Date(body.endAt);
      if (!isValidDate(d)) return NextResponse.json({ error: "Invalid endAt" }, { status: 400 });
      data.endAt = d;
    }
  }

  if (has(body, "locationName")) data.locationName = body.locationName ? String(body.locationName) : null;
  if (has(body, "address")) data.address = body.address ? String(body.address) : null;
  if (has(body, "category")) data.category = body.category ? String(body.category) : null;

  if (has(body, "capacity")) {
    if (body.capacity === null || body.capacity === "") {
      data.capacity = null;
    } else {
      const n = Number(body.capacity);
      if (!Number.isFinite(n)) return NextResponse.json({ error: "Invalid capacity" }, { status: 400 });
      data.capacity = Math.max(1, Math.floor(n));
    }
  }

  if (has(body, "waitlistEnabled")) data.waitlistEnabled = !!body.waitlistEnabled;

  // 🚫 IMPORTANT: do NOT set image/images here unless you are intentionally updating them.
  // data.image = ...
  // data.images = ...

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
    },
  });

  const after: EventSnapshot = {
    title: updated.title,
    startAt: updated.startAt,
    endAt: updated.endAt,
    locationName: updated.locationName,
    address: updated.address,
  };

  const changes = diffEvent(before, after);
  if (changes.length > 0) {
    const baseUrl = getBaseUrlFromRequest(req);
    const eventUrl = `${baseUrl}/public/events/${updated.slug}`;
    const recipients = await getRsvpRecipients(event.id);

    // Send emails best-effort (don’t block the edit if mail fails)
    try {
      await Promise.allSettled(
        recipients.map((r) =>
          emailEventUpdated({
            to: r.email,
            name: r.name,
            eventTitle: updated.title,
            eventUrl,
            changes,
            startAt: updated.startAt,
            endAt: updated.endAt,
            locationName: updated.locationName,
            address: updated.address,
          })
        )
      );
    } catch (e) {
      console.error("emailEventUpdated failed:", e);
    }
  }

  revalidatePath("/public/events");
  revalidatePath(`/public/events/${slug}`);

  return NextResponse.json({ ok: true, slug: updated.slug });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await resolveUser(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "ORGANIZER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    },
  });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.organizerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const baseUrl = getBaseUrlFromRequest(req);
  const listUrl = `${baseUrl}/public/events`;

  // Notify RSVP users first (best effort), then delete.
  const recipients = await getRsvpRecipients(event.id);
  if (recipients.length > 0) {
    try {
      await Promise.allSettled(
        recipients.map((r) =>
          emailEventCancelled({
            to: r.email,
            name: r.name,
            eventTitle: event.title,
            listUrl,
            startAt: event.startAt,
            endAt: event.endAt,
            locationName: event.locationName,
            address: event.address,
          })
        )
      );
    } catch (e) {
      console.error("emailEventCancelled failed:", e);
    }
  }

  await prisma.event.delete({ where: { id: event.id } });

  revalidatePath("/public/events");
  revalidatePath(`/public/events/${slug}`);

  return NextResponse.json({ ok: true });
}
