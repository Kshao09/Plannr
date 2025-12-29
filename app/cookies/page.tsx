import MarketingPageShell from "@/components/MarketingPageShell";

export default function CookiesPage() {
  return (
    <MarketingPageShell title="Cookie policy" subtitle="How cookies are used for authentication and reliability.">
      <div className="space-y-4 text-zinc-300">
        <p>We use cookies for sign-in sessions (NextAuth) and core site functionality.</p>
        <p>Optional analytics may be added later and should be user-controllable.</p>
      </div>
    </MarketingPageShell>
  );
}
