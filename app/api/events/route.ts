import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEventInput } from "@/lib/eventValidation";
//import { slugify } from "@/lib/slug";

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

  const v = validateEventInput(body);
  if (!v.ok) return NextResponse.json({ message: v.message }, { status: 400 });

  const created = await prisma.event.create({
    data: {
      title: v.data.title,
      slug: slugify(v.data.title),
      description: v.data.description,
      startAt: v.data.start,
      endAt: v.data.end,
      locationName: v.data.locationName,
      address: v.data.address,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
