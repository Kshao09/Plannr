import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type RangeKey = "all" | "today" | "week" | "month" | "upcoming";
export type TicketTier = "FREE" | "PREMIUM";

export type EventsQuery = {
  page: number;
  pageSize: number;
  q?: string;

  range?: RangeKey;
  from?: string;
  to?: string;

  loc?: string[] | string;
  city?: string[] | string;
  category?: string[] | string;

  tier?: string[] | string;

  // ✅ NEW: integer dollars range filters
  minPrice?: string;
  maxPrice?: string;

  organizerId?: string;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseLocalDateStart(ymd: string) {
  return new Date(`${ymd}T00:00:00`);
}
function parseLocalDateEnd(ymd: string) {
  return new Date(`${ymd}T23:59:59.999`);
}

function toArray(v?: string[] | string) {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean) : [v].filter(Boolean);
}

function dollarsToCents(s: string | undefined) {
  if (!s) return null;
  const n = Number(String(s).replace(/[^\d]/g, ""));
  if (!Number.isFinite(n)) return null;
  const int = Math.floor(n);
  if (int < 0) return null;
  return int * 100;
}

function computeDateWindow(input: Pick<EventsQuery, "range" | "from" | "to">) {
  const now = new Date();

  if (input.from || input.to) {
    const from = input.from ? parseLocalDateStart(input.from) : undefined;
    const to = input.to ? parseLocalDateEnd(input.to) : undefined;
    return { from, to };
  }

  switch (input.range) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week": {
      const from = startOfDay(now);
      const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
      return { from, to };
    }
    case "month": {
      const from = startOfDay(now);
      const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));
      return { from, to };
    }
    case "upcoming":
      return { from: now, to: undefined };
    case "all":
    default:
      return { from: undefined, to: undefined };
  }
}

export async function getEvents(query: EventsQuery) {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(50, Math.max(5, query.pageSize || 8));
  const skip = (page - 1) * pageSize;

  const { from, to } = computeDateWindow(query);

  const where: any = {};

  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { locationName: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  if (from || to) {
    where.startAt = {};
    if (from) where.startAt.gte = from;
    if (to) where.startAt.lte = to;
  }

  const locValues = toArray(query.loc).concat(toArray(query.city));
  if (locValues.length) {
    where.locationName = { in: Array.from(new Set(locValues)) };
  }

  const catValues = toArray(query.category);
  if (catValues.length) {
    where.category = { in: Array.from(new Set(catValues)) };
  }

  const tiers = toArray(query.tier).map((x) => String(x).toUpperCase());
  if (tiers.length) {
    where.ticketTier = { in: Array.from(new Set(tiers)) };
  }

  // ✅ NEW: price range filter (stored as cents)
  const minCents = dollarsToCents(query.minPrice);
  const maxCents = dollarsToCents(query.maxPrice);

  if (minCents != null || maxCents != null) {
    where.priceCents = {};
    if (minCents != null) where.priceCents.gte = minCents;
    if (maxCents != null) where.priceCents.lte = maxCents;
  }

  if (query.organizerId) {
    where.organizerId = query.organizerId;
  }

  const [total, items] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { startAt: "asc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        startAt: true,
        endAt: true,
        locationName: true,
        address: true,
        category: true,
        ticketTier: true,
        priceCents: true, // ✅ NEW
        currency: true,
        image: true,
        organizer: { select: { name: true } },
      } as any,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items, total, page, pageSize, totalPages };
}

type LocRow = Prisma.EventGetPayload<{ select: { locationName: true } }>;
type CatRow = Prisma.EventGetPayload<{ select: { category: true } }>;

export async function getEventFilterOptions() {
  const [locRows, catRows]: [LocRow[], CatRow[]] = await Promise.all([
    prisma.event.findMany({
      where: { locationName: { not: null } },
      distinct: ["locationName"],
      select: { locationName: true },
    }),
    prisma.event.findMany({
      where: { category: { not: null } },
      distinct: ["category"],
      select: { category: true },
    }),
  ]);

  const locations = locRows
    .map((r) => r.locationName!)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const categories = catRows
    .map((r) => r.category!)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const tiers: TicketTier[] = ["FREE", "PREMIUM"];

  return { locations, categories, tiers };
}
