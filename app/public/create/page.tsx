"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

export default function CreateEventPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");

  function closeModal() {
    router.push("/public/events");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          startAt,
          endAt,
          locationName,
          address,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg || "Failed to create event.", "Create failed");
        return;
      }

      toast.success("Event created!");
      router.push("/public/events");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Network error.", "Create failed");
    } finally {
      setLoading(false);
    }
  }

  const labelCls = "text-xs font-medium text-zinc-200";

  // Use `!` because your globals.css has input/textarea/button rules after Tailwind utilities.
  const inputCls =
    "mt-1 w-full rounded-xl !bg-white px-3 py-2 text-sm !text-black !placeholder:text-zinc-500 " +
    "!border !border-zinc-300 outline-none focus:!border-zinc-500 focus:ring-2 focus:ring-black/10";

  const textareaCls =
    "mt-1 w-full resize-none rounded-xl !bg-white px-3 py-2 text-sm !text-black !placeholder:text-zinc-500 " +
    "!border !border-zinc-300 outline-none focus:!border-zinc-500 focus:ring-2 focus:ring-black/10";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close create event modal"
        onClick={closeModal}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative z-10 w-[min(860px,96vw)] max-w-none overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-white">Create event</h1>
            <p className="mt-0.5 text-xs text-zinc-300">
              Fill out the details below. Press{" "}
              <span className="font-semibold">Esc</span> to close.
            </p>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="max-h-[70vh] overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Title</label>
              <input
                className={inputCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Study group meetup"
                required
              />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea
                className={textareaCls}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What is this event about?"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Start</label>
                <input
                  className={inputCls}
                  type="datetime-local"
                  value={startAt}
                  style={{ colorScheme: "light" }}
                  onChange={(e) => setStartAt(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelCls}>End</label>
                <input
                  className={inputCls}
                  type="datetime-local"
                  value={endAt}
                  style={{ colorScheme: "light" }}
                  onChange={(e) => setEndAt(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Location name</label>
                <input
                  className={inputCls}
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. FIU Library"
                  required
                />
              </div>

              <div>
                <label className={labelCls}>Address</label>
                <input
                  className={inputCls}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, city, state"
                  required
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="w-auto rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-60"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-auto rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
