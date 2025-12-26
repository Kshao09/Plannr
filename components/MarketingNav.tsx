import Link from "next/link";

export default function MarketingNav() {
  return (
    <div className="sticky top-0 z-50 w-screen border-b border-white/10 bg-[#050711]/85 backdrop-blur">
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-white">
          Plannr
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
