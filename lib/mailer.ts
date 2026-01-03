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

function baseUrl() {
  // Prefer explicit env
  const explicit = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL
  )?.trim();

  if (explicit) return explicit.replace(/\/$/, "");

  // Vercel provides VERCEL_URL without protocol
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  // Local fallback
  return "http://localhost:3000";
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

export type SendVerificationEmailArgs = {
  to: string | string[];
  token: string;

  // optional passthrough overrides
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  from?: string;
};

// Overloads: allow both the “old” call style and the “token” style
export function sendVerificationEmail(args: SendEmailArgs): Promise<SendEmailResult>;
export function sendVerificationEmail(args: SendVerificationEmailArgs): Promise<SendEmailResult>;
export async function sendVerificationEmail(
  args: SendEmailArgs | SendVerificationEmailArgs
): Promise<SendEmailResult> {
  // New style: { to, token }
  if ("token" in args) {
    const app = process.env.APP_NAME || "Plannr";
    const verifyUrl = `${baseUrl()}/api/auth/verify-email?token=${encodeURIComponent(args.token)}`;

    const subject = `${app}: Verify your email`;
    const html = `
      <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">Verify your email</h2>
        <p style="margin: 0 0 12px;">Click the button below to verify your email address.</p>
        <p style="margin: 16px 0;">
          <a href="${verifyUrl}"
             style="display:inline-block;padding:10px 14px;border-radius:10px;text-decoration:none;background:#111;color:#fff;">
            Verify Email
          </a>
        </p>
        <p style="margin: 0 0 8px; font-size: 12px; color:#555;">Or copy/paste this link:</p>
        <p style="margin: 0; font-size: 12px; word-break: break-all;">
          ${verifyUrl}
        </p>
      </div>
    `;
    const text = `Verify your email: ${verifyUrl}`;

    return sendEmail({
      to: args.to,
      subject,
      html,
      text,
      cc: args.cc,
      bcc: args.bcc,
      replyTo: args.replyTo,
      from: args.from,
    });
  }

  // Old style: { to, subject, html, ... }
  return sendEmail(args);
}
