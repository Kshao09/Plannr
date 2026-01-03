import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import { reminderEmail } from "@/lib/emailTemplates";

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

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("x-cron-secret");
  const qp = new URL(req.url).searchParams.get("secret");
  return header === secret || qp === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const now = new Date();

  const win24a = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const win24b = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const win1a = new Date(now.getTime() + 30 * 60 * 1000);
  const win1b = new Date(now.getTime() + 90 * 60 * 1000);

  const rsvps24 = await prisma.rSVP.findMany({
    where: {
      status: "GOING",
      attendanceState: "CONFIRMED",
      reminder24hSentAt: null,
      user: { email: { not: null } },
      event: { startAt: { gte: win24a, lt: win24b } },
    },
    select: {
      id: true,
      user: { select: { email: true } },
      event: { select: { title: true, slug: true, startAt: true, locationName: true } },
    },
  });

  for (const r of rsvps24) {
    const to = r.user.email!;
    const url = `${appUrl}/events/${r.event.slug}`;

    await sendEmail({
      to,
      subject: `Reminder (24h): ${r.event.title}`,
      html: reminderEmail({
        eventTitle: r.event.title,
        when: fmt(new Date(r.event.startAt)),
        where: r.event.locationName ?? undefined,
        url,
        hours: 24,
      }),
    });

    await prisma.rSVP.update({
      where: { id: r.id },
      data: { reminder24hSentAt: new Date() },
    });
  }

  const rsvps1 = await prisma.rSVP.findMany({
    where: {
      status: "GOING",
      attendanceState: "CONFIRMED",
      reminder1hSentAt: null,
      user: { email: { not: null } },
      event: { startAt: { gte: win1a, lt: win1b } },
    },
    select: {
      id: true,
      user: { select: { email: true } },
      event: { select: { title: true, slug: true, startAt: true, locationName: true } },
    },
  });

  for (const r of rsvps1) {
    const to = r.user.email!;
    const url = `${appUrl}/events/${r.event.slug}`;

    await sendEmail({
      to,
      subject: `Reminder (1h): ${r.event.title}`,
      html: reminderEmail({
        eventTitle: r.event.title,
        when: fmt(new Date(r.event.startAt)),
        where: r.event.locationName ?? undefined,
        url,
        hours: 1,
      }),
    });

    await prisma.rSVP.update({
      where: { id: r.id },
      data: { reminder1hSentAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true, sent24h: rsvps24.length, sent1h: rsvps1.length });
}
