import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}
