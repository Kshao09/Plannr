// lib/mailer.ts
import { Resend } from "resend";

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;

  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  from?: string; // optional override
};

export type SendEmailResult = {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
};

function defaultFrom() {
  const app = process.env.APP_NAME || "Plannr";

  // Preferred: your verified domain sender (or Resend From)
  const configured = (process.env.RESEND_FROM || process.env.EMAIL_FROM || "").trim();
  if (configured) return configured;

  // Fallback that works for early testing in Resend:
  return `${app} <onboarding@resend.dev>`;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] disabled (missing RESEND_API_KEY)", { to: args.to, subject: args.subject });
    return { ok: false, skipped: true, error: "Missing RESEND_API_KEY" };
  }

  const from = (args.from ?? defaultFrom()).trim();
  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      cc: args.cc,
      bcc: args.bcc,
      replyTo: args.replyTo,
    });

    if (error) {
      console.error("[email] send failed:", error);
      return { ok: false, error: error.message || String(error) };
    }

    return { ok: true, id: data?.id };
  } catch (err: any) {
    console.error("[email] send exception:", err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

// Keep this export for older code that expects it:
export const sendVerificationEmail = sendEmail;
