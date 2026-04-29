"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGate from "../../../../components/AuthGate";
import { getInquiry, declineInquiry } from "../../../../services/inquiries";
import { listOffers, createOffer } from "../../../../services/offers";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_PIPELINE = [
  { key: "submitted",      label: "Received"  },
  { key: "viewed",         label: "Viewed"    },
  { key: "discussed",      label: "Chatting"  },
  { key: "actions_needed", label: "Offer Sent"},
  { key: "scheduled",      label: "Booked"    },
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

const PROPOSAL_TYPE_LABELS = {
  cash: "Paid Engagement", product: "Vendor Fee", both: "Free to Join",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(cents) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

function fmtDate(raw, opts = { month: "short", day: "numeric", year: "numeric" }) {
  if (!raw) return null;
  return new Date(raw).toLocaleDateString("en-US", opts);
}

function timeAgo(raw) {
  if (!raw) return null;
  const diff  = Date.now() - new Date(raw);
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days  < 7)  return `${days}d ago`;
  return fmtDate(raw, { month: "short", day: "numeric" });
}

function isRecent(raw) {
  return !!raw && Date.now() - new Date(raw) < 86400000;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Avatar({ name, size = 10 }) {
  const initials = (name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ background: "var(--gradient-vendor)", fontSize: size >= 12 ? 15 : 13 }}
    >
      {initials}
    </div>
  );
}

function Card({ children, className = "", style = {} }) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${className}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)", ...style }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[var(--gray-100)]" />;
}

// ─── Status pipeline ──────────────────────────────────────────────────────────

