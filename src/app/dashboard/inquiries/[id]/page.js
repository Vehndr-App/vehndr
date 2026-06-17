"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGate from "../../../../components/AuthGate";
import CancelBookingModal from "../../../../components/CancelBookingModal";
import { getInquiry, declineInquiry, requestFinalPayment } from "../../../../services/inquiries";
import { listOffers, createOffer, withdrawOffer } from "../../../../services/offers";
import { marketplaceBreakdown, vendorBoothBreakdown } from "../../../../utils/marketplacePricing";

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

function formatLoadTime(stored) {
  if (!stored) return stored;
  const m = stored.match(/^(\d{4}-\d{2}-\d{2}) (.+)$/);
  if (!m) return stored;
  const d = new Date(m[1] + "T00:00:00");
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${m[2]}`;
}

function fmt$(cents) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

function displayTipCents(inquiry) {
  const booking = inquiry?.marketplaceBooking;
  if (!booking) return inquiry?.tipCents ?? 0;
  return booking.paymentStatus === "fully_paid" ? (booking.tipCents ?? 0) : (inquiry?.tipCents ?? 0);
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
  coordinatorType, budgetCents, vendingFeeCents, tipCents, submittedAt,
  fresh, isExpired, isVendorDeclined, isCancelled, isConfirmed,
  offerAccepted, offerDeclined, canRevise, canWithdraw,
  cashPending, needsVendorPay, vendorPaid, freeConfirmed,
  needsProposal, primaryHref, primaryLabel,
  confirmDecline, setConfirmDecline,
  declining, handleDecline, accepting, handleQuickAccept,
  withdrawing, handleWithdrawOffer,
  canCancel, onCancel,
  canRequestFinalPayment, finalPaymentRequested, requestingFinalPayment, onRequestFinalPayment,
  id,
}) {
  const statusLabel = isCancelled ? "Cancelled"
    : isVendorDeclined ? "Declined"
    : isConfirmed ? "Booked"
    : status === "actions_needed" || status === "offer_updated" ? "Offer Sent"
    : STATUS_PIPELINE.find(s => s.key === status)?.label ?? status;

  const statusStyle = isCancelled
    ? { bg: "#FEF2F2", color: "#dc2626" }
    : isExpired || isVendorDeclined
    ? { bg: "var(--gray-100)", color: "var(--gray-500)" }
    : isConfirmed
    ? { bg: "var(--mint-50)", color: "var(--mint-700)" }
    : status === "actions_needed" || status === "offer_updated"
    ? { bg: "var(--violet-100)", color: "var(--violet-700)" }
    : { bg: "var(--gray-100)", color: "var(--gray-600)" };

  return (
    <Card>
      {/* Pipeline */}
      {!isExpired && !isVendorDeclined && !isCancelled && (
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

      {/* Budget / fee row */}
      {(budgetCents > 0 || vendingFeeCents > 0 || tipCents > 0 || coordinatorType === "no_fees") && (
        <div className="px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-1.5">
          {coordinatorType === "hiring_vendor" && budgetCents > 0 && !needsVendorPay && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--gray-400)] uppercase tracking-wider">You&apos;d receive</span>
              <span className="text-[15px] font-bold text-[var(--gray-900)]">{fmt$(marketplaceBreakdown(budgetCents, tipCents).vendorPayoutCents)}</span>
            </div>
          )}
          {coordinatorType === "charges_fees" && vendingFeeCents > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--gray-400)] uppercase tracking-wider">Vending Fee</span>
              <span className="text-[15px] font-bold text-[var(--gray-900)]">{fmt$(vendingFeeCents)}</span>
            </div>
          )}
          {coordinatorType === "no_fees" && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--gray-400)] uppercase tracking-wider">Cost</span>
              <span className="text-[13px] font-semibold text-[var(--mint-700)]">Free to join</span>
            </div>
          )}
          {tipCents > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--gray-400)] uppercase tracking-wider">Tip</span>
              <span className="text-[15px] font-bold text-[var(--violet-600)]">+{fmt$(tipCents)}</span>
            </div>
          )}
        </div>
      )}

      <Divider />

      {/* Action bar */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-2">
        {/* Send Offer / Accept / Decline — only when no offer is pending */}
        {needsProposal && !isExpired && !isVendorDeclined && primaryHref && (
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

        {needsProposal && !isExpired && !isVendorDeclined && !offerDeclined && (
          <button type="button" onClick={handleQuickAccept} disabled={accepting}
            className="h-9 px-4 rounded-xl border border-[var(--mint-300)] text-[13px] font-semibold text-[var(--mint-700)] bg-[var(--mint-50)] hover:bg-[var(--mint-100)] disabled:opacity-50 transition-colors flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {accepting ? "Accepting…" : "Accept"}
          </button>
        )}

        {needsProposal && !isExpired && !isVendorDeclined && !offerAccepted && (
          confirmDecline ? (
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
              className="h-9 px-4 rounded-xl text-[13px] font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Decline
            </button>
          )
        )}

        {/* Withdraw Offer — only when offer is pending (sent but not yet accepted) */}
        {canWithdraw && (
          <button type="button" onClick={handleWithdrawOffer} disabled={withdrawing}
            className="h-9 px-4 rounded-xl text-[13px] font-semibold text-[var(--gray-600)] border border-[var(--gray-200)] bg-white hover:bg-[var(--gray-50)] disabled:opacity-50 transition-colors flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
            </svg>
            {withdrawing ? "Withdrawing…" : "Withdraw Offer"}
          </button>
        )}

        {/* Message */}
        <Link href={`/messages/${id}`}
          className="h-9 px-4 rounded-xl border border-[var(--gray-200)] text-[13px] font-semibold text-[var(--gray-700)] flex items-center gap-1.5 hover:bg-[var(--gray-50)] transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Message
        </Link>

        {/* Status badges */}
        {needsVendorPay && (
          <Link href={`/dashboard/inquiries/${id}/pay`}
            className="h-9 px-4 rounded-xl text-[13px] font-bold text-white flex items-center gap-1.5"
            style={{ background: "linear-gradient(to right, var(--violet-600), var(--magenta-600))" }}>
            Pay Vending Fee
          </Link>
        )}
        {cashPending && (
          <span className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-[var(--mint-50)] border border-[var(--mint-200)] text-[var(--mint-700)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Awaiting payment
          </span>
        )}

        {canRequestFinalPayment && (
          finalPaymentRequested ? (
            <span className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-[var(--mint-50)] border border-[var(--mint-200)] text-[var(--mint-700)]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Payment request sent
            </span>
          ) : (
            <button type="button" onClick={onRequestFinalPayment} disabled={requestingFinalPayment}
              className="h-9 px-4 rounded-xl text-[13px] font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              style={{ background: "linear-gradient(to right, var(--violet-600), var(--magenta-600))" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
              {requestingFinalPayment ? "Sending…" : "Request Final Payment"}
            </button>
          )
        )}
        {(vendorPaid || freeConfirmed) && (
          <span className="h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-[var(--mint-50)] border border-[var(--mint-200)] text-[var(--mint-700)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {freeConfirmed ? "Confirmed" : "Booking Confirmed"}
          </span>
        )}

        {canCancel && (
          <button type="button" onClick={onCancel}
            className="h-9 px-4 rounded-xl text-[13px] font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5 ml-auto">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            Cancel Booking
          </button>
        )}
      </div>
    </Card>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventBrief({ event }) {
  if (!event) return null;

  const address = event.streetAddress || event.location;
  const dateStr = (() => {
    if (!event.startDate) return null;
    const parse = (r) => new Date(r.includes("T") ? r : r + "T00:00:00");
    const fmtFull = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const fmtShort = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const start = parse(event.startDate);
    if (!event.endDate) return fmtFull(start);
    const end = parse(event.endDate);
    if (start.toDateString() === end.toDateString()) return fmtFull(start);
    return `${fmtShort(start)} – ${fmtShort(end)}, ${start.getFullYear()}`;
  })();

  // Show top-level load times only for single-day events (multi-day shows per-day in DailyScheduleCard)
  const hasPerDaySchedule = event.dailySchedule?.some(d => d.vendorLoadIn || d.vendorLoadOut);
  const showLoadTimes = !hasPerDaySchedule && (event.vendorLoadIn || event.vendorLoadOut);

  return (
    <Link
      href={`/events/${event.id}`}
      className="block bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow h-full"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
    >
      <div className="h-1 w-full" style={{ background: "var(--gradient-organizer)" }} />
      <div className="px-5 py-4">
        <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-1">Event</p>
        <p className="text-[15px] font-bold text-[var(--gray-900)] leading-snug">{event.name}</p>
        {dateStr && <p className="text-xs text-[var(--gray-500)] mt-1">{dateStr}</p>}
        {address && <p className="text-xs text-[var(--gray-400)] mt-0.5 truncate">{address}</p>}
        {showLoadTimes && (
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            {event.vendorLoadIn && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-[var(--gray-400)] uppercase tracking-wide">Load-in</span>
                <span className="text-xs font-medium text-[var(--gray-700)]">{event.vendorLoadIn}</span>
              </div>
            )}
            {event.vendorLoadOut && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-[var(--gray-400)] uppercase tracking-wide">Load-out</span>
                <span className="text-xs font-medium text-[var(--gray-700)]">{event.vendorLoadOut}</span>
              </div>
            )}
          </div>
        )}
        <p className="text-xs font-semibold text-[var(--violet-600)] mt-3 flex items-center gap-1">
          View event
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </p>
      </div>
    </Link>
  );
}

// ─── Daily schedule card ──────────────────────────────────────────────────────

function fmtTime(val) {
  if (!val) return null;
  const [h, m] = val.split(":").map(Number);
  if (isNaN(h)) return val;
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

function DailyScheduleCard({ event }) {
  if (!event?.dailySchedule?.length) return null;
  const hasMultipleDays = event.dailySchedule.length > 1;
  const hasAnyData = event.dailySchedule.some(
    (d) => d.startTime || d.endTime || d.vendorLoadIn || d.vendorLoadOut
  );
  if (!hasAnyData) return null;

  return (
    <Card>
      <div className="px-5 pt-5 pb-1 border-b border-[var(--gray-50)]">
        <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-1">
          {hasMultipleDays ? "Event Schedule by Day" : "Event Schedule"}
        </p>
      </div>
      <div className="px-5 py-3 divide-y divide-[var(--gray-50)]">
        {event.dailySchedule.map((day) => {
          const start   = fmtTime(day.startTime);
          const end     = fmtTime(day.endTime);
          const loadIn  = fmtTime(day.vendorLoadIn);
          const loadOut = fmtTime(day.vendorLoadOut);
          if (!start && !end && !loadIn && !loadOut) return null;
          return (
            <div key={day.date} className="py-3">
              {hasMultipleDays && (
                <p className="text-[11px] font-bold text-[var(--violet-700)] uppercase tracking-wide mb-2">
                  {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric",
                  })}
                </p>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {start && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[var(--gray-400)] uppercase tracking-wide w-16 shrink-0">Start</span>
                    <span className="text-[13px] text-[var(--gray-700)] font-medium">{start}</span>
                  </div>
                )}
                {end && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[var(--gray-400)] uppercase tracking-wide w-16 shrink-0">End</span>
                    <span className="text-[13px] text-[var(--gray-700)] font-medium">{end}</span>
                  </div>
                )}
                {loadIn && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[var(--gray-400)] uppercase tracking-wide w-16 shrink-0">Load-in</span>
                    <span className="text-[13px] text-[var(--gray-700)] font-medium">{loadIn}</span>
                  </div>
                )}
                {loadOut && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[var(--gray-400)] uppercase tracking-wide w-16 shrink-0">Load-out</span>
                    <span className="text-[13px] text-[var(--gray-700)] font-medium">{loadOut}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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

// ─── Price breakdown (cash offers) ───────────────────────────────────────────

function CashBreakdown({ totalPriceCents, tipCents = 0, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const pricing   = marketplaceBreakdown(totalPriceCents, tipCents);
  const vehndrFee = pricing.vendorFeeCents;
  const totalVehndrFee = pricing.vehndrFeeCents;
  const stripeFee = pricing.stripeFeeCents;
  const tax       = pricing.taxCents;
  const payout    = pricing.vendorPayoutCents;

  // The bar shows the full customer-facing charge split into payout, fees, Stripe, and tax.
  const barTotal = pricing.totalChargeCents;
  const segments = [
    { label: "Your payout", value: payout,    pct: payout    / barTotal, color: "bg-violet-500",  dot: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50"  },
    { label: "VEHNDR",      value: totalVehndrFee, pct: totalVehndrFee / barTotal, color: "bg-emerald-500", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Stripe",      value: stripeFee,  pct: stripeFee / barTotal, color: "bg-gray-400",    dot: "bg-gray-400",    text: "text-gray-600",    bg: "bg-gray-50"    },
    { label: "Tax",         value: tax,        pct: tax       / barTotal, color: "bg-amber-400",   dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  ];

  return (
    <div className="border-t border-[var(--gray-100)]">
      {/* Toggle row */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--gray-50)] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          <span className="text-[12px] font-semibold text-[var(--gray-500)]">Fee breakdown</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold" style={{ color: "var(--mint-700)" }}>{fmt$(payout)} to you</span>
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4">
          {/* Visual bar */}
          <div className="flex rounded-full overflow-hidden h-2 gap-px">
            {segments.map(({ label, pct, color }) => (
              <div
                key={label}
                className={`${color} transition-all`}
                style={{ width: `${Math.max(pct * 100, 4)}%` }}
              />
            ))}
          </div>

          {/* Grid of segments */}
          <div className="grid grid-cols-2 gap-2">
            {segments.map(({ label, value, dot, text, bg }) => (
              <div key={label} className={`flex items-center justify-between px-3 py-2 rounded-xl ${bg}`}>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                  <span className="text-[11px] text-[var(--gray-500)] font-medium">{label}</span>
                </div>
                <span className={`text-[11px] font-bold ${text}`}>{fmt$(value)}</span>
              </div>
            ))}
          </div>

          {/* Line-item detail */}
          <div className="space-y-2 pt-1 border-t border-[var(--gray-100)]">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-400)]">Agreed price</span>
              <span className="font-medium text-[var(--gray-700)]">{fmt$(totalPriceCents)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-400)]">VEHNDR fee (10%)</span>
              <span className="font-medium text-red-400">−{fmt$(vehndrFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-400)]">Stripe processing (2.9% + $0.30)</span>
              <span className="font-medium text-red-400">−{fmt$(stripeFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-400)]">Tax collected</span>
              <span className="font-medium text-[var(--gray-500)]">{fmt$(tax)}</span>
            </div>
            {tipCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--gray-400)]">Committed tip</span>
                <span className="font-medium text-[var(--violet-600)]">+{fmt$(tipCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-[var(--gray-100)]">
              <span className="font-semibold text-[var(--gray-700)]">You receive</span>
              <span className="font-bold" style={{ color: "var(--mint-700)" }}>{fmt$(payout)}</span>
            </div>
          </div>

          <p className="text-[10px] text-[var(--gray-400)] leading-relaxed">
            Coordinator pays {fmt$(pricing.totalChargeCents)} at checkout. Tax is remitted by VEHNDR and is not part of payout.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Offer card ───────────────────────────────────────────────────────────────

function OfferCard({ offer, tipCents = 0, offerAccepted, offerDeclined, canRevise, isConfirmed, inquiryId }) {
  if (!offer) return null;

  const changesRequested = offer.status === "changes_requested";
  const statusColor = offerAccepted ? "mint" : offerDeclined ? "red" : changesRequested ? "violet" : "amber";
  const statusLabel = offerAccepted ? "Accepted" : offerDeclined ? "Declined" : changesRequested ? "Changes requested" : "Pending";
  const isCash = offer.proposalType === "cash";

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--gray-100)]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[var(--gray-800)]">
            {offerAccepted ? "Accepted Offer" : offerDeclined ? "Declined Offer" : "Offer Sent"}
          </span>
          {offer.versionNumber > 1 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--gray-100)] text-[var(--gray-400)]">v{offer.versionNumber}</span>
          )}
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
          statusColor === "mint"  ? "bg-[var(--mint-50)]  text-[var(--mint-700)]"
        : statusColor === "red"   ? "bg-red-50 text-red-600"
        : statusColor === "violet" ? "bg-[var(--violet-50)] text-[var(--violet-700)]"
        :                           "bg-[var(--amber-50)] text-[var(--amber-600)]"
        }`}>{statusLabel}</span>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-[var(--gray-500)]">{isCash ? "Your base" : offer.proposalType === "product" ? "Booth fee" : "Price"}</span>
          <span className="text-[22px] font-bold text-[var(--gray-900)] tabular-nums">
            {fmt$(offer.totalPriceCents)}
          </span>
        </div>
        {offer.depositCents > 0 && (
          <div className="flex items-baseline justify-between pt-2 border-t border-[var(--gray-100)]">
            <span className="text-sm text-[var(--gray-500)]">Deposit{offer.depositType ? ` (${offer.depositType.replace(/_/g, " ")})` : ""}</span>
            <span className="text-sm font-semibold text-[var(--gray-700)] tabular-nums">{fmt$(offer.depositCents)}</span>
          </div>
        )}
        {offer.remainingBalanceCents > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[var(--gray-500)]">Remaining balance</span>
            <span className="text-sm font-semibold text-[var(--gray-700)] tabular-nums">{fmt$(offer.remainingBalanceCents)}</span>
          </div>
        )}
        {offer.expiresAt && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[var(--gray-500)]">Expires</span>
            <span className="text-sm font-semibold text-[var(--gray-700)]">{fmtDate(offer.expiresAt)}</span>
          </div>
        )}
        {isConfirmed && offer.paymentStatus && offer.paymentStatus !== "none" && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[var(--gray-500)]">Payment</span>
            <span className="text-sm font-semibold capitalize" style={{ color: "var(--mint-600)" }}>{offer.paymentStatus.replace(/_/g, " ")}</span>
          </div>
        )}
        {offer.description && (
          <div className="pt-2 border-t border-[var(--gray-100)]">
            <p className="text-xs text-[var(--gray-400)] font-semibold uppercase tracking-wider mb-1">Note</p>
            <p className="text-[13px] text-[var(--gray-600)] leading-relaxed">{offer.description}</p>
          </div>
        )}
        {canRevise && (
          <div className="pt-1">
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
              <div key={offer.id} className="px-6 py-3.5 border-b border-[var(--gray-50)] last:border-0">
                <div className="flex items-center justify-between">
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
                {offer.description && (
                  <p className="text-xs text-[var(--gray-400)] mt-1.5 leading-snug">{offer.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Earnings card ────────────────────────────────────────────────────────────

function EarningsCard({ offer, tipCents = 0 }) {
  const total      = offer.totalPriceCents ?? 0;
  const pricing    = marketplaceBreakdown(total, tipCents);
  const vehndrFee  = pricing.vendorFeeCents;
  const stripeFee  = pricing.stripeFeeCents;
  const tax        = pricing.taxCents;
  const payout     = pricing.vendorPayoutCents;

  return (
    <Card style={{ border: "1px solid var(--mint-200)" }}>
      <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--mint-100)]"
        style={{ background: "var(--mint-50)" }}>
        <span className="text-[13px] font-semibold" style={{ color: "var(--mint-800)" }}>Your Payout</span>
        <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: "var(--mint-600)" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Payment confirmed
        </span>
      </div>

      <div className="px-5 py-5 space-y-3">
        <p className="text-[38px] font-bold leading-none tracking-tight" style={{ color: "var(--mint-700)" }}>
          {fmt$(payout)}
        </p>

        <div className="space-y-2 pt-1">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--gray-500)]">Agreed price</span>
            <span className="font-medium text-[var(--gray-800)] tabular-nums">{fmt$(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--gray-500)]">VEHNDR fee (10%)</span>
            <span className="font-medium text-red-400 tabular-nums">−{fmt$(vehndrFee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--gray-500)]">Stripe processing</span>
            <span className="font-medium text-red-400 tabular-nums">−{fmt$(stripeFee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--gray-500)]">Tax collected</span>
            <span className="font-medium text-[var(--gray-500)] tabular-nums">{fmt$(tax)}</span>
          </div>
          {tipCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-500)]">Tip</span>
              <span className="font-medium text-[var(--violet-600)] tabular-nums">+{fmt$(tipCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t border-[var(--gray-100)]">
            <span className="font-semibold text-[var(--gray-700)]">You receive</span>
            <span className="font-bold tabular-nums" style={{ color: "var(--mint-700)" }}>{fmt$(payout)}</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-[var(--gray-100)]">
        <p className="text-[11px] text-[var(--gray-400)]">
          Fees deducted from your payout. Transfers within 2–7 business days after payment clears.
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
  const [withdrawing,    setWithdrawing]    = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [requestingFinalPayment, setRequestingFinalPayment] = useState(false);
  const [finalPaymentRequested,  setFinalPaymentRequested]  = useState(false);

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

  async function handleWithdrawOffer() {
    setWithdrawing(true);
    try {
      await withdrawOffer(id, inquiry?.activeOffer?.id);
      const [inq, list] = await Promise.all([getInquiry(id), listOffers(id)]);
      setInquiry(inq); setOffers(Array.isArray(list) ? list : []);
    } catch (e) { alert(e.message || "Failed to withdraw offer."); }
    finally { setWithdrawing(false); }
  }

  async function handleRequestFinalPayment() {
    setRequestingFinalPayment(true);
    try {
      await requestFinalPayment(id);
      setFinalPaymentRequested(true);
    } catch (e) { alert(e.message || "Failed to send payment request."); }
    finally { setRequestingFinalPayment(false); }
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

  const bookingTipCents  = displayTipCents(inquiry);
  const offerAccepted    = activeOffer?.status === "accepted";
  const offerDeclined    = !activeOffer && lastOffer?.status === "declined";
  const offerChangesRequested = !activeOffer && lastOffer?.status === "changes_requested";
  const displayOffer     = activeOffer || ((offerDeclined || offerChangesRequested) ? lastOffer : null);
  const hasOffer         = !!activeOffer;
  const needsProposal    = !hasOffer || offerDeclined;
  const canRevise        = hasOffer && !offerAccepted && !offerDeclined;
  const isExpired        = status === "expired";
  const isVendorDeclined = status === "vendor_declined";
  const isConfirmed      = status === "scheduled" || status === "completed";
  const isCancelled      = marketplaceBooking?.status === "cancelled" || status === "cancelled";
  const fresh            = isRecent(submittedAt);

  const vendorPaid     = hasOffer && activeOffer?.proposalType === "product" && status === "scheduled" && !isCancelled;
  const needsVendorPay = hasOffer && activeOffer?.proposalType === "product" && status !== "scheduled" && !isCancelled;
  const cashPending    = offerAccepted && activeOffer?.proposalType === "cash" && !isConfirmed && !isCancelled;
  const freeConfirmed  = offerAccepted && activeOffer?.proposalType === "both" && !isCancelled;
  const canWithdraw    = hasOffer && !offerAccepted && !offerDeclined && !isExpired && !isVendorDeclined && !isCancelled;
  const canCancel      = !!marketplaceBooking && !isCancelled && (isConfirmed || offerAccepted);
  const canRequestFinalPayment = marketplaceBooking?.paymentStatus === "deposit_paid"
    && (activeOffer?.remainingBalanceCents ?? 0) > 0
    && !isCancelled;

  const primaryHref = (offerDeclined || canRevise || (needsProposal && !offerDeclined && !isExpired && !isVendorDeclined))
    ? `/dashboard/inquiries/${id}/offer/new` : null;
  const primaryLabel = offerDeclined ? "Send New Offer" : offerChangesRequested ? "Review Tip & Send Offer" : canRevise ? "Revise Offer" : "Counter Offer";

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

        {/* Cancelled banner */}
        {isCancelled && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <div className="text-sm text-red-700">
              <p className="font-semibold">This booking was cancelled{marketplaceBooking?.cancelledByRole ? ` by the ${marketplaceBooking.cancelledByRole}` : ""}.</p>
              {(marketplaceBooking?.refundAmountCents ?? 0) > 0 && (
                <p className="mt-0.5">A refund of {fmt$(marketplaceBooking.refundAmountCents)} {marketplaceBooking?.refundStatus === "full_refund" ? "(full)" : "(partial)"} is being processed.</p>
              )}
            </div>
          </div>
        )}

        {/* Cancel booking modal */}
        {showCancelModal && (
          <CancelBookingModal
            inquiry={inquiry}
            booking={marketplaceBooking}
            role="vendor"
            onClose={() => setShowCancelModal(false)}
            onCancelled={async () => {
              setShowCancelModal(false);
              const [inq, list] = await Promise.all([getInquiry(id), listOffers(id)]);
              setInquiry(inq); setOffers(Array.isArray(list) ? list : []);
            }}
          />
        )}

        {/* 1. Hero — pipeline + customer + actions */}
        <HeroCard
          customer={customer} event={event} status={status}
          coordinatorType={coordinatorType} budgetCents={budgetCents}
          vendingFeeCents={vendingFeeCents} tipCents={proposalTipCents ?? 0} submittedAt={submittedAt}
          fresh={fresh} isExpired={isExpired} isVendorDeclined={isVendorDeclined}
          isCancelled={isCancelled}
          isConfirmed={isConfirmed} offerAccepted={offerAccepted}
          offerDeclined={offerDeclined} canRevise={canRevise}
          cashPending={cashPending} needsVendorPay={needsVendorPay}
          vendorPaid={vendorPaid} freeConfirmed={freeConfirmed}
          needsProposal={needsProposal} primaryHref={primaryHref} primaryLabel={primaryLabel}
          confirmDecline={confirmDecline} setConfirmDecline={setConfirmDecline}
          declining={declining} handleDecline={handleDecline}
          accepting={accepting} handleQuickAccept={handleQuickAccept}
          canWithdraw={canWithdraw} withdrawing={withdrawing} handleWithdrawOffer={handleWithdrawOffer}
          canCancel={canCancel} onCancel={() => setShowCancelModal(true)}
          canRequestFinalPayment={canRequestFinalPayment}
          finalPaymentRequested={finalPaymentRequested}
          requestingFinalPayment={requestingFinalPayment}
          onRequestFinalPayment={handleRequestFinalPayment}
          id={id}
        />

        {/* 2a. Earnings confirmed card — after offer is accepted/booked */}
        {(offerAccepted || isConfirmed) && displayOffer?.proposalType === "cash" && coordinatorType === "hiring_vendor" && (
          <EarningsCard
            offer={displayOffer}
            tipCents={bookingTipCents}
          />
        )}

        {/* 2b. Fee breakdown — shown for cash engagements until the confirmed EarningsCard takes over */}
        {!(offerAccepted || isConfirmed) && coordinatorType === "hiring_vendor" && (() => {
          const amountCents = (activeOffer?.proposalType === "cash" && activeOffer.totalPriceCents > 0)
            ? activeOffer.totalPriceCents
            : (budgetCents ?? 0);
          if (!amountCents) return null;
          return (
            <Card>
              <div className="px-5 py-3.5 border-b border-[var(--gray-100)]">
                <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest">Fee Breakdown</p>
                <p className="text-[11px] text-[var(--gray-400)] mt-0.5">
                  {activeOffer
                    ? `Based on the agreed amount of ${fmt$(amountCents)}`
                    : `Based on the coordinator's proposed budget of ${fmt$(amountCents)}`}
                </p>
              </div>
              <CashBreakdown totalPriceCents={amountCents} tipCents={proposalTipCents ?? 0} defaultOpen={true} />
            </Card>
          );
        })()}

        {/* 2c. Fee breakdown — shown for product (vendor-pays) engagements */}
        {coordinatorType === "charges_fees" && !isCancelled && (() => {
          const baseCents = (activeOffer?.proposalType === "product" && activeOffer.totalPriceCents > 0)
            ? activeOffer.totalPriceCents
            : (vendingFeeCents ?? 0);
          if (!baseCents) return null;
          const boothPricing = vendorBoothBreakdown(baseCents);
          return (
            <Card>
              <div className="px-5 py-3.5 border-b border-[var(--gray-100)]">
                <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest">What You&apos;ll Pay</p>
                <p className="text-[11px] text-[var(--gray-400)] mt-0.5">
                  {activeOffer
                    ? `Based on the agreed booth fee of ${fmt$(baseCents)}`
                    : `Based on the event vending fee of ${fmt$(baseCents)}`}
                </p>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--gray-500)]">Booth fee</span>
                  <span className="font-medium text-[var(--gray-800)]">{fmt$(baseCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--gray-500)]">VEHNDR fee (10%)</span>
                  <span className="font-medium text-[var(--gray-800)]">{fmt$(boothPricing.vehndrFeeCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--gray-500)]">Tax (8.25%)</span>
                  <span className="font-medium text-[var(--gray-800)]">{fmt$(boothPricing.taxCents)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-[var(--gray-100)]">
                  <span className="font-semibold text-[var(--gray-700)]">Total you pay</span>
                  <span className="font-bold text-[var(--gray-900)]">{fmt$(boothPricing.totalCents)}</span>
                </div>

                {/* EC payout breakdown */}
                <div className="pt-3 mt-1 border-t border-[var(--gray-100)] space-y-2">
                  <p className="text-[11px] font-bold text-[var(--gray-400)] uppercase tracking-wider">Coordinator receives</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--gray-500)]">Booth fee collected</span>
                    <span className="font-medium text-[var(--gray-800)]">{fmt$(baseCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--gray-500)]">VEHNDR fee (10%)</span>
                    <span className="font-medium text-red-400">−{fmt$(boothPricing.ecRecipientFeeCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--gray-500)]">Stripe fee (2.9% + $0.30)</span>
                    <span className="font-medium text-red-400">−{fmt$(boothPricing.stripeFeeCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-[var(--gray-100)]">
                    <span className="font-semibold text-[var(--gray-700)]">Coordinator payout</span>
                    <span className="font-bold" style={{ color: "var(--mint-700)" }}>{fmt$(boothPricing.ecPayoutCents)}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })()}

        {/* 3. Message + event — side by side */}
        {(initialMessage || event) && (
          <div className={`grid gap-4 ${initialMessage && event ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            <MessageCard customer={customer} initialMessage={initialMessage} />
            <EventBrief event={event} />
          </div>
        )}

        {/* 3b. Per-day schedule */}
        <DailyScheduleCard event={event} />

        {/* 4. Status banners */}
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

        {offerChangesRequested && (
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-[var(--violet-50)] border border-[var(--violet-100)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <p className="text-[13px] font-semibold text-[var(--violet-800)]">Tip updated</p>
              <p className="text-xs text-[var(--violet-600)] mt-0.5">The coordinator changed the committed tip. Send an updated offer to continue.</p>
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

        {/* 5. Offer card */}
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

        {/* 6. Revision history */}
        {offers.length > 1 && <OfferHistory offers={offers} />}

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
              Pay Vending Fee
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
