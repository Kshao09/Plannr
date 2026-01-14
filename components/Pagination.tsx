"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function go(nextPage: number) {
    const clamped = Math.max(1, Math.min(totalPages || 1, nextPage));
    const params = new URLSearchParams(sp.toString());
    if (clamped <= 1) params.delete("page");
    else params.set("page", String(clamped));

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const total = Math.max(1, totalPages || 1);
  const current = Math.max(1, Math.min(total, page || 1));

  if (total <= 1) return null;

  const canPrev = current > 1;
  const canNext = current < total;

  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <button
        disabled={!canPrev}
        onClick={() => go(current - 1)}
        className={[
          "rounded-xl border px-4 py-2 text-sm transition",
          canPrev
            ? "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
            : "cursor-not-allowed border-zinc-200 bg-white text-zinc-400",
        ].join(" ")}
      >
        ← Prev
      </button>

      <div className="flex items-center gap-2">
        {start > 1 && (
          <>
            <PageButton active={current === 1} onClick={() => go(1)} label="1" />
            {start > 2 && <span className="text-zinc-400">…</span>}
          </>
        )}

        {pages.map((p) => (
          <PageButton
            key={p}
            active={p === current}
            onClick={() => go(p)}
            label={String(p)}
          />
        ))}

        {end < total && (
          <>
            {end < total - 1 && <span className="text-zinc-400">…</span>}
            <PageButton
              active={current === total}
              onClick={() => go(total)}
              label={String(total)}
            />
          </>
        )}
      </div>

      <button
        disabled={!canNext}
        onClick={() => go(current + 1)}
        className={[
          "rounded-xl border px-4 py-2 text-sm transition",
          canNext
            ? "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
            : "cursor-not-allowed border-zinc-200 bg-white text-zinc-400",
        ].join(" ")}
      >
        Next →
      </button>
    </div>
  );
}

function PageButton({
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
        "h-9 min-w-9 rounded-xl border px-3 text-sm transition",
        active
          ? "border-zinc-300 bg-zinc-100 text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
