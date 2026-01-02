// lib/email.ts
export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  from?: string; // optional override
};

export type SendEmailResult = {
  sent: boolean;
  skipped: boolean;
  id?: string;
  status?: number;
  error?: string;
  provider: "resend";
};

function defaultFrom() {
  const app = process.env.APP_NAME || "Plannr";
  // Works for testing without a verified domain:
  // (Resend’s docs show onboarding@resend.dev as the example sender)
  return process.env.EMAIL_FROM || `${app} <onboarding@resend.dev>`;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = (args.from ?? defaultFrom()).trim();

  if (!apiKey) {
    console.warn("[email] Skipping send; missing RESEND_API_KEY", {
      to: args.to,
      subject: args.subject,
    });
    return { sent: false, skipped: true, provider: "resend", error: "Missing RESEND_API_KEY" };
  }

  const payload: any = {
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  };

  if (args.cc) payload.cc = args.cc;
  if (args.bcc) payload.bcc = args.bcc;
  if (args.replyTo) payload.replyTo = args.replyTo;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Resend failed", res.status, body);
      return {
        sent: false,
        skipped: false,
        provider: "resend",
        status: res.status,
        error: body || res.statusText,
      };
    }

    const data = await res.json().catch(() => ({} as any));
    return { sent: true, skipped: false, provider: "resend", id: data?.id };
  } catch (e: any) {
    console.error("[email] Resend exception", e);
    return {
      sent: false,
      skipped: false,
      provider: "resend",
      error: e?.message ?? "Unknown email error",
    };
  }
}
