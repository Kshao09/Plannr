// lib/mailer.ts
import nodemailer from "nodemailer";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
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

    // Helpful for Gmail STARTTLS
    ...(secure
      ? {}
      : {
          requireTLS: true,
        }),
  });

  return cachedTransporter;
}

export function getFromAddress() {
  // Example: "Plannr <no-reply@yourdomain.com>"
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || "Plannr <no-reply@plannr.local>";
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailArgs) {
  const transporter = getTransporter();
  if (!transporter) return { skipped: true };

  const from = getFromAddress();

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
    replyTo,
  });

  return { skipped: false, messageId: info.messageId };
}
