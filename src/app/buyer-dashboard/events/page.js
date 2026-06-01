"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import { getMyEvents } from "../../../services/events";

function fmt(raw) {
  if (!raw) return null;
  return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function EventCard({ event, index }) {
  const startDate = fmt(event.startDate);
  const endDate   = event.endDate && event.endDate !== event.startDate ? fmt(event.endDate) : null;
  const isUpcoming = event.startDate && new Date(event.startDate) > new Date();

  return (
    <Link
      href={`/buyer-dashboard/events/${event.id}`}
      className="bg-white rounded-2xl overflow-hidden group hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-1 hover:scale-[1.01] transition-all duration-200 block"
      style={{ boxShadow: "var(--shadow-card)", animationDelay: `${index * 40}ms` }}
    >
      {/* Top gradient strip */}
      <div className="h-1.5 w-full" style={{ background: isUpcoming ? "var(--gradient-vendor)" : "var(--gray-200)" }} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--gray-900)] truncate">{event.name}</h3>
            {event.streetAddress || event.location ? (
              <p className="text-xs text-[var(--gray-400)] mt-0.5 truncate">
                📍 {event.streetAddress || event.location}
              </p>
            ) : null}
          </div>
          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
            isUpcoming
              ? "bg-[var(--violet-50)] text-[var(--violet-700)]"
              : "bg-[var(--gray-100)] text-[var(--gray-500)]"
          }`}>
            {isUpcoming ? "Upcoming" : event.status ?? "Draft"}
          </span>
        </div>

        {event.description && (
          <p className="text-xs text-[var(--gray-500)] leading-relaxed mb-4 line-clamp-2">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--gray-400)]">
          {startDate && (
            <span className="flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {startDate}{endDate ? ` → ${endDate}` : ""}
            </span>
          )}
          {event.attendees > 0 && (
            <span className="flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              {event.attendees.toLocaleString()} guests
            </span>
          )}
          {event.ageGroup && (
            <span className="flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              {event.ageGroup}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Skeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="h-1.5 bg-[var(--gray-100)] animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-[var(--gray-100)] rounded w-1/2 animate-pulse" />
        <div className="h-3 bg-[var(--gray-100)] rounded w-2/3 animate-pulse" />
        <div className="h-3 bg-[var(--gray-100)] rounded w-1/3 animate-pulse" />
      </div>
    </div>
  );
}

export default function EventsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    getMyEvents()
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-[var(--gray-900)]">My Events</h1>
          {!loading && events.length > 0 && (
            <p className="text-sm text-[var(--gray-400)] mt-0.5">{events.length} event{events.length !== 1 ? "s" : ""}</p>
          )}
        </div>
        <Link
          href="/vendors"
          className="flex items-center justify-center h-9 w-9 sm:w-auto sm:gap-1.5 sm:px-4 rounded-xl bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white font-semibold hover:shadow-[var(--shadow-button)] transition-all flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span className="hidden sm:inline text-sm">New Proposal</span>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton /><Skeleton /><Skeleton />
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-20 px-6 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center" style={{ background: "var(--gradient-browse)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold text-[var(--gray-900)] mb-1.5">No events yet</h3>
          <p className="text-[13px] text-[var(--gray-400)] leading-relaxed max-w-xs mb-6">
            Events are created when you submit a proposal to a vendor. Browse vendors to get started.
          </p>
          <Link href="/vendors" className="btn btn-gradient text-sm" style={{ height: "40px", padding: "0 20px", fontSize: "13px" }}>
            Browse vendors
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((evt, i) => (
            <EventCard key={evt.id} event={evt} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
