"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ToastProvider";

type Role = "ORGANIZER" | "MEMBER";
type SubStatus = string | null | undefined;

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 flex-none">
      <path
        fill="currentColor"
        d="M7.8 13.6 4.7 10.6a1 1 0 0 1 1.4-1.4l1.7 1.7 6.1-6.1a1 1 0 1 1 1.4 1.4l-6.8 6.8a1 1 0 0 1-1.4 0Z"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 flex-none">
      <path
        fill="currentColor"
        d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm0-11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-1 8h2V8H9v7Z"
      />
    </svg>
  );
}

function normalizeStatus(s: SubStatus) {
  return (s ?? "none").toLowerCase();
}

function prettyStatus(s: SubStatus) {
  const v = normalizeStatus(s);
  if (v === "active") return "Active";
  if (v === "trialing") return "Trial";
  if (v === "past_due") return "Past due";
  if (v === "unpaid") return "Unpaid";
  if (v === "canceled" || v === "cancelled") return "Canceled";
  return "None";
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function SubscriptionPlans({
  role,
  status,
  currentPeriodEndISO,
  proPriceId,
}: {
  role: Role;
  status?: SubStatus;
  currentPeriodEndISO?: string | null;
  proPriceId: string;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState<"upgrade" | "portal" | null>(null);

  const statusNorm = useMemo(() => normalizeStatus(status), [status]);
  const isPro = statusNorm === "active" || statusNorm === "trialing";
  const needsAttention = statusNorm === "past_due" || statusNorm === "unpaid";
  const statusLabel = useMemo(() => prettyStatus(status), [status]);
  const renewLabel = useMemo(() => fmtDate(currentPeriodEndISO), [currentPeriodEndISO]);

  const proHighlights = useMemo(() => {
    const base = [
      "Pro badge + premium profile styling",
      "Advanced planner tools (smart sorting & suggestions)",
      "Priority support + early access to features",
      "Higher limits for uploads & content",
    ];
    if (role === "ORGANIZER") {
      base.splice(1, 0, "Better visibility options (featured placement / boosts)");
      base.push("Organizer growth tools (promotion helpers & insights)");
    } else {
      base.splice(1, 0, "Faster checkout + premium saved lists");
      base.push("VIP discovery feeds and personalized recs");
    }
    return base;
  }, [role]);

  async function postAndRedirect(path: string, body?: any) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Request failed");
    if (!data?.url) throw new Error("Missing redirect url");
    window.location.href = data.url;
  }

  async function onUpgrade() {
    if (!proPriceId) {
      toast.error("Missing Stripe Price ID. Set NEXT_PUBLIC_STRIPE_PRICE_PRO.");
      return;
    }
    if (loading) return;

    setLoading("upgrade");
    try {
      await postAndRedirect("/api/checkout/subscription", { priceId: proPriceId });
    } catch (e: any) {
      toast.error(e?.message ?? "Checkout failed");
    } finally {
      setLoading(null);
    }
  }

  async function onManageBilling() {
    if (loading) return;

    setLoading("portal");
    try {
      await postAndRedirect("/api/checkout/portal");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open billing portal");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Plans & billing</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Upgrade to Pro for extra benefits and a premium experience.
          </p>
        </div>

        <div
          className={[
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
            needsAttention
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : isPro
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-zinc-200 bg-zinc-50 text-zinc-800",
          ].join(" ")}
        >
          <span
            className={[
              "h-2 w-2 rounded-full",
              needsAttention ? "bg-amber-500" : isPro ? "bg-emerald-500" : "bg-zinc-400",
            ].join(" ")}
          />
          <span>Subscription: {statusLabel}</span>
          {isPro && renewLabel ? <span className="text-zinc-500">• Renews {renewLabel}</span> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Free</div>
              <div className="mt-1 text-xs text-zinc-600">Everything you need to get started.</div>
            </div>
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-800">
              Included
            </div>
          </div>

          <div className="mt-4 text-2xl font-semibold text-zinc-900">
            $0 <span className="text-sm font-medium text-zinc-500">/ forever</span>
          </div>

          <ul className="mt-4 space-y-2 text-sm text-zinc-700">
            <li className="flex gap-2">
              <span className="mt-0.5 text-emerald-600"><CheckIcon /></span>
              Browse events & RSVP
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-emerald-600"><CheckIcon /></span>
              Save events for later
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-emerald-600"><CheckIcon /></span>
              Basic calendar planning
            </li>
          </ul>

          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
            <div className="flex gap-2">
              <span className="mt-0.5 text-zinc-500"><InfoIcon /></span>
              Upgrade anytime — Stripe checkout will show price, billing frequency, and terms.
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 right-[-80px] h-56 w-56 rounded-full bg-fuchsia-500/20 blur-2xl" />
            <div className="absolute -bottom-24 left-[-80px] h-56 w-56 rounded-full bg-cyan-500/20 blur-2xl" />
            <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#111827_1px,transparent_1px)] [background-size:28px_28px]" />
          </div>

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2">
                  <div className="text-sm font-semibold text-zinc-900">Pro</div>
                  <span className="rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Most popular
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  Best for {role === "ORGANIZER" ? "organizers growing events" : "power users planning often"}.
                </div>
              </div>

              {isPro ? (
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  You’re Pro
                </div>
              ) : needsAttention ? (
                <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  Action needed
                </div>
              ) : (
                <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-800">
                  Upgrade
                </div>
              )}
            </div>

            <div className="mt-4 text-2xl font-semibold text-zinc-900">
              Pro <span className="text-sm font-medium text-zinc-500">/ billed via Stripe</span>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              {proHighlights.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-0.5 text-fuchsia-600"><CheckIcon /></span>
                  {x}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {!isPro ? (
                <button
                  type="button"
                  onClick={onUpgrade}
                  disabled={loading !== null || !proPriceId}
                  className={[
                    "inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm",
                    "bg-gradient-to-r from-fuchsia-600 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  ].join(" ")}
                >
                  {loading === "upgrade" ? "Redirecting…" : "Upgrade to Pro"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onManageBilling}
                  disabled={loading !== null}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading === "portal" ? "Opening…" : "Manage billing"}
                </button>
              )}

              <div className="text-xs text-zinc-600">
                {proPriceId ? (
                  <span>Secure checkout • cancel anytime</span>
                ) : (
                  <span>
                    Missing Stripe config:{" "}
                    <code className="rounded bg-zinc-100 px-1 py-0.5">NEXT_PUBLIC_STRIPE_PRICE_PRO</code>
                  </span>
                )}
              </div>
            </div>

            {needsAttention ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Your subscription needs attention. Open billing to update payment details.
                <button type="button" onClick={onManageBilling} className="ml-2 underline underline-offset-2">
                  Manage billing
                </button>
              </div>
            ) : (
              <div className="mt-3 text-xs text-zinc-500">
                You’ll see the exact price, billing frequency, and terms in Stripe Checkout.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
        <div className="font-semibold text-zinc-900">What Pro unlocks</div>
        <div className="mt-1 text-sm text-zinc-600">
          A premium planner experience, better visibility tools, and priority support — powered by Stripe subscriptions.
        </div>
      </div>
    </div>
  );
}
