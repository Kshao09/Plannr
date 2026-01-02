import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrlFromRequest } from "@/lib/siteUrl";
import { emailRsvpUpdated, emailWaitlistPromoted } from "@/lib/rsvpEmails";

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

      const prevWasConfirmedSeat = prev?.status === "GOING" && prev?.attendanceState === "CONFIRMED";
      const nowIsConfirmedSeat = rsvp.status === "GOING" && rsvp.attendanceState === "CONFIRMED";
      const freedSeat = prevWasConfirmedSeat && !nowIsConfirmedSeat;

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
