// lib/rsvpEmails.ts
import { sendEmail } from "@/lib/mailer";

type RSVPStatus = "GOING" | "MAYBE" | "DECLINED";
type AttendanceState = "CONFIRMED" | "WAITLISTED";

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
    <div style="margin-top:18px;font-size:12px;color:#666;">
      Sent by Plannr
    </div>
  </div>`;
}

export async function emailRsvpUpdated(args: {
  to: string;
  name?: string | null;
  eventTitle: string;
  eventUrl: string;
  status: RSVPStatus;
  attendanceState: AttendanceState;
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
  });
}

export async function emailWaitlistPromoted(args: {
  to: string;
  name?: string | null;
  eventTitle: string;
  eventUrl: string;
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
  });
}
