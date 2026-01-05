"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { EVENT_CATEGORIES } from "@/lib/EventCategories";
import EventImagesField from "@/components/EventImagesField";

type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

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

type EditInitial = {
  title: string;
  description: string;
  startAt: string; // ISO
  endAt: string; // ISO
  locationName: string;

  address: string; // street
  city: string;
  state: string;

  category: string;
  capacity: number | null;
  waitlistEnabled: boolean;

  isRecurring: boolean;
  recurrence: RecurrenceFrequency | null;

  image: string; // cover
  images: string[]; // gallery

  checkInSecret: string;
};

export default function EventEditForm({ slug, initial }: { slug: string; initial: EditInitial }) {
  const router = useRouter();
  const toast = useToast();

  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [startAt, setStartAt] = useState(toDatetimeLocalFromISO(initial.startAt));
  const [endAt, setEndAt] = useState(toDatetimeLocalFromISO(initial.endAt));
  const [locationName, setLocationName] = useState(initial.locationName ?? "");

  const [address, setAddress] = useState(initial.address ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [stateCode, setStateCode] = useState((initial.state ?? "").toUpperCase());

  const [category, setCategory] = useState(initial.category ?? "");

  const [capacity, setCapacity] = useState<string>(
    initial.capacity == null ? "" : String(initial.capacity)
  );
  const [waitlistEnabled, setWaitlistEnabled] = useState<boolean>(!!initial.waitlistEnabled);

  const [isRecurring, setIsRecurring] = useState<boolean>(!!initial.isRecurring);
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>(
    (initial.recurrence as RecurrenceFrequency | null) ?? "WEEKLY"
  );

  const [cover, setCover] = useState<string>(initial.image ?? "");
  const [images, setImages] = useState<string[]>(Array.isArray(initial.images) ? initial.images : []);

  const payload = useMemo(() => {
    const cap = capacity.trim() ? Number(capacity) : null;

    const normalizedState = stateCode.trim().toUpperCase();
    const safeState = normalizedState ? normalizedState.slice(0, 2) : null;

    return {
      title: title.trim(),
      description: description.trim() || null,
      startAt: startAt ? toISOFromDatetimeLocal(startAt) : null,
      endAt: endAt ? toISOFromDatetimeLocal(endAt) : null,
      locationName: locationName.trim() || null,

      address: address.trim() || null,
      city: city.trim() || null,
      state: safeState,

      category: category || null,
      capacity: cap != null && Number.isFinite(cap) ? Math.max(1, Math.floor(cap)) : null,
      waitlistEnabled,

      isRecurring,
      recurrence: isRecurring ? recurrence : null,

      image: cover || null,
      images,
    };
  }, [
    title,
    description,
    startAt,
    endAt,
    locationName,
    address,
    city,
    stateCode,
    category,
    capacity,
    waitlistEnabled,
    isRecurring,
    recurrence,
    cover,
    images,
  ]);

  function validate() {
    if (!payload.title) return "Title is required.";
    if (!startAt || !endAt) return "Start and End are required.";

    const s = new Date(payload.startAt as string).getTime();
    const e = new Date(payload.endAt as string).getTime();
    if (Number.isNaN(s) || Number.isNaN(e)) return "Invalid Start/End time.";
    if (e <= s) return "End must be after Start.";

    if ((payload.images?.length ?? 0) > 5) return "Max 5 gallery images.";

    if (payload.isRecurring && !payload.recurrence) return "Choose a recurrence frequency.";

    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const v = validate();
    if (v) return toast.error(v, "Save failed");

    setSaving(true);
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to save event.", "Save failed");
        return;
      }

      toast.success("Changes saved!");
      router.push(`/public/events/${slug}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error.";
      toast.error(msg, "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.70)] backdrop-blur"
    >
      <div className="grid gap-4">
        <input
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />

        <textarea
          className="min-h-[120px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-300">
            Start
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </label>

          <label className="text-sm text-zinc-300">
            End
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-300">
            Location name
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. FIU Library"
            />
          </label>

          <label className="text-sm text-zinc-300">
            Category
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/20"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">—</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* ✅ Address / City / State */}
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm text-zinc-300 md:col-span-1">
            Address
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
            />
          </label>

          <label className="text-sm text-zinc-300">
            City
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Miami"
            />
          </label>

          <label className="text-sm text-zinc-300">
            State
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value.toUpperCase())}
              placeholder="FL"
              maxLength={2}
            />
          </label>
        </div>

        {/* ✅ Recurring */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <label className="flex items-center gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => {
                const on = e.target.checked;
                setIsRecurring(on);
                if (!on) setRecurrence("WEEKLY");
              }}
            />
            Recurring event
          </label>

          {isRecurring ? (
            <div className="mt-3">
              <label className="text-sm text-zinc-300">
                Repeats
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-white/20"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency)}
                >
                  <option value="WEEKLY">Every week</option>
                  <option value="MONTHLY">Every month</option>
                  <option value="YEARLY">Every year</option>
                </select>
              </label>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-300">
            Capacity (blank = unlimited)
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/20"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 50"
            />
          </label>

          <label className="mt-6 flex items-center gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={waitlistEnabled}
              onChange={(e) => setWaitlistEnabled(e.target.checked)}
            />
            Enable waitlist when full
          </label>
        </div>

        <EventImagesField
          cover={cover}
          images={images}
          onChange={({ cover, images }) => {
            setCover(cover);
            setImages(images);
          }}
        />

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
