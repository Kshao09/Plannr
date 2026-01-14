import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { headers } from "next/headers";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";

  let session: any = null;
  try {
    session = await auth();
  } catch (e) {
    console.error("[app/app/layout] auth() crashed:", e);
    session = null;
  }

  const hideHeader = pathname === "/app/dashboard";

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {!hideHeader ? (
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/app/dashboard" className="text-lg font-semibold text-zinc-900">
              Plannr
            </Link>

            <nav className="flex items-center gap-3">
              <Link
                href="/app/dashboard"
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Dashboard
              </Link>

              {session?.user ? (
                <SignOutButton
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Sign out
                </SignOutButton>
              ) : (
                <Link href="/login" className="text-sm text-zinc-700 hover:text-zinc-900">
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>
      ) : null}

      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
