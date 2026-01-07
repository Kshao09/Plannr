import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-white text-zinc-900">
      {/* soft background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-48 top-[-140px] h-[520px] w-[620px] rounded-full bg-fuchsia-200/45 blur-[120px]" />
        <div className="absolute right-[-260px] top-[60px] h-[560px] w-[720px] rounded-full bg-cyan-200/45 blur-[130px]" />
        <div className="absolute left-[18%] top-[640px] h-[560px] w-[720px] rounded-full bg-amber-200/35 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#000000_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}
