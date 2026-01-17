// app/app/cart/page.tsx
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CheckoutCartButton from "./CheckoutCartButton";

export const dynamic = "force-dynamic";

type CartPageRow = {
  id: string;
  quantity: number | null;
  event: {
    id: string;
    slug: string;
    title: string;
    priceCents: number | null;
    ticketTier: string;
  };
};

async function resolveUserId(session: any): Promise<string | null> {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
  const email = (su as any)?.email as string | undefined;

  if (sessionId) return sessionId;
  if (!email) return null;

  const db = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return db?.id ?? null;
}

function formatUSDFromCents(cents: number) {
  const v = Math.max(0, Number(cents || 0)) / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export default async function CartPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login");

  const items = (await prisma.cartItem.findMany({
    where: { userId },
    select: {
      id: true,
      quantity: true,
      event: { select: { id: true, slug: true, title: true, priceCents: true, ticketTier: true } },
    },
    orderBy: { createdAt: "asc" },
  })) as CartPageRow[];

  const premiumItems: CartPageRow[] = items.filter(
    (i: CartPageRow) => String(i.event.ticketTier).toUpperCase() === "PREMIUM" && (i.event.priceCents ?? 0) > 0
  );

  const totalCents = premiumItems.reduce(
    (sum: number, it: CartPageRow) => sum + (it.event.priceCents ?? 0) * Math.max(1, it.quantity ?? 1),
    0
  );

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/app/dashboard"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50"
          >
            ←
          </Link>
          <h1 className="text-3xl font-semibold">Cart</h1>
        </div>

        {premiumItems.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">Your cart is empty.</div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="space-y-3">
              {premiumItems.map((it: CartPageRow) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{it.event.title}</div>
                    <div className="text-sm text-zinc-700">
                      {formatUSDFromCents(it.event.priceCents ?? 0)} × {Math.max(1, it.quantity ?? 1)}
                    </div>
                    <Link
                      className="text-xs font-semibold text-blue-700 hover:underline"
                      href={`/public/events/${it.event.slug}`}
                    >
                      View event
                    </Link>
                  </div>

                  <form
                    action={async () => {
                      "use server";
                      await prisma.cartItem.deleteMany({ where: { userId, eventId: it.event.id } });
                    }}
                  >
                    <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">
                      Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-zinc-700">Total</div>
              <div className="text-lg font-semibold">{formatUSDFromCents(totalCents)}</div>
            </div>

            <div className="mt-5">
              <CheckoutCartButton />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
