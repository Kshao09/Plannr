// app/api/checkout/subscription/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { absoluteUrlFromRequest } from "@/lib/siteUrl";
import { beginIdempotency, finishIdempotency } from "@/lib/idempotency";

export const runtime = "nodejs";

async function resolveUser(
  session: any
): Promise<{ id: string; email: string | null; name: string | null } | null> {
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
    metadata: { userId }, // helps webhook map customer -> user
  });

  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveUser(session);
  if (!me?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const route = `POST:/api/checkout/subscription`;
  const idem = await beginIdempotency({ req, route, userId: me.id, ttlSeconds: 60 * 10 });
  if (idem.kind === "replay" || idem.kind === "inflight") return idem.response;

  // recordId exists when claimed; use it to make Stripe idempotency per-attempt
  const recordId = idem.kind === "claimed" ? idem.recordId : undefined;

  try {
    const body = await req.json().catch(() => ({} as any));
    const priceIdFromBody = typeof body?.priceId === "string" ? body.priceId : "";
    const priceId = priceIdFromBody || (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "");

    if (!priceId) {
      const out = { error: "Missing Price ID. Set NEXT_PUBLIC_STRIPE_PRICE_PRO or pass priceId." };
      await finishIdempotency({ recordId, statusCode: 400, response: out });
      return NextResponse.json(out, { status: 400 });
    }

    const customerId = await getOrCreateCustomer(me.id, me.email, me.name);

    const successUrl = absoluteUrlFromRequest(req, "/app/profile?sub=success");
    const cancelUrl = absoluteUrlFromRequest(req, "/app/profile?sub=cancel");

    // ✅ IMPORTANT: Stripe idempotency should be per-request-attempt
    // This prevents duplicates on retries, but allows future upgrades after cancel, and works across localhost/vercel.
    const stripeIdemKey = recordId ? `sub_checkout:${recordId}` : undefined;

    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,

        metadata: {
          type: "SUBSCRIPTION",
          userId: me.id,
          priceId,
        },

        subscription_data: {
          metadata: {
            userId: me.id,
            priceId,
          },
        },
      },
      stripeIdemKey ? { idempotencyKey: stripeIdemKey } : undefined
    );

    const out = { ok: true, url: checkout.url };
    await finishIdempotency({ recordId, statusCode: 200, response: out });
    return NextResponse.json(out);
  } catch (err: any) {
    const out = { error: err?.message ?? "Checkout failed" };
    await finishIdempotency({ recordId, statusCode: 500, response: out });
    return NextResponse.json(out, { status: 500 });
  }
}
