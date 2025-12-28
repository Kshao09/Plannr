"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-sm transition",
        active
          ? "border-white/20 bg-white/15 text-white"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function EventsFilters({
  locations,
  categories,
}: {
  locations: string[];
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [localQ, setLocalQ] = useState(sp.get("q") ?? "");

  const locSet = useMemo(
    () => new Set((sp.get("loc") ?? "").split(",").filter(Boolean)),
    [sp]
  );
  const catSet = useMemo(
    () => new Set((sp.get("category") ?? "").split(",").filter(Boolean)),
    [sp]
  );

  function pushParams(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(sp.toString());
    // any filter change => reset pagination
    params.set("page", "1");
    mutator(params);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function setParam(key: string, value: string | null) {
    pushParams((params) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
  }

  function toggleMulti(key: "loc" | "category", value: string) {
    pushParams((params) => {
      const current = new Set((params.get(key) ?? "").split(",").filter(Boolean));
      if (current.has(value)) current.delete(value);
      else current.add(value);

      const next = Array.from(current).join(",");
      if (!next) params.delete(key);
      else params.set(key, next);
    });
  }

  function applySearch(q: string) {
    const trimmed = q.trim();
    setParam("q", trimmed ? trimmed : null);
  }

  return (
    <div className="mt-6">
      {/* Search */}
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch(localQ);
            }}
            placeholder="Search events..."
            className="min-w-0 flex-1 bg-transparent text-white/90 outline-none placeholder:text-white/40"
          />

          <button
            onClick={() => applySearch(localQ)}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Search
          </button>

          {/* Only show X when there is input */}
          {localQ.trim().length > 0 && (
            <button
              onClick={() => {
                setLocalQ("");
                pushParams((params) => {
                  params.delete("q");
                });
              }}
              aria-label="Clear search"
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
            >
              X
            </button>
          )}
        </div>
      </div>

      {/* Chips */}
      <div className="mt-4">
        {/* Category + Custom dates on ONE line */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Category chips */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-1 text-sm text-white/50">Category:</div>
              {categories.map((c) => (
                <Chip
                  key={c}
                  active={catSet.has(c)}
                  label={c}
                  onClick={() => toggleMulti("category", c)}
                />
              ))}
            </div>
          )}

          {/* Divider (optional, only shows on md+) */}
          <div className="hidden h-6 w-px bg-white/10 md:block" />

          {/* Custom date range */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/50">Custom dates:</span>

            <input
              type="date"
              defaultValue={sp.get("from") ?? ""}
              onChange={(e) =>
                pushParams((params) => {
                  const v = e.target.value;
                  if (!v) params.delete("from");
                  else params.set("from", v);
                  params.delete("range"); // custom overrides range (safe even if you removed range chips)
                })
              }
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80"
            />

            <span className="text-white/40">to</span>

            <input
              type="date"
              defaultValue={sp.get("to") ?? ""}
              onChange={(e) =>
                pushParams((params) => {
                  const v = e.target.value;
                  if (!v) params.delete("to");
                  else params.set("to", v);
                  params.delete("range");
                })
              }
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
