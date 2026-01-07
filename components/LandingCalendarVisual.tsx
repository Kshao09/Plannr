"use client";

import { useEffect, useRef } from "react";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function LandingCalendarVisual() {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;

      const rx = clamp((0.5 - y) * 10, -8, 8);
      const ry = clamp((x - 0.5) * 14, -10, 10);

      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
      el.style.setProperty("--sx", `${Math.round(x * 100)}%`);
      el.style.setProperty("--sy", `${Math.round(y * 100)}%`);
    };

    const onLeave = () => {
      el.style.setProperty("--rx", `0deg`);
      el.style.setProperty("--ry", `0deg`);
      el.style.setProperty("--sx", `50%`);
      el.style.setProperty("--sy", `40%`);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      style={
        {
          ["--rx" as any]: "0deg",
          ["--ry" as any]: "0deg",
          ["--sx" as any]: "50%",
          ["--sy" as any]: "40%",
        } as React.CSSProperties
      }
      className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
    >
      {/* Spotlight */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(600px circle at var(--sx) var(--sy), rgba(0,0,0,0.06), transparent 45%)",
        }}
      />

      {/* 3D stage */}
      <div
        className="relative transform-gpu transition will-change-transform animate-[pulseZoom_8s_ease-in-out_infinite]"
        style={{
          transform: "perspective(900px) rotateX(var(--rx)) rotateY(var(--ry))",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">Weekly Planner</div>
          <div className="text-xs text-zinc-500">Mon–Sun</div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-[11px] text-zinc-500">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="text-center">
              {d}
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-white"
            >
              <div className="absolute left-2 top-1 text-[10px] text-zinc-400">{i + 1}</div>
            </div>
          ))}

          {/* “Events” overlays */}
          <div className="pointer-events-none absolute left-5 right-5 top-[92px] h-[210px]">
            <div className="absolute left-[2%] top-[18%] h-6 w-[44%] rounded-xl bg-gradient-to-r from-fuchsia-300/80 via-indigo-300/55 to-cyan-200/45" />
            <div className="absolute left-[52%] top-[36%] h-6 w-[30%] rounded-xl bg-gradient-to-r from-emerald-300/70 to-cyan-200/45" />
            <div className="absolute left-[18%] top-[58%] h-6 w-[52%] rounded-xl bg-gradient-to-r from-amber-300/75 to-rose-200/45" />
          </div>
        </div>
      </div>

      {/* Animated cursors */}
      <Cursor className="animate-[cursorA_6.5s_ease-in-out_infinite]" />
      <Cursor className="animate-[cursorB_7.8s_ease-in-out_infinite]" />
      <Cursor className="animate-[cursorC_9.2s_ease-in-out_infinite]" />

      <style jsx global>{`
        @keyframes pulseZoom {
          0% {
            transform: perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)) scale(1);
          }
          50% {
            transform: perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)) scale(1.02);
          }
          100% {
            transform: perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)) scale(1);
          }
        }
        @keyframes cursorA {
          0% {
            transform: translate(18px, 66px) rotate(-6deg);
            opacity: 0;
          }
          10% { opacity: 0.9; }
          50% { transform: translate(260px, 120px) rotate(6deg); }
          100% {
            transform: translate(420px, 180px) rotate(0deg);
            opacity: 0;
          }
        }
        @keyframes cursorB {
          0% {
            transform: translate(420px, 70px) rotate(10deg);
            opacity: 0;
          }
          12% { opacity: 0.85; }
          55% { transform: translate(220px, 210px) rotate(-10deg); }
          100% {
            transform: translate(40px, 160px) rotate(-2deg);
            opacity: 0;
          }
        }
        @keyframes cursorC {
          0% {
            transform: translate(140px, 260px) rotate(-12deg);
            opacity: 0;
          }
          18% { opacity: 0.8; }
          60% { transform: translate(360px, 120px) rotate(12deg); }
          100% {
            transform: translate(520px, 230px) rotate(4deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function Cursor({ className = "" }: { className?: string }) {
  return (
    <div className={["pointer-events-none absolute left-0 top-0", className].join(" ")}>
      <svg width="20" height="22" viewBox="0 0 20 22" fill="none">
        <path
          d="M2 1 L18 10 L10 12 L12 20 L9 21 L7 13 L2 16 Z"
          fill="rgba(17,24,39,0.85)"
          stroke="rgba(0,0,0,0.20)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
