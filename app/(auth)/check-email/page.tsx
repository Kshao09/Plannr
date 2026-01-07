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
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-zinc-900">Check your email</h1>

        {resent === "1" && sent === "1" ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Verification email resent.
          </div>
        ) : null}

        {resent === "1" && sent === "0" ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Email couldn’t be sent (check server logs / email config).
          </div>
        ) : null}

        {err ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {err}
          </div>
        ) : null}

        {sent === "1" ? (
          <p className="mt-2 text-sm text-zinc-600">
            We sent a verification link{email ? ` to ${email}` : ""}. Click it to verify.
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">No email was sent. You can resend below.</p>
        )}

        <div className="mt-6">
          <ResendVerificationClient email={email} />
        </div>

        <div className="mt-6">
          <Link className="font-semibold text-zinc-900 hover:underline" href="/login">
            Back to log in
          </Link>
        </div>
      </div>
    </main>
  );
}
