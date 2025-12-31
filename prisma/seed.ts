// prisma/seed.ts
import { prisma } from "./prismaClient";

function atLocal(daysFromNow: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const organizer = await prisma.user.findFirst({
    where: { role: "ORGANIZER" },
    select: { id: true },
  });

  if (!organizer) {
    throw new Error(
      'No ORGANIZER user found. Sign up once as role "ORGANIZER", then re-run seed.'
    );
  }

  const events = [
    // --- landing page (5) ---
    {
      slug: "sunset-rooftop-meetup",
      title: "Sunset Rooftop Meetup",
      description:
        "Golden hour networking + chill music. Bring a friend and enjoy the skyline. Snacks and mocktails provided.",
      startAt: atLocal(2, 17, 30),
      endAt: atLocal(2, 19, 30),
      locationName: "Skyline Rooftop",
      address: "Brickell, Miami, FL",
      category: "Outdoors",
      image: "/images/rooftop001.png",
      images: ["/images/rooftop001.png"],
      capacity: 60,
      waitlistEnabled: true,
    },
    {
      slug: "ai-club-meetup",
      title: "AI Club Meetup",
      description:
        "Lightning talks + demos on GenAI, ML, and real-world projects. Great for students and builders.",
      startAt: atLocal(3, 18, 30),
      endAt: atLocal(3, 20, 0),
      locationName: "FIU Engineering Center",
      address: "Miami, FL",
      category: "Tech",
      image: "/images/ai001.png",
      images: ["/images/ai001.png"],
      capacity: 80,
      waitlistEnabled: true,
    },
    {
      slug: "food-truck-festival",
      title: "Food Truck Festival",
      description:
        "Taste your way through Miami’s best food trucks. Live DJ, outdoor seating, and plenty of dessert.",
      startAt: atLocal(4, 16, 0),
      endAt: atLocal(4, 20, 30),
      locationName: "Wynwood Marketplace",
      address: "Wynwood, Miami, FL",
      category: "Food & Drink",
      image: "/images/food001.png",
      images: ["/images/food001.png"],
      capacity: 200,
      waitlistEnabled: true,
    },
    {
      slug: "chess-club-library",
      title: "Chess Club @ Library",
      description:
        "Weekly casual chess meetup. All levels welcome. Bring a board or just show up — we’ll pair you up.",
      startAt: atLocal(5, 18, 0),
      endAt: atLocal(5, 20, 0),
      locationName: "Downtown Library",
      address: "Downtown Miami, FL",
      category: "Arts",
      image: "/images/chess001.png",
      images: ["/images/chess001.png"],
      capacity: 30,
      waitlistEnabled: true,
    },
    {
      slug: "rock-concert-night",
      title: "Rock Concert",
      description:
        "High-energy live show featuring local bands. Doors open early — come for the opener!",
      startAt: atLocal(6, 19, 0),
      endAt: atLocal(6, 22, 30),
      locationName: "Hollow Park",
      address: "Miami, FL",
      category: "Music",
      image: "/images/rockConcert001.png",
      images: ["/images/rockConcert001.png"],
      capacity: 150,
      waitlistEnabled: true,
    },

    // --- events page extra (4) ---
    {
      slug: "arts-gallery-night",
      title: "Arts Gallery Night",
      description:
        "Explore local art, meet creators, and enjoy a relaxed gallery walk with music and refreshments.",
      startAt: atLocal(8, 18, 0),
      endAt: atLocal(8, 20, 30),
      locationName: "Arts District Gallery",
      address: "Miami, FL",
      category: "Arts",
      image: "/images/arts001.png",
      images: ["/images/arts001.png"],
      capacity: 70,
      waitlistEnabled: true,
    },
    {
      slug: "pickup-basketball",
      title: "Pickup Basketball",
      description:
        "Friendly pickup games. Bring water and your best energy. Teams rotate every game.",
      startAt: atLocal(9, 17, 0),
      endAt: atLocal(9, 19, 0),
      locationName: "Tamiami Park Courts",
      address: "Tamiami Park, Miami, FL",
      category: "Sports",
      image: "/images/basketball001.png",
      images: ["/images/basketball001.png"],
      capacity: 40,
      waitlistEnabled: true,
    },
    {
      slug: "soccer-scrimmage",
      title: "Soccer Scrimmage",
      description:
        "Casual soccer scrimmage with rotating teams. Cleats recommended, shin guards optional.",
      startAt: atLocal(10, 17, 30),
      endAt: atLocal(10, 19, 30),
      locationName: "Tamiami Park Field",
      address: "Tamiami Park, Miami, FL",
      category: "Sports",
      image: "/images/soccer001.png",
      images: ["/images/soccer001.png"],
      capacity: 44,
      waitlistEnabled: true,
    },
    {
      slug: "music-open-mic",
      title: "Music Open Mic",
      description:
        "Open mic night for singers, poets, and musicians. Sign-up at the door. Support local talent!",
      startAt: atLocal(11, 19, 0),
      endAt: atLocal(11, 21, 30),
      locationName: "Downtown Cafe Stage",
      address: "Miami, FL",
      category: "Music",
      image: "/images/music001.png",
      images: ["/images/music001.png"],
      capacity: 55,
      waitlistEnabled: true,
    },
  ];

  for (const e of events) {
    await prisma.event.upsert({
      where: { slug: e.slug },
      update: { ...e, organizerId: organizer.id },
      create: { ...e, organizerId: organizer.id },
    });
  }

  console.log(`✅ Seeded ${events.length} events`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
