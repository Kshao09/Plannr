// lib/purchaseEmails.ts
import { sendEmail } from "@/lib/mailer";

function esc(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function moneyFromCents(cents: number, currency = "USD") {
  const v = Math.max(0, Number(cents || 0)) / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);
}

function layout(title: string, bodyHtml: string) {
  return `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;line-height:1.5;color:#111;">
      <h2 style="margin:0 0 12px 0;">${esc(title)}</h2>
      <div style="font-size:14px;color:#111;">${bodyHtml}</div>
      <div style="margin-top:18px;font-size:12px;color:#666;">Sent by Plannr</div>
    </div>
  `;
}

export async function sendPurchaseReceiptEmail(args: {
  to: string;
  name?: string | null;
  orderId: string;
  items: { title: string; url: string; unitAmountCents: number; quantity: number }[];
  totalCents: number;
  idempotencyKey?: string;
}) {
  const name = args.name?.trim() ? args.name.trim() : "there";
  const total = moneyFromCents(args.totalCents, "USD");

  const rows = args.items
    .map((it) => {
      const price = moneyFromCents(it.unitAmountCents, "USD");
      return `<li><b>${esc(it.title)}</b> — ${esc(price)} × ${it.quantity} (<a href="${esc(it.url)}">view</a>)</li>`;
    })
    .join("");

  const html = layout(
    "Payment confirmation",
    `
      <p>Hi ${esc(name)},</p>
      <p>Thanks! Your payment was successful.</p>
      <p><b>Order:</b> ${esc(args.orderId)}</p>
      <p><b>Total:</b> ${esc(total)}</p>
      <p><b>Tickets:</b></p>
      <ul style="margin:10px 0 0 18px;">${rows}</ul>
    `
  );

  const text =
    `Hi ${name},\n\n` +
    `Payment successful.\n` +
    `Order: ${args.orderId}\n` +
    `Total: ${total}\n` +
    `Tickets:\n` +
    args.items.map((i) => `- ${i.title} (${moneyFromCents(i.unitAmountCents)} x ${i.quantity}) ${i.url}`).join("\n") +
    `\n`;

  return sendEmail({
    to: args.to,
    subject: "Your ticket receipt",
    html,
    text,
    idempotencyKey: args.idempotencyKey,
  });
}
