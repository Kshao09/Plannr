// prisma/seed.js
require("dotenv").config(); // reads .env by default

const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");

// adapter is ESM; load it safely from CommonJS
async function getAdapter(pool) {
  const mod = await import("@prisma/adapter-pg");
  const { PrismaPg } = mod;
  return new PrismaPg(pool);
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(prisma, base) {
  let slug = base;
  let i = 2;
  while (true) {
    const found = await prisma.event.findUnique({ where: { slug } });
    if (!found) return slug;
    slug = `${base}-${i++}`;
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = await getAdapter(pool);

  const prisma = new PrismaClient({ adapter });

  const organizer = await prisma.user.upsert({
    where: { email: "picks@plannr.local" },
    update: { name: "Plannr Picks", role: "ORGANIZER" },
    create: { email: "picks@plannr.local", name: "Plannr Picks", role: "ORGANIZER" },
  });

  const now = Date.now();
  const HOUR = 3600_000;

  const events = [
    {
      title: "Robotics + AI Meetup",
      description: "A casual AI club meetup + robotics demos.",
      category: "Tech",
      image: "/images/ai001.png",
      startAt: new Date(now + 2 * 24 * HOUR),
      endAt: new Date(now + 2 * 24 * HOUR + 2 * HOUR),
      locationName: "FIU Engineering Center",
      address: "10555 W Flagler St, Miami, FL 33174",
    },
    {
      title: "Food Truck Festival",
      description: "Local trucks, music, and night market vibes.",
      category: "Food & Drink",
      image: "/images/food001.png",
      startAt: new Date(now + 3 * 24 * HOUR),
      endAt: new Date(now + 3 * 24 * HOUR + 3 * HOUR),
      locationName: "Wynwood Marketplace",
      address: "2250 NW 2nd Ave, Miami, FL 33127",
    },
    {
      title: "Rock Concert",
      description: "Live rock show + guest opener.",
      category: "Music",
      image: "/images/rooftop001.png",
      startAt: new Date(now + 4 * 24 * HOUR),
      endAt: new Date(now + 4 * 24 * HOUR + 2 * HOUR),
      locationName: "Hollow Park",
      address: "123 Park Ave, Miami, FL 33130",
    },
    {
      title: "Chess Club @ Library",
      description: "Bring a friend. Boards provided.",
      category: "Arts",
      image: "/images/chess001.png",
      startAt: new Date(now + 5 * 24 * HOUR),
      endAt: new Date(now + 5 * 24 * HOUR + 2 * HOUR),
      locationName: "Downtown Library",
      address: "101 W Flagler St, Miami, FL 33130",
    },
    {
      title: "Pickup Soccer",
      description: "Casual 7v7 — all levels welcome.",
      category: "Sports",
      image: "/images/soccer001.png",
      startAt: new Date(now + 6 * 24 * HOUR),
      endAt: new Date(now + 6 * 24 * HOUR + 2 * HOUR),
      locationName: "Tamiami Park",
      address: "11201 SW 24th St, Miami, FL 33165",
    },
    {
      title: "Basketball Run",
      description: "Full court runs — rotate teams.",
      category: "Sports",
      image: "/images/basketball001.png",
      startAt: new Date(now + 7 * 24 * HOUR),
      endAt: new Date(now + 7 * 24 * HOUR + 2 * HOUR),
      locationName: "Coral Gate Park",
      address: "1450 SW 27th Ave, Miami, FL 33145",
    },
    {
      title: "Sunset Rooftop Meetup",
      description: "Networking + city views.",
      category: "Music",
      image: "/images/rooftop001.png",
      startAt: new Date(now + 8 * 24 * HOUR),
      endAt: new Date(now + 8 * 24 * HOUR + 2 * HOUR),
      locationName: "Brickell Rooftop",
      address: "999 Brickell Ave, Miami, FL 33131",
    },
    {
      title: "Tech + Coffee Hangout",
      description: "Meet other builders, share projects.",
      category: "Tech",
      image: "/images/ai001.png",
      startAt: new Date(now + 9 * 24 * HOUR),
      endAt: new Date(now + 9 * 24 * HOUR + 2 * HOUR),
      locationName: "Cafe in Midtown",
      address: "3201 NE 1st Ave, Miami, FL 33137",
    },
  ];

  for (const e of events) {
    const base = slugify(e.title);
    const slug = await ensureUniqueSlug(prisma, base);

    await prisma.event.upsert({
      where: { slug },
      update: {
        title: e.title,
        description: e.description,
        startAt: e.startAt,
        endAt: e.endAt,
        locationName: e.locationName,
        address: e.address,
        category: e.category,
        image: e.image,
        organizerId: organizer.id,
      },
      create: {
        slug,
        title: e.title,
        description: e.description,
        startAt: e.startAt,
        endAt: e.endAt,
        locationName: e.locationName,
        address: e.address,
        category: e.category,
        image: e.image,
        organizerId: organizer.id,
      },
    });
  }

  await prisma.$disconnect();
  await pool.end();

  console.log("✅ Seed complete");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
