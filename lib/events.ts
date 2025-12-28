// lib/events.ts
import { prisma } from "@/lib/prisma";

export type RangeKey = "all" | "today" | "week" | "month" | "upcoming";

export type EventsQuery = {
  page: number;
  pageSize: number;
  q?: string;

  range?: RangeKey;
  from?: string; // YYYY-MM-DD (custom)
  to?: string;   // YYYY-MM-DD (custom)

  loc?: string[];      // filters Event.locationName
  category?: string[]; // filters Event.category
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

// Safer parse for YYYY-MM-DD (avoid UTC shifting)
function parseLocalDateStart(ymd: string) {
  return new Date(`${ymd}T00:00:00`);
}
function parseLocalDateEnd(ymd: string) {
  return new Date(`${ymd}T23:59:59.999`);
}

function computeDateWindow(input: Pick<EventsQuery, "range" | "from" | "to">) {
  const now = new Date();

  // Custom overrides if provided
  if (input.from || input.to) {
    const from = input.from ? parseLocalDateStart(input.from) : undefined;
    const to = input.to ? parseLocalDateEnd(input.to) : undefined;
    return { from, to };
  }

  switch (input.range) {
    case "today": {
      return { from: startOfDay(now), to: endOfDay(now) };
    }
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
    case "upcoming": {
      // upcoming = startAt >= now
      return { from: now, to: undefined };
    }
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

  if (query.loc?.length) {
    where.locationName = { in: query.loc };
  }

  if (query.category?.length) {
    where.category = { in: query.category };
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
        image: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { items, total, page, pageSize, totalPages };
}

export async function getEventFilterOptions() {
  const [locRows, catRows] = await Promise.all([
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

  return { locations, categories };
}
