// lib/rsvpEmails.ts
import { sendEmail } from "@/lib/mailer";

type RSVPStatus = "GOING" | "MAYBE" | "DECLINED";
type AttendanceState = "CONFIRMED" | "WAITLISTED";

type Change = { field: "time" | "location" | "capacity" | "waitlistEnabled"; from: string; to: string };

function esc(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function btn(href: string, label: string) {
  const u = esc(href);
  const t = esc(label);
  return `
    <a href="${u}"
       style="display:inline-block;padding:10px 14px;border-radius:12px;background:#111827;color:#fff;text-decoration:none;font-weight:600;">
      ${t}
    </a>
  `;
}

function layout(title: string, bodyHtml: string) {
  const h = esc(title);
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5;color:#111;">
    <h2 style="margin:0 0 12px 0;">${h}</h2>
    <div style="font-size:14px;color:#111;">${bodyHtml}</div>
    <div style="margin-top:18px;font-size:12px;color:#666;">Sent by Plannr</div>
  </div>`;
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return "(empty)";
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function fmtLocation(locationName: string | null | undefined, address: string | null | undefined) {
  const a = (locationName ?? "").trim();
  const b = (address ?? "").trim();
  if (a && b) return `${a} — ${b}`;
  if (a) return a;
  if (b) return b;
  return "(empty)";
}

/* =========================
   RSVP UPDATED
   ========================= */

export async function emailRsvpUpdated(args: {
  to: string;
  name?: string | null;
  eventTitle: string;
  eventUrl: string;
  status: RSVPStatus;
  attendanceState: AttendanceState;
  idempotencyKey?: string;
}) {
  const name = args.name?.trim() ? args.name!.trim() : "there";
  const eventTitle = args.eventTitle;
  const url = args.eventUrl;

  let subject = `RSVP updated: ${eventTitle}`;
  let headline = `RSVP updated`;
  let message = "";

  if (args.status === "DECLINED") {
    subject = `You declined: ${eventTitle}`;
    headline = `You declined`;
    message = `You’re marked as <b>Declined</b> for <b>${esc(eventTitle)}</b>.`;
  } else if (args.status === "MAYBE") {
    subject = `You’re “Maybe” for: ${eventTitle}`;
    headline = `You’re “Maybe”`;
    message = `You’re marked as <b>Maybe</b> for <b>${esc(eventTitle)}</b>.`;
  } else {
    // GOING
    if (args.attendanceState === "WAITLISTED") {
      subject = `Waitlisted: ${eventTitle}`;
      headline = `You’re on the waitlist`;
      message = `You RSVP’d <b>Going</b> but the event is full, so you’ve been placed on the <b>waitlist</b> for <b>${esc(
        eventTitle
      )}</b>.`;
    } else {
      subject = `Confirmed: ${eventTitle}`;
      headline = `You’re confirmed`;
      message = `You’re marked as <b>Going</b> and <b>confirmed</b> for <b>${esc(eventTitle)}</b>.`;
    }
  }

  const html = layout(
    headline,
    `
      <p>Hi ${esc(name)},</p>
      <p>${message}</p>
      <p style="margin-top:14px;">${btn(url, "View event")}</p>
    `
  );

  const text = `Hi ${name},\n\n${headline}\n${eventTitle}\n\nView event: ${url}\n`;

  return sendEmail({
    to: args.to,
    subject,
    html,
    text,
    idempotencyKey: args.idempotencyKey,
  });
}

export async function emailWaitlistPromoted(args: {
  to: string;
  name?: string | null;
  eventTitle: string;
  eventUrl: string;
  idempotencyKey?: string;
}) {
  const name = args.name?.trim() ? args.name!.trim() : "there";
  const eventTitle = args.eventTitle;
  const url = args.eventUrl;

  const subject = `Good news — you’re confirmed for ${eventTitle}`;
  const html = layout(
    "You’re off the waitlist",
    `
      <p>Hi ${esc(name)},</p>
      <p>A spot opened up — you’ve been <b>promoted from the waitlist</b> and are now <b>confirmed</b> for <b>${esc(
        eventTitle
      )}</b>.</p>
      <p style="margin-top:14px;">${btn(url, "View event")}</p>
    `
  );

  const text = `Hi ${name},\n\nYou're off the waitlist and confirmed for ${eventTitle}.\n\nView event: ${url}\n`;

  return sendEmail({
    to: args.to,
    subject,
    html,
    text,
    idempotencyKey: args.idempotencyKey,
  });
}

/* =========================
   EVENT UPDATED / CANCELLED
   ========================= */

export async function emailEventUpdated(args: {
  to: string;
  name?: string | null;
  eventTitle: string;
  eventUrl: string;
  changes: Change[];
  startAt: Date | null;
  endAt: Date | null;
  locationName: string | null;
  address: string | null;
  idempotencyKey?: string;
}) {
  const name = args.name?.trim() ? args.name!.trim() : "there";

  const changeLines = args.changes
    .map((c) => {
      const label =
        c.field === "location" ? "Location" : c.field === "time" ? "Time" : c.field === "capacity" ? "Capacity" : "Waitlist";

      return `<li><b>${label}</b><br/>From: ${esc(c.from || "(empty)")}<br/>To: ${esc(c.to || "(empty)")}</li>`;
    })
    .join("");

  const subject = `Event updated: ${args.eventTitle}`;

  const html = layout(
    "Event updated",
    `
      <p>Hi ${esc(name)},</p>
      <p>The organizer updated <b>${esc(args.eventTitle)}</b>. Here’s what changed:</p>
      <ul style="margin:10px 0 0 18px;">${changeLines}</ul>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />

      <p><b>Current details</b></p>
      <p style="margin:0;">
        <b>When:</b> ${esc(fmtDate(args.startAt))} — ${esc(fmtDate(args.endAt))}<br/>
        <b>Where:</b> ${esc(fmtLocation(args.locationName, args.address))}
      </p>

      <p style="margin-top:14px;">${btn(args.eventUrl, "View event")}</p>
    `
  );

  const text =
    `Hi ${name},\n\n` +
    `The organizer updated "${args.eventTitle}".\n\n` +
    `Changes:\n` +
    args.changes.map((c) => `- ${c.field}: ${c.from || "(empty)"} -> ${c.to || "(empty)"}`).join("\n") +
    `\n\nView event: ${args.eventUrl}\n`;

  return sendEmail({
    to: args.to,
    subject,
    html,
    text,
    idempotencyKey: args.idempotencyKey,
  });
}

export async function emailEventCancelled(args: {
  to: string;
  name?: string | null;
  eventTitle: string;
  listUrl: string;
  startAt: Date | null;
  endAt: Date | null;
  locationName: string | null;
  address: string | null;
  idempotencyKey?: string;
}) {
  const name = args.name?.trim() ? args.name!.trim() : "there";

  const subject = `Event cancelled: ${args.eventTitle}`;

  const html = layout(
    "Event cancelled",
    `
      <p>Hi ${esc(name)},</p>
      <p>The event <b>${esc(args.eventTitle)}</b> has been cancelled by the organizer.</p>

      <p style="margin:0;">
        <b>Was scheduled:</b> ${esc(fmtDate(args.startAt))} — ${esc(fmtDate(args.endAt))}<br/>
        <b>Location:</b> ${esc(fmtLocation(args.locationName, args.address))}
      </p>

      <p style="margin-top:14px;">${btn(args.listUrl, "Browse other events")}</p>
    `
  );

  const text =
    `Hi ${name},\n\n` +
    `The event "${args.eventTitle}" was cancelled by the organizer.\n\n` +
    `Was scheduled: ${fmtDate(args.startAt)} — ${fmtDate(args.endAt)}\n` +
    `Location: ${fmtLocation(args.locationName, args.address)}\n\n` +
    `Browse other events: ${args.listUrl}\n`;

  return sendEmail({
    to: args.to,
    subject,
    html,
    text,
    idempotencyKey: args.idempotencyKey,
  });
}
