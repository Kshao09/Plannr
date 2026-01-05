// app/api/uploads/cover/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { enforceRateLimit, limiters } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/ip";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any)?.role as string | undefined;
    if (role !== "ORGANIZER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const ip = getClientIp(req);
    const rl = await enforceRateLimit({ limiter: limiters.uploadIpMinute, key: ip, message: "Too many uploads" });
    if (!rl.ok) return rl.response;

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error:
            "Missing BLOB_READ_WRITE_TOKEN. Run `vercel env pull .env.local` after connecting the Blob store, then restart dev server.",
        },
        { status: 500, headers: rl.headers }
      );
    }

    const form = await req.formData();
    const file = form.get("file") ?? form.get("image") ?? form.get("cover");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded (expected form field 'file')." }, { status: 400, headers: rl.headers });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400, headers: rl.headers });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 8MB)." }, { status: 400, headers: rl.headers });
    }

    const safeName = (file.name || "cover").replace(/[^\w.\-]+/g, "_").slice(0, 120);

    const blob = await put(`covers/${Date.now()}-${safeName}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url }, { headers: rl.headers });
  } catch (e: any) {
    console.error("cover upload failed:", e);
    return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
  }
}
