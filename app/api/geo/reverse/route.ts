import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ message: "Missing lat/lon" }, { status: 400 });
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);

  if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
    return NextResponse.json({ message: "Invalid lat/lon" }, { status: 400 });
  }

  // Nominatim reverse geocoding (no key). Server-side avoids CORS issues.
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`;

  const res = await fetch(url, {
    headers: {
      // Nominatim prefers a UA
      "User-Agent": "Plannr/1.0 (localhost)",
      "Accept-Language": "en",
    },
    // cache for a day
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return NextResponse.json({ message: "Reverse geocode failed" }, { status: 502 });
  }

  const data = await res.json();

  const addr = data?.address ?? {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.suburb ||
    addr.county ||
    addr.state ||
    "";

  return NextResponse.json(
    {
      city,
      region: addr.state ?? "",
      country: addr.country ?? "",
      displayName: data?.display_name ?? "",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    }
  );
}
