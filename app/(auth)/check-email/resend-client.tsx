"use client";

import { useState } from "react";

function newIdempotencyKey() {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ResendVerificationClient({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function resend() {
    if (!email) return;
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": newIdempotencyKey(),
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.message || "Too many attempts. Please try again later.");
        return;
      }

      setMsg("If an account exists and isn’t verified yet, a new email will be sent.");
    } catch {
      setMsg("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={resend}
        className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60 focus:outline-none focus:ring-4 focus:ring-zinc-300"
        disabled={!email || loading}
      >
        {loading ? "Sending..." : "Resend verification email"}
      </button>

      {msg ? <div className="text-sm text-zinc-700">{msg}</div> : null}
    </div>
  );
}
