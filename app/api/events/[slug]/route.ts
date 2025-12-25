import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEventInput } from "@/lib/eventValidation";

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

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();

  const v = validateEventInput(body);
  if (!v.ok) return NextResponse.json({ message: v.message }, { status: 400 });

  const updated = await prisma.event.update({
    where: { slug },
    data: {
      title: v.data.title,
      // optional: update slug only if you want title change to change URL
      // slug: slugify(v.data.title),
      description: v.data.description,
      startAt: v.data.start,
      endAt: v.data.end,
      locationName: v.data.locationName,
      address: v.data.address,
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
