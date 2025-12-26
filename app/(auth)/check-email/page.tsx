// app/(auth)/check-email/page.tsx
import Link from "next/link";

type SP = { email?: string | string[]; sent?: string | string[] };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  const sent = typeof sp.sent === "string" ? sp.sent : "1";

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-semibold text-white">Check your email</h1>

        {sent === "1" ? (
          <p className="mt-2 text-sm text-zinc-400">
            We sent a verification link{email ? ` to ${email}` : ""}. Click it to verify.
          </p>
        ) : (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Email couldn’t be sent (SMTP not configured). Check your server terminal —
            the verification link was printed there.
          </div>
        )}

        <div className="mt-6">
          <Link className="text-zinc-200 hover:underline" href="/login">
            Back to log in
          </Link>
        </div>
      </div>
    </main>
  );
}
