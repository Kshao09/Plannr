import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import OrganizerCreateLink from "@/components/OrganizerCreateLink";
import { signOutAction } from "./_actions/signOutAction";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Never let auth() crash the whole /app segment
  let session: any = null;
  try {
    session = await auth();
  } catch (e) {
    console.error("[app/app/layout] auth() crashed:", e);
    session = null;
  }

  const isOrganizer = session?.user?.role === "ORGANIZER";

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/app/dashboard" className="text-lg font-semibold text-white">
            Plannr
          </Link>

          <nav className="flex items-center gap-3">
            <Link href="/public/events" className="text-sm text-zinc-200 hover:text-white">
              Events
            </Link>

            {isOrganizer ? <OrganizerCreateLink /> : null}

            {session?.user ? (
              <form action={signOutAction}>
                <button className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black hover:opacity-90">
                  Sign out
                </button>
              </form>
            ) : (
              <Link href="/login" className="text-sm text-zinc-200 hover:text-white">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
