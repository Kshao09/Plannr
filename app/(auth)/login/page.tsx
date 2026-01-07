import Link from "next/link";
import { redirect } from "next/navigation";
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
    typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "/app/dashboard";

  const error = typeof sp?.error === "string" ? sp.error : null;

  const errorText =
    error === "EmailNotVerified"
      ? "Please verify your email before logging in."
      : error === "EmailNotFound"
      ? "Email not found."
      : error === "InvalidCredentials" || error === "CredentialsSignin" || error === "credentials"
      ? "Invalid email or password."
      : error
      ? "Could not sign you in."
      : null;

  const card =
    "rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]";
  const input =
    "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70";
  const primaryBtn =
    "w-full rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-300";

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className={card}>
        <h1 className="text-2xl font-semibold text-zinc-900">Log in</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Use your email and password to access your account.
        </p>

        {errorText ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorText}
          </div>
        ) : null}

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";

            const email = String(formData.get("email") ?? "").toLowerCase().trim();
            const password = String(formData.get("password") ?? "");

            if (!email || !password) {
              redirect(`/login?next=${encodeURIComponent(next)}&error=InvalidCredentials`);
            }

            try {
              await signIn("credentials", {
                email,
                password,
                redirectTo: next,
              });
            } catch (err: any) {
              if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;

              const code = err?.cause?.code || err?.code || err?.type || "CredentialsSignin";
              redirect(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(code)}`);
            }
          }}
        >
          <input
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            className={input}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className={input}
            required
          />

          <button className={primaryBtn}>Log in</button>
        </form>

        <div className="mt-4">
          <Link
            href="/forgot-password"
            className="text-sm text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
          >
            Forgot password?
          </Link>
        </div>

        <p className="mt-4 text-sm text-zinc-600">
          Don&apos;t have an account?{" "}
          <Link className="font-semibold text-zinc-900 hover:underline" href="/signup">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
