// app/api/cron/reminders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import { reminderEmail } from "@/lib/emailTemplates";
import { sendEmailOnce } from "@/lib/emailOutbox";

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

function baseUrlFromEnv() {
  const explicit = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || process.env.APP_URL)?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = baseUrlFromEnv();
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
      event: { select: { id: true, title: true, slug: true, startAt: true, locationName: true } },
    },
  });

  let sent24h = 0;

  for (const r of rsvps24) {
    const to = r.user.email!;
    const url = `${appUrl}/public/events/${r.event.slug}`;

    const res = await sendEmailOnce({
      dedupeKey: `email:reminder24h:${r.id}`,
      kind: "reminder_24h",
      to,
      meta: { rsvpId: r.id, eventId: r.event.id, slug: r.event.slug },
      send: (idempotencyKey) =>
        sendEmail({
          to,
          subject: `Reminder (24h): ${r.event.title}`,
          html: reminderEmail({
            eventTitle: r.event.title,
            when: fmt(new Date(r.event.startAt)),
            where: r.event.locationName ?? undefined,
            url,
            hours: 24,
          }),
          idempotencyKey,
        }),
    });

    // Mark as sent if:
    // - we sent now, OR
    // - outbox already shows SENT (previous run sent but DB update failed)
    if (res.outboxStatus === "SENT") {
      await prisma.rSVP.update({ where: { id: r.id }, data: { reminder24hSentAt: new Date() } });
      sent24h++;
    }
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
      event: { select: { id: true, title: true, slug: true, startAt: true, locationName: true } },
    },
  });

  let sent1h = 0;

  for (const r of rsvps1) {
    const to = r.user.email!;
    const url = `${appUrl}/public/events/${r.event.slug}`;

    const res = await sendEmailOnce({
      dedupeKey: `email:reminder1h:${r.id}`,
      kind: "reminder_1h",
      to,
      meta: { rsvpId: r.id, eventId: r.event.id, slug: r.event.slug },
      send: (idempotencyKey) =>
        sendEmail({
          to,
          subject: `Reminder (1h): ${r.event.title}`,
          html: reminderEmail({
            eventTitle: r.event.title,
            when: fmt(new Date(r.event.startAt)),
            where: r.event.locationName ?? undefined,
            url,
            hours: 1,
          }),
          idempotencyKey,
        }),
    });

    if (res.outboxStatus === "SENT") {
      await prisma.rSVP.update({ where: { id: r.id }, data: { reminder1hSentAt: new Date() } });
      sent1h++;
    }
  }

  return NextResponse.json({ ok: true, sent24h, sent1h });
}
