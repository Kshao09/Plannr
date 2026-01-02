"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function CheckInQRCode({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: 160 })
      .then((url) => alive && setDataUrl(url))
      .catch(() => alive && setDataUrl(""));
    return () => {
      alive = false;
    };
  }, [value]);

  if (!dataUrl) {
    return (
      <div className="h-[160px] w-[160px] rounded-xl border border-white/10 bg-white/5" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="QR code"
      className="h-[160px] w-[160px] rounded-xl border border-white/10 bg-white/5"
    />
  );
}
