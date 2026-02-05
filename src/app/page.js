import { Suspense } from "react";
import HomePageClient from "./HomePageClient";

function HomeFallback() {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center">
      <div className="text-[var(--gray-500)]">Loading…</div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomePageClient />
    </Suspense>
  );
}
