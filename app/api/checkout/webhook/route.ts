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

function asString(x: unknown) {
  return typeof x === "string" ? x : "";
}

function toDateFromUnixSeconds(sec: number | null | undefined) {
  if (typeof sec !== "number") return null;
  const ms = sec * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function resolveUserIdFromCustomerId(customerId: string): Promise<string | null> {
  // Fast path: we already stored stripeCustomerId on user
  const byDb = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (byDb?.id) return byDb.id;

  // Fallback: customer metadata.userId (because you set it on create)
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !("deleted" in customer) && customer.metadata?.userId) {
      const userId = String(customer.metadata.userId);

      // Best-effort: sync stripeCustomerId if missing
      await prisma.user.updateMany({
        where: { id: userId, stripeCustomerId: null },
        data: { stripeCustomerId: customerId },
      });

      return userId;
    }
  } catch {
    // ignore
  }

  return null;
}

async function upsertSubscriptionForUser(userId: string, sub: Stripe.Subscription) {
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;

  // ✅ avoid TS collisions by using "any" access
  const currentPeriodEndSec = (sub as any).current_period_end as number | undefined;
  const currentPeriodEnd = toDateFromUnixSeconds(currentPeriodEndSec);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      status: sub.status,
      currentPeriodEnd,
    },
    update: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      status: sub.status,
      currentPeriodEnd,
    },
  });
}

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
    // -------------------------
    // ✅ 1) Checkout completed
    // -------------------------
    if (evt.type === "checkout.session.completed") {
      const session = evt.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};
      const type = String(meta.type ?? "");

      // -------------------------
      // A) Event Orders
      // -------------------------
      if (type === "EVENT_ORDER") {
        const orderId = String(meta.orderId ?? "");

        if (orderId) {
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

          if (!order) return NextResponse.json({ received: true });

          if (order.status !== "PAID") {
            const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

            await prisma.order.update({
              where: { id: order.id },
              data: {
                status: "PAID",
                stripeCheckoutSessionId: session.id,
                stripePaymentIntentId: paymentIntentId,
              },
            });

            await prisma.cartItem.deleteMany({
              where: { userId: order.userId, eventId: { in: order.items.map((i) => i.eventId) } },
            });

            for (const it of order.items) {
              const ev = it.event;

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

            const to = order.user.email ?? session.customer_email ?? session.customer_details?.email ?? null;

            if (to) {
              const items = order.items.map((it) => ({
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

        return NextResponse.json({ received: true });
      }

      // -------------------------
      // B) Subscriptions (NEW)
      // -------------------------
      if (type === "SUBSCRIPTION") {
        const metaUserId = asString(meta.userId);
        const customerId = typeof session.customer === "string" ? session.customer : null;
        const subId = typeof session.subscription === "string" ? session.subscription : null;

        // If metadata is missing, try to map customer -> user
        const userId =
          metaUserId ||
          (customerId ? await resolveUserIdFromCustomerId(customerId) : "");

        if (!userId || !subId) {
          return NextResponse.json({ received: true, note: "missing userId/subscription" });
        }

        if (customerId) {
          await prisma.user.updateMany({
            where: { id: userId },
            data: { stripeCustomerId: customerId },
          });
        }

        const sub = await stripe.subscriptions.retrieve(subId, {
          expand: ["items.data.price"],
        });

        await upsertSubscriptionForUser(userId, sub);
        return NextResponse.json({ received: true, ok: true, kind: "subscription" });
      }

      return NextResponse.json({ received: true });
    }

    // -------------------------
    // ✅ 2) Checkout expired
    // -------------------------
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

      return NextResponse.json({ received: true });
    }

    // -------------------------
    // ✅ 3) Subscription lifecycle updates
    // -------------------------
    if (
      evt.type === "customer.subscription.created" ||
      evt.type === "customer.subscription.updated" ||
      evt.type === "customer.subscription.deleted"
    ) {
      const sub = evt.data.object as Stripe.Subscription;

      const customerId = typeof sub.customer === "string" ? sub.customer : null;
      if (!customerId) return NextResponse.json({ received: true });

      const userId = await resolveUserIdFromCustomerId(customerId);
      if (!userId) return NextResponse.json({ received: true });

      await upsertSubscriptionForUser(userId, sub);
      return NextResponse.json({ received: true, ok: true, kind: "subscription_event" });
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook handler error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
