export default function QrImage({ text }: { text: string }) {
  const src = `/api/qr?text=${encodeURIComponent(text)}`;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="QR code" className="h-[220px] w-[220px]" />
      <div className="mt-2 break-all text-xs text-zinc-400">{text}</div>
    </div>
  );
}
