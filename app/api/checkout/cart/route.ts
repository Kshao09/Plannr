// app/api/checkout/cart/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { absoluteUrlFromRequest } from "@/lib/siteUrl";
import { beginIdempotency, finishIdempotency, stableIdempotencyKey } from "@/lib/idempotency";

export const runtime = "nodejs";

type ResolvedUser = { id: string; email: string | null; name: string | null };

type CartRow = {
  quantity: number | null;
  event: {
    id: string;
    slug: string;
    title: string;
    ticketTier: string;
    priceCents: number | null;
    currency: string | null;
  };
};

type RawItem = {
  eventId: string;
  slug: string;
  title: string;
  quantity: number;
  unitAmountCents: number;
  currency: string;
};

type PaidRow = { eventId: string };

async function resolveUser(session: any): Promise<ResolvedUser | null> {
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
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
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

  // DB-backed HTTP idempotency (uses Idempotency-Key header)
  const idem = await beginIdempotency({
    req,
    route: "POST:/api/checkout/cart",
    userId: me.id,
    ttlSeconds: 60 * 30,
  });

  if (idem.kind === "replay" || idem.kind === "inflight") return idem.response;
  const recordId = idem.kind === "claimed" ? idem.recordId : undefined;

  try {
    const cart = (await prisma.cartItem.findMany({
      where: { userId: me.id },
      select: {
        quantity: true,
        event: {
          select: { id: true, slug: true, title: true, ticketTier: true, priceCents: true, currency: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })) as CartRow[];

    const rawItems: RawItem[] = cart
      .filter((c: CartRow) => String(c.event.ticketTier).toUpperCase() === "PREMIUM" && (c.event.priceCents ?? 0) > 0)
      .map((c: CartRow): RawItem => ({
        eventId: c.event.id,
        slug: c.event.slug,
        title: c.event.title,
        quantity: Math.max(1, Math.floor((c.quantity ?? 1) || 1)),
        unitAmountCents: c.event.priceCents ?? 0,
        currency: c.event.currency ?? "usd",
      }));

    if (rawItems.length === 0) {
      const out = { error: "Cart has no premium items." };
      await finishIdempotency({ recordId, statusCode: 400, response: out });
      return NextResponse.json(out, { status: 400 });
    }

    const currency = rawItems[0].currency;
    if (rawItems.some((x: RawItem) => x.currency !== currency)) {
      const out = { error: "Mixed currencies not supported." };
      await finishIdempotency({ recordId, statusCode: 400, response: out });
      return NextResponse.json(out, { status: 400 });
    }

    // Don’t charge again for already-paid items
    const paid = (await prisma.orderItem.findMany({
      where: {
        eventId: { in: rawItems.map((x: RawItem) => x.eventId) },
        order: { is: { userId: me.id, status: "PAID" } },
      },
      select: { eventId: true },
    })) as PaidRow[];

    const paidSet = new Set<string>(paid.map((p: PaidRow) => p.eventId));
    const items: RawItem[] = rawItems.filter((x: RawItem) => !paidSet.has(x.eventId));

    if (items.length === 0) {
      const out = { ok: true, alreadyPurchased: true };
      await finishIdempotency({ recordId, statusCode: 200, response: out });
      return NextResponse.json(out);
    }

    const totalCents = items.reduce(
      (sum: number, it: RawItem) => sum + it.unitAmountCents * it.quantity,
      0
    );

    if (totalCents <= 0) {
      const out = { error: "Invalid total." };
      await finishIdempotency({ recordId, statusCode: 400, response: out });
      return NextResponse.json(out, { status: 400 });
    }

    // Create Order
    const order = await prisma.order.create({
      data: {
        userId: me.id,
        status: "PENDING",
        currency,
        totalCents,
        items: {
          create: items.map((it: RawItem) => ({
            eventId: it.eventId,
            unitAmountCents: it.unitAmountCents,
            quantity: it.quantity,
          })),
        },
      },
      select: { id: true },
    });

    const customerId = await getOrCreateCustomer(me.id, me.email, me.name);

    const successUrl = absoluteUrlFromRequest(req, `/app/cart?checkout=success&order=${encodeURIComponent(order.id)}`);
    const cancelUrl = absoluteUrlFromRequest(req, `/app/cart?checkout=cancel&order=${encodeURIComponent(order.id)}`);

    // Stripe idempotency key (stable per order)
    const stripeIdemKey = stableIdempotencyKey({ purpose: "cart_checkout", userId: me.id, orderId: order.id });

    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer: customerId,
        line_items: items.map((it: RawItem) => ({
          price_data: {
            currency,
            unit_amount: it.unitAmountCents,
            product_data: { name: it.title, metadata: { eventId: it.eventId, slug: it.slug } },
          },
          quantity: it.quantity,
        })),
        metadata: {
          type: "EVENT_ORDER",
          orderId: order.id,
          userId: me.id,
        },
        payment_intent_data: { metadata: { type: "EVENT_ORDER", orderId: order.id, userId: me.id } },
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
      },
      { idempotencyKey: stripeIdemKey }
    );

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: checkout.id },
    });

    const out = { ok: true, url: checkout.url, orderId: order.id };
    await finishIdempotency({ recordId, statusCode: 200, response: out });
    return NextResponse.json(out);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    const out = { error: message };
    await finishIdempotency({ recordId, statusCode: 500, response: out });
    return NextResponse.json(out, { status: 500 });
  }
}
