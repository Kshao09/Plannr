// app/forgot-password/ForgotPasswordForm.tsx
"use client";

import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-white/10 p-4 text-sm">
        If an account exists for <b>{email}</b>, a reset link has been sent.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button
        className="w-full rounded-xl bg-white/10 px-3 py-2 hover:bg-white/15 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
