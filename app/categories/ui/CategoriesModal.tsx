"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Row = {
  id: string;
  title: string;
  slug: string;
  startAt: string;
  locationName?: string | null;
  image?: string | null;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CategoriesModal() {
  const router = useRouter();
  const sp = useSearchParams();
  const initial = sp.get("q") ?? "";

  const [q, setQ] = useState(initial);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  function close() {
    router.push("/");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(nextQ: string) {
    const cleaned = nextQ.trim();
    if (!cleaned) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/events?q=${encodeURIComponent(cleaned)}&take=12`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => []);
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initial) runSearch(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={close}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative z-10 w-[min(980px,96vw)] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/85 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <div className="text-lg font-semibold text-white">Search events</div>
            <div className="mt-0.5 text-xs text-zinc-400">
              Type keywords (rock, food, AI, chess...) and press Enter.
            </div>
          </div>

          <button
            onClick={close}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(q);
            }}
            className="flex flex-col gap-2 md:flex-row md:items-center"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events…"
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
            />
            <button
              type="submit"
              className="rounded-2xl border border-white/15 bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/15 to-cyan-500/20 px-5 py-3 text-sm font-semibold text-white hover:border-white/25"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </form>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((e) => (
              <Link
                key={e.id}
                href={`/public/events/${e.slug}`}   // ✅ FIXED
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-white/20 hover:bg-white/10"
              >
                <div className="relative h-36 w-full">
                  <Image
                    src={e.image ?? "/images/ai001.png"}
                    alt={e.title}
                    fill
                    sizes="(max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                </div>

                <div className="p-4">
                  <div className="font-semibold line-clamp-2 text-white">{e.title}</div>
                  <div className="mt-2 text-sm text-zinc-400">
                    {formatWhen(e.startAt)}
                    {e.locationName ? ` • ${e.locationName}` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {!loading && rows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              No results yet. Try: <span className="text-white">rock</span>,{" "}
              <span className="text-white">food</span>, <span className="text-white">AI</span>,{" "}
              <span className="text-white">chess</span>.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
