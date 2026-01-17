// app/api/checkout/subscription/route.ts
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

  const dbUser = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
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

  const body = await req.json().catch(() => ({}));
  const priceId = String(body?.priceId ?? "").trim();
  if (!priceId) return NextResponse.json({ error: "Missing priceId" }, { status: 400 });

  const route = `POST:/api/checkout/subscription:${priceId}`;

  const idem = await beginIdempotency({ req, route, userId: me.id, ttlSeconds: 60 * 30 });
  if (idem.kind === "replay" || idem.kind === "inflight") return idem.response;
  const recordId = idem.kind === "claimed" ? idem.recordId : undefined;

  try {
    const customerId = await getOrCreateCustomer(me.id, me.email, me.name);

    const successUrl = absoluteUrlFromRequest(req, `/app/profile?sub=success`);
    const cancelUrl = absoluteUrlFromRequest(req, `/app/profile?sub=cancel`);

    const stripeIdemKey = stableIdempotencyKey({ purpose: "subscription_checkout", userId: me.id, priceId });

    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { type: "SUBSCRIPTION", userId: me.id, priceId },
      },
      { idempotencyKey: stripeIdemKey }
    );

    const out = { ok: true, url: checkout.url };
    await finishIdempotency({ recordId, statusCode: 200, response: out });
    return NextResponse.json(out);
  } catch (err: any) {
    const out = { error: err?.message ?? "Subscription checkout failed" };
    await finishIdempotency({ recordId, statusCode: 500, response: out });
    return NextResponse.json(out, { status: 500 });
  }
}
