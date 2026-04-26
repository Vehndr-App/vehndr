"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGate from "../../../../components/AuthGate";
import { getInquiry, declineInquiry } from "../../../../services/inquiries";
import { listOffers, createOffer } from "../../../../services/offers";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_PIPELINE = [
  { key: "submitted",      label: "Received" },
  { key: "viewed",         label: "Viewed" },
  { key: "discussed",      label: "Chatting" },
  { key: "actions_needed", label: "Offer Sent" },
  { key: "scheduled",      label: "Booked" },
];

const STATUS_ORDER_MAP = {
  submitted: 0, viewed: 1, discussed: 2,
  actions_needed: 3, offer_updated: 3, scheduled: 4, completed: 4,
};

const COORDINATOR_LABELS = {
  hiring_vendor: "Hiring a vendor",
  charges_fees:  "Charging vending fees",
  no_fees:       "Free to vend",
};

const COORDINATOR_ICONS = {
  hiring_vendor: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  charges_fees: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  ),
  no_fees: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
};

const PROPOSAL_TYPE_LABELS = { cash: "Paid Engagement", product: "Vendor Fee", both: "Free to Join" };
const PROPOSAL_TYPE_COLORS = {
  cash:    { bg: "var(--mint-50)",    border: "var(--mint-200)",    text: "var(--mint-700)" },
  product: { bg: "var(--violet-50)", border: "var(--violet-200)",  text: "var(--violet-700)" },
  both:    { bg: "var(--amber-50)",   border: "var(--amber-200)",   text: "var(--amber-700)" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(cents) {
  if (!cents) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cents / 100);
}

function fmtDate(raw, opts = { month: "short", day: "numeric", year: "numeric" }) {
  if (!raw) return null;
  return new Date(raw).toLocaleDateString("en-US", opts);
}

function timeAgo(raw) {
  if (!raw) return null;
  const diff = Date.now() - new Date(raw);
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7)   return `${days}d ago`;
  return fmtDate(raw, { month: "short", day: "numeric" });
}

function isRecent(raw) {
  if (!raw) return false;
  return Date.now() - new Date(raw) < 86400000;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 10 }) {
  const initials = (name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
      style={{ background: "var(--gradient-vendor)" }}
    >
      {initials}
    </div>
  );
}

// ─── Status pipeline ──────────────────────────────────────────────────────────

