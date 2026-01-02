"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ToastProvider";

function normalizeBase(u: string) {
  return u.replace(/\/+$/, "");
}

function getClientBaseUrl() {
  const env = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (env) return normalizeBase(/^https?:\/\//i.test(env) ? env : `https://${env}`);
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

function toAbsUrl(maybeRelative: string) {
  const t = (maybeRelative ?? "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return new URL(t.startsWith("/") ? t : `/${t}`, getClientBaseUrl()).toString();
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

  const finalText = useMemo(() => toAbsUrl(text), [text]);

  const openUrl = useMemo(() => {
    const o = (openHref ?? "").trim();
    return o ? toAbsUrl(o) : finalText;
  }, [openHref, finalText]);

  const src = useMemo(() => `/api/qr?text=${encodeURIComponent(finalText)}`, [finalText]);

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

  if (!finalText) return null;

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
              className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 opacity-50 cursor-not-allowed"
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
