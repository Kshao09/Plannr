"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { EVENT_CATEGORIES } from "@/lib/EventCategories";

type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";
type TicketTier = "FREE" | "PREMIUM";

function toDatetimeLocalFromISO(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function toISOFromDatetimeLocal(v: string) {
  const d = new Date(v);
  return d.toISOString();
}

function clampInt(v: unknown, min: number, max: number) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

type EditInitial = {
  id: string;
  slug: string;

  title: string;
  description: string | null;

  startAt: string; // ISO
  endAt: string; // ISO

  locationName: string;
  address: string;
  city: string;
  state: string;

  category: string;

  ticketTier: TicketTier;
  priceCents: number;
  currency: string;

  isRecurring: boolean;
  recurrence: RecurrenceFrequency | null;
};

export default function EventEditForm({ initial }: { initial: EditInitial }) {
  const router = useRouter();
  const toast = useToast();

  // --- Pricing (checkbox + optional price) ---
  const initialPremium =
    String(initial.ticketTier).toUpperCase() === "PREMIUM" &&
    (initial.priceCents ?? 0) > 0;

  const [isPremium, setIsPremium] = useState<boolean>(initialPremium);

  // integer dollars in UI (stored as cents in DB)
  const [priceDollars, setPriceDollars] = useState<number>(() =>
    clampInt(Math.floor((initial.priceCents ?? 0) / 100), 0, 1_000_000)
  );

  const ticketTier: TicketTier = isPremium ? "PREMIUM" : "FREE";

  const computedPriceCents = useMemo(() => {
    if (!isPremium) return 0;
    const dollars = clampInt(priceDollars, 1, 1_000_000);
    return dollars * 100;
  }, [isPremium, priceDollars]);

  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    const form = e.currentTarget;
    const fd = new FormData(form);

    // Enforce required fields (except description + recurring checkbox)
    const title = String(fd.get("title") ?? "").trim();
    const locationName = String(fd.get("locationName") ?? "").trim();
    const category = String(fd.get("category") ?? "").trim();
    const address = String(fd.get("address") ?? "").trim();
    const city = String(fd.get("city") ?? "").trim();
    const state = String(fd.get("state") ?? "").trim();

    const startLocal = String(fd.get("startLocal") ?? "").trim();
    const endLocal = String(fd.get("endLocal") ?? "").trim();

    if (
      !title ||
      !locationName ||
      !category ||
      !address ||
      !city ||
      !state ||
      !startLocal ||
      !endLocal
    ) {
      toast.error(
        "Please fill all required fields (description is optional).",
        "Missing required fields"
      );
      return;
    }

    if (isPremium && computedPriceCents <= 0) {
      toast.error("Premium events must have a price of at least $1.", "Invalid price");
      return;
    }

    const isRecurring = fd.get("isRecurring") === "on";
    const recurrence = isRecurring
      ? (String(fd.get("recurrence") ?? "").toUpperCase() as RecurrenceFrequency)
      : null;

    // payload — keep backend fields stable
    const payload = {
      title,
      description: String(fd.get("description") ?? "").trim() || null,

      startAt: toISOFromDatetimeLocal(startLocal),
      endAt: toISOFromDatetimeLocal(endLocal),

      locationName,
      category,

      address,
      city,
      state,

      ticketTier,
      priceCents: computedPriceCents,
      currency: "usd",

      isRecurring,
      recurrence,
    };

    // Basic date sanity
    const startMs = new Date(payload.startAt).getTime();
    const endMs = new Date(payload.endAt).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      toast.error("End must be after start.", "Invalid date range");
      return;
    }

    setBusy(true);
    try {
      // Adjust method/route here if your backend differs.
      const res = await fetch(`/api/events/${encodeURIComponent(initial.slug)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Could not update event.", "Update failed");
        return;
      }

      toast.success("Saved successfully.", "Event updated");
      router.refresh();
      router.push(`/public/events/${encodeURIComponent(initial.slug)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="mb-2 block text-sm font-semibold">Title *</label>
        <input
          name="title"
          defaultValue={initial.title}
          required
          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
        />
      </div>

      {/* Description (optional) */}
      <div>
        <label className="mb-2 block text-sm font-semibold">Description</label>
        <textarea
          name="description"
          defaultValue={initial.description ?? ""}
          rows={5}
          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
        />
      </div>

      {/* Dates */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">Start *</label>
          <input
            type="datetime-local"
            name="startLocal"
            required
            defaultValue={toDatetimeLocalFromISO(initial.startAt)}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">End *</label>
          <input
            type="datetime-local"
            name="endLocal"
            required
            defaultValue={toDatetimeLocalFromISO(initial.endAt)}
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
          />
        </div>
      </div>

      {/* Location + Category + Pricing */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-semibold">Location name *</label>
          <input
            name="locationName"
            defaultValue={initial.locationName}
            required
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Category *</label>
          <select
            name="category"
            defaultValue={initial.category}
            required
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:border-zinc-400"
          >
            {EVENT_CATEGORIES.map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ Pricing (Checkbox + conditional price field) */}
        <div>
          <label className="mb-2 block text-sm font-semibold">Pricing *</label>

          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(e) => {
                  const next = e.target.checked;
                  setIsPremium(next);
                  if (!next) setPriceDollars(0);
                  if (next && priceDollars <= 0) setPriceDollars(10); // sensible default
                }}
                className="h-5 w-5 rounded border-zinc-300"
              />
              <span className="text-sm font-semibold">Premium (paid tickets)</span>
            </label>

            {isPremium ? (
              <div className="mt-3">
                <div className="text-xs font-semibold text-zinc-700">Ticket price (USD) *</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-zinc-700">$</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(clampInt(e.target.value, 0, 1_000_000))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400"
                    required
                  />
                </div>
                <div className="mt-2 text-xs text-zinc-600">
                  Attendees must purchase before RSVP becomes GOING.
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs font-semibold text-emerald-700">Free</div>
            )}

            {/* ✅ keep backend compatibility */}
            <input type="hidden" name="ticketTier" value={ticketTier} />
            <input type="hidden" name="priceCents" value={String(computedPriceCents)} />
            <input type="hidden" name="currency" value="usd" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-semibold">Address *</label>
          <input
            name="address"
            defaultValue={initial.address}
            required
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">City *</label>
          <input
            name="city"
            defaultValue={initial.city}
            required
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">State *</label>
          <input
            name="state"
            defaultValue={initial.state}
            required
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
          />
        </div>
      </div>

      {/* Recurring */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="isRecurring"
            defaultChecked={!!initial.isRecurring}
            className="h-5 w-5 rounded border-zinc-300"
          />
          <span className="text-sm font-semibold">Recurring event</span>
        </label>

        <div className="mt-3">
          <label className="mb-2 block text-xs font-semibold text-zinc-700">Frequency</label>
          <select
            name="recurrence"
            defaultValue={initial.recurrence ?? "WEEKLY"}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:border-zinc-400"
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
          <div className="mt-2 text-xs text-zinc-600">
            If “Recurring event” is unchecked, the frequency is ignored.
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
