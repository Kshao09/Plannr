import { prisma } from "@/lib/db";

export async function getEvents({ q }: { q?: string }) {
  const query = (q ?? "").trim();

  return prisma.event.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { locationName: { contains: query, mode: "insensitive" } },
            { address: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
  });
}
