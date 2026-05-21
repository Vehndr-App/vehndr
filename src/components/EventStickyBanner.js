"use client";

import { useState, useEffect } from "react";
import { getEvent } from "../services/events";

export default function EventStickyBanner({ eventId }) {
  const [event, setEvent] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId).then(setEvent).catch(() => {});
  }, [eventId]);

  if (!eventId || dismissed || !event) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 px-4 pb-5 pointer-events-none">
      <div
        className="mx-auto max-w-6xl bg-[var(--gray-900)] text-white rounded-2xl px-5 py-4 flex items-center justify-between pointer-events-auto"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-white/60 font-medium leading-none mb-0.5">Event selected</p>
            <p className="text-[14px] font-semibold leading-tight">{event.name}</p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center flex-shrink-0 transition-colors ml-4"
          aria-label="Dismiss"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
