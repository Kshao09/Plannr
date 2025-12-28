// app/(public)/events/page.tsx  (or app/events/page.tsx)
import Link from "next/link";
import { getEventFilterOptions, getEvents } from "@/lib/events";
import EventsFilters from "@/components/EventFilters";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function toArrayParam(v: string | string[] | undefined) {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap((x) => x.split(",")).filter(Boolean);
  return v.split(",").filter(Boolean);
}

export default async function EventsPage({
  searchParams,
}: {
  // ✅ works in Next 15 (Promise) AND Next 14 (plain object)
  searchParams: Promise<SP> | SP;
}) {
  const sp = await Promise.resolve(searchParams); // ✅ unwrap

  const page = Number(sp.page ?? "1") || 1;
  const pageSize = Number(sp.pageSize ?? "8") || 8;

  const q = (sp.q as string) ?? "";

  const range = ((sp.range as string) ?? "upcoming") as any;
  const from = (sp.from as string) || undefined;
  const to = (sp.to as string) || undefined;

  const loc = toArrayParam(sp.loc);
  const category = toArrayParam(sp.category);

  const [data, options] = await Promise.all([
    getEvents({ page, pageSize, q, range, from, to, loc, category }),
    getEventFilterOptions(),
  ]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10"
          >
            ←
          </Link>
          <h1 className="text-4xl font-semibold tracking-tight">Events</h1>
        </div>

        <EventsFilters locations={options.locations} categories={options.categories} />

        <div className="mt-5 space-y-4">
          {data.items.map((e) => (
            <Link
              key={e.id}
              href={`/events/${e.slug}`}
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-6 py-6 hover:bg-white/10"
            >
              <div className="min-w-0">
                <div className="truncate text-xl font-semibold">{e.title}</div>
                <div className="mt-1 text-sm text-white/60">
                  {new Date(e.startAt).toLocaleString()}
                  {e.locationName ? ` • ${e.locationName}` : ""}
                  {e.category ? ` • ${e.category}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-white/60 transition group-hover:text-white">
                View →
              </div>
            </Link>
          ))}

          {data.items.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
              No events match your filters.
            </div>
          )}
        </div>

        <Pagination page={data.page} totalPages={data.totalPages} />

        <div className="mt-3 text-xs text-white/40">
          Showing page {data.page} of {data.totalPages} • {data.total} results
        </div>
      </div>
    </div>
  );
}
