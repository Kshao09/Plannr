// lib/mailer.ts
import nodemailer from "nodemailer";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendEmailResult = {
  sent: boolean;            // ✅ what your auth flow expects
  skipped: boolean;         // true when SMTP not configured
  messageId?: string;
  error?: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "[mailer] SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS. Emails will be skipped."
    );
    return null;
  }

  const secure = port === 465; // 465 = SSL, 587 = STARTTLS

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    ...(secure ? {} : { requireTLS: true }),
  });

  return cachedTransporter;
}

export function getFromAddress() {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || "Plannr <no-reply@plannr.local>";
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailArgs): Promise<SendEmailResult> {
  const transporter = getTransporter();
  if (!transporter) {
    // ✅ keep auth flow happy
    return { sent: false, skipped: true };
  }

  const from = getFromAddress();

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
      replyTo,
    });

    return { sent: true, skipped: false, messageId: String(info.messageId ?? "") };
  } catch (e: any) {
    return { sent: false, skipped: false, error: e?.message ?? "Email send failed" };
  }
}

/**
 * Backwards-compatible helper for your auth flows.
 * Supports BOTH calling styles:
 *   sendVerificationEmail(email, urlOrCode)
 *   sendVerificationEmail({ to/email, url/link/verificationUrl, code/token, name, appName })
 */
export async function sendVerificationEmail(a: any, b?: any, c?: any): Promise<SendEmailResult> {
  // Normalize inputs
  let to: string | undefined;
  let url: string | undefined;
  let code: string | undefined;
  let name: string | undefined;
  let appName: string | undefined;

  if (typeof a === "string") {
    to = a;
    if (typeof b === "string") {
      if (/^https?:\/\//i.test(b)) url = b;
      else code = b;
    }
    if (c && typeof c === "object") {
      name = c.name ?? name;
      appName = c.appName ?? appName;
      url = c.url ?? c.link ?? c.verificationUrl ?? url;
      code = c.code ?? c.token ?? code;
    }
  } else if (a && typeof a === "object") {
    to = a.to ?? a.email;
    url = a.url ?? a.link ?? a.verificationUrl;
    code = a.code ?? a.token;
    name = a.name;
    appName = a.appName;
  }

  if (!to) {
    return { sent: false, skipped: false, error: "sendVerificationEmail: missing recipient email" };
  }

  appName = appName || process.env.APP_NAME || "Plannr";
  const subject = `Verify your email for ${appName}`;

  const greeting = name?.trim() ? `Hi ${escapeHtml(name.trim())},` : `Hi,`;

  const actionHtml = url
    ? `
      <p style="margin:14px 0;">Click the button below to verify your email:</p>
      <p style="margin:14px 0;">
        <a href="${escapeHtml(url)}"
           style="display:inline-block;padding:10px 14px;border-radius:12px;background:#111827;color:#fff;text-decoration:none;font-weight:600;">
          Verify email
        </a>
      </p>
      <p style="margin:14px 0;font-size:12px;color:#6b7280;">
        If the button doesn’t work, copy and paste this link:<br/>
        <span>${escapeHtml(url)}</span>
      </p>
    `
    : `
      <p style="margin:14px 0;">Use this verification code:</p>
      <p style="margin:14px 0;">
        <span style="display:inline-block;padding:10px 14px;border-radius:12px;background:#111827;color:#fff;font-weight:700;letter-spacing:0.08em;">
          ${escapeHtml(code || "")}
        </span>
      </p>
    `;

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5;color:#111;">
      <h2 style="margin:0 0 12px 0;">Verify your email</h2>
      <div style="font-size:14px;color:#111;">
        <p>${greeting}</p>
        <p>Thanks for signing up for <b>${escapeHtml(appName)}</b>.</p>
        ${actionHtml}
        <p style="margin-top:18px;font-size:12px;color:#6b7280;">Sent by ${escapeHtml(appName)}</p>
      </div>
    </div>
  `;

  const text = url
    ? `Verify your email for ${appName}\n\nOpen this link:\n${url}\n`
    : `Verify your email for ${appName}\n\nVerification code:\n${code || ""}\n`;

  return sendEmail({ to, subject, html, text });
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
