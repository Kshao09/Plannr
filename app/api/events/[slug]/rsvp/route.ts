import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrlFromRequest } from "@/lib/siteUrl";
import { emailRsvpUpdated, emailWaitlistPromoted } from "@/lib/rsvpEmails";

export const runtime = "nodejs";

type RSVPStatus = "GOING" | "MAYBE" | "DECLINED";
type AttendanceState = "CONFIRMED" | "WAITLISTED";

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

async function promoteWaitlist(
  tx: any,
  event: { id: string; capacity: number | null; waitlistEnabled: boolean }
) {
  if (!event.waitlistEnabled) return [];

  if (typeof event.capacity !== "number" || !Number.isFinite(event.capacity) || event.capacity <= 0) {
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
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const user = await resolveUser(session);
  if (!user?.id || !user.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const status = String(body?.status ?? "").toUpperCase() as RSVPStatus;

  if (!["GOING", "MAYBE", "DECLINED"].includes(status)) {
    return NextResponse.json({ message: "Invalid RSVP status" }, { status: 400 });
  }

  const base = getBaseUrlFromRequest(req);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          title: true,
          capacity: true,
          waitlistEnabled: true,

          // ✅ needed for conflict checks
          startAt: true,
          endAt: true,
        },
      });

      if (!event) {
        return { kind: "notfound" as const };
      }

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
            if (!event.waitlistEnabled) {
              return { kind: "full" as const };
            }
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

      // ✅ Conflict check ONLY when user is about to TAKE a confirmed seat
      const prevWasConfirmedSeat =
        prev?.status === "GOING" && prev?.attendanceState === "CONFIRMED";
      const nowIsConfirmedSeat = status === "GOING" && attendanceState === "CONFIRMED";

      if (
        nowIsConfirmedSeat &&
        !prevWasConfirmedSeat &&
        event.startAt &&
        event.endAt
      ) {
        const conflicts: ConflictItem[] = [];

        // 1) Conflicts with other RSVPs (GOING + CONFIRMED)
        const rsvpConflicts = await tx.rSVP.findMany({
          where: {
            userId: user.id,
            eventId: { not: event.id },
            status: "GOING",
            attendanceState: "CONFIRMED",
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

        // 2) Conflicts with events the user organizes (treat as busy)
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
            .map((c) => `${c.title} (${fmt(c.startAt)} → ${fmt(c.endAt)})`)
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
            select: { status: true, attendanceState: true },
          })
        : await tx.rSVP.create({
            data: {
              status,
              attendanceState,
              userId: user.id,
              eventId: event.id,
            },
            select: { status: true, attendanceState: true },
          });

      const prevWasConfirmedSeat2 =
        prev?.status === "GOING" && prev?.attendanceState === "CONFIRMED";
      const nowIsConfirmedSeat2 =
        rsvp.status === "GOING" && rsvp.attendanceState === "CONFIRMED";
      const freedSeat = prevWasConfirmedSeat2 && !nowIsConfirmedSeat2;

      const promoted = freedSeat ? await promoteWaitlist(tx, event) : [];

      return {
        kind: "ok" as const,
        event,
        prev, // ✅ include prev so we can detect changes
        rsvp,
        promoted,
      };
    });

    if (result.kind === "notfound") {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (result.kind === "full") {
      return NextResponse.json(
        { message: "This event is full and waitlist is disabled." },
        { status: 409 }
      );
    }

    if (result.kind === "conflict") {
      return NextResponse.json(
        {
          message: result.message,
          conflicts: result.conflicts.map((c) => ({
            slug: c.slug,
            title: c.title,
            startAt: c.startAt,
            endAt: c.endAt,
            kind: c.kind,
          })),
        },
        { status: 409 }
      );
    }

    const eventUrl = new URL(`/public/events/${encodeURIComponent(slug)}`, base).toString();

    // ✅ only send RSVP email if RSVP/attendance actually changed
    const changed =
      !result.prev ||
      result.prev.status !== result.rsvp.status ||
      result.prev.attendanceState !== result.rsvp.attendanceState;

    const tasks: Promise<any>[] = [];

    if (changed) {
      tasks.push(
        emailRsvpUpdated({
          to: user.email,
          name: user.name,
          eventTitle: result.event.title,
          eventUrl,
          status: result.rsvp.status,
          attendanceState: result.rsvp.attendanceState,
        }).catch(() => null)
      );
    }

    // ✅ promoted attendees always get the promotion email
    for (const p of result.promoted) {
      const to = p.user?.email;
      if (!to) continue;
      tasks.push(
        emailWaitlistPromoted({
          to,
          name: p.user?.name,
          eventTitle: result.event.title,
          eventUrl,
        }).catch(() => null)
      );
    }

    await Promise.allSettled(tasks);

    return NextResponse.json(
      {
        ok: true,
        rsvp: { status: result.rsvp.status, attendanceState: result.rsvp.attendanceState },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ message: e?.message ?? "Server error" }, { status: 500 });
  }
}
