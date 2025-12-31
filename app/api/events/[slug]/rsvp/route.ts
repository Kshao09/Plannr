import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { promotedEmail, rsvpConfirmedEmail, waitlistedEmail } from "@/lib/emailTemplates";

type RSVPStatus = "GOING" | "MAYBE" | "DECLINED";
const ALLOWED: ReadonlySet<RSVPStatus> = new Set(["GOING", "MAYBE", "DECLINED"]);

type AttendanceState = "CONFIRMED" | "WAITLISTED";

async function resolveUserId(session: any): Promise<string | null> {
  const u = session?.user ?? {};
  const sessionId = u?.id as string | undefined;
  const sessionEmail = u?.email as string | undefined;

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

async function resolveSlug(
  params: { slug: string } | Promise<{ slug: string }>
): Promise<string> {
  const { slug } = await Promise.resolve(params);
  return slug;
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

function safeCapacity(cap: number | null | undefined) {
  if (cap == null) return null;
  return Math.max(0, cap);
}

// GET /api/events/:slug/rsvp
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const slug = await resolveSlug(params);

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, capacity: true, waitlistEnabled: true },
  });
  if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });

  const existing = await prisma.rSVP.findUnique({
    where: { userId_eventId: { userId, eventId: event.id } },
    select: {
      status: true,
      attendanceState: true,
      checkInCode: true,
      checkedInAt: true,
    },
  });

  const cap = safeCapacity(event.capacity);

  const [confirmedCount, waitlistedCount] = await Promise.all([
    prisma.rSVP.count({
      where: { eventId: event.id, status: "GOING", attendanceState: "CONFIRMED" },
    }),
    prisma.rSVP.count({
      where: { eventId: event.id, status: "GOING", attendanceState: "WAITLISTED" },
    }),
  ]);

  const isFull = cap != null ? confirmedCount >= cap : false;
  const spotsLeft = cap != null ? Math.max(0, cap - confirmedCount) : null;

  const canShowCheckIn =
    existing?.status === "GOING" && existing?.attendanceState === "CONFIRMED";

  return NextResponse.json(
    {
      status: existing?.status ?? null,
      attendanceState: existing?.attendanceState ?? null,
      checkInCode: canShowCheckIn ? existing?.checkInCode : null,
      checkedInAt: canShowCheckIn ? existing?.checkedInAt : null,

      capacity: cap,
      waitlistEnabled: event.waitlistEnabled,
      confirmedCount,
      waitlistedCount,
      isFull,
      spotsLeft,
    },
    { status: 200 }
  );
}

