import MarketingPageShell from "@/components/MarketingPageShell";

export default function PressPage() {
  return (
    <MarketingPageShell title="Press" subtitle="Brand info, product description, and media contact.">
      <div className="space-y-6 text-zinc-300">
        <div>
          <h2 className="text-lg font-semibold text-white">One-liner</h2>
          <p className="mt-2">
            Plannr is an event planner + marketplace that helps organizers publish events and helps everyone discover what’s nearby.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-sm font-semibold text-white">Media contact</div>
          <div className="mt-1 text-sm">press@plannr.app (placeholder)</div>
        </div>
      </div>
    </MarketingPageShell>
  );
}
