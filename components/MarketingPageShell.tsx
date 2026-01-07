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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white text-zinc-900">
      <MarketingNav />

      {/* soft background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-[-140px] h-[420px] w-[560px] rounded-full bg-fuchsia-200/45 blur-[110px]" />
        <div className="absolute right-[-240px] top-[80px] h-[520px] w-[680px] rounded-full bg-cyan-200/45 blur-[120px]" />
        <div className="absolute left-[22%] top-[620px] h-[520px] w-[680px] rounded-full bg-amber-200/35 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#000000_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <main className="relative mx-auto w-full max-w-5xl px-6 pb-24 pt-12 md:px-10">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
          {subtitle ? <p className="mt-3 max-w-3xl text-zinc-600">{subtitle}</p> : null}
        </header>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] md:p-8">
          {children}
        </div>

        <MarketingFooter />
      </main>
    </div>
  );
}
