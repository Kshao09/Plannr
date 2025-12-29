import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function MarketingNav() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  const role = (session?.user as any)?.role as string | undefined;
  const isOrganizer = role === "ORGANIZER";

  return (
    <div className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#050711]/75 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="text-lg font-semibold">
          <span className="bg-gradient-to-r from-fuchsia-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            Plannr
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/public/events"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/25"
              >
                Browse
              </Link>

              {isOrganizer ? (
                <Link
                  href="/create"
                  className="rounded-xl border border-white/15 bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/15 to-cyan-500/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/25"
                >
                  Create
                </Link>
              ) : null}

              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/25"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/25"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="rounded-xl border border-white/15 bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/15 to-cyan-500/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/25"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