// POST /api/events/:slug/rsvp body: { status }
export async function POST(
  req: Request,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const slug = await resolveSlug(params);

  const body = await req.json().catch(() => ({}));
  const status = String(body?.status ?? "") as RSVPStatus;

  if (!ALLOWED.has(status)) {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const userEmail = (session?.user?.email as string | undefined) ?? null;

  const result = await prisma.$transaction(async (tx) => {
    // serialize writes per event to prevent overbooking
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${slug}))`;

    const event = await tx.event.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        startAt: true,
        locationName: true,
        organizerId: true,
        capacity: true,
        waitlistEnabled: true,
      },
    });
    if (!event) return { ok: false as const, code: 404, message: "Event not found" };

    if (event.organizerId === userId) {
      return { ok: false as const, code: 403, message: "Organizers cannot RSVP their own event." };
    }

    const cap = safeCapacity(event.capacity);

    const existing = await tx.rSVP.findUnique({
      where: { userId_eventId: { userId, eventId: event.id } },
      select: { status: true, attendanceState: true },
    });

    const countConfirmedGoing = () =>
      tx.rSVP.count({
        where: { eventId: event.id, status: "GOING", attendanceState: "CONFIRMED" },
      });

    let nextState: AttendanceState = "CONFIRMED";

    if (status === "GOING") {
      if (cap == null) {
        nextState = "CONFIRMED";
      } else if (existing?.status === "GOING" && existing.attendanceState === "CONFIRMED") {
        nextState = "CONFIRMED";
      } else {
        const confirmed = await countConfirmedGoing();
        if (confirmed < cap) nextState = "CONFIRMED";
        else {
          if (!event.waitlistEnabled) {
            return { ok: false as const, code: 409, message: "Event is full." };
          }
          nextState = "WAITLISTED";
        }
      }
    }

    const rsvp = await tx.rSVP.upsert({
      where: { userId_eventId: { userId, eventId: event.id } },
      update: { status, attendanceState: nextState },
      create: { userId, eventId: event.id, status, attendanceState: nextState },
      select: {
        status: true,
        attendanceState: true,
        checkInCode: true,
        checkedInAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Promote FIFO while seats available
    const promoted: { email: string; name: string | null }[] = [];
    if (cap != null) {
      let confirmed = await countConfirmedGoing();

      while (confirmed < cap) {
        const next = await tx.rSVP.findFirst({
          where: { eventId: event.id, status: "GOING", attendanceState: "WAITLISTED" },
          orderBy: { createdAt: "asc" },
          select: { id: true, user: { select: { email: true, name: true } } },
        });

        if (!next?.user?.email) break;

        await tx.rSVP.update({
          where: { id: next.id },
          data: { attendanceState: "CONFIRMED" },
        });

        promoted.push({ email: next.user.email, name: next.user.name });
        confirmed = await countConfirmedGoing();
      }
    }

    const [confirmedCount, waitlistedCount] = await Promise.all([
      tx.rSVP.count({
        where: { eventId: event.id, status: "GOING", attendanceState: "CONFIRMED" },
      }),
      tx.rSVP.count({
        where: { eventId: event.id, status: "GOING", attendanceState: "WAITLISTED" },
      }),
    ]);

    const isFull = cap != null ? confirmedCount >= cap : false;
    const spotsLeft = cap != null ? Math.max(0, cap - confirmedCount) : null;

    const wasConfirmed =
      existing?.status === "GOING" && existing.attendanceState === "CONFIRMED";
    const wasWaitlisted =
      existing?.status === "GOING" && existing.attendanceState === "WAITLISTED";

    const nowConfirmed = rsvp.status === "GOING" && rsvp.attendanceState === "CONFIRMED";
    const nowWaitlisted = rsvp.status === "GOING" && rsvp.attendanceState === "WAITLISTED";

    return {
      ok: true as const,
      event,
      cap,
      rsvp,
      newlyConfirmed: nowConfirmed && !wasConfirmed,
      newlyWaitlisted: nowWaitlisted && !wasWaitlisted,
      promoted,
      confirmedCount,
      waitlistedCount,
      isFull,
      spotsLeft,
    };
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.code });
  }

  const when = fmt(new Date(result.event.startAt));
  const eventUrl = `${appUrl}/events/${result.event.slug}`;

  try {
    if (userEmail && result.newlyConfirmed) {
      await sendEmail({
        to: userEmail,
        subject: `Confirmed: ${result.event.title}`,
        html: rsvpConfirmedEmail({
          eventTitle: result.event.title,
          when,
          where: result.event.locationName,
          url: eventUrl,
        }),
      });
    }

    if (userEmail && result.newlyWaitlisted) {
      await sendEmail({
        to: userEmail,
        subject: `Waitlisted: ${result.event.title}`,
        html: waitlistedEmail({ eventTitle: result.event.title, url: eventUrl }),
      });
    }

    for (const p of result.promoted) {
      await sendEmail({
        to: p.email,
        subject: `You're in: ${result.event.title}`,
        html: promotedEmail({ eventTitle: result.event.title, when, url: eventUrl }),
      });
    }
  } catch (e) {
    console.error("[rsvp-email-error]", e);
  }

  const canShowCheckIn =
    result.rsvp.status === "GOING" && result.rsvp.attendanceState === "CONFIRMED";

  return NextResponse.json(
    {
      status: result.rsvp.status,
      attendanceState: result.rsvp.attendanceState,
      checkInCode: canShowCheckIn ? result.rsvp.checkInCode : null,
      checkedInAt: canShowCheckIn ? result.rsvp.checkedInAt : null,
      updatedAt: result.rsvp.updatedAt,

      capacity: result.cap,
      waitlistEnabled: result.event.waitlistEnabled,
      confirmedCount: result.confirmedCount,
      waitlistedCount: result.waitlistedCount,
      isFull: result.isFull,
      spotsLeft: result.spotsLeft,

      promotedCount: result.promoted.length,
    },
    { status: 200 }
  );
}
