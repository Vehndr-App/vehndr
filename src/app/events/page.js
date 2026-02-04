import { Suspense } from "react";
import EventsPageClient from "./EventsPageClient";

function EventsFallback() {
  return (
    <div className="w-full min-h-[40vh] flex items-center justify-center">
      <div className="text-[var(--gray-500)]">Loading…</div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<EventsFallback />}>
      <EventsPageClient />
    </Suspense>
  );
}
