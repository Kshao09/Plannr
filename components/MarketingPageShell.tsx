import type { ReactNode } from "react";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";

export default function MarketingPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050711] text-white">
      <MarketingNav />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-[-120px] h-[380px] w-[520px] rounded-full bg-fuchsia-500/20 blur-[90px]" />
        <div className="absolute right-[-220px] top-[120px] h-[420px] w-[560px] rounded-full bg-cyan-500/15 blur-[90px]" />
        <div className="absolute left-[20%] top-[520px] h-[420px] w-[520px] rounded-full bg-amber-500/10 blur-[110px]" />
      </div>

      <main className="relative mx-auto w-full max-w-5xl px-6 pb-24 pt-10 md:px-10">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
          {subtitle ? <p className="mt-3 max-w-3xl text-zinc-300">{subtitle}</p> : null}
        </header>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
          {children}
        </div>

        <MarketingFooter />
      </main>
    </div>
  );
}
