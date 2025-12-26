// app/(auth)/login/page.tsx
import Link from "next/link";
import { signIn } from "@/auth";

type SP = { next?: string | string[]; error?: string | string[] };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const nextRaw = sp?.next;
  const next =
    typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "/dashboard";

  const error = typeof sp?.error === "string" ? sp.error : null;

  const errorText =
    error === "EmailNotVerified"
      ? "Please verify your email before logging in."
      : error === "CredentialsSignin"
      ? "Invalid email or password."
      : error
      ? "Could not sign you in."
      : null;

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-semibold text-white">Log in</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Use your email and password to access your account.
        </p>

        {errorText ? (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorText}
          </div>
        ) : null}

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";

            const email = String(formData.get("email") ?? "")
              .toLowerCase()
              .trim();
            const password = String(formData.get("password") ?? "");

            if (!email || !password) {
              throw new Error("Missing email or password.");
            }

            // If your credentials provider denies unverified users,
            // you can redirect back with ?error=EmailNotVerified from authorize().
            await signIn("credentials", {
              email,
              password,
              redirectTo: next,
            });
          }}
        >
          <input
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
            required
          />

          <button className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black hover:opacity-90">
            Log in
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link className="text-zinc-200 hover:underline" href="/signup">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
