// app/api/events/[slug]/rsvp/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getBaseUrlFromRequest } from "@/lib/siteUrl";
import { emailRsvpUpdated, emailWaitlistPromoted } from "@/lib/rsvpEmails";
import { beginIdempotency, finishIdempotency } from "@/lib/idempotency";
import { enforceRateLimit, limiters } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/ip";
import { sendEmailOnce } from "@/lib/emailOutbox";

export const runtime = "nodejs";

type RSVPStatus = "GOING" | "MAYBE" | "DECLINED";
type AttendanceState = "CONFIRMED" | "WAITLISTED";

async function resolveUser(session: any) {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
  const sessionEmail = su?.email as string | undefined;

  if (sessionId) {
    const u = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { id: true, email: true, name: true },
    });
    if (u) return u;
  }

  if (sessionEmail) {
    const u = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, email: true, name: true },
    });
    if (u) return u;
  }

  return null;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

function mergeHeaders(...hs: Headers[]) {
  const out = new Headers();
  for (const h of hs) {
    h.forEach((v, k) => out.set(k, v));
  }
  return out;
}

function normalizeStatus(v: any): RSVPStatus | null {
  const s = String(v ?? "").toUpperCase();
  if (s === "GOING" || s === "MAYBE" || s === "DECLINED") return s as RSVPStatus;
  return null;
}

