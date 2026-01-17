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
          ? "border-zinc-300 bg-zinc-100 text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function EventsFilters({
  locations,
  categories,
  tiers,
}: {
  locations: string[];
  categories: string[];
  tiers: string[]; // ["FREE","PREMIUM"]
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [localQ, setLocalQ] = useState(sp.get("q") ?? "");

  const catSet = useMemo(
    () => new Set((sp.get("category") ?? "").split(",").filter(Boolean)),
    [sp]
  );

  const tierActive = (sp.get("tier") ?? "").toUpperCase(); // FREE | PREMIUM | ""

  function pushParams(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(sp.toString());

    params.delete("mine");
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

  function toggleMulti(key: "category", value: string) {
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

  function setPriceParam(key: "minPrice" | "maxPrice", raw: string) {
    const v = raw.replace(/[^\d]/g, "");
    pushParams((params) => {
      if (!v) params.delete(key);
      else params.set(key, v);
    });
  }

  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <input
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch(localQ);
            }}
            placeholder="Search events..."
            className="min-w-0 flex-1 bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400"
          />

          <button
            onClick={() => applySearch(localQ)}
            className="shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
          >
            Search
          </button>

          {localQ.trim().length > 0 && (
            <button
              onClick={() => {
                setLocalQ("");
                pushParams((params) => params.delete("q"));
              }}
              aria-label="Clear search"
              className="shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
            >
              X
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-4">
          {tiers?.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-1 text-sm text-zinc-900">Pricing:</div>
              <Chip
                active={tierActive === "FREE"}
                label="Free"
                onClick={() => setParam("tier", tierActive === "FREE" ? null : "FREE")}
              />
              <Chip
                active={tierActive === "PREMIUM"}
                label="Premium"
                onClick={() => setParam("tier", tierActive === "PREMIUM" ? null : "PREMIUM")}
              />
            </div>
          ) : null}

          <div className="hidden h-6 w-px bg-zinc-200 md:block" />

          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-900">Price range ($):</span>
            <input
              inputMode="numeric"
              defaultValue={sp.get("minPrice") ?? ""}
              onChange={(e) => setPriceParam("minPrice", e.target.value)}
              placeholder="min"
              className="w-24 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
            />
            <span className="text-zinc-700">to</span>
            <input
              inputMode="numeric"
              defaultValue={sp.get("maxPrice") ?? ""}
              onChange={(e) => setPriceParam("maxPrice", e.target.value)}
              placeholder="max"
              className="w-24 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
            />
          </div>

          <div className="hidden h-6 w-px bg-zinc-200 md:block" />

          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-1 text-sm text-zinc-900">Category:</div>
              {categories.map((c) => (
                <Chip key={c} active={catSet.has(c)} label={c} onClick={() => toggleMulti("category", c)} />
              ))}
            </div>
          )}

          <div className="hidden h-6 w-px bg-zinc-200 md:block" />

          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-900">Custom dates:</span>

            <input
              type="date"
              defaultValue={sp.get("from") ?? ""}
              onChange={(e) =>
                pushParams((params) => {
                  const v = e.target.value;
                  if (!v) params.delete("from");
                  else params.set("from", v);
                  params.delete("range");
                })
              }
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
            />

            <span className="text-zinc-700">to</span>

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
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
