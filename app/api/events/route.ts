// app/api/events/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function pickFallbackImage(title: string, category?: string | null) {
  const t = title.toLowerCase();
  const c = (category ?? "").toLowerCase();

  // If your file is /public/image/rockConcert001.png => "/image/rockConcert001.png"
  // If your file is /public/images/rockConcert001.png => "/images/rockConcert001.png"
  if (t.includes("rock") || t.includes("concert") || c.includes("music"))
    return "/images/rockConcert001.png";

  if (t.includes("ai") || t.includes("robot") || c.includes("tech")) return "/images/ai001.png";
  if (t.includes("food") || t.includes("truck") || c.includes("drink")) return "/images/food001.png";
  if (t.includes("chess") || c.includes("arts")) return "/images/chess001.png";
  if (t.includes("soccer")) return "/images/soccer001.png";
  if (t.includes("basket")) return "/images/basketball001.png";
  return "/images/rooftop001.png";
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function resolveUser(session: any): Promise<{ userId: string | null; role: string | null }> {
  const su = session?.user ?? {};
  const sessionId = su?.id as string | undefined;
  const sessionEmail = su?.email as string | undefined;
  const sessionRole = (su as any)?.role as string | undefined;

  if (sessionId && sessionRole) return { userId: sessionId, role: sessionRole };

  if (sessionEmail) {
    const dbUser = await prisma.user.findUnique({
      where: { email: sessionEmail },
      select: { id: true, role: true },
    });
    return {
      userId: dbUser?.id ?? sessionId ?? null,
      role: sessionRole ?? (dbUser?.role as any) ?? null,
    };
  }

  return { userId: sessionId ?? null, role: sessionRole ?? null };
}

function parseDate(v: any) {
  const d = new Date(String(v ?? ""));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * GET /api/events?q=&city=&category=&take=
 * Used by your events list / filters
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const city = (searchParams.get("city") || "").trim();
  const category = (searchParams.get("category") || "").trim();
  const take = Math.min(parseInt(searchParams.get("take") || "12", 10) || 12, 50);

  const now = new Date();
  const AND: any[] = [{ startAt: { gte: now } }];

  if (q) {
    AND.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { locationName: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (city) {
    AND.push({
      OR: [
        { locationName: { contains: city, mode: "insensitive" } },
        { address: { contains: city, mode: "insensitive" } },
      ],
    });
  }

  if (category) {
    AND.push({ category: { equals: category, mode: "insensitive" } });
  }

  const rows = await prisma.event.findMany({
    where: { AND },
    orderBy: { startAt: "asc" },
    take,
    select: {
      id: true,
      title: true,
      slug: true,
      startAt: true,
      endAt: true,
      locationName: true,
      address: true,
      category: true,
      image: true,
      organizer: { select: { name: true } },
    },
  });

  return NextResponse.json(
    rows.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt ? e.endAt.toISOString() : null,
      locationName: e.locationName,
      address: e.address,
      category: e.category,
      image: e.image ?? pickFallbackImage(e.title, e.category),
      organizerName: e.organizer?.name ?? null,
    })),
    { status: 200 }
  );
}

/**
 * POST /api/events
 * Organizer-only create endpoint (fixes your 405).
 *
 * body:
 * {
 *  title, description?, startAt, endAt,
 *  locationName?, address?, category?, image?
 * }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, role } = await resolveUser(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "ORGANIZER") {
    return NextResponse.json({ error: "Only organizers can create events." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const locationName = String(body.locationName ?? "").trim() || null;
  const address = String(body.address ?? "").trim() || null;
  const category = String(body.category ?? "").trim() || null;

  const startAt = parseDate(body.startAt);
  const endAt = parseDate(body.endAt);

  if (!title || !startAt || !endAt) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (endAt.getTime() <= startAt.getTime()) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }

  const base = slugify(title) || "event";
  let slug = base;

  // ensure uniqueness
  for (let i = 0; i < 8; i++) {
    const exists = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const requestedImage = String(body.image ?? "").trim();
  const image = requestedImage || pickFallbackImage(title, category);

  const created = await prisma.event.create({
    data: {
      slug,
      title,
      description,
      startAt,
      endAt,
      locationName,
      address,
      category,
      image,
      organizerId: userId,
    },
    select: { id: true, slug: true },
  });

  return NextResponse.json(created, { status: 201 });
}
