// app/app/cart/CheckoutCartButton.tsx
"use client";

import { useRef, useState } from "react";

function makeIdemKey() {
  // Prefer UUID if available, otherwise fallback
  const c: any = globalThis.crypto as any;
  if (c?.randomUUID) return c.randomUUID();
  return `idem_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function CheckoutCartButton() {
  const idemRef = useRef<string>(makeIdemKey());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onCheckout() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idemRef.current,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Checkout failed");

      if (data?.alreadyPurchased) {
        setErr("You already purchased all premium items in your cart.");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("Missing checkout URL");
    } catch (e: any) {
      setErr(e?.message ?? "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        disabled={loading}
        onClick={onCheckout}
        className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Checkout"}
      </button>

      {err ? <div className="mt-3 text-sm font-semibold text-rose-700">{err}</div> : null}
    </div>
  );
}
