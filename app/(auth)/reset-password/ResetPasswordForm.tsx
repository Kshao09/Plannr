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

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="mt-2 text-sm text-zinc-400">Choose a new password.</p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2"
          type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <input className="w-full rounded-xl border border-white/10 bg-transparent px-3 py-2"
          type="password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} />

        <button className="w-full rounded-xl bg-white/10 px-3 py-2 hover:bg-white/15 disabled:opacity-50"
          disabled={loading}>
          {loading ? "Updating..." : "Update password"}
        </button>
        {msg ? <div className="text-sm text-zinc-200">{msg}</div> : null}
      </form>
    </div>
  );
}
