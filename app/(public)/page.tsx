import Link from "next/link";
import { auth } from "@/auth";

export default async function LandingPage() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-10">
        <h1 className="text-5xl font-bold tracking-tight text-white">
          Plannr
        </h1>
        <p className="mt-4 text-zinc-300">
          Create and discover events. Organizers publish, members RSVP and track.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-white px-5 py-3 font-medium text-black hover:opacity-90"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl bg-white px-5 py-3 font-medium text-black hover:opacity-90"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-white/15 bg-transparent px-5 py-3 font-medium text-white hover:bg-white/5"
              >
                Sign up
              </Link>
            </>
          )}

          <Link
            href="/events"
            className="rounded-xl border border-white/15 bg-transparent px-5 py-3 font-medium text-white hover:bg-white/5"
          >
            Browse events
          </Link>
        </div>
      </div>
    </main>
  );
}
