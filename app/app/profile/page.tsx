import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AvatarUploader from "./AvatarUploader";

export const dynamic = "force-dynamic";

async function resolveUser(session: any): Promise<{ id: string; email: string | null } | null> {
  const su = session?.user ?? {};
  const sessionId = (su as any)?.id as string | undefined;
  const email = (su as any)?.email as string | undefined;
  if (sessionId) return { id: sessionId, email: email ?? null };
  if (!email) return null;
  const db = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!db?.id) return null;
  return { id: db.id, email: db.email ?? null };
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await resolveUser(session);
  if (!me?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: me.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      subscription: { select: { status: true, stripePriceId: true, currentPeriodEnd: true } },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/app/dashboard" className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50">
            ←
          </Link>
          <h1 className="text-3xl font-semibold">Profile</h1>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.image || "/images/avatarPlaceholder.png"}
                alt="Avatar"
                className="h-16 w-16 rounded-full border border-zinc-200 object-cover"
              />
              <div>
                <div className="text-xl font-semibold">{user.name || "User"}</div>
                <div className="text-sm text-zinc-700">{user.email}</div>
                <div className="mt-1 inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-900">
                  {user.role}
                </div>
              </div>
            </div>

            <AvatarUploader />
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="text-sm font-semibold text-zinc-900">Subscription</div>
            <div className="mt-2 text-sm text-zinc-700">
              Status: <span className="font-semibold text-zinc-900">{user.subscription?.status ?? "none"}</span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <button
                onClick={async () => {
                  const res = await fetch("/api/checkout/subscription", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
                    body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || "" }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok && data?.url) window.location.href = data.url;
                }}
                className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Subscribe (Pro)
              </button>

              <div className="text-xs text-zinc-600">
                Set <code>NEXT_PUBLIC_STRIPE_PRICE_PRO</code> to your Stripe Price ID.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
