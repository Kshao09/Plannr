import MarketingPageShell from "@/components/MarketingPageShell";

export default function ContactPage() {
  return (
    <MarketingPageShell title="Contact" subtitle="Support, partnerships, and organizer help.">
      <div className="grid gap-4 text-zinc-300 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-sm font-semibold text-white">Support</div>
          <div className="mt-1 text-sm">support@plannr.app (placeholder)</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-sm font-semibold text-white">Partnerships</div>
          <div className="mt-1 text-sm">partners@plannr.app (placeholder)</div>
        </div>
      </div>
    </MarketingPageShell>
  );
}
