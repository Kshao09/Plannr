// lib/emails/passwordReset.ts
import { sendEmail } from "@/lib/mailer";

type Args = {
  to: string;
  name?: string | null;
  resetUrl: string;
  expiresInMinutes: number;
  appName?: string;
};

function esc(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function btn(href: string, label: string) {
  return `
    <a href="${esc(href)}"
       style="display:inline-block;padding:10px 14px;border-radius:12px;background:#111827;color:#fff;text-decoration:none;font-weight:600;">
      ${esc(label)}
    </a>
  `;
}

function layout(title: string, bodyHtml: string, appName: string) {
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5;color:#111;">
    <h2 style="margin:0 0 12px 0;">${esc(title)}</h2>
    <div style="font-size:14px;color:#111;">${bodyHtml}</div>
    <div style="margin-top:18px;font-size:12px;color:#666;">
      Sent by ${esc(appName)}
    </div>
  </div>`;
}

export async function sendPasswordResetEmail({ to, name, resetUrl, expiresInMinutes, appName }: Args) {
  const app = appName || process.env.APP_NAME || "Plannr";
  const who = name?.trim() ? name.trim() : "there";

  const subject = `Reset your password for ${app}`;

  const html = layout(
    "Reset your password",
    `
      <p>Hi ${esc(who)},</p>
      <p>We received a request to reset your password.</p>
      <p>This link expires in <b>${expiresInMinutes} minutes</b>.</p>
      <p style="margin-top:14px;">${btn(resetUrl, "Reset password")}</p>
      <p style="margin-top:14px;font-size:12px;color:#6b7280;">
        If the button doesn’t work, copy and paste this link:<br/>
        <span>${esc(resetUrl)}</span>
      </p>
      <p style="margin-top:14px;">If you didn’t request this, you can ignore this email.</p>
    `,
    app
  );

  const text =
    `Hi ${who},\n\n` +
    `We received a request to reset your password.\n\n` +
    `Reset link (expires in ${expiresInMinutes} minutes):\n${resetUrl}\n\n` +
    `If you didn’t request this, you can ignore this email.\n`;

  return sendEmail({ to, subject, html, text });
}
