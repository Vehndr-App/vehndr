"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AuthGate from "../../../components/AuthGate";
import { listVendorInquiries } from "../../../services/inquiries";

function fmt(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function dateRange(start, end) {
  if (!start) return null;
  const s = fmt(start);
  const e = end && new Date(end).toDateString() !== new Date(start).toDateString() ? fmt(end) : null;
  return e ? `${s} – ${e}` : s;
}

function statusColors(status) {
  switch (status) {
    case "scheduled": return { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" };
    case "completed": return { dot: "bg-gray-400",    text: "text-gray-500",    bg: "bg-gray-50 border-gray-100"    };
    default:          return { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50 border-amber-100"  };
  }
}

function statusLabel(status) {
  if (status === "scheduled") return "Confirmed";
  if (status === "completed") return "Completed";
  return status.replace("_", " ");
}

export default function VendorEventsPage() {
  return (
    <AuthGate allowedRoles={["vendor"]}>
      <VendorEventsInner />
    </AuthGate>
  );
}

function VendorEventsInner() {
  const [inquiries, setInquiries] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("upcoming");

  useEffect(() => {
    listVendorInquiries()
      .then((inqs) => {
        const withEvent = inqs.filter(
          (i) => i.event && ["scheduled", "completed"].includes(i.status)
        );
        setInquiries(withEvent);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming  = inquiries.filter((i) => i.status === "scheduled" && (!i.event.startDate || new Date(i.event.startDate) >= now));
  const past      = inquiries.filter((i) => i.status === "completed" || (i.status === "scheduled" && i.event.startDate && new Date(i.event.startDate) < now));

  const visible = tab === "upcoming" ? upcoming : past;

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-100)] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          <h1 className="text-xl font-display font-bold text-[var(--gray-900)]">My Events</h1>
          <p className="text-sm text-[var(--gray-400)] mt-0.5">Events you're booked to vend at</p>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-[var(--gray-100)] rounded-xl p-1">
            {[
              { key: "upcoming", label: `Upcoming${upcoming.length ? ` (${upcoming.length})` : ""}` },
              { key: "past",     label: `Past${past.length ? ` (${past.length})` : ""}` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === key
                    ? "bg-white text-[var(--violet-700)] shadow-sm"
                    : "text-[var(--gray-500)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="h-4 bg-[var(--gray-100)] rounded w-2/3 mb-3" />
              <div className="h-3 bg-[var(--gray-100)] rounded w-1/2 mb-2" />
              <div className="h-3 bg-[var(--gray-100)] rounded w-1/3" />
            </div>
          ))
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-[var(--gray-100)] flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-[var(--gray-700)] mb-1">
              {tab === "upcoming" ? "No upcoming events" : "No past events"}
            </p>
            <p className="text-xs text-[var(--gray-400)] max-w-xs leading-relaxed">
              {tab === "upcoming"
                ? "When coordinators book you for events, they'll appear here."
                : "Completed events will show here."}
            </p>
          </div>
        ) : (
          visible.map((inq) => {
            const colors = statusColors(inq.status);
            const dates  = dateRange(inq.event.startDate, inq.event.endDate);
            return (
              <Link
                key={inq.id}
                href={`/dashboard/inquiries/${inq.id}`}
                className="block bg-white rounded-2xl p-5 transition-all hover:shadow-md"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-[var(--gray-900)] leading-tight truncate">
                      {inq.event.name}
                    </p>
                    {inq.event.location && (
                      <p className="text-xs text-[var(--gray-500)] mt-0.5 truncate">{inq.event.location}</p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${colors.bg} ${colors.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    {statusLabel(inq.status)}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  {dates && (
                    <div className="flex items-center gap-2 text-xs text-[var(--gray-500)]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {dates}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-[var(--gray-500)]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    {inq.customer.name}
                  </div>
                  {inq.budgetCents > 0 && (
                    <div className="flex items-center gap-2 text-xs text-[var(--gray-500)]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(inq.budgetCents / 100)} budget
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-[var(--gray-100)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--gray-400)]">View details →</span>
                  {inq.activeOffer && (
                    <span className="text-[11px] font-semibold text-[var(--violet-600)]">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(inq.activeOffer.totalPriceCents / 100)} offer
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