// POST /api/events/[slug]/rsvp
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await resolveUser(session);
  if (!user?.id || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // HTTP idempotency (optional, via header)
  const idem = await beginIdempotency({
    req,
    route: `POST:/api/events/${slug}/rsvp`,
    userId: user.id,
    ttlSeconds: 10 * 60,
  });

  if (idem.kind === "replay" || idem.kind === "inflight") return idem.response;
  const recordId = idem.kind === "claimed" ? idem.recordId : undefined;

  // Rate limits
  const ip = getClientIp(req);
  const rl1 = await enforceRateLimit({ limiter: limiters.rsvpIpMinute, key: ip, message: "Too many RSVP attempts" });
  if (!rl1.ok) return rl1.response;

  const rl2 = await enforceRateLimit({ limiter: limiters.rsvpUserMinute, key: user.id, message: "Too many RSVP attempts" });
  if (!rl2.ok) return rl2.response;

  const headers = mergeHeaders(rl1.headers, rl2.headers);

  try {
    const body = await req.json().catch(() => ({}));
    const nextStatus = normalizeStatus(body?.status);
    if (!nextStatus) {
      const res = NextResponse.json({ error: "Invalid status" }, { status: 400, headers });
      await finishIdempotency({ recordId, statusCode: 400, response: { error: "Invalid status" } });
      return res;
    }

    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        startAt: true,
        endAt: true,
        capacity: true,
        waitlistEnabled: true,
        organizerId: true,
      },
    });

    if (!event) {
      const res = NextResponse.json({ error: "Not found" }, { status: 404, headers });
      await finishIdempotency({ recordId, statusCode: 404, response: { error: "Not found" } });
      return res;
    }

    // Time-conflict check (for GOING/MAYBE)
    if (nextStatus === "GOING" || nextStatus === "MAYBE") {
      const others = await prisma.rSVP.findMany({
        where: {
          userId: user.id,
          status: { in: ["GOING", "MAYBE"] },
          eventId: { not: event.id },
          event: {
            startAt: { lt: event.endAt },
            endAt: { gt: event.startAt },
          },
        },
        select: {
          event: { select: { title: true, startAt: true, endAt: true } },
        },
        take: 1,
      });

      if (others.length > 0 && overlaps(event.startAt, event.endAt, others[0].event.startAt, others[0].event.endAt)) {
        const res = NextResponse.json(
          { error: "Time conflict with another RSVP’d event." },
          { status: 409, headers }
        );
        await finishIdempotency({ recordId, statusCode: 409, response: { error: "Time conflict" } });
        return res;
      }
    }

    // Transaction: update RSVP, manage waitlist promotion
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // existing RSVP?
      const existing = await tx.rSVP.findUnique({
        where: { userId_eventId: { userId: user.id, eventId: event.id } },
        select: { id: true, status: true, attendanceState: true, createdAt: true },
      });

      // compute attendanceState
      let nextAttendance: AttendanceState = "CONFIRMED";
      if (nextStatus === "GOING") {
        const cap = event.capacity ?? null;

        if (cap && cap > 0) {
          const confirmedCount = await tx.rSVP.count({
            where: {
              eventId: event.id,
              status: "GOING",
              attendanceState: "CONFIRMED",
              ...(existing ? { id: { not: existing.id } } : {}),
            },
          });

          if (confirmedCount >= cap) {
            if (event.waitlistEnabled) nextAttendance = "WAITLISTED";
            else throw Object.assign(new Error("FULL"), { code: "FULL" });
          }
        }
      }

      const upserted = await tx.rSVP.upsert({
        where: { userId_eventId: { userId: user.id, eventId: event.id } },
        create: {
          userId: user.id,
          eventId: event.id,
          status: nextStatus,
          attendanceState: nextAttendance,
        },
        update: {
          status: nextStatus,
          attendanceState: nextAttendance,
        },
        select: {
          id: true,
          status: true,
          attendanceState: true,
        },
      });

      // If someone DECLINED (or moved away from GOING), try promote first waitlisted
      let promoted: { userEmail: string; userName: string | null } | null = null;

      const freesSeat =
        existing?.status === "GOING" &&
        existing?.attendanceState === "CONFIRMED" &&
        (nextStatus !== "GOING" || nextAttendance !== "CONFIRMED");

      const cap = event.capacity ?? null;
      if (cap && cap > 0 && freesSeat) {
        const candidate = await tx.rSVP.findFirst({
          where: { eventId: event.id, status: "GOING", attendanceState: "WAITLISTED" },
          orderBy: { createdAt: "asc" },
          select: { id: true, user: { select: { email: true, name: true } } },
        });

        if (candidate?.user?.email) {
          await tx.rSVP.update({
            where: { id: candidate.id },
            data: { attendanceState: "CONFIRMED" },
          });
          promoted = { userEmail: candidate.user.email, userName: candidate.user.name ?? null };
        }
      }

      return { upserted, promoted };
    });

    const eventUrl = `${getBaseUrlFromRequest(req)}/public/events/${event.slug}`;

    // Outbox + provider idempotency for RSVP update email
    await sendEmailOnce({
      dedupeKey: `email:rsvpUpdated:${result.upserted.id}:${result.upserted.status}:${result.upserted.attendanceState}`,
      kind: "rsvp_updated",
      to: user.email,
      meta: { eventId: event.id, slug: event.slug, status: result.upserted.status, attendanceState: result.upserted.attendanceState },
      send: (idempotencyKey) =>
        emailRsvpUpdated({
          to: user.email!,
          name: user.name,
          eventTitle: event.title,
          eventUrl,
          status: result.upserted.status as RSVPStatus,
          attendanceState: result.upserted.attendanceState as AttendanceState,
          idempotencyKey,
        }),
    });

    // Outbox + provider idempotency for waitlist promotion email
    if (result.promoted) {
      await sendEmailOnce({
        dedupeKey: `email:waitlistPromoted:${event.id}:${result.promoted.userEmail}`,
        kind: "waitlist_promoted",
        to: result.promoted.userEmail,
        meta: { eventId: event.id, slug: event.slug },
        send: (idempotencyKey) =>
          emailWaitlistPromoted({
            to: result.promoted.userEmail,
            name: result.promoted.userName,
            eventTitle: event.title,
            eventUrl,
            idempotencyKey,
          }),
      });
    }

    const payload = {
      ok: true,
      status: result.upserted.status,
      attendanceState: result.upserted.attendanceState,
    };

    await finishIdempotency({ recordId, statusCode: 200, response: payload });
    return NextResponse.json(payload, { headers });
  } catch (e: any) {
    if (e?.code === "FULL" || e?.message === "FULL") {
      const payload = { error: "Event is full." };
      await finishIdempotency({ recordId, statusCode: 409, response: payload });
      return NextResponse.json(payload, { status: 409, headers });
    }

    console.error("[rsvp] failed:", e?.message ?? e);
    const payload = { error: "Failed to update RSVP" };
    await finishIdempotency({ recordId, statusCode: 500, response: payload });
    return NextResponse.json(payload, { status: 500, headers });
  }
}
