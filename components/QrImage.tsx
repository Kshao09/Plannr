"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ToastProvider";

function normalizeBase(u: string) {
  return u.replace(/\/+$/, "");
}

function normalizeEnvOrigin() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (!raw) return "";
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return normalizeBase(withProto);
}

function toAbsUrl(maybeRelative: string, origin: string) {
  const t = (maybeRelative ?? "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (!origin) return ""; // don't guess on SSR/first render
  return new URL(t.startsWith("/") ? t : `/${t}`, origin).toString();
}

export default function QrImage({
  text, // QR encodes THIS (and Copy copies THIS)
  openHref, // Open button goes HERE (optional)
  openLabel = "Open link ↗",
  openDisabled = false,
  size = 220,
  showText = true,
  showActions = true,
}: {
  text: string;
  openHref?: string;
  openLabel?: string;
  openDisabled?: boolean;
  size?: number;
  showText?: boolean;
  showActions?: boolean;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // ✅ stable on SSR + first client render
  const [origin, setOrigin] = useState<string>(() => normalizeEnvOrigin());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOrigin(window.location.origin);
  }, []);

  const finalText = useMemo(() => toAbsUrl(text, origin), [text, origin]);

  const openUrl = useMemo(() => {
    const o = (openHref ?? "").trim();
    return o ? toAbsUrl(o, origin) : finalText;
  }, [openHref, origin, finalText]);

  const src = useMemo(() => {
    if (!finalText) return "";
    return `/api/qr?text=${encodeURIComponent(finalText)}`;
  }, [finalText]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(finalText);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Copy failed");
    }
  }

  // If we can't compute an absolute link yet (origin not known), render a stable skeleton
  if (!finalText) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div
          className="rounded-xl bg-white/10 animate-pulse"
          style={{ width: size, height: size }}
        />
        {showText ? <div className="mt-2 h-4 w-3/4 rounded bg-white/10 animate-pulse" /> : null}
        {showActions ? (
          <div className="mt-3 flex gap-2">
            <div className="h-8 w-24 rounded-xl bg-white/10 animate-pulse" />
            <div className="h-8 w-16 rounded-xl bg-white/10 animate-pulse" />
          </div>
        ) : null}
        {/* helps during dev; safe to remove later */}
        {!mounted ? <div className="mt-2 text-[10px] text-zinc-500">Loading…</div> : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="QR code"
        style={{ width: size, height: size }}
        className="rounded-xl bg-white p-2"
      />

      {showText ? <div className="mt-2 break-all text-xs text-zinc-400">{finalText}</div> : null}

      {showActions ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {openDisabled ? (
            <button
              type="button"
              disabled
              title="Organizer only"
              className="inline-flex cursor-not-allowed items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 opacity-50"
            >
              {openLabel}
            </button>
          ) : (
            <a
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
            >
              {openLabel}
            </a>
          )}

          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
