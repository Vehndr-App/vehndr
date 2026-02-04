import { Suspense } from "react";
import VendorsPageClient from "./VendorsPageClient";

function VendorsFallback() {
  return (
    <div className="w-full min-h-[40vh] flex items-center justify-center">
      <div className="text-[var(--gray-500)]">Loading…</div>
    </div>
  );
}

export default function VendorsPage() {
  return (
    <Suspense fallback={<VendorsFallback />}>
      <VendorsPageClient />
    </Suspense>
  );
}
