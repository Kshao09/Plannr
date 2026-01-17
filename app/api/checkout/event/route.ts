// app/api/checkout/event/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { absoluteUrlFromRequest } from "@/lib/siteUrl";
import { beginIdempotency, finishIdempotency, stableIdempotencyKey } from "@/lib/idempotency";

export const runtime = "nodejs";

async function resolveUser(session: any): Promise<{ id: string; email: string | null; name: string | null } | null> {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
  const email = (su as any)?.email as string | undefined;
  const name = (su as any)?.name as string | undefined;

  if (sessionId) return { id: sessionId, email: email ?? null, name: name ?? null };
  if (!email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  if (!dbUser?.id) return null;
  return { id: dbUser.id, email: dbUser.email ?? null, name: dbUser.name ?? null };
}

async function getOrCreateCustomer(userId: string, email: string | null, name: string | null) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
  if (u?.stripeCustomerId) return u.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: { userId },
  });

  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveUser(session);
  if (!me?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const slug = String(body?.slug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const route = `POST:/api/checkout/event:${slug}`;

  const idem = await beginIdempotency({
    req,
    route,
    userId: me.id,
    ttlSeconds: 60 * 30,
  });

  if (idem.kind === "replay" || idem.kind === "inflight") return idem.response;
  const recordId = idem.kind === "claimed" ? idem.recordId : undefined;

  try {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true, slug: true, title: true, ticketTier: true, priceCents: true, currency: true },
    });

    if (!event) {
      const out = { error: "Event not found" };
      await finishIdempotency({ recordId, statusCode: 404, response: out });
      return NextResponse.json(out, { status: 404 });
    }

    if (String(event.ticketTier).toUpperCase() !== "PREMIUM" || (event.priceCents ?? 0) <= 0) {
      const out = { error: "This event is not purchasable." };
      await finishIdempotency({ recordId, statusCode: 400, response: out });
      return NextResponse.json(out, { status: 400 });
    }

    // Already purchased?
    const already = await prisma.orderItem.findFirst({
      where: { eventId: event.id, order: { userId: me.id, status: "PAID" } as any },
      select: { id: true },
    });

    if (already) {
      const out = { ok: true, alreadyPurchased: true };
      await finishIdempotency({ recordId, statusCode: 200, response: out });
      return NextResponse.json(out);
    }

    const order = await prisma.order.create({
      data: {
        userId: me.id,
        status: "PENDING",
        currency: event.currency ?? "usd",
        totalCents: event.priceCents ?? 0,
        items: { create: { eventId: event.id, unitAmountCents: event.priceCents ?? 0, quantity: 1 } },
      },
      select: { id: true },
    });

    const customerId = await getOrCreateCustomer(me.id, me.email, me.name);

    const successUrl = absoluteUrlFromRequest(req, `/public/events/${encodeURIComponent(event.slug)}?checkout=success&order=${encodeURIComponent(order.id)}`);
    const cancelUrl = absoluteUrlFromRequest(req, `/public/events/${encodeURIComponent(event.slug)}?checkout=cancel&order=${encodeURIComponent(order.id)}`);

    const stripeIdemKey = stableIdempotencyKey({ purpose: "event_checkout", userId: me.id, orderId: order.id });

    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: event.currency ?? "usd",
              unit_amount: event.priceCents ?? 0,
              product_data: { name: event.title, metadata: { eventId: event.id, slug: event.slug } },
            },
            quantity: 1,
          },
        ],
        metadata: { type: "EVENT_ORDER", orderId: order.id, userId: me.id },
        payment_intent_data: { metadata: { type: "EVENT_ORDER", orderId: order.id, userId: me.id } },
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
      },
      { idempotencyKey: stripeIdemKey }
    );

    await prisma.order.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: checkout.id } });

    const out = { ok: true, url: checkout.url, orderId: order.id };
    await finishIdempotency({ recordId, statusCode: 200, response: out });
    return NextResponse.json(out);
  } catch (err: any) {
    const out = { error: err?.message ?? "Checkout failed" };
    await finishIdempotency({ recordId, statusCode: 500, response: out });
    return NextResponse.json(out, { status: 500 });
  }
}
