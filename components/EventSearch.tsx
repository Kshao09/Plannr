"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function EventSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isOrganizer = status === "authenticated" && role === "ORGANIZER";

  const initial = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initial);

  // Debounce URL updates
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));

      if (q.trim()) params.set("q", q.trim());
      else params.delete("q");

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const inputCls =
    "flex-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 " +
    "placeholder:text-zinc-400 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10";

  // ✅ Dark theme button (no white background)
  const createBtnCls =
    "w-auto shrink-0 whitespace-nowrap rounded-2xl border border-white/10 bg-white/5 px-5 py-3 " +
    "text-sm font-semibold text-zinc-100 shadow-sm transition hover:bg-white/10 hover:border-white/20 " +
    "active:translate-y-[1px]";

  return (
    <div className="mt-4 flex items-center gap-4">
      <input
        className={inputCls}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search events..."
      />

      {isOrganizer && (
        <Link href="/create" className={createBtnCls}>
          Create Event
        </Link>
      )}
    </div>
  );
}
