import MarketingPageShell from "@/components/MarketingPageShell";

export default function SafetyPage() {
  return (
    <MarketingPageShell title="Safety" subtitle="Guidelines to keep events trustworthy and communities welcoming.">
      <div className="space-y-8 text-zinc-900">
        <section>
          <h2 className="text-lg font-semibold text-white">Community guidelines</h2>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>No hate or harassment</li>
            <li>No scams or misleading listings</li>
            <li>Respect venues and local rules</li>
            <li>Report suspicious content</li>
          </ul>
        </section>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-sm font-semibold text-black">Report an issue</div>
          <div className="mt-1 text-sm">safety@plannr.app (placeholder)</div>
        </div>
      </div>
    </MarketingPageShell>
  );
}
