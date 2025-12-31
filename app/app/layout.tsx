import Link from "next/link";
import { auth, signOut } from "@/auth";
import OrganizerCreateLink from "@/components/OrganizerCreateLink";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

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

            {session?.user?.role === "ORGANIZER" ? <OrganizerCreateLink /> : null}

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-black hover:opacity-90">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
