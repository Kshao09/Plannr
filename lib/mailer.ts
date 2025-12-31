// lib/mailer.ts
import nodemailer from "nodemailer";
import { getAppUrl } from "@/lib/appUrl";

type SendResult = { sent: boolean; verifyUrl: string };

function buildVerifyUrl(token: string) {
  const base = getAppUrl();

  const url = new URL("/verify-email", base);
  url.searchParams.set("token", token);

  return url.toString();
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Dev-friendly: allow app to run without SMTP configured
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
    auth: { user, pass },
  });
}

export async function sendVerificationEmail({
  to,
  token,
}: {
  to: string;
  token: string;
}): Promise<SendResult> {
  const verifyUrl = buildVerifyUrl(token);
  const transporter = getTransporter();

  // ✅ Dev fallback: no SMTP configured
  if (!transporter) {
    console.warn("[mailer] SMTP not configured. Verification link:", verifyUrl);
    return { sent: false, verifyUrl };
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your email",
    text: `Verify your email: ${verifyUrl}`,
    html: `
      <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
        <h2>Verify your email</h2>
        <p>Click to verify:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      </div>
    `,
  });

  return { sent: true, verifyUrl };
}
