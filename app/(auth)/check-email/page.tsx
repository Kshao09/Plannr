// app/(auth)/check-email/page.tsx
import Link from "next/link";
import ResendVerificationClient from "./resend-client";

type SP = {
  email?: string | string[];
  sent?: string | string[];
  resent?: string | string[];
  err?: string | string[];
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const email = typeof sp.email === "string" ? sp.email : "";
  const sent = typeof sp.sent === "string" ? sp.sent : "1";
  const resent = typeof sp.resent === "string" ? sp.resent : "0";
  const err = typeof sp.err === "string" ? sp.err : "";

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-semibold text-white">Check your email</h1>

        {resent === "1" && sent === "1" ? (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Verification email resent.
          </div>
        ) : null}

        {resent === "1" && sent === "0" ? (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Email couldn’t be sent (check server logs / email config).
          </div>
        ) : null}

        {err ? (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {err}
          </div>
        ) : null}

        {sent === "1" ? (
          <p className="mt-2 text-sm text-zinc-400">
            We sent a verification link{email ? ` to ${email}` : ""}. Click it to verify.
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">
            No email was sent. You can resend below.
          </p>
        )}

        <div className="mt-6">
          <ResendVerificationClient email={email} />
        </div>

        <div className="mt-6">
          <Link className="text-zinc-200 hover:underline" href="/login">
            Back to log in
          </Link>
        </div>
      </div>
    </main>
  );
}
