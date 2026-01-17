import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

async function resolveUserId(session: any): Promise<string | null> {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
  const email = (su as any)?.email as string | undefined;

  if (sessionId) return sessionId;
  if (!email) return null;

  const db = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return db?.id ?? null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Max 5MB" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `avatars/${userId}/${Date.now()}.${ext}`;

  const blob = await put(path, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || "image/png",
  });

  await prisma.user.update({
    where: { id: userId },
    data: { image: blob.url },
  });

  return NextResponse.json({ ok: true, url: blob.url });
}
