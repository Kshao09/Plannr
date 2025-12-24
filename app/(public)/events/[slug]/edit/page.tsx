import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EditEventForm from "./EditEventForm";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event) notFound();

  return (
    <EditEventForm
      event={{
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        locationName: event.locationName,
        address: event.address,
        startAt: event.startAt.toISOString(),
        endAt: event.endAt.toISOString(),
      }}
    />
  );
}
