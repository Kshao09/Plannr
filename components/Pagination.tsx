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
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <button
        disabled={!canPrev}
        onClick={() => go(page - 1)}
        className={[
          "rounded-xl border px-4 py-2 text-sm transition",
          canPrev
            ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            : "cursor-not-allowed border-white/5 bg-white/5 text-white/30",
        ].join(" ")}
      >
        ← Prev
      </button>

      <div className="flex items-center gap-2">
        {start > 1 && (
          <>
            <PageButton active={page === 1} onClick={() => go(1)} label="1" />
            {start > 2 && <span className="text-white/30">…</span>}
          </>
        )}

        {pages.map((p) => (
          <PageButton
            key={p}
            active={p === page}
            onClick={() => go(p)}
            label={String(p)}
          />
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-white/30">…</span>}
            <PageButton
              active={page === totalPages}
              onClick={() => go(totalPages)}
              label={String(totalPages)}
            />
          </>
        )}
      </div>

      <button
        disabled={!canNext}
        onClick={() => go(page + 1)}
        className={[
          "rounded-xl border px-4 py-2 text-sm transition",
          canNext
            ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            : "cursor-not-allowed border-white/5 bg-white/5 text-white/30",
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
      onClick={onClick}
      className={[
        "h-9 min-w-9 rounded-xl border px-3 text-sm transition",
        active
          ? "border-white/20 bg-white/15 text-white"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
