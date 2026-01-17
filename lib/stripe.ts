// lib/stripe.ts
import "server-only";
import Stripe from "stripe";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`[stripe] Missing ${name}`);
  return v.trim();
}

/**
 * Create the Stripe client lazily so dev builds don’t crash at import time
 * when env vars aren't loaded yet.
 */
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;

  // Keep your current behavior: warn at import-time, but throw when actually used.
  if (!key || !key.trim()) {
    throw new Error("[stripe] Missing STRIPE_SECRET_KEY");
  }

  // Reuse in dev to avoid multiple instances on hot reload.
  const g = globalThis as unknown as { __stripe?: Stripe };
  if (!g.__stripe) {
    g.__stripe = new Stripe(key.trim(), {
      apiVersion: "2024-06-20" as any,
    });
  }
  return g.__stripe;
}

/**
 * Exported Stripe client (getter-style via Proxy)
 * so importing modules can keep using `stripe.*`.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe() as any;
    return client[prop];
  },
});

/**
 * ✅ This is what your webhook route expects:
 *   import { stripe, stripeWebhookSecret } from "@/lib/stripe";
 */
export function stripeWebhookSecret() {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}
