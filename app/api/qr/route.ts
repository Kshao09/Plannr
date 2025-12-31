import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text") ?? "";
  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }
  const svg = await QRCode.toString(text, { type: "svg", margin: 1, width: 220 });
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
  });
}
