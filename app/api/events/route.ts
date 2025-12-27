import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function pickFallbackImage(title: string, category?: string | null) {
  const t = title.toLowerCase();
  const c = (category ?? "").toLowerCase();

  // ✅ ensure rock concert always uses rock image
  if (t.includes("rock") || t.includes("concert") || c.includes("music")) return "/images/rock001.png";
  if (t.includes("ai") || t.includes("robot") || c.includes("tech")) return "/images/ai001.png";
  if (t.includes("food") || t.includes("truck") || c.includes("drink")) return "/images/food001.png";
  if (t.includes("chess") || c.includes("arts")) return "/images/chess001.png";
  if (t.includes("soccer")) return "/images/soccer001.png";
  if (t.includes("basket")) return "/images/basketball001.png";
  return "/images/rooftop001.png";
}

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
    // ✅ city is usually in address or locationName; filter by both
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

  const payload = rows.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    startAt: e.startAt,
    endAt: e.endAt,
    locationName: e.locationName,
    address: e.address,
    category: e.category,
    image: e.image ?? pickFallbackImage(e.title, e.category),
    organizerName: e.organizer?.name ?? null,
  }));

  return NextResponse.json(payload);
}