function StatusPipeline({ status }) {
  const current = STATUS_ORDER_MAP[status] ?? 0;
  const isExpired = status === "expired";

  return (
    <div className="flex items-center gap-0 w-full">
      {STATUS_PIPELINE.map((step, i) => {
        const done   = i <= current && !isExpired;
        const active = i === current && !isExpired;
        const isLast = i === STATUS_PIPELINE.length - 1;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${active ? "ring-4 ring-[var(--violet-100)]" : ""}`}
                style={{ background: done ? (active ? "var(--violet-600)" : "var(--violet-400)") : "var(--gray-150,var(--gray-200))" }}
              >
                {done && !active ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : active ? (
                  <div className="w-2 h-2 rounded-full bg-white" />
                ) : null}
              </div>
              <span className={`text-[9px] font-semibold tracking-wide whitespace-nowrap ${active ? "text-[var(--violet-600)]" : done ? "text-[var(--violet-400)]" : "text-[var(--gray-300)]"}`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className="h-0.5 flex-1 mx-1 mb-4 rounded-full"
                style={{ background: i < current && !isExpired ? "var(--violet-300)" : "var(--gray-200)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Logistics chip ───────────────────────────────────────────────────────────

function LogisticChip({ icon, label, value, variant }) {
  const styles = {
    positive: { bg: "var(--mint-50)",    border: "var(--mint-100)",    text: "var(--mint-700)" },
    negative: { bg: "var(--gray-50)",    border: "var(--gray-200)",    text: "var(--gray-500)" },
    warning:  { bg: "var(--amber-50)",   border: "var(--amber-100)",   text: "var(--amber-700)" },
    info:     { bg: "var(--violet-50)",  border: "var(--violet-100)",  text: "var(--violet-700)" },
  };
  const s = styles[variant] ?? styles.info;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="text-base leading-none flex-shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--gray-400)" }}>{label}</p>
        <p className="text-xs font-bold leading-tight mt-0.5" style={{ color: s.text }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Event Brief ──────────────────────────────────────────────────────────────

function EventBrief({ event }) {
  const [expanded, setExpanded] = useState(false);
  if (!event) return null;

  const startDt  = event.startDate ? new Date(event.startDate) : null;
  const endDt    = event.endDate   ? new Date(event.endDate)   : null;
  const dateStr  = startDt ? startDt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : null;
  const timeStr  = startDt ? startDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;
  const endTimeStr = endDt ? endDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;
  const address  = event.streetAddress || event.location;
  const boothDisplay = event.boothSize ? event.boothSize.replace("x", " × ") + " ft" : null;

  const logistics = [
    event.indoorOutdoor === "indoor"  && { icon: "🏛️",  label: "Setting",  value: "Indoor",       variant: "info" },
    event.indoorOutdoor === "outdoor" && { icon: "🌤️",  label: "Setting",  value: "Outdoor",      variant: "info" },
    event.indoorOutdoor === "both"    && { icon: "🏛️",  label: "Setting",  value: "Indoor & Outdoor", variant: "info" },
    boothDisplay                      && { icon: "📐",  label: "Booth",    value: boothDisplay,   variant: "info" },
    event.accessToPower === "yes"     && { icon: "⚡",  label: "Power",    value: "Available",    variant: "positive" },
    event.accessToPower === "no"      && { icon: "⚡",  label: "Power",    value: "No access",    variant: "negative" },
    event.accessToPower === "limited" && { icon: "⚡",  label: "Power",    value: "Limited",      variant: "warning" },
    event.accessToWater === "yes"     && { icon: "💧",  label: "Water",    value: "Available",    variant: "positive" },
    event.accessToWater === "no"      && { icon: "💧",  label: "Water",    value: "No access",    variant: "negative" },
    event.canopyAllowed === "yes"     && { icon: "⛺",  label: "Canopy",   value: "Allowed",      variant: "positive" },
    event.canopyAllowed === "no"      && { icon: "⛺",  label: "Canopy",   value: "Not allowed",  variant: "negative" },
    event.parkingAvailable === "yes"  && { icon: "🅿️", label: "Parking",  value: "On-site",      variant: "positive" },
    event.parkingAvailable === "paid" && { icon: "🅿️", label: "Parking",  value: "Paid on-site", variant: "warning" },
    event.parkingAvailable === "no"   && { icon: "🅿️", label: "Parking",  value: "None",         variant: "negative" },
    event.wifiAvailability === "yes"  && { icon: "📶",  label: "WiFi",     value: "Available",    variant: "positive" },
    event.securityPresence === "yes"  && { icon: "🔒",  label: "Security", value: "On-site",      variant: "positive" },
  ].filter(Boolean);

  const scheduleRows = [
    event.eventHours    && { label: "Event hours",    value: event.eventHours },
    event.vendorLoadIn  && { label: "Vendor load-in", value: event.vendorLoadIn },
    event.vendorLoadOut && { label: "Vendor load-out",value: event.vendorLoadOut },
  ].filter(Boolean);

  const requirements = [
    event.requiresCoi    && "Certificate of Insurance",
    event.rsvpRequired   && "RSVP Required",
    event.badgeRequired  && "Badge Required",
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-[var(--gray-100)] overflow-hidden">
      {/* Gradient top stripe */}
      <div className="h-1.5" style={{ background: "linear-gradient(90deg, var(--violet-500), var(--magenta-500))" }} />

      <div className="p-5">
        <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-2">Event Brief</p>

        {/* Event name */}
        <h2 className="text-xl font-bold text-[var(--gray-900)] leading-snug mb-4">{event.name}</h2>

        {/* Date + Location */}
        <div className="flex flex-col gap-2.5 mb-4">
          {dateStr && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "var(--violet-50)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--gray-900)]">{dateStr}</p>
                {(timeStr || endTimeStr) && (
                  <p className="text-xs text-[var(--gray-500)] mt-0.5">
                    {timeStr}{endTimeStr ? ` – ${endTimeStr}` : ""}
                  </p>
                )}
              </div>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "var(--violet-50)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-[var(--gray-900)] mt-1">{address}</p>
            </div>
          )}
          {event.attendees > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "var(--violet-50)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <p className="text-sm font-bold text-[var(--gray-900)] mt-1">
                {Number(event.attendees).toLocaleString()} expected guests
              </p>
            </div>
          )}
        </div>

        {/* Venue logistics grid */}
        {logistics.length > 0 && (
          <>
            <div className="h-px bg-[var(--gray-100)] mb-4" />
            <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-2.5">Venue Logistics</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {logistics.map((l, i) => (
                <LogisticChip key={i} icon={l.icon} label={l.label} value={l.value} variant={l.variant} />
              ))}
            </div>
          </>
        )}

        {/* Expandable extra details */}
        {(event.description || scheduleRows.length > 0 || requirements.length > 0 || event.eventUrl || event.perks?.length > 0) && (
          <>
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="mt-4 flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ color: "var(--violet-600)" }}
            >
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              {expanded ? "Show less" : "More event details"}
            </button>

            {expanded && (
              <div className="mt-4 space-y-4">
                {event.description && (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-1.5">About this event</p>
                    <p className="text-sm text-[var(--gray-600)] leading-relaxed">{event.description}</p>
                  </div>
                )}

                {scheduleRows.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-2">Schedule</p>
                    <div className="rounded-xl overflow-hidden border border-[var(--gray-100)]">
                      {scheduleRows.map((row, i) => (
                        <div key={i} className="flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--gray-50)] last:border-0 bg-[var(--gray-50)]">
                          <span className="text-xs text-[var(--gray-500)]">{row.label}</span>
                          <span className="text-xs font-semibold text-[var(--gray-800)]">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {requirements.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-2">Requirements</p>
                    <div className="flex flex-wrap gap-1.5">
                      {requirements.map((r, i) => (
                        <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: "var(--amber-50)", border: "1px solid var(--amber-100)", color: "var(--amber-700)" }}>
                          ⚠️ {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {event.perks?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-2">Perks &amp; Amenities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {event.perks.map((perk, i) => (
                        <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: "var(--violet-50)", border: "1px solid var(--violet-100)", color: "var(--violet-700)" }}>
                          {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {event.eventUrl && (
                  <a
                    href={event.eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl transition-colors group"
                    style={{ background: "var(--violet-50)", border: "1px solid var(--violet-100)" }}
                  >
                    <span className="text-xs font-semibold" style={{ color: "var(--violet-600)" }}>View event page</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      className="group-hover:translate-x-0.5 transition-transform">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Coordinator request card ─────────────────────────────────────────────────

function CoordinatorRequest({ customer, coordinatorType, budgetCents, vendingFeeCents, submittedAt, initialMessage }) {
  const typeColor = {
    hiring_vendor: { bg: "var(--mint-50)",    border: "var(--mint-200)",    text: "var(--mint-700)" },
    charges_fees:  { bg: "var(--amber-50)",   border: "var(--amber-200)",   text: "var(--amber-700)" },
    no_fees:       { bg: "var(--violet-50)",  border: "var(--violet-200)",  text: "var(--violet-700)" },
  }[coordinatorType] ?? { bg: "var(--gray-50)", border: "var(--gray-200)", text: "var(--gray-600)" };

  return (
    <div className="bg-white rounded-2xl border border-[var(--gray-100)] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <Avatar name={customer?.name} size={10} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--gray-900)] leading-tight truncate">{customer?.name ?? "Coordinator"}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {submittedAt && <span className="text-xs text-[var(--gray-400)]">{timeAgo(submittedAt)}</span>}
          </div>
        </div>
        {coordinatorType && (
          <span
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0"
            style={{ background: typeColor.bg, border: `1px solid ${typeColor.border}`, color: typeColor.text }}
          >
            {COORDINATOR_ICONS[coordinatorType]}
            {COORDINATOR_LABELS[coordinatorType]}
          </span>
        )}
      </div>

      {/* Financial highlight */}
      {(budgetCents > 0 || vendingFeeCents > 0) && (
        <div className="mx-5 mb-4 grid grid-cols-2 gap-2">
          {budgetCents > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--mint-500)" }}>Their Budget</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: "var(--mint-700)" }}>{fmt$(budgetCents)}</p>
              <div className="mt-2 space-y-0.5 border-t border-[var(--mint-200)] pt-2">
                <p className="text-[10px]" style={{ color: "var(--mint-600)" }}>Tax (10%): -{fmt$(Math.round(budgetCents * 0.10))}</p>
                <p className="text-[10px]" style={{ color: "var(--mint-600)" }}>VEHNDR fee (10%): -{fmt$(Math.round(budgetCents * 0.10))}</p>
                <p className="text-[10px] font-bold" style={{ color: "var(--mint-800)" }}>Net: {fmt$(Math.round(budgetCents * 0.80))}</p>
              </div>
            </div>
          )}
          {vendingFeeCents > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ background: "var(--amber-50)", border: "1px solid var(--amber-100)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--amber-500)" }}>Vending Fee</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: "var(--amber-700)" }}>{fmt$(vendingFeeCents)}</p>
            </div>
          )}
        </div>
      )}

      {/* Message bubble */}
      {initialMessage && (
        <div className="px-5 pb-5">
          <div className="h-px bg-[var(--gray-100)] mb-4" />
          <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-3">Their Message</p>
          <div className="flex gap-3">
            <Avatar name={customer?.name} size={7} />
            <div className="flex-1 min-w-0 px-4 py-3 rounded-2xl rounded-tl-sm"
              style={{ background: "var(--gray-50)", border: "1px solid var(--gray-100)" }}>
              <p className="text-sm text-[var(--gray-800)] leading-relaxed whitespace-pre-wrap">{initialMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Offer card ───────────────────────────────────────────────────────────────

function OfferCard({ offer, offerAccepted, offerDeclined, canRevise, isConfirmed, inquiryId }) {
  if (!offer) return null;
  const ptc = PROPOSAL_TYPE_COLORS[offer.proposalType];

  return (
    <div className="bg-white rounded-2xl border overflow-hidden"
      style={{ borderColor: offerAccepted ? "var(--mint-200)" : offerDeclined ? "#fecaca" : "var(--violet-200)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ background: offerAccepted ? "var(--mint-50)" : offerDeclined ? "#fef2f2" : "var(--violet-50)" }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--gray-900)]">Your Offer</span>
          <span className="text-[10px] font-bold text-[var(--gray-400)] bg-white/70 px-1.5 py-0.5 rounded">
            v{offer.versionNumber}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {offer.proposalType && ptc && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: ptc.bg, border: `1px solid ${ptc.border}`, color: ptc.text }}>
              {PROPOSAL_TYPE_LABELS[offer.proposalType]}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            offerAccepted
              ? "bg-[var(--mint-100)] text-[var(--mint-700)]"
              : offerDeclined
              ? "bg-red-100 text-red-600"
              : "bg-[var(--amber-50)] text-[var(--amber-700)]"
          }`}>
            {offerAccepted ? "✓ Accepted" : offerDeclined ? "Declined" : "Pending"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Price */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[10px] text-[var(--gray-400)] font-bold uppercase tracking-widest">
              {offer.proposalType === "product" ? "You Pay" : offer.proposalType === "both" ? "Total" : "Customer Pays"}
            </p>
            <p className="text-4xl font-bold text-[var(--gray-900)] leading-tight mt-1">
              {fmt$(offer.totalPriceCents) ?? "—"}
            </p>
          </div>
          {offer.depositCents > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-[var(--gray-400)] font-bold uppercase tracking-wide">Deposit</p>
              <p className="text-sm font-bold text-[var(--gray-700)] mt-0.5">{fmt$(offer.depositCents)}</p>
              <p className="text-[10px] text-[var(--gray-400)] capitalize">{offer.depositType ?? ""}</p>
            </div>
          )}
        </div>

        {/* Meta row */}
        {(offer.remainingBalanceCents > 0 || offer.expiresAt || (isConfirmed && offer.paymentStatus && offer.paymentStatus !== "none")) && (
          <div className="flex flex-wrap gap-x-6 gap-y-3 mb-4 pt-3 border-t border-[var(--gray-100)]">
            {offer.remainingBalanceCents > 0 && (
              <div>
                <p className="text-[10px] text-[var(--gray-400)] font-bold uppercase tracking-wide">Remaining</p>
                <p className="text-sm font-bold text-[var(--gray-700)] mt-0.5">{fmt$(offer.remainingBalanceCents)}</p>
              </div>
            )}
            {offer.expiresAt && (
              <div>
                <p className="text-[10px] text-[var(--gray-400)] font-bold uppercase tracking-wide">Expires</p>
                <p className="text-sm font-bold text-[var(--gray-700)] mt-0.5">{fmtDate(offer.expiresAt)}</p>
              </div>
            )}
            {isConfirmed && offer.paymentStatus && offer.paymentStatus !== "none" && (
              <div>
                <p className="text-[10px] text-[var(--gray-400)] font-bold uppercase tracking-wide">Payment</p>
                <p className="text-sm font-bold mt-0.5 capitalize" style={{ color: "var(--mint-600)" }}>
                  {offer.paymentStatus.replace("_", " ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {offer.description && (
          <div className="pt-3 border-t border-[var(--gray-100)]">
            <p className="text-[10px] text-[var(--gray-400)] font-bold uppercase tracking-widest mb-2">Offer Terms</p>
            <p className="text-sm text-[var(--gray-700)] leading-relaxed">{offer.description}</p>
          </div>
        )}

        {/* Revise link */}
        {canRevise && (
          <div className="mt-4 pt-3 border-t border-[var(--gray-100)]">
            <Link href={`/dashboard/inquiries/${inquiryId}/offer/new`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ color: "var(--violet-600)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Revise this offer
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Offer history ────────────────────────────────────────────────────────────

function OfferHistory({ offers }) {
  const [expanded, setExpanded] = useState(false);
  const sorted   = [...offers].sort((a, b) => a.versionNumber - b.versionNumber);
  const active   = sorted[sorted.length - 1];
  const previous = sorted.slice(0, -1);
  if (previous.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-[var(--gray-100)] overflow-hidden">
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--gray-50)] transition-colors text-left">
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="text-sm font-semibold text-[var(--gray-700)]">Revision history</span>
          <span className="text-[11px] font-medium text-[var(--gray-400)] bg-[var(--gray-100)] px-2 py-0.5 rounded-full">
            {previous.length} prev
          </span>
        </div>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-[var(--gray-100)]">
          {[...previous].reverse().map((offer, i, arr) => {
            const next = i === 0 ? active : arr[i - 1];
            const diff = next ? next.totalPriceCents - offer.totalPriceCents : null;
            return (
              <div key={offer.id} className="px-5 py-3 border-b border-[var(--gray-50)] last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--gray-400)] bg-[var(--gray-100)] px-1.5 py-0.5 rounded">v{offer.versionNumber}</span>
                    <span className="text-[11px] text-[var(--gray-400)]">{timeAgo(offer.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {diff !== null && diff !== 0 && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${diff > 0 ? "bg-red-50 text-red-600" : "bg-[var(--mint-50)] text-[var(--mint-600)]"}`}>
                        {diff > 0 ? `↑ ${fmt$(diff)}` : `↓ ${fmt$(Math.abs(diff))}`}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-[var(--gray-500)]">{fmt$(offer.totalPriceCents)}</span>
                  </div>
                </div>
                {offer.description && (
                  <p className="text-xs text-[var(--gray-400)] leading-relaxed line-clamp-2 mt-1.5">{offer.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Respond panel ────────────────────────────────────────────────────────────

function RespondPanel({ id, customer, confirmDecline, setConfirmDecline, declining, accepting, handleDecline, handleQuickAccept }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--gray-100)] p-5">
      <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-4">Respond to this inquiry</p>

      {confirmDecline ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
            style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: "#b91c1c" }}>
              This will notify <strong>{customer?.name ?? "the coordinator"}</strong> that you&apos;re unable to participate. Are you sure?
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDecline(false)}
              className="flex-1 h-10 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleDecline} disabled={declining}
              className="flex-1 h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-colors"
              style={{ background: "#dc2626" }}>
              {declining ? "Declining…" : "Yes, decline"}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {/* Accept */}
          <button type="button" onClick={handleQuickAccept} disabled={accepting}
            className="group flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border-2 transition-all disabled:opacity-60"
            style={{ borderColor: "var(--mint-300)", background: "var(--mint-50)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-shadow group-hover:shadow-md"
              style={{ background: "var(--mint-500)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="text-center">
              <span className="text-xs font-bold block" style={{ color: "var(--mint-700)" }}>
                {accepting ? "Accepting…" : "Accept"}
              </span>
              <span className="text-[10px] leading-tight block mt-0.5" style={{ color: "var(--mint-500)" }}>Quick yes</span>
            </div>
          </button>

          {/* Decline */}
          <button type="button" onClick={() => setConfirmDecline(true)}
            className="group flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border-2 transition-all"
            style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-shadow group-hover:shadow-md"
              style={{ background: "#ef4444" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <div className="text-center">
              <span className="text-xs font-bold block" style={{ color: "#dc2626" }}>Decline</span>
              <span className="text-[10px] leading-tight block mt-0.5" style={{ color: "#f87171" }}>Can&apos;t do it</span>
            </div>
          </button>

          {/* Negotiate */}
          <Link href={`/dashboard/inquiries/${id}/offer/new`}
            className="group flex flex-col items-center gap-2.5 px-3 py-4 rounded-xl border-2 transition-all"
            style={{ borderColor: "var(--violet-200)", background: "var(--violet-50)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-shadow group-hover:shadow-md"
              style={{ background: "linear-gradient(135deg, var(--violet-600), var(--magenta-500))" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div className="text-center">
              <span className="text-xs font-bold block" style={{ color: "var(--violet-700)" }}>Propose</span>
              <span className="text-[10px] leading-tight block mt-0.5" style={{ color: "var(--violet-400)" }}>Custom offer</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorInquiryDetailPage() {
  return <AuthGate><VendorInquiryDetailInner /></AuthGate>;
}

function VendorInquiryDetailInner() {
  const { id } = useParams();
  const [inquiry,        setInquiry]        = useState(null);
  const [offers,         setOffers]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [declining,      setDeclining]      = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [accepting,      setAccepting]      = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getInquiry(id), listOffers(id)])
      .then(([inq, list]) => { setInquiry(inq); setOffers(Array.isArray(list) ? list : []); })
      .catch(() => setError("Failed to load inquiry."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDecline() {
    setDeclining(true);
    try {
      await declineInquiry(id);
      const [inq, list] = await Promise.all([getInquiry(id), listOffers(id)]);
      setInquiry(inq);
      setOffers(Array.isArray(list) ? list : []);
      setConfirmDecline(false);
    } catch (e) {
      alert(e.message || "Failed to decline inquiry.");
    } finally {
      setDeclining(false);
    }
  }

  async function handleQuickAccept() {
    setAccepting(true);
    try {
      const ct = inquiry?.coordinatorType;
      const proposalType = ct === "charges_fees" ? "product" : ct === "no_fees" ? "both" : "cash";
      const amount = proposalType === "product" ? (inquiry?.vendingFeeCents || 0) : (inquiry?.budgetCents || 0);
      await createOffer(id, { proposal_type: proposalType, total_price_cents: amount });
      const [inq, list] = await Promise.all([getInquiry(id), listOffers(id)]);
      setInquiry(inq);
      setOffers(Array.isArray(list) ? list : []);
    } catch (e) {
      alert(e.message || "Failed to create offer.");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) return <LoadingSkeleton />;
  if (error)   return <ErrorState message={error} />;
  if (!inquiry) return null;

  const {
    customer, event, status,
    activeOffer, lastOffer,
    initialMessage, coordinatorType,
    budgetCents, vendingFeeCents,
    submittedAt,
  } = inquiry;

  const hasOffer         = !!activeOffer;
  const offerAccepted    = activeOffer?.status === "accepted";
  const offerDeclined    = !activeOffer && lastOffer?.status === "declined";
  const displayOffer     = activeOffer || (offerDeclined ? lastOffer : null);
  const needsProposal    = !hasOffer || offerDeclined;
  const canRevise        = hasOffer && !offerAccepted && !offerDeclined;
  const isExpired        = status === "expired";
  const isVendorDeclined = status === "vendor_declined";
  const isConfirmed      = status === "scheduled" || status === "completed";
  const fresh            = isRecent(submittedAt);

  const vendorPaid     = offerAccepted && activeOffer?.proposalType === "product" && status === "scheduled";
  const needsVendorPay = offerAccepted && activeOffer?.proposalType === "product" && status !== "scheduled";
  const cashPending    = offerAccepted && activeOffer?.proposalType === "cash" && !isConfirmed;
  const freeConfirmed  = offerAccepted && activeOffer?.proposalType === "both";

  let actionLabel, actionHref, actionStyle;
  if (offerDeclined) {
    actionLabel = "Send New Offer"; actionHref = `/dashboard/inquiries/${id}/offer/new`; actionStyle = "primary";
  } else if (canRevise) {
    actionLabel = "Revise Offer"; actionHref = `/dashboard/inquiries/${id}/offer/new`; actionStyle = "secondary";
  } else {
    actionLabel = "Respond to Proposal"; actionHref = `/dashboard/inquiries/${id}/offer/new`; actionStyle = "primary";
  }

  const statusLabel = isVendorDeclined ? "Declined"
    : isConfirmed ? "Booked"
    : status === "actions_needed" || status === "offer_updated" ? "Offer Sent"
    : STATUS_PIPELINE.find(s => s.key === status)?.label ?? status;

  return (
    <div className="min-h-screen" style={{ background: "var(--gray-50)" }}>

      {/* ── Top nav ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--gray-100)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3 h-14">
          <Link
            href="/dashboard/inquiries"
            className="flex items-center gap-1.5 text-sm font-medium transition-colors flex-shrink-0"
            style={{ color: "var(--gray-400)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Inquiries
          </Link>
          <span style={{ color: "var(--gray-200)" }}>/</span>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--gray-800)" }}>
            {customer?.name ?? "Inquiry"}
          </span>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {fresh && !isExpired && !isVendorDeclined && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: "var(--amber-50)", color: "var(--amber-600)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--amber-500)" }} />
                New
              </span>
            )}
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
              isExpired || isVendorDeclined ? "bg-[var(--gray-100)] text-[var(--gray-400)]"
              : isConfirmed ? "bg-[var(--mint-50)] text-[var(--mint-700)]"
              : status === "actions_needed" || status === "offer_updated" ? "bg-[var(--violet-100)] text-[var(--violet-700)]"
              : "bg-[var(--gray-100)] text-[var(--gray-600)]"
            }`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 lg:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_292px] gap-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-4 min-w-0">

            {/* 1. Event brief — always at top */}
            <EventBrief event={event} />

            {/* 2. Coordinator's request */}
            <CoordinatorRequest
              customer={customer}
              coordinatorType={coordinatorType}
              budgetCents={budgetCents}
              vendingFeeCents={vendingFeeCents}
              submittedAt={submittedAt}
              initialMessage={initialMessage}
            />

            {/* 3. Status banners */}
            {offerDeclined && (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#b91c1c" }}>Offer declined</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#ef4444" }}>
                    The coordinator declined your proposal. Send a revised offer to keep things moving.
                  </p>
                </div>
              </div>
            )}

            {isVendorDeclined && (
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
                style={{ background: "var(--gray-50)", border: "1px solid var(--gray-200)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--gray-700)" }}>You declined this inquiry</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--gray-500)" }}>
                    You&apos;ve indicated you&apos;re unable to participate in this event.
                  </p>
                </div>
              </div>
            )}

            {/* 4. Respond panel (no offer yet) */}
            {needsProposal && !offerDeclined && !isExpired && !isVendorDeclined && (
              <RespondPanel
                id={id}
                customer={customer}
                confirmDecline={confirmDecline}
                setConfirmDecline={setConfirmDecline}
                declining={declining}
                accepting={accepting}
                handleDecline={handleDecline}
                handleQuickAccept={handleQuickAccept}
              />
            )}

            {/* 5. Offer card */}
            {displayOffer && (
              <OfferCard
                offer={displayOffer}
                offerAccepted={offerAccepted}
                offerDeclined={offerDeclined}
                canRevise={canRevise}
                isConfirmed={isConfirmed}
                inquiryId={id}
              />
            )}

            {/* 6. Revision history */}
            {offers.length > 1 && <OfferHistory offers={offers} />}

            {/* 7. Payment notices */}
            {cashPending && (
              <div className="flex items-start gap-3 px-4 py-4 rounded-2xl"
                style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--mint-700)" }}>Awaiting coordinator payment</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--mint-600)" }}>
                    You&apos;ll be notified as soon as {customer?.name ?? "the coordinator"} completes their payment.
                  </p>
                </div>
              </div>
            )}
            {needsVendorPay && (
              <div className="flex items-start gap-3 px-4 py-4 rounded-2xl"
                style={{ background: "var(--violet-50)", border: "1px solid var(--violet-100)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "var(--violet-800)" }}>Payment required to confirm your spot</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--violet-600)" }}>
                    Complete your payment to lock in participation at this event.
                  </p>
                </div>
                <Link href={`/dashboard/inquiries/${id}/pay`}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                  style={{ background: "linear-gradient(to right, var(--violet-600), var(--magenta-600))" }}>
                  Pay now →
                </Link>
              </div>
            )}
            {(vendorPaid || freeConfirmed) && (
              <div className="flex items-start gap-3 px-4 py-4 rounded-2xl"
                style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--mint-700)" }}>
                    {freeConfirmed ? "Booking confirmed — no payment required" : "Payment complete — you're confirmed!"}
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--mint-600)" }}>
                    Your participation at this event is confirmed.
                  </p>
                </div>
              </div>
            )}

          </div>{/* end left column */}

          {/* ── RIGHT SIDEBAR ── */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-4">

              {/* Status + actions */}
              <div className="bg-white rounded-2xl border border-[var(--gray-100)] p-5">
                <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-3">Progress</p>
                {isExpired || isVendorDeclined ? (
                  <div className="flex items-center gap-2 py-2 px-3 rounded-xl"
                    style={{ background: "var(--gray-50)", border: "1px solid var(--gray-100)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span className="text-xs font-semibold" style={{ color: "var(--gray-500)" }}>
                      {isVendorDeclined ? "You declined this inquiry" : "This inquiry has expired"}
                    </span>
                  </div>
                ) : (
                  <StatusPipeline status={status} />
                )}

                {/* CTA buttons */}
                <div className="mt-4 pt-4 border-t border-[var(--gray-100)] space-y-2">
                  <Link href={`/messages/${id}`}
                    className="flex items-center justify-between w-full px-4 h-10 rounded-xl border border-[var(--gray-200)] text-sm font-semibold transition-all hover:bg-[var(--gray-50)] hover:border-[var(--gray-300)]"
                    style={{ color: "var(--gray-700)" }}>
                    <span className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      Open Thread
                    </span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>

                  {!isExpired && !isVendorDeclined && !offerAccepted && (offerDeclined || canRevise) && (
                    <Link href={actionHref}
                      className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: actionStyle === "primary" ? "linear-gradient(to right, var(--violet-600), var(--magenta-600))" : "var(--violet-100)",
                        color: actionStyle === "primary" ? "white" : "var(--violet-700)",
                        boxShadow: actionStyle === "primary" ? "0 4px 14px rgba(139,92,246,0.25)" : "none",
                      }}>
                      {actionLabel}
                    </Link>
                  )}

                  {cashPending && (
                    <div className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-xs font-semibold"
                      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)", color: "var(--mint-700)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Awaiting Payment
                    </div>
                  )}
                  {needsVendorPay && (
                    <Link href={`/dashboard/inquiries/${id}/pay`}
                      className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-sm font-bold text-white"
                      style={{ background: "linear-gradient(to right, var(--violet-600), var(--magenta-600))", boxShadow: "0 4px 14px rgba(139,92,246,0.25)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                      Pay to Participate
                    </Link>
                  )}
                  {(vendorPaid || freeConfirmed) && (
                    <div className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-xs font-semibold"
                      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)", color: "var(--mint-700)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Booking Confirmed
                    </div>
                  )}
                </div>
              </div>

              {/* Customer card */}
              <div className="bg-white rounded-2xl border border-[var(--gray-100)] p-5">
                <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-3">Coordinator</p>
                <div className="flex items-center gap-3">
                  <Avatar name={customer?.name} size={10} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--gray-900)" }}>{customer?.name ?? "Coordinator"}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--gray-500)" }}>
                      {coordinatorType ? COORDINATOR_LABELS[coordinatorType] : "Event coordinator"}
                    </p>
                  </div>
                </div>
                {(budgetCents > 0 || vendingFeeCents > 0 || submittedAt) && (
                  <div className="mt-3 pt-3 border-t border-[var(--gray-100)] space-y-1.5">
                    {budgetCents > 0 && (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: "var(--gray-500)" }}>Budget</span>
                          <span className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>{fmt$(budgetCents)}</span>
                        </div>
                        <div className="mt-1 space-y-0.5 pl-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px]" style={{ color: "var(--gray-400)" }}>Tax (10%)</span>
                            <span className="text-[10px]" style={{ color: "var(--gray-400)" }}>-{fmt$(Math.round(budgetCents * 0.10))}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px]" style={{ color: "var(--gray-400)" }}>VEHNDR fee (10%)</span>
                            <span className="text-[10px]" style={{ color: "var(--gray-400)" }}>-{fmt$(Math.round(budgetCents * 0.10))}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-[var(--gray-100)] pt-0.5">
                            <span className="text-[10px] font-semibold" style={{ color: "var(--gray-600)" }}>Net</span>
                            <span className="text-[10px] font-semibold" style={{ color: "var(--mint-700)" }}>{fmt$(Math.round(budgetCents * 0.80))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {vendingFeeCents > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "var(--gray-500)" }}>Vending fee</span>
                        <span className="text-xs font-bold" style={{ color: "var(--amber-700)" }}>{fmt$(vendingFeeCents)}</span>
                      </div>
                    )}
                    {submittedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "var(--gray-500)" }}>Received</span>
                        <span className="text-xs font-semibold" style={{ color: "var(--gray-600)" }}>{timeAgo(submittedAt)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>{/* end sidebar */}

        </div>
      </div>

      {/* ── Mobile sticky footer ── */}
      {!isExpired && !isVendorDeclined && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--gray-100)] safe-area-bottom"
          style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)" }}>
          <div className="px-4 py-3 flex gap-3">
            <Link href={`/messages/${id}`}
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-[var(--gray-200)] text-sm font-semibold transition-all flex-shrink-0"
              style={{ color: "var(--gray-700)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Messages
            </Link>
            {!offerAccepted && !needsProposal && (
              <Link href={actionHref}
                className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all"
                style={{
                  background: actionStyle === "primary" ? "linear-gradient(to right, var(--violet-600), var(--magenta-600))" : "var(--violet-100)",
                  color: actionStyle === "primary" ? "white" : "var(--violet-700)",
                  boxShadow: actionStyle === "primary" ? "0 4px 14px rgba(139,92,246,0.35)" : "none",
                }}>
                {actionLabel}
              </Link>
            )}
            {cashPending && (
              <div className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)", color: "var(--mint-700)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Awaiting Payment
              </div>
            )}
            {needsVendorPay && (
              <Link href={`/dashboard/inquiries/${id}/pay`}
                className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white"
                style={{ background: "linear-gradient(to right, var(--violet-600), var(--magenta-600))", boxShadow: "0 4px 14px rgba(139,92,246,0.35)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Pay to Participate
              </Link>
            )}
            {(vendorPaid || freeConfirmed) && (
              <div className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                style={{ background: "var(--mint-50)", border: "1px solid var(--mint-200)", color: "var(--mint-700)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Booking Confirmed
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Skeletons / Error ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gray-50)" }}>
      <div className="h-14 bg-white border-b border-[var(--gray-100)]" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_292px] gap-6">
          <div className="space-y-4">
            {/* Event brief skeleton */}
            <div className="bg-white rounded-2xl border border-[var(--gray-100)] overflow-hidden">
              <div className="h-1.5 bg-[var(--gray-100)]" />
              <div className="p-5 space-y-4">
                <div className="h-3 w-20 bg-[var(--gray-100)] rounded animate-pulse" />
                <div className="h-6 w-3/4 bg-[var(--gray-100)] rounded animate-pulse" />
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--gray-100)] animate-pulse flex-shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-1/2 bg-[var(--gray-100)] rounded animate-pulse" />
                        <div className="h-2.5 w-1/3 bg-[var(--gray-100)] rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-[var(--gray-100)]" />
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-12 bg-[var(--gray-100)] rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
            {/* Request skeleton */}
            <div className="bg-white rounded-2xl border border-[var(--gray-100)] p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--gray-100)] animate-pulse" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-32 bg-[var(--gray-100)] rounded animate-pulse" />
                  <div className="h-3 w-20 bg-[var(--gray-100)] rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-[var(--gray-100)] rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-[var(--gray-100)] rounded animate-pulse" />
                <div className="h-3 w-3/5 bg-[var(--gray-100)] rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="hidden lg:block space-y-4">
            <div className="bg-white rounded-2xl border border-[var(--gray-100)] p-5 space-y-3">
              <div className="h-3 w-14 bg-[var(--gray-100)] rounded animate-pulse" />
              <div className="flex gap-2">{[1,2,3,4,5].map(i => <div key={i} className="w-6 h-6 rounded-full bg-[var(--gray-100)] animate-pulse" />)}</div>
              <div className="h-px bg-[var(--gray-100)]" />
              <div className="h-9 bg-[var(--gray-100)] rounded-xl animate-pulse" />
            </div>
            <div className="bg-white rounded-2xl border border-[var(--gray-100)] p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--gray-100)] animate-pulse" />
                <div className="space-y-1.5"><div className="h-3.5 w-28 bg-[var(--gray-100)] rounded animate-pulse" /><div className="h-3 w-20 bg-[var(--gray-100)] rounded animate-pulse" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gray-50)" }}>
      <div className="text-center">
        <p className="text-sm" style={{ color: "var(--error)" }}>{message}</p>
        <Link href="/dashboard/inquiries" className="text-sm mt-3 block" style={{ color: "var(--violet-600)" }}>
          ← Back to inquiries
        </Link>
      </div>
    </div>
  );
}
