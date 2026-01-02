"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const token = useMemo(() => sp.get("token") || "", [sp]);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!token) return setMsg("Missing token. Please use the link from your email.");
    if (pw.length < 8) return setMsg("Password must be at least 8 characters.");
    if (pw !== pw2) return setMsg("Passwords do not match.");

    start(async () => {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setMsg(data?.error || "Reset failed. Your link may be expired.");
        return;
      }

      setMsg("Password updated. Redirecting to sign in…");
      setTimeout(() => router.push("/signin"), 800);
    });
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <p className="mt-2 text-sm text-zinc-300">
        Enter a new password for your account.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <div>
          <label className="text-sm font-medium">New password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Confirm password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {msg && <div className="text-sm text-zinc-200">{msg}</div>}

        <button
          disabled={pending}
          className="w-full rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </main>
  );
}
