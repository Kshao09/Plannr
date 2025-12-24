import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

async function uniqueSlug(base: string) {
  let slug = base;
  let i = 2;
  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { startAt: "asc" },
    select: { id: true, title: true, slug: true, startAt: true, locationName: true },
  });
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const body = await req.json();

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const locationName = String(body.locationName ?? "").trim();
  const address = String(body.address ?? "").trim();

  if (!title || !description || !locationName || !address) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }

  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ message: "Invalid dates" }, { status: 400 });
  }
  if (endAt <= startAt) {
    return NextResponse.json({ message: "End must be after start" }, { status: 400 });
  }

  const slug = await uniqueSlug(slugify(title));

  const created = await prisma.event.create({
    data: { title, slug, description, startAt, endAt, locationName, address },
  });

  return NextResponse.json(created, { status: 201 });
}
