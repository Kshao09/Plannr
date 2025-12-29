import MarketingPageShell from "@/components/MarketingPageShell";

export default function CommunityPage() {
  return (
    <MarketingPageShell title="Community" subtitle="Member-only area (protected).">
      <div className="space-y-4 text-zinc-300">
        <p>This is where you can add saved events, groups, invites, and member profiles.</p>
        <p className="text-sm text-zinc-400">Your middleware already redirects to /login when not signed in.</p>
      </div>
    </MarketingPageShell>
  );
}
