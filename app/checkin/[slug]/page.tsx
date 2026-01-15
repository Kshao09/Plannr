import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StaffCheckInClient from "./staffCheckInClient";

export const dynamic = "force-dynamic";

export default async function StaffCheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ secret?: string }>;
}) {
  const { slug } = await params;
  const { secret } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { slug },
    select: { title: true, checkInSecret: true },
  });

  if (!event) notFound();

  // allow page to render but show an error in the client UI if secret is missing/invalid
  const s = String(secret ?? "");

  const eventDetailsHref = `/public/events/${encodeURIComponent(slug)}`;

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      {/* ✅ Back arrow (same window) */}
      <Link
        href={eventDetailsHref}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
        aria-label="Back to event"
        title="Back to event"
      >
        ←
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-black">Staff check-in</h1>
      <p className="mt-2 text-sm text-zinc-800">{event.title}</p>

      <div className="mt-6">
        <StaffCheckInClient slug={slug} secret={s} expectedSecret={event.checkInSecret} />
      </div>
    </main>
  );
}
