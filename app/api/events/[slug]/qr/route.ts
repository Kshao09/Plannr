import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getBaseUrlFromRequest } from "@/lib/siteUrl";

export const runtime = "nodejs";

async function resolveSlug(
  params: { slug: string } | Promise<{ slug: string }>
): Promise<string> {
  const { slug } = await Promise.resolve(params);
  return slug;
}

export async function GET(
  req: Request,
  { params }: { params: { slug: string } | Promise<{ slug: string }> }
) {
  const slug = await resolveSlug(params);

  // ✅ Use canonical app URL if configured; otherwise infer from request headers.
  const base = getBaseUrlFromRequest(req);

  const target = new URL(`/public/events/${encodeURIComponent(slug)}`, base).toString();

  const svg = await QRCode.toString(target, { type: "svg", margin: 1, width: 256 });

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}
