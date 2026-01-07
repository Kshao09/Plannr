import MarketingPageShell from "@/components/MarketingPageShell";

export default function CareersPage() {
  return (
    <MarketingPageShell title="Careers" subtitle="We’re building local event discovery with a clean, fast experience.">
      <div className="space-y-6 text-zinc-900">
        <p>We’re not actively hiring right now. If you want to collaborate, send your portfolio.</p>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-sm font-semibold text-black">Contact</div>
          <div className="mt-1 text-sm text-zinc-800">careers@plannr.app (placeholder)</div>
        </div>
      </div>
    </MarketingPageShell>
  );
}
