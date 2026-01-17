"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { EVENT_CATEGORIES } from "@/lib/EventCategories";
import EventImagesField from "@/components/EventImagesField";

type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

function toISOFromDatetimeLocal(v: string) {
  const d = new Date(v);
  return d.toISOString();
}

function dollarsToCentsInt(dollars: string) {
  // integer dollars only (per your requirement)
  const n = Number(dollars);
  if (!Number.isFinite(n)) return null;
  const int = Math.floor(n);
  if (int < 0) return null;
  return int * 100;
}

export default function CreateEventForm() {
  const router = useRouter();
  const toast = useToast();

  const [saving, setSaving] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [locationName, setLocationName] = useState("");

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");

  const [category, setCategory] = useState("");

  // ✅ NEW: checkbox for premium + integer dollars input
  const [isPremium, setIsPremium] = useState(false);
  const [priceDollars, setPriceDollars] = useState("25");

  const [capacity, setCapacity] = useState<string>("50");
  const [waitlistEnabled, setWaitlistEnabled] = useState<boolean>(true);

  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>("WEEKLY");

  const [cover, setCover] = useState<string>("");
  const [images, setImages] = useState<string[]>([]);

  const inputClass =
    "mt-1 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-100";
  const labelClass = "text-sm font-medium text-zinc-700";
  const sectionClass = "rounded-2xl border border-zinc-200 bg-zinc-50 p-4";

  const payload = useMemo(() => {
    const cap = capacity.trim() ? Number(capacity) : null;

    const normalizedState = stateCode.trim().toUpperCase();
    const safeState = normalizedState ? normalizedState.slice(0, 2) : null;

    const priceCents = isPremium ? dollarsToCentsInt(priceDollars) : 0;

    return {
      title: title.trim(),
      description: description.trim() || null,
      startAt: startAt ? toISOFromDatetimeLocal(startAt) : null,
      endAt: endAt ? toISOFromDatetimeLocal(endAt) : null,

      // ✅ required (per your request)
      locationName: locationName.trim(),
      address: address.trim(),
      city: city.trim(),
      state: safeState,
      category: category || null,

      ticketTier: isPremium ? "PREMIUM" : "FREE",
      priceCents: priceCents ?? null,
      currency: "usd",

      capacity: cap != null && Number.isFinite(cap) ? Math.max(1, Math.floor(cap)) : null,
      waitlistEnabled,

      isRecurring,
      recurrence: isRecurring ? recurrence : null,
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
    isPremium,
    priceDollars,
    capacity,
    waitlistEnabled,
    isRecurring,
    recurrence,
  ]);

  function validate() {
    if (!payload.title) return "Title is required.";
    if (!startAt || !endAt) return "Start and End are required.";

    const s = new Date(payload.startAt as string).getTime();
    const e = new Date(payload.endAt as string).getTime();
    if (Number.isNaN(s) || Number.isNaN(e)) return "Invalid Start/End time.";
    if (e <= s) return "End must be after Start.";

    if (!payload.locationName?.trim()) return "Location name is required.";
    if (!payload.address?.trim()) return "Address is required.";
    if (!payload.city?.trim()) return "City is required.";
    if (!payload.state?.trim() || payload.state.length !== 2) return "State is required (2 letters).";
    if (!payload.category) return "Category is required.";

    if (payload.capacity == null || payload.capacity < 1) return "Capacity is required and must be >= 1.";

    if (payload.ticketTier === "PREMIUM") {
      if (payload.priceCents == null) return "Ticket price is required.";
      if (payload.priceCents <= 0) return "Ticket price must be >= 1.";
    }

    if ((images?.length ?? 0) > 5) return "Max 5 gallery images.";
    if (payload.isRecurring && !payload.recurrence) return "Choose a recurrence frequency.";
    if (imagesUploading) return "Please wait for image uploads to finish.";

    return null;
  }

  async function persistImages(slug: string) {
    const res = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: cover || null,
        images: Array.isArray(images) ? images : [],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "Failed to save images.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const v = validate();
    if (v) return toast.error(v, "Create failed");

    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Failed to create event.", "Create failed");
        return;
      }

      const slug = data?.slug ?? data?.event?.slug ?? null;

      if (slug && (cover || (images?.length ?? 0) > 0)) {
        await persistImages(slug);
      }

      toast.success("Event created!");
      router.push(slug ? `/public/events/${slug}` : "/public/events");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error.";
      toast.error(msg, "Create failed");
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
          placeholder="Description (optional)"
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
              required
            />
          </label>

          <label className={labelClass}>
            Category
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="">—</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className={sectionClass}>
            <label className="flex items-center justify-between gap-3 text-sm text-zinc-800">
              <span className="font-semibold">Premium event</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-zinc-900"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
              />
            </label>

            {isPremium ? (
              <label className={`${labelClass} mt-3 block`}>
                Ticket price (USD, whole dollars)
                <input
                  className={inputClass}
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="e.g. 25"
                  required
                />
              </label>
            ) : (
              <div className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                Free (default)
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className={`${labelClass} md:col-span-1`}>
            Address
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" required />
          </label>

          <label className={labelClass}>
            City
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Miami" required />
          </label>

          <label className={labelClass}>
            State
            <input
              className={inputClass}
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value.toUpperCase())}
              placeholder="FL"
              maxLength={2}
              required
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
            Recurring event (optional)
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
            Capacity
            <input
              className={inputClass}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="e.g. 50"
              required
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
            {saving ? "Creating…" : imagesUploading ? "Uploading images…" : "Create event"}
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
