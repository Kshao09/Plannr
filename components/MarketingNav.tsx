import Link from "next/link";
import { auth } from "@/auth";
import { headers } from "next/headers";
import SignOutButton from "@/components/SignOutButton";

export default async function MarketingNav() {
  const h = await headers();
  const pathname = h.get("x-pathname");
  if (pathname === "/app/dashboard") return null;

  const session = await auth();
  const isLoggedIn = !!session?.user;

  const role = (session?.user as any)?.role as string | undefined;
  const isOrganizer = role === "ORGANIZER";

  return (
    <div className="sticky top-0 z-50 w-full border-b border-zinc-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-900">
          <span className="bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
            Plannr
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/public/events"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 hover:border-zinc-300"
              >
                Browse
              </Link>

              {isOrganizer ? (
                <Link
                  href="/app/organizer/create"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Create
                </Link>
              ) : null}

              <Link
                href="/app/saved"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 hover:border-zinc-300"
              >
                Saved
              </Link>

              <SignOutButton className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-60" />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-blue hover:border-zinc-300"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
