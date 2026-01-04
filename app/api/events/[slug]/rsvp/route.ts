// app/api/events/[slug]/rsvp/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrlFromRequest } from "@/lib/siteUrl";
import { emailRsvpUpdated, emailWaitlistPromoted } from "@/lib/rsvpEmails";

import { getClientIp } from "@/lib/ip";
import { enforceRateLimit, limiters } from "@/lib/rateLimit";
import { beginIdempotency, finishIdempotency } from "@/lib/idempotency";
import { sendEmailOnce } from "@/lib/emailOutbox";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

type RSVPStatus = "GOING" | "MAYBE" | "DECLINED";
type AttendanceState = "CONFIRMED" | "WAITLISTED";

type Tx = Prisma.TransactionClient;

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return bStart < aEnd && bEnd > aStart;
}

function fmt(d: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

async function resolveUser(session: any) {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
  const sessionEmail = su?.email as string | undefined;

  if (sessionId) {
    const u = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { id: true, email: true, name: true },
    });
    if (u?.email) return u;
  }

  if (sessionEmail) {
    return prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, email: true, name: true },
    });
  }

  return null;
}

type PromotedItem = {
  id: string;
  user: { email: string | null; name: string | null };
};

async function promoteWaitlist(
  tx: Tx,
  event: { id: string; capacity: number | null; waitlistEnabled: boolean }
): Promise<PromotedItem[]> {
  if (!event.waitlistEnabled) return [];

  if (
    typeof event.capacity !== "number" ||
    !Number.isFinite(event.capacity) ||
    event.capacity <= 0
  ) {
    return [];
  }

  const confirmed = await tx.rSVP.count({
    where: { eventId: event.id, status: "GOING", attendanceState: "CONFIRMED" },
  });

  const slots = event.capacity - confirmed;
  if (slots <= 0) return [];

  const waiting = await tx.rSVP.findMany({
    where: { eventId: event.id, status: "GOING", attendanceState: "WAITLISTED" },
    orderBy: { createdAt: "asc" },
    take: slots,
    select: { id: true, user: { select: { email: true, name: true } } },
  });

  for (const w of waiting) {
    await tx.rSVP.update({
      where: { id: w.id },
      data: { attendanceState: "CONFIRMED" },
    });
  }

  return waiting;
}

type ConflictItem = {
  slug: string;
  title: string;
  startAt: Date;
  endAt: Date;
  kind: "rsvp" | "organized";
};

