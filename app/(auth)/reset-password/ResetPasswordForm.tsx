"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!token) return setMsg("Missing token. Please use the link from your email.");
    if (pw.length < 8) return setMsg("Password must be at least 8 characters.");
    if (pw !== pw2) return setMsg("Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Reset failed");

      setMsg("Password updated. Redirecting to sign-in…");
      setTimeout(() => router.push("/login"), 800);
    } catch (e: any) {
      setMsg(e?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70";

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-zinc-900">Reset password</h1>
        <p className="mt-2 text-sm text-zinc-600">Choose a new password.</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            className={input}
            type="password"
            placeholder="New password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <input
            className={input}
            type="password"
            placeholder="Confirm new password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />

          <button
            className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-zinc-300"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update password"}
          </button>

          {msg ? <div className="text-sm text-zinc-700">{msg}</div> : null}
        </form>
      </div>
    </div>
  );
}
