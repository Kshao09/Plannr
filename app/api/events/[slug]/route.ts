import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function makeUniqueSlug(desired: string, currentId?: string) {
  let slug = desired;
  let i = 2;

  while (true) {
    const existing = await prisma.event.findUnique({ where: { slug } });
    if (!existing) return slug;
    if (currentId && existing.id === currentId) return slug;
    slug = `${desired}-${i++}`;
  }
}

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(event);
}

export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = await params;

  const existing = await prisma.event.findUnique({ where: { slug } });
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

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

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return NextResponse.json({ message: "Invalid dates" }, { status: 400 });
  }

  const desiredSlug = slugify(title);
  const nextSlug = await makeUniqueSlug(desiredSlug, existing.id);

  const updated = await prisma.event.update({
    where: { id: existing.id },
    data: {
      title,
      slug: nextSlug,
      description,
      startAt,
      endAt,
      locationName,
      address,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { slug } = await params;

  const existing = await prisma.event.findUnique({ where: { slug } });
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await prisma.event.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
