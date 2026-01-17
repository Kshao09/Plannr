// app/api/checkout/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, stripeWebhookSecret } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendPurchaseReceiptEmail } from "@/lib/purchaseEmails";
import { absoluteUrlFromRequest } from "@/lib/siteUrl";

export const runtime = "nodejs";

type OrderRow = {
  id: string;
  userId: string;
  status: "PENDING" | "PAID" | "CANCELED" | "REFUNDED";
  totalCents: number;
  currency: string;
  items: Array<{
    quantity: number;
    unitAmountCents: number;
    eventId: string;
    event: { slug: string; title: string; id: string; capacity: number | null; waitlistEnabled: boolean };
  }>;
  user: { email: string | null; name: string | null };
};

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  const secret = stripeWebhookSecret();
  const body = await req.text();

  let evt: Stripe.Event;
  try {
    evt = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "invalid";
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  try {
    if (evt.type === "checkout.session.completed") {
      const session = evt.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};
      const type = String(meta.type ?? "");
      const orderId = String(meta.orderId ?? "");

      if (type === "EVENT_ORDER" && orderId) {
        const order = (await prisma.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            userId: true,
            status: true,
            totalCents: true,
            currency: true,
            items: {
              select: {
                quantity: true,
                unitAmountCents: true,
                eventId: true,
                event: { select: { slug: true, title: true, id: true, capacity: true, waitlistEnabled: true } },
              },
            },
            user: { select: { email: true, name: true } },
          },
        })) as OrderRow | null;

        // If no order, still ack the webhook (don’t cause retries forever)
        if (!order) return NextResponse.json({ received: true });

        // Idempotent: do nothing if already PAID
        if (order.status !== "PAID") {
          const paymentIntentId =
            typeof session.payment_intent === "string" ? session.payment_intent : null;

          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "PAID",
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: paymentIntentId,
            },
          });

          // Remove purchased items from cart
          await prisma.cartItem.deleteMany({
            where: { userId: order.userId, eventId: { in: order.items.map((i: OrderRow["items"][number]) => i.eventId) } },
          });

          // Create RSVPs for purchased events (idempotent upsert)
          for (const it of order.items) {
            const ev = it.event;

            // Fulfillment capacity gate:
            let attendanceState: "CONFIRMED" | "WAITLISTED" = "CONFIRMED";

            if (typeof ev.capacity === "number" && ev.capacity > 0) {
              const confirmedCount = await prisma.rSVP.count({
                where: { eventId: ev.id, status: "GOING", attendanceState: "CONFIRMED" },
              });

              if (confirmedCount >= ev.capacity) attendanceState = "WAITLISTED";
            }

            await prisma.rSVP.upsert({
              where: { userId_eventId: { userId: order.userId, eventId: ev.id } },
              update: { status: "GOING", attendanceState },
              create: { userId: order.userId, eventId: ev.id, status: "GOING", attendanceState },
            });
          }

          // Receipt email
          const to =
            order.user.email ??
            session.customer_email ??
            session.customer_details?.email ??
            null;

          if (to) {
            const items = order.items.map((it: OrderRow["items"][number]) => ({
              title: it.event.title,
              url: absoluteUrlFromRequest(req, `/public/events/${encodeURIComponent(it.event.slug)}`),
              unitAmountCents: it.unitAmountCents,
              quantity: it.quantity,
            }));

            await sendPurchaseReceiptEmail({
              to,
              name: order.user.name,
              orderId: order.id,
              items,
              totalCents: order.totalCents,
              idempotencyKey: `receipt:${session.id}`,
            });
          }
        }
      }
    }

    if (evt.type === "checkout.session.expired") {
      const session = evt.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};
      const type = String(meta.type ?? "");
      const orderId = String(meta.orderId ?? "");

      if (type === "EVENT_ORDER" && orderId) {
        await prisma.order.updateMany({
          where: { id: orderId, status: "PENDING" },
          data: { status: "CANCELED" },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook handler error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
