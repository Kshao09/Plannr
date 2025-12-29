import MarketingPageShell from "@/components/MarketingPageShell";

export default function DevelopersPage() {
  return (
    <MarketingPageShell title="Developers" subtitle="API and integrations (coming soon).">
      <div className="space-y-6 text-zinc-300">
        <p>We’re working on developer access for event publishing, webhooks, and integrations.</p>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-sm font-semibold text-white">Early access</div>
          <div className="mt-1 text-sm">dev@plannr.app (placeholder)</div>
        </div>
      </div>
    </MarketingPageShell>
  );
}
