import MarketingPageShell from "@/components/MarketingPageShell";

export default function TermsPage() {
  return (
    <MarketingPageShell title="Terms">
      <div className="space-y-4 text-zinc-900">
        <p><span className="text-zinc-900 font-semibold">1) Using Plannr</span> — follow our guidelines and local laws.</p>
        <p><span className="text-zinc-900 font-semibold">2) Listings</span> — organizers are responsible for event accuracy.</p>
        <p><span className="text-zinc-900 font-semibold">3) Accounts</span> — no abuse, scraping, or unauthorized access.</p>
      </div>
    </MarketingPageShell>
  );
}
