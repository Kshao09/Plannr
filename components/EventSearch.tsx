"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function EventSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read q from URL
  const urlQ = searchParams.get("q") ?? "";

  // Local input state
  const [q, setQ] = useState(urlQ);

  // Keep input synced when user navigates (back/forward) or URL changes
  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  // Convert searchParams to a stable string so it can be used in deps safely
  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => {
      const cleaned = q.trim();

      // Optional: don’t search until 2 chars
      // if (cleaned.length > 0 && cleaned.length < 2) return;

      // If URL already matches, do nothing
      if (cleaned === urlQ) return;

      const params = new URLSearchParams(searchParamsString);

      if (cleaned) params.set("q", cleaned);
      else params.delete("q");

      // Optional: reset pagination
      // params.delete("page");

      startTransition(() => {
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 250);

    return () => clearTimeout(t);
  }, [q, urlQ, pathname, router, searchParamsString, startTransition]);

  return (
    <div className="mb-4 flex items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search events..."
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-zinc-100
                   placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
      />

      {q ? (
        <button
          type="button"
          onClick={() => setQ("")}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200
                     transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          disabled={isPending}
        >
          Clear
        </button>
      ) : null}

      <span className="text-sm text-zinc-500">
        {isPending ? "Searching..." : ""}
      </span>
    </div>
  );
}
