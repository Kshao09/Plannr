"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { EVENT_CATEGORIES } from "@/lib/EventCategories";
import EventImagesField from "@/components/EventImagesField";

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

type EditInitial = {
  title: string;
  description: string;
  startAt: string; // ISO
  endAt: string; // ISO
  locationName: string;

  address: string;
  city: string;
  state: string;

  category: string;
  ticketTier?: TicketTier | null; // ✅ NEW (optional so your server page won’t break until you add it)
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
  const [imagesUploading, setImagesUploading] = useState(false);

  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [startAt, setStartAt] = useState(toDatetimeLocalFromISO(initial.startAt));
  const [endAt, setEndAt] = useState(toDatetimeLocalFromISO(initial.endAt));
  const [locationName, setLocationName] = useState(initial.locationName ?? "");

  const [address, setAddress] = useState(initial.address ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [stateCode, setStateCode] = useState((initial.state ?? "").toUpperCase());

  const [category, setCategory] = useState(initial.category ?? "");
  const [ticketTier, setTicketTier] = useState<TicketTier>((initial.ticketTier ?? "FREE") as TicketTier); // ✅ NEW

  const [capacity, setCapacity] = useState<string>(initial.capacity == null ? "" : String(initial.capacity));
  const [waitlistEnabled, setWaitlistEnabled] = useState<boolean>(!!initial.waitlistEnabled);

  const [isRecurring, setIsRecurring] = useState<boolean>(!!initial.isRecurring);
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>(
    (initial.recurrence as RecurrenceFrequency | null) ?? "WEEKLY"
  );

  const [cover, setCover] = useState<string>(initial.image ?? "");
  const [images, setImages] = useState<string[]>(Array.isArray(initial.images) ? initial.images : []);

  const inputClass =
    "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100";
  const labelClass = "text-sm font-medium text-zinc-700";
  const sectionClass = "rounded-2xl border border-zinc-200 bg-zinc-50 p-4";

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
      ticketTier, // ✅ NEW

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
    ticketTier,
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
    if (imagesUploading) return "Please wait for image uploads to finish.";

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
      className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)]"
    >
      <div className="grid gap-4">
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />

        <textarea
          className={`${inputClass} min-h-[120px]`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Start
            <input
              type="datetime-local"
              className={inputClass}
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </label>

          <label className={labelClass}>
            End
            <input
              type="datetime-local"
              className={inputClass}
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className={labelClass}>
            Location name
            <input
              className={inputClass}
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. FIU Library"
            />
          </label>

          <label className={labelClass}>
            Category
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">—</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {/* ✅ NEW */}
          <label className={labelClass}>
            Pricing
            <select
              className={inputClass}
              value={ticketTier}
              onChange={(e) => setTicketTier(e.target.value as TicketTier)}
            >
              <option value="FREE">Free</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className={`${labelClass} md:col-span-1`}>
            Address
            <input
              className={inputClass}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
            />
          </label>

          <label className={labelClass}>
            City
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Miami" />
          </label>

          <label className={labelClass}>
            State
            <input
              className={inputClass}
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value.toUpperCase())}
              placeholder="FL"
              maxLength={2}
            />
          </label>
        </div>

        <div className={sectionClass}>
          <label className="flex items-center gap-3 text-sm text-zinc-800">
            <input
              type="checkbox"
              className="h-4 w-4 accent-zinc-900"
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
              <label className={labelClass}>
                Repeats
                <select
                  className={inputClass}
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
          <label className={labelClass}>
            Capacity (blank = unlimited)
            <input
              className={inputClass}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 50"
            />
          </label>

          <label className="mt-6 flex items-center gap-3 text-sm text-zinc-800">
            <input
              type="checkbox"
              className="h-4 w-4 accent-zinc-900"
              checked={waitlistEnabled}
              onChange={(e) => setWaitlistEnabled(e.target.checked)}
            />
            Enable waitlist when full
          </label>
        </div>

        <EventImagesField
          cover={cover}
          images={images}
          onUploadingChange={setImagesUploading}
          onChange={({ cover, images }) => {
            setCover(cover);
            setImages(images);
          }}
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving || imagesUploading}
            className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : imagesUploading ? "Uploading images…" : "Save changes"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
