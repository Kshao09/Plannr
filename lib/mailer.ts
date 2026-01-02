// lib/mailer.ts
import { sendEmail as sendResendEmail } from "@/lib/email";
import type { SendEmailArgs, SendEmailResult } from "@/lib/email";

export type { SendEmailArgs, SendEmailResult };

export function getFromAddress() {
  const app = process.env.APP_NAME || "Plannr";
  return process.env.EMAIL_FROM || `${app} <onboarding@resend.dev>`;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  return sendResendEmail({
    ...args,
    from: args.from ?? getFromAddress(),
  });
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
    return { sent: false, skipped: false, provider: "resend", error: "sendVerificationEmail: missing recipient email" };
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