function StatusPipeline({ status }) {
  const current   = STATUS_ORDER_MAP[status] ?? 0;
  const isExpired = status === "expired";

  return (
    <div className="flex items-center w-full">
      {STATUS_PIPELINE.map((step, i) => {
        const done   = i <= current && !isExpired;
        const active = i === current && !isExpired;
        const isLast = i === STATUS_PIPELINE.length - 1;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${active ? "ring-[3px] ring-[var(--violet-100)]" : ""}`}
                style={{ background: done ? (active ? "var(--violet-600)" : "var(--violet-300)") : "var(--gray-200)" }}
              >
                {done && !active && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className={`text-[9px] font-semibold tracking-wide whitespace-nowrap ${active ? "text-[var(--violet-600)]" : done ? "text-[var(--violet-300)]" : "text-[var(--gray-300)]"}`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className="h-px flex-1 mx-1 mb-4"
                style={{ background: i < current && !isExpired ? "var(--violet-300)" : "var(--gray-200)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Hero card ────────────────────────────────────────────────────────────────

function HeroCard({
  customer, event, status,
  coordinatorType, budgetCents, vendingFeeCents, submittedAt,
  fresh, isExpired, isVendorDeclined, isConfirmed,
  offerAccepted, offerDeclined, canRevise,
  cashPending, needsVendorPay, vendorPaid, freeConfirmed,
  needsProposal, primaryHref, primaryLabel,
  confirmDecline, setConfirmDecline,
  declining, handleDecline, accepting, handleQuickAccept,
  id,
}) {
  const statusLabel = isVendorDeclined ? "Declined"
    : isConfirmed ? "Booked"
    : status === "actions_needed" || status === "offer_updated" ? "Offer Sent"
    : STATUS_PIPELINE.find(s => s.key === status)?.label ?? status;

  const statusStyle = isExpired || isVendorDeclined
    ? { bg: "var(--gray-100)", color: "var(--gray-500)" }
    : isConfirmed
    ? { bg: "var(--mint-50)", color: "var(--mint-700)" }
    : status === "actions_needed" || status === "offer_updated"
    ? { bg: "var(--violet-100)", color: "var(--violet-700)" }
    : { bg: "var(--gray-100)", color: "var(--gray-600)" };

  return (
    <Card>
      {/* Pipeline */}
      {!isExpired && !isVendorDeclined && (
        <>
          <div className="px-6 pt-5 pb-4 overflow-x-auto">
            <div style={{ minWidth: 360 }}>
              <StatusPipeline status={status} />
            </div>
          </div>
          <Divider />
        </>
      )}

      {/* Customer info */}
      <div className="px-6 py-5 flex items-start gap-4">
        <Avatar name={customer?.name} size={12} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[17px] font-bold text-[var(--gray-900)] leading-tight">{customer?.name ?? "Coordinator"}</h1>
            {fresh && !isExpired && !isVendorDeclined && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--amber-50)] text-[var(--amber-600)]">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[var(--amber-500)]" />
                New
              </span>
            )}
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: statusStyle.bg, color: statusStyle.color }}>
              {statusLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
            {event && (
              <span className="text-[13px] text-[var(--gray-400)]">
                for <span className="font-medium text-[var(--gray-600)]">{event.name}</span>
              </span>
            )}
            {submittedAt && (
              <span className="text-[13px] text-[var(--gray-400)]">{timeAgo(submittedAt)}</span>
            )}
          </div>
        </div>
      </div>

      <Divider />

      {/* Action bar */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-2">
        {/* Primary action */}
        {primaryHref && !offerAccepted && (
          <Link href={primaryHref}
            className="h-9 px-4 rounded-xl text-[13px] font-bold text-white flex items-center gap-1.5"
            style={{ background: "linear-gradient(to right, var(--violet-600), var(--magenta-600))", boxShadow: "0 2px 10px rgba(139,92,246,0.25)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            {primaryLabel}
          </Link>
        )}

        {/* Open thread */}
        <Link href={`/messages/${id}`}
          className="h-9 px-4 rounded-xl border border-[var(--gray-200)] text-[13px] font-semibold text-[var(--gray-700)] flex items-center gap-1.5 hover:bg-[var(--gray-50)] transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Open Thread
        </Link>

        {/* Vendor payment */}
        {needsVendorPay && (
          <Link href={`/dashboard/inquiries/${id}/pay`}
            className="h-9 px-4 rounded-xl text-[13px] font-bold text-white flex items-center gap-1.5"
            style={{ background: "linear-gradient(to right, var(--violet-600), var(--magenta-600))" }}>
            Pay to Participate
          </Link>
        )}

        {/* Awaiting */}
        {cashPending && (
          <span className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-[var(--mint-50)] border border-[var(--mint-200)] text-[var(--mint-700)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Awaiting payment
          </span>
        )}

        {(vendorPaid || freeConfirmed) && (
          <span className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-[var(--mint-50)] border border-[var(--mint-200)] text-[var(--mint-700)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {freeConfirmed ? "Confirmed" : "Booking Confirmed"}
          </span>
        )}

        {/* Quick accept + decline — only when no offer yet */}
        {needsProposal && !offerDeclined && !isExpired && !isVendorDeclined && (
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={handleQuickAccept} disabled={accepting}
              className="h-9 px-3 rounded-xl border border-[var(--gray-200)] text-[13px] font-semibold text-[var(--gray-600)] hover:bg-[var(--gray-50)] disabled:opacity-50 transition-colors">
              {accepting ? "Accepting…" : "Quick Accept"}
            </button>
            {confirmDecline ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--gray-400)]">Sure?</span>
                <button type="button" onClick={handleDecline} disabled={declining}
                  className="h-9 px-3 rounded-xl text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors">
                  {declining ? "…" : "Yes, decline"}
                </button>
                <button type="button" onClick={() => setConfirmDecline(false)}
                  className="h-9 px-3 rounded-xl border border-[var(--gray-200)] text-[13px] font-semibold text-[var(--gray-600)] hover:bg-[var(--gray-50)] transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDecline(true)}
                className="h-9 px-3 rounded-xl text-[13px] font-semibold text-red-500 border border-red-100 hover:bg-red-50 transition-colors">
                Decline
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Event brief ──────────────────────────────────────────────────────────────

function EventBrief({ event }) {
  const [expanded, setExpanded] = useState(false);
  if (!event) return null;

  const startDt    = event.startDate ? new Date(event.startDate) : null;
  const endDt      = event.endDate   ? new Date(event.endDate)   : null;
  const address    = event.streetAddress || event.location;
  const dateStr    = startDt ? startDt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : null;
  const timeStr    = startDt ? startDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;
  const endTimeStr = endDt   ? endDt.toLocaleTimeString("en-US",   { hour: "numeric", minute: "2-digit" }) : null;
  const boothDisplay = event.boothSize ? event.boothSize.replace("x", " × ") + " ft" : null;

  const logistics = [
    event.indoorOutdoor === "indoor"   && { label: "Setting",  value: "Indoor"          },
    event.indoorOutdoor === "outdoor"  && { label: "Setting",  value: "Outdoor"         },
    event.indoorOutdoor === "both"     && { label: "Setting",  value: "Indoor & Outdoor"},
    boothDisplay                       && { label: "Booth",    value: boothDisplay      },
    event.accessToPower === "yes"      && { label: "Power",    value: "Available"       },
    event.accessToPower === "no"       && { label: "Power",    value: "No access"       },
    event.accessToPower === "limited"  && { label: "Power",    value: "Limited"         },
    event.accessToWater === "yes"      && { label: "Water",    value: "Available"       },
    event.accessToWater === "no"       && { label: "Water",    value: "No access"       },
    event.canopyAllowed === "yes"      && { label: "Canopy",   value: "Allowed"         },
    event.canopyAllowed === "no"       && { label: "Canopy",   value: "Not allowed"     },
    event.parkingAvailable === "yes"   && { label: "Parking",  value: "On-site"         },
    event.parkingAvailable === "paid"  && { label: "Parking",  value: "Paid"            },
    event.parkingAvailable === "no"    && { label: "Parking",  value: "None"            },
    event.wifiAvailability === "yes"   && { label: "WiFi",     value: "Available"       },
    event.securityPresence === "yes"   && { label: "Security", value: "On-site"         },
  ].filter(Boolean);

  const scheduleRows = [
    event.eventHours    && { label: "Event hours",     value: event.eventHours    },
    event.vendorLoadIn  && { label: "Vendor load-in",  value: event.vendorLoadIn  },
    event.vendorLoadOut && { label: "Vendor load-out", value: event.vendorLoadOut },
  ].filter(Boolean);

  const requirements = [
    event.requiresCoi   && "COI Required",
    event.rsvpRequired  && "RSVP Required",
    event.badgeRequired && "Badge Required",
  ].filter(Boolean);

  const hasExtra = event.description || scheduleRows.length > 0 || requirements.length > 0 || event.eventUrl || event.perks?.length > 0;

  return (
    <Card className="h-full flex flex-col">
      <div className="px-5 pt-5 pb-4 border-b border-[var(--gray-50)]">
        <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-1">Event</p>
        <h2 className="text-[16px] font-bold text-[var(--gray-900)] leading-snug">{event.name}</h2>
      </div>
      <div className="px-5 py-4 flex-1 space-y-2.5">
        {dateStr && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--gray-50)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gray-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--gray-800)] leading-snug">{dateStr}</p>
              {(timeStr || endTimeStr) && (
                <p className="text-xs text-[var(--gray-400)] mt-0.5">{timeStr}{endTimeStr ? ` – ${endTimeStr}` : ""}</p>
              )}
            </div>
          </div>
        )}
        {address && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--gray-50)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gray-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-[var(--gray-800)]">{address}</p>
          </div>
        )}
        {event.attendees > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--gray-50)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gray-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-[var(--gray-800)]">{Number(event.attendees).toLocaleString()} attendees</p>
          </div>
        )}

        {logistics.length > 0 && (
          <div className="pt-2 grid grid-cols-2 gap-1">
            {logistics.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--gray-50)]">
                <span className="text-[11px] text-[var(--gray-400)]">{item.label}</span>
                <span className="text-[11px] font-semibold text-[var(--gray-700)]">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {hasExtra && (
          <>
            <button type="button" onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)] transition-colors pt-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              {expanded ? "Less" : "More details"}
            </button>

            {expanded && (
              <div className="space-y-3 pt-1">
                {event.description && (
                  <p className="text-[13px] text-[var(--gray-600)] leading-relaxed">{event.description}</p>
                )}
                {scheduleRows.map((r, i) => (
                  <div key={i} className="flex justify-between text-[13px]">
                    <span className="text-[var(--gray-400)]">{r.label}</span>
                    <span className="font-medium text-[var(--gray-700)]">{r.value}</span>
                  </div>
                ))}
                {requirements.map((r, i) => (
                  <span key={i} className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--amber-50)] text-[var(--amber-700)] mr-1">{r}</span>
                ))}
                {event.perks?.map((p, i) => (
                  <span key={i} className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--violet-50)] text-[var(--violet-700)] mr-1">{p}</span>
                ))}
                {event.eventUrl && (
                  <a href={event.eventUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--violet-600)] hover:underline">
                    View event page
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// ─── Message card ─────────────────────────────────────────────────────────────

function MessageCard({ customer, initialMessage }) {
  if (!initialMessage) return null;
  return (
    <Card className="h-full flex flex-col">
      <div className="px-5 pt-5 pb-4 border-b border-[var(--gray-50)]">
        <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-1">Their Message</p>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
            style={{ background: "var(--gradient-vendor)" }}>
            {(customer?.name ?? "?").charAt(0).toUpperCase()}
          </div>
          <p className="text-[13px] font-semibold text-[var(--gray-700)]">{customer?.name ?? "Coordinator"}</p>
        </div>
      </div>
      <div className="px-5 py-4 flex-1">
        <p className="text-[13px] text-[var(--gray-600)] leading-relaxed whitespace-pre-wrap">{initialMessage}</p>
      </div>
    </Card>
  );
}

// ─── Offer card ───────────────────────────────────────────────────────────────

function OfferCard({ offer, tipCents = 0, offerAccepted, offerDeclined, canRevise, isConfirmed, inquiryId }) {
  if (!offer) return null;

  const borderColor = offerAccepted ? "var(--mint-200)" : offerDeclined ? "#fecaca" : "var(--gray-200)";
  const headerBg    = offerAccepted ? "var(--mint-50)"  : offerDeclined ? "#fef2f2"  : "var(--gray-50)";

  return (
    <Card style={{ border: `1px solid ${borderColor}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor, background: headerBg }}>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[var(--gray-800)]">
            {offerAccepted ? "Accepted Offer" : "Your Offer"}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 text-[var(--gray-400)]">v{offer.versionNumber}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {offer.proposalType && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-[var(--gray-500)]">
              {PROPOSAL_TYPE_LABELS[offer.proposalType]}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            offerAccepted ? "bg-[var(--mint-100)] text-[var(--mint-700)]"
            : offerDeclined ? "bg-red-100 text-red-600"
            : "bg-[var(--amber-50)] text-[var(--amber-600)]"
          }`}>
            {offerAccepted ? "✓ Accepted" : offerDeclined ? "Declined" : "Pending"}
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Price + deposit side by side */}
        <div className="flex items-end justify-between gap-6 mb-6">
          <div>
            <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-1.5">
              {offer.proposalType === "product" ? "You Pay" : offer.proposalType === "both" ? "Total" : "Customer Pays"}
            </p>
            <p className="text-[40px] font-bold text-[var(--gray-900)] leading-none tracking-tight">{fmt$(offer.totalPriceCents)}</p>
            {offer.proposalType === "cash" && tipCents > 0 && (
              <p className="text-[13px] font-medium text-[var(--violet-600)] mt-2">+ {fmt$(tipCents)} tip committed</p>
            )}
          </div>
          {offer.depositCents > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-1">Deposit</p>
              <p className="text-[20px] font-bold text-[var(--gray-700)]">{fmt$(offer.depositCents)}</p>
              {offer.depositType && (
                <p className="text-[11px] text-[var(--gray-400)] capitalize mt-0.5">{offer.depositType.replace(/_/g, " ")}</p>
              )}
            </div>
          )}
        </div>

        {/* Secondary meta */}
        {(offer.remainingBalanceCents > 0 || offer.expiresAt || (isConfirmed && offer.paymentStatus && offer.paymentStatus !== "none")) && (
          <div className="flex flex-wrap gap-6 pt-4 border-t border-[var(--gray-50)] mb-4">
            {offer.remainingBalanceCents > 0 && (
              <div>
                <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-0.5">Remaining</p>
                <p className="text-[13px] font-semibold text-[var(--gray-700)]">{fmt$(offer.remainingBalanceCents)}</p>
              </div>
            )}
            {offer.expiresAt && (
              <div>
                <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-0.5">Expires</p>
                <p className="text-[13px] font-semibold text-[var(--gray-700)]">{fmtDate(offer.expiresAt)}</p>
              </div>
            )}
            {isConfirmed && offer.paymentStatus && offer.paymentStatus !== "none" && (
              <div>
                <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-0.5">Payment</p>
                <p className="text-[13px] font-semibold capitalize" style={{ color: "var(--mint-600)" }}>
                  {offer.paymentStatus.replace(/_/g, " ")}
                </p>
              </div>
            )}
          </div>
        )}

        {offer.description && (
          <div className={offer.remainingBalanceCents > 0 || offer.expiresAt ? "" : "pt-4 border-t border-[var(--gray-50)]"}>
            <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-2">Offer Terms</p>
            <p className="text-[13px] text-[var(--gray-600)] leading-relaxed">{offer.description}</p>
          </div>
        )}

        {canRevise && (
          <div className="mt-5 pt-4 border-t border-[var(--gray-50)]">
            <Link href={`/dashboard/inquiries/${inquiryId}/offer/new`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)] transition-colors">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Revise this offer
            </Link>
          </div>
        )}
      </div>
    </Card>
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
    <Card>
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--gray-50)] transition-colors text-left">
        <div className="flex items-center gap-2.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="text-[13px] font-semibold text-[var(--gray-700)]">Revision history</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-500)]">{previous.length}</span>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
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
              <div key={offer.id} className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--gray-50)] last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold bg-[var(--gray-100)] px-1.5 py-0.5 rounded text-[var(--gray-400)]">v{offer.versionNumber}</span>
                  <span className="text-xs text-[var(--gray-400)]">{timeAgo(offer.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {diff !== null && diff !== 0 && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${diff > 0 ? "bg-red-50 text-red-500" : "bg-[var(--mint-50)] text-[var(--mint-600)]"}`}>
                      {diff > 0 ? `↑ ${fmt$(diff)}` : `↓ ${fmt$(Math.abs(diff))}`}
                    </span>
                  )}
                  <span className="text-[13px] font-semibold text-[var(--gray-500)]">{fmt$(offer.totalPriceCents)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Earnings card ────────────────────────────────────────────────────────────

const VENDOR_FEE_RATE = 0.10;

function calcVendorEarnings(baseCents, tipCents = 0) {
  const vehndrFee   = Math.round(baseCents * VENDOR_FEE_RATE);
  const netService  = baseCents - vehndrFee;
  const totalPayout = netService + tipCents;
  return { vehndrFee, netService, totalPayout };
}

function EarningsCard({ offer, tipCents = 0, committedTipCents = 0, budgetCents = 0, submittedAt }) {
  const baseCents      = offer.totalPriceCents ?? 0;
  const postPaymentTip = Math.max(0, tipCents - committedTipCents);
  const { vehndrFee, netService, totalPayout } = calcVendorEarnings(baseCents, tipCents);

  const f = (c) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD",
      minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(c / 100);

  const rows = [
    budgetCents > 0 && { label: "Customer's Budget",           value: f(budgetCents),        muted: true  },
    { label: "Agreed Offer Price",                              value: f(baseCents),           muted: false },
    { label: "VEHNDR Platform Fee (10%)",                       value: `−${f(vehndrFee)}`,     red: true    },
    { label: "Net Service Earnings",                            value: f(netService),          bold: true   },
    committedTipCents > 0 && { label: "Tip (committed with proposal)", value: `+${f(committedTipCents)}`, mint: true },
    postPaymentTip > 0    && { label: "Additional Tip (post-payment)", value: `+${f(postPaymentTip)}`,    violet: true },
  ].filter(Boolean);

  return (
    <Card style={{ border: "1px solid var(--mint-200)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--mint-100)]"
        style={{ background: "var(--mint-50)" }}>
        <span className="text-[13px] font-semibold" style={{ color: "var(--mint-800)" }}>Earnings Breakdown</span>
        <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: "var(--mint-600)" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Payment Received
        </span>
      </div>

      {/* Two-column interior: hero | table */}
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] divide-y sm:divide-y-0 sm:divide-x divide-[var(--gray-100)]">

        {/* Left: payout hero */}
        <div className="px-6 py-6 flex flex-col justify-center sm:min-w-[220px]">
          <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-1.5">Total Payout</p>
          <p className="text-[42px] font-bold leading-none tracking-tight" style={{ color: "var(--mint-700)" }}>
            {f(totalPayout)}
          </p>
          {submittedAt && (
            <p className="text-xs text-[var(--gray-400)] mt-3">
              Inquiry received<br />{timeAgo(submittedAt)}
            </p>
          )}
        </div>

        {/* Right: breakdown table */}
        <div className="divide-y divide-[var(--gray-50)]">
          {rows.map((row, i) => (
            <div key={i} className={`flex items-center justify-between px-5 py-3 ${row.muted ? "bg-[var(--gray-50)]" : "bg-white"}`}>
              <span className={`text-xs ${row.bold ? "font-semibold text-[var(--gray-700)]" : "text-[var(--gray-400)]"}`}>{row.label}</span>
              <span className={`text-xs font-semibold tabular-nums ${
                row.red    ? "text-red-500"
                : row.mint   ? "text-[var(--mint-600)]"
                : row.violet ? "text-[var(--violet-600)]"
                : row.bold   ? "text-[var(--gray-800)] text-sm font-bold"
                : "text-[var(--gray-600)]"
              }`}>{row.value}</span>
            </div>
          ))}
          {/* Total row */}
          <div className="flex items-center justify-between px-5 py-3.5" style={{ background: "var(--mint-50)" }}>
            <span className="text-[13px] font-bold" style={{ color: "var(--mint-800)" }}>Total Payout</span>
            <span className="text-[15px] font-bold tabular-nums" style={{ color: "var(--mint-700)" }}>{f(totalPayout)}</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-3 border-t border-[var(--gray-100)]">
        <p className="text-[11px] text-[var(--gray-400)] leading-relaxed">
          Customer pays the Stripe processing fee — it does not come out of your payout. Funds transfer within 2–7 business days via Stripe Connect.
        </p>
      </div>
    </Card>
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
      setInquiry(inq); setOffers(Array.isArray(list) ? list : []);
      setConfirmDecline(false);
    } catch (e) { alert(e.message || "Failed to decline inquiry."); }
    finally { setDeclining(false); }
  }

  async function handleQuickAccept() {
    setAccepting(true);
    try {
      const ct = inquiry?.coordinatorType;
      const proposalType = ct === "charges_fees" ? "product" : ct === "no_fees" ? "both" : "cash";
      const amount = proposalType === "product" ? (inquiry?.vendingFeeCents || 0) : (inquiry?.budgetCents || 0);
      await createOffer(id, { proposal_type: proposalType, total_price_cents: amount });
      const [inq, list] = await Promise.all([getInquiry(id), listOffers(id)]);
      setInquiry(inq); setOffers(Array.isArray(list) ? list : []);
    } catch (e) { alert(e.message || "Failed to create offer."); }
    finally { setAccepting(false); }
  }

  if (loading) return <LoadingSkeleton />;
  if (error)   return <ErrorState message={error} />;
  if (!inquiry) return null;

  const {
    customer, event, status,
    activeOffer, lastOffer,
    initialMessage, coordinatorType,
    budgetCents, vendingFeeCents,
    tipCents: proposalTipCents,
    submittedAt, marketplaceBooking,
  } = inquiry;

  const bookingTipCents  = marketplaceBooking?.tipCents ?? proposalTipCents ?? 0;
  const offerAccepted    = activeOffer?.status === "accepted";
  const offerDeclined    = !activeOffer && lastOffer?.status === "declined";
  const displayOffer     = activeOffer || (offerDeclined ? lastOffer : null);
  const hasOffer         = !!activeOffer;
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

  const primaryHref = (offerDeclined || canRevise || (needsProposal && !offerDeclined && !isExpired && !isVendorDeclined))
    ? `/dashboard/inquiries/${id}/offer/new` : null;
  const primaryLabel = offerDeclined ? "Send New Offer" : canRevise ? "Revise Offer" : "Send Offer";

  return (
    <div className="min-h-screen" style={{ background: "var(--gray-50)" }}>

      {/* Minimal sticky nav */}
      <div className="sticky top-0 z-20 border-b border-[var(--gray-100)]"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center gap-2 h-13">
          <Link href="/dashboard/inquiries"
            className="flex items-center gap-1.5 text-[13px] text-[var(--gray-400)] hover:text-[var(--gray-700)] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Inquiries
          </Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span className="text-[13px] font-semibold text-[var(--gray-800)] truncate">{customer?.name ?? "Inquiry"}</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-24 space-y-4">

        {/* 1. Hero — pipeline + customer + actions */}
        <HeroCard
          customer={customer} event={event} status={status}
          coordinatorType={coordinatorType} budgetCents={budgetCents}
          vendingFeeCents={vendingFeeCents} submittedAt={submittedAt}
          fresh={fresh} isExpired={isExpired} isVendorDeclined={isVendorDeclined}
          isConfirmed={isConfirmed} offerAccepted={offerAccepted}
          offerDeclined={offerDeclined} canRevise={canRevise}
          cashPending={cashPending} needsVendorPay={needsVendorPay}
          vendorPaid={vendorPaid} freeConfirmed={freeConfirmed}
          needsProposal={needsProposal} primaryHref={primaryHref} primaryLabel={primaryLabel}
          confirmDecline={confirmDecline} setConfirmDecline={setConfirmDecline}
          declining={declining} handleDecline={handleDecline}
          accepting={accepting} handleQuickAccept={handleQuickAccept}
          id={id}
        />

        {/* 2. Message + event — side by side */}
        {(initialMessage || event) && (
          <div className={`grid gap-4 ${initialMessage && event ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            <MessageCard customer={customer} initialMessage={initialMessage} />
            <EventBrief event={event} />
          </div>
        )}

        {/* 3. Status banners */}
        {offerDeclined && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-red-50 border border-red-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <div>
              <p className="text-[13px] font-semibold text-red-700">Offer declined</p>
              <p className="text-xs text-red-500 mt-0.5">The coordinator declined your proposal. Send a revised offer to keep things moving.</p>
            </div>
          </div>
        )}

        {isVendorDeclined && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-[var(--gray-50)] border border-[var(--gray-200)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <p className="text-[13px] font-semibold text-[var(--gray-600)]">You declined this inquiry</p>
          </div>
        )}

        {needsVendorPay && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-[var(--violet-50)] border border-[var(--violet-100)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[var(--violet-900)]">Payment required to confirm your spot</p>
              <p className="text-xs text-[var(--violet-600)] mt-0.5">Complete payment to lock in your participation.</p>
            </div>
            <Link href={`/dashboard/inquiries/${id}/pay`}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[var(--violet-600)] hover:bg-[var(--violet-700)] transition-colors">
              Pay now
            </Link>
          </div>
        )}

        {(vendorPaid || freeConfirmed) && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-[var(--mint-50)] border border-[var(--mint-100)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className="text-[13px] font-semibold text-[var(--mint-800)]">
              {freeConfirmed ? "Booking confirmed — no payment required" : "Payment complete — you're confirmed!"}
            </p>
          </div>
        )}

        {/* 4. Offer card */}
        {displayOffer && (
          <OfferCard
            offer={displayOffer}
            tipCents={proposalTipCents ?? 0}
            offerAccepted={offerAccepted}
            offerDeclined={offerDeclined}
            canRevise={canRevise}
            isConfirmed={isConfirmed}
            inquiryId={id}
          />
        )}

        {/* 5. Revision history */}
        {offers.length > 1 && <OfferHistory offers={offers} />}

        {/* 6. Earnings card */}
        {isConfirmed && displayOffer?.proposalType === "cash" && (
          <EarningsCard
            offer={displayOffer}
            tipCents={bookingTipCents}
            committedTipCents={proposalTipCents ?? 0}
            budgetCents={budgetCents ?? 0}
            submittedAt={submittedAt}
          />
        )}
      </div>

      {/* Mobile footer */}
      {!isExpired && !isVendorDeclined && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--gray-100)] px-4 py-3 flex gap-2"
          style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)" }}>
          <Link href={`/messages/${id}`}
            className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-[var(--gray-200)] text-[13px] font-semibold text-[var(--gray-700)] flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Messages
          </Link>
          {primaryHref && !offerAccepted && (
            <Link href={primaryHref}
              className="flex-1 h-11 rounded-xl flex items-center justify-center text-[13px] font-bold text-white"
              style={{ background: "linear-gradient(to right, var(--violet-600), var(--magenta-600))" }}>
              {primaryLabel}
            </Link>
          )}
          {cashPending && (
            <div className="flex-1 h-11 rounded-xl flex items-center justify-center text-[13px] font-semibold bg-[var(--mint-50)] border border-[var(--mint-200)] text-[var(--mint-700)]">
              Awaiting Payment
            </div>
          )}
          {needsVendorPay && (
            <Link href={`/dashboard/inquiries/${id}/pay`}
              className="flex-1 h-11 rounded-xl flex items-center justify-center text-[13px] font-bold text-white"
              style={{ background: "linear-gradient(to right, var(--violet-600), var(--magenta-600))" }}>
              Pay to Participate
            </Link>
          )}
          {(vendorPaid || freeConfirmed) && (
            <div className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-semibold bg-[var(--mint-50)] border border-[var(--mint-200)] text-[var(--mint-700)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Confirmed
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ─── Skeleton / Error ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gray-50)" }}>
      <div className="h-13 bg-white border-b border-[var(--gray-100)]" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-4">
        {/* Hero skeleton */}
        <div className="bg-white rounded-2xl p-6 space-y-5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="flex justify-between gap-2 pb-5 border-b border-[var(--gray-50)]">
            {[1,2,3,4,5].map(i => <div key={i} className="flex-1 h-5 bg-[var(--gray-100)] rounded-full animate-pulse" />)}
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--gray-100)] animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-[var(--gray-100)] rounded animate-pulse" />
              <div className="h-3 w-1/4 bg-[var(--gray-100)] rounded animate-pulse" />
              <div className="h-3 w-2/5 bg-[var(--gray-100)] rounded animate-pulse" />
            </div>
          </div>
          <div className="pt-4 border-t border-[var(--gray-50)] flex gap-2">
            <div className="h-9 w-28 bg-[var(--gray-100)] rounded-xl animate-pulse" />
            <div className="h-9 w-28 bg-[var(--gray-100)] rounded-xl animate-pulse" />
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 space-y-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="h-3 w-12 bg-[var(--gray-100)] rounded animate-pulse" />
              {[1,2,3].map(j => <div key={j} className="h-3 bg-[var(--gray-100)] rounded animate-pulse" />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gray-50)" }}>
      <div className="text-center">
        <p className="text-[13px] text-[var(--error)]">{message}</p>
        <Link href="/dashboard/inquiries" className="text-[13px] mt-3 block text-[var(--violet-600)] hover:underline">
          ← Back to inquiries
        </Link>
      </div>
    </div>
  );
}