export async function POST(
  req: Request,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const { slug } = await Promise.resolve(params);

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveUser(session);
  if (!user?.id || !user.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userEmail: string = user.email; // ✅ now string (not null)

  const ip = getClientIp(req);

  const body = await req.json().catch(() => ({}));
  const status = String(body?.status ?? "").toUpperCase() as RSVPStatus;

  if (!["GOING", "MAYBE", "DECLINED"].includes(status)) {
    return NextResponse.json({ message: "Invalid RSVP status" }, { status: 400 });
  }

  // ---------- Rate limits ----------
  const mergedHeaders = new Headers();

  const rl1 = await enforceRateLimit({
    limiter: limiters.rsvpIpMinute,
    key: `rsvp:ip:${ip}`,
    message: "Too many RSVP updates from this IP. Try again in a bit.",
  });
  rl1.headers.forEach((v, k) => mergedHeaders.set(k, v));
  if (!rl1.ok) return rl1.response;

  const rl2 = await enforceRateLimit({
    limiter: limiters.rsvpUserMinute,
    key: `rsvp:user:${user.id}`,
    message: "You’re changing RSVP too fast. Please slow down.",
  });
  rl2.headers.forEach((v, k) => mergedHeaders.set(k, v));
  if (!rl2.ok) return rl2.response;

  const rl3 = await enforceRateLimit({
    limiter: limiters.rsvpEventMinute,
    key: `rsvp:event:${slug}`,
    message: "This event is receiving too many RSVP updates right now. Try again shortly.",
  });
  rl3.headers.forEach((v, k) => mergedHeaders.set(k, v));
  if (!rl3.ok) return rl3.response;

  // ---------- Idempotency (optional) ----------
  const idem = await beginIdempotency({
    req,
    route: `POST:/api/events/${slug}/rsvp:${user.id}:${status}`,
    userId: user.id,
    ttlSeconds: 2 * 60,
  });

  if (idem.kind === "replay" || idem.kind === "inflight") {
    mergedHeaders.forEach((v, k) => idem.response.headers.set(k, v));
    return idem.response;
  }

  const respond = async (payload: any, statusCode: number) => {
    await finishIdempotency({
      recordId: idem.kind === "claimed" ? idem.recordId : undefined,
      statusCode,
      response: payload,
    });
    return NextResponse.json(payload, { status: statusCode, headers: mergedHeaders });
  };

  const base = getBaseUrlFromRequest(req);

  try {
    const result = await prisma.$transaction(async (tx: Tx) => {
      const event = await tx.event.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          title: true,
          capacity: true,
          waitlistEnabled: true,
          startAt: true,
          endAt: true,
        },
      });

      if (!event) return { kind: "notfound" as const };

      const prev = await tx.rSVP.findUnique({
        where: { userId_eventId: { userId: user.id, eventId: event.id } },
        select: { id: true, status: true, attendanceState: true },
      });

      let attendanceState: AttendanceState = "CONFIRMED";

      if (status === "GOING") {
        if (typeof event.capacity === "number" && Number.isFinite(event.capacity)) {
          const confirmedExcludingMe = await tx.rSVP.count({
            where: {
              eventId: event.id,
              status: "GOING",
              attendanceState: "CONFIRMED",
              NOT: { userId: user.id },
            },
          });

          if (confirmedExcludingMe >= event.capacity) {
            if (!event.waitlistEnabled) return { kind: "full" as const };
            attendanceState = "WAITLISTED";
          } else {
            attendanceState = "CONFIRMED";
          }
        } else {
          attendanceState = "CONFIRMED";
        }
      } else {
        attendanceState = "CONFIRMED";
      }

      // Treat GOING or MAYBE as "busy" and prevent overlapping busy RSVPs
      const busyStatuses: RSVPStatus[] = ["GOING", "MAYBE"];
      const prevWasBusy = !!prev && busyStatuses.includes(prev.status as RSVPStatus);
      const nowIsBusy = busyStatuses.includes(status);

      if (nowIsBusy && !prevWasBusy && event.startAt && event.endAt) {
        const conflicts: ConflictItem[] = [];

        // 1) Conflicts with other RSVPs
        const rsvpConflicts = await tx.rSVP.findMany({
          where: {
            userId: user.id,
            eventId: { not: event.id },
            status: { in: busyStatuses },
            event: {
              startAt: { lt: event.endAt },
              endAt: { gt: event.startAt },
            },
          },
          select: {
            event: { select: { slug: true, title: true, startAt: true, endAt: true } },
          },
          take: 5,
        });

        for (const r of rsvpConflicts) {
          const e = r.event;
          if (overlaps(event.startAt, event.endAt, e.startAt, e.endAt)) {
            conflicts.push({
              slug: e.slug,
              title: e.title,
              startAt: e.startAt,
              endAt: e.endAt,
              kind: "rsvp",
            });
          }
        }

        // 2) Conflicts with events the user organizes
        const organizedConflicts = await tx.event.findMany({
          where: {
            organizerId: user.id,
            id: { not: event.id },
            startAt: { lt: event.endAt },
            endAt: { gt: event.startAt },
          },
          select: { slug: true, title: true, startAt: true, endAt: true },
          take: 5,
        });

        for (const e of organizedConflicts) {
          if (overlaps(event.startAt, event.endAt, e.startAt, e.endAt)) {
            conflicts.push({
              slug: e.slug,
              title: e.title,
              startAt: e.startAt,
              endAt: e.endAt,
              kind: "organized",
            });
          }
        }

        if (conflicts.length > 0) {
          const msg = conflicts
            .slice(0, 3)
            .map((c: ConflictItem) => `${c.title} (${fmt(c.startAt)} → ${fmt(c.endAt)})`)
            .join("; ");

          return {
            kind: "conflict" as const,
            conflicts,
            message: `Time conflict — you already have: ${msg}`,
          };
        }
      }

      const rsvp = prev
        ? await tx.rSVP.update({
            where: { id: prev.id },
            data: { status, attendanceState },
            select: { id: true, status: true, attendanceState: true, updatedAt: true },
          })
        : await tx.rSVP.create({
            data: { status, attendanceState, userId: user.id, eventId: event.id },
            select: { id: true, status: true, attendanceState: true, updatedAt: true },
          });

      const prevWasConfirmedSeat =
        prev?.status === "GOING" && prev?.attendanceState === "CONFIRMED";
      const nowIsConfirmedSeat =
        rsvp.status === "GOING" && rsvp.attendanceState === "CONFIRMED";
      const freedSeat = prevWasConfirmedSeat && !nowIsConfirmedSeat;

      const promoted = freedSeat ? await promoteWaitlist(tx, event) : [];
      return { kind: "ok" as const, event, prev, rsvp, promoted };
    });

    if (result.kind === "notfound") return respond({ message: "Not found" }, 404);

    if (result.kind === "full") {
      return respond({ message: "This event is full and waitlist is disabled." }, 409);
    }

    if (result.kind === "conflict") {
      return respond(
        {
          message: result.message,
          conflicts: result.conflicts.map((c: ConflictItem) => ({
            slug: c.slug,
            title: c.title,
            startAt: c.startAt,
            endAt: c.endAt,
            kind: c.kind,
          })),
        },
        409
      );
    }

    const eventUrl = new URL(`/public/events/${encodeURIComponent(slug)}`, base).toString();

    const changed =
      !result.prev ||
      result.prev.status !== result.rsvp.status ||
      result.prev.attendanceState !== result.rsvp.attendanceState;

    const tasks: Promise<unknown>[] = [];

    if (changed) {
      const dedupeKey = `rsvp-updated:${result.rsvp.id}:${result.rsvp.updatedAt.toISOString()}`;

      tasks.push(
        sendEmailOnce({
          dedupeKey,
          kind: "rsvp-updated",
          to: userEmail,
          meta: {
            eventId: result.event.id,
            slug,
            status: result.rsvp.status,
            attendanceState: result.rsvp.attendanceState,
          },
          send: () =>
            emailRsvpUpdated({
              to: userEmail,
              name: user.name,
              eventTitle: result.event.title,
              eventUrl,
              status: result.rsvp.status,
              attendanceState: result.rsvp.attendanceState,
            }),
        }).catch(() => null)
      );
    }

    for (const p of result.promoted) {
      const to = (p.user.email ?? "").trim();
      if (!to) continue;

      const dedupeKey = `waitlist-promoted:${p.id}`;

      tasks.push(
        sendEmailOnce({
          dedupeKey,
          kind: "waitlist-promoted",
          to,
          meta: { eventId: result.event.id, slug },
          send: () =>
            emailWaitlistPromoted({
              to,
              name: p.user.name,
              eventTitle: result.event.title,
              eventUrl,
            }),
        }).catch(() => null)
      );
    }

    await Promise.allSettled(tasks);

    return respond(
      { ok: true, rsvp: { status: result.rsvp.status, attendanceState: result.rsvp.attendanceState } },
      200
    );
  } catch (e: any) {
    return respond({ message: e?.message ?? "Server error" }, 500);
  }
}
