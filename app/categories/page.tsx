// app/categories/page.tsx
import { Suspense } from "react";
import CategoriesModal from "./ui/CategoriesModal";

export const dynamic = "force-dynamic";

function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-[min(980px,96vw)] rounded-3xl border border-white/10 bg-zinc-950/85 p-6 text-zinc-300 shadow-2xl">
        Loading…
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CategoriesModal />
    </Suspense>
  );
}
