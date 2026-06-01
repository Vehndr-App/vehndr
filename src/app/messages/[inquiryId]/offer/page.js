"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../contexts/AuthContext";
import { listOffers, acceptOffer, declineOffer } from "../../../../services/offers";
import { getInquiry, sendMessage, updateInquiryTip } from "../../../../services/inquiries";

function formatPrice(cents) {
  if (!cents) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtExact(cents) {
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

function CostBreakdown({ offer, tipCents = 0 }) {
  const [open, setOpen] = useState(false);
  const base       = offer.totalPriceCents;
  const tip        = tipCents ?? 0;
  const total      = base + tip;
  const hasDeposit = offer.depositCents > 0;
  const depTotal   = hasDeposit ? offer.depositCents : 0;

  return (
    <div className="rounded-2xl border border-[var(--violet-100)] bg-[var(--violet-50)] overflow-hidden">
      {/* Toggle row — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="text-[11px] font-semibold text-[var(--violet-700)] uppercase tracking-wider">
            {hasDeposit ? "Est. deposit today" : "Est. checkout total"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--gray-900)]">{fmtExact(hasDeposit ? depTotal : total)}</span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet-400)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {/* Expanded line items */}
      {open && (
        <div className="border-t border-[var(--violet-100)] px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--violet-700)]">Base service</span>
            <span className="font-semibold text-[var(--gray-800)]">{formatPrice(base)}</span>
          </div>
          {tip > 0 ? (
            <div className="flex justify-between text-xs">
              <span className="text-[var(--violet-700)]">Tip</span>
              <span className="font-semibold text-[var(--violet-700)]">+{formatPrice(tip)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-xs">
              <span className="text-[var(--violet-500)]">Tip</span>
              <span className="text-[var(--gray-400)] italic">Optional at checkout</span>
            </div>
          )}
          <div className="pt-1.5 mt-0.5 border-t border-[var(--violet-200)]">
            <div className="flex justify-between">
              <span className="text-xs font-bold text-[var(--violet-800)]">
                {hasDeposit ? "Full booking total" : "Est. total due"}
              </span>
              <span className="text-sm font-bold text-[var(--gray-900)]">{fmtExact(total)}</span>
            </div>
            {hasDeposit && (
              <div className="flex justify-between mt-1">
                <span className="text-xs font-semibold text-[var(--violet-700)]">Est. deposit today</span>
                <span className="text-xs font-bold text-[var(--violet-800)]">{fmtExact(depTotal)}</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-[var(--violet-400)] pt-1">Platform fee &amp; processing deducted from vendor payout</p>
        </div>
      )}
    </div>
  );
}

function TipEditor({ tipCents = 0, onTipUpdate }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(tipCents > 0 ? (tipCents / 100).toFixed(2) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setInput(tipCents > 0 ? (tipCents / 100).toFixed(2) : "");
  }, [editing, tipCents]);

  async function handleSave() {
    const newCents = Math.round(parseFloat(input || 0) * 100);
    setEditing(false);
    if (isNaN(newCents) || newCents < 0 || newCents === tipCents) return;

    setSaving(true);
    try {
      await onTipUpdate?.(newCents);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-5 py-4 border-t border-[var(--gray-100)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--gray-700)]">Tip</p>
          <p className="text-xs text-[var(--gray-400)] mt-0.5">Changing this sends the offer back to vendor review.</p>
        </div>
        {editing ? (
          <div className="flex items-center gap-1">
            <span className="text-sm text-[var(--gray-400)]">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
              autoFocus
              disabled={saving}
              className="w-24 text-right px-3 py-2 rounded-[var(--radius-md)] border border-[var(--violet-300)] bg-white text-base sm:text-sm outline-none focus:ring-2 focus:ring-[var(--violet-100)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={saving}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--violet-200)] text-sm font-semibold text-[var(--violet-600)] hover:bg-[var(--violet-50)] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : tipCents > 0 ? `${formatPrice(tipCents)} · Edit` : "Add tip"}
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getExpiryInfo(expiresAt) {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires - now;
  if (diffMs <= 0) return { expired: true, label: "Expired", urgency: "dead" };
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffHours < 24) return { expired: false, label: `Expires in ${diffHours}h`, urgency: "critical" };
  if (diffDays <= 2) return { expired: false, label: `Expires in ${diffDays} day${diffDays === 1 ? "" : "s"}`, urgency: "critical" };
  if (diffDays <= 7) return { expired: false, label: `Expires in ${diffDays} days`, urgency: "warning" };
  return { expired: false, label: `Expires ${formatDate(expiresAt)}`, urgency: "normal" };
}

// ─── Active Offer Card ────────────────────────────────────────────────────────

function OfferCard({ offer, tipCents, inquiryId, onAccept, onDecline, onRequestChanges, onTipUpdate, accepting, declining, actionsInFooter }) {
  const isExpired = offer.expiresAt && new Date(offer.expiresAt) < new Date();
  const isPending = offer.status === "pending" && !isExpired;
  const expiryInfo = getExpiryInfo(offer.expiresAt);

  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Urgency banner */}
      {isPending && expiryInfo && (expiryInfo.urgency === "critical" || expiryInfo.urgency === "warning") && (
        <div className={`px-5 py-3 flex items-center gap-2.5 ${
          expiryInfo.urgency === "critical"
            ? "bg-gradient-to-r from-[var(--coral-50)] to-[#fff8f5] border-b border-[var(--coral-100)]"
            : "bg-gradient-to-r from-[var(--amber-50)] to-[#fffdf5] border-b border-[var(--amber-100)]"
        }`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
            expiryInfo.urgency === "critical" ? "bg-[var(--coral-100)]" : "bg-[var(--amber-100)]"
          }`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke={expiryInfo.urgency === "critical" ? "var(--coral-600)" : "var(--amber-700)"}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <p className={`text-[12px] font-bold leading-snug ${expiryInfo.urgency === "critical" ? "text-[var(--coral-700)]" : "text-[var(--amber-700)]"}`}>
            {expiryInfo.label}
            <span className="font-normal"> — accept now to lock in your booking</span>
          </p>
        </div>
      )}

      {/* Card header */}
      <div className="px-5 pt-6 pb-5 border-b border-[var(--gray-100)]">
        {/* Version + status badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--violet-100)] text-[var(--violet-700)] tracking-wide">
            v{offer.versionNumber}
          </span>
          {isExpired && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-500)]">
              Expired
            </span>
          )}
          {offer.status === "accepted" && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--mint-50)] text-[var(--mint-700)] flex items-center gap-1">
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Accepted
            </span>
          )}
          {offer.status === "declined" && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-500)]">
              Declined
            </span>
          )}
          {isPending && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--coral-50)] text-[var(--coral-600)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral-500)] animate-pulse" />
              Awaiting your response
            </span>
          )}
        </div>

        {/* Hero price */}
        <p
          className={`font-display leading-none tracking-tight mb-1 ${
            isExpired || offer.status === "declined" ? "text-[var(--gray-300)]" : "text-[var(--gray-900)]"
          }`}
          style={{ fontSize: "clamp(36px, 10vw, 48px)", fontWeight: 800, letterSpacing: "-0.03em" }}
        >
          {formatPrice(offer.totalPriceCents)}
        </p>
        <p className="text-[12px] text-[var(--gray-400)]">Total service price from vendor</p>

        {offer.description && (
          <p className="text-[14px] text-[var(--gray-600)] mt-4 leading-relaxed border-t border-[var(--gray-50)] pt-4">
            {offer.description}
          </p>
        )}
      </div>

      {/* Price breakdown */}
      <div className="px-5 py-4 space-y-3">
        {offer.depositCents > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--gray-600)]">
                {offer.depositType === "refundable" ? "Refundable deposit" : "Non-refundable deposit"}
              </span>
            </div>
            <span className="text-sm font-semibold text-[var(--gray-900)]">
              {formatPrice(offer.depositCents)}
            </span>
          </div>
        )}

        {offer.remainingBalanceCents > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--gray-600)]">Remaining balance</span>
            <span className="text-sm font-semibold text-[var(--gray-900)]">
              {formatPrice(offer.remainingBalanceCents)}
            </span>
          </div>
        )}

        {offer.expiresAt && expiryInfo && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--gray-600)]">Offer expires</span>
            <span className={`text-sm font-semibold ${
              isExpired
                ? "text-[var(--gray-400)]"
                : expiryInfo.urgency === "critical"
                ? "text-[var(--coral-600)]"
                : expiryInfo.urgency === "warning"
                ? "text-[var(--amber-700)]"
                : "text-[var(--gray-900)]"
            }`}>
              {expiryInfo.urgency === "normal" ? formatDate(offer.expiresAt) : expiryInfo.label}
            </span>
          </div>
        )}
      </div>

      {isPending && offer.proposalType === "cash" && (
        <TipEditor tipCents={tipCents} onTipUpdate={onTipUpdate} />
      )}

      {/* Cost breakdown for pending cash offers */}
      {isPending && offer.proposalType === "cash" && (
        <div className="px-5 pb-4">
          <CostBreakdown offer={offer} tipCents={tipCents} />
        </div>
      )}

      {/* Actions — hidden on mobile when moved to sticky footer */}
      {isPending && !actionsInFooter && (
        <div className="px-5 pb-5 space-y-2">
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              disabled={declining || accepting}
              className="flex-1 py-3 rounded-[var(--radius-lg)] border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors disabled:opacity-40"
            >
              {declining ? "Declining…" : "Decline"}
            </button>
            <button
              onClick={onAccept}
              disabled={accepting || declining}
              className="flex-1 py-3 rounded-[var(--radius-lg)] bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-sm font-semibold shadow-[var(--shadow-button)] hover:shadow-lg transition-all disabled:opacity-40"
            >
              {accepting ? "Accepting…" : "Accept Offer"}
            </button>
          </div>
          <button
            onClick={onRequestChanges}
            disabled={accepting || declining}
            className="w-full py-2.5 rounded-[var(--radius-lg)] border border-[var(--violet-200)] text-sm font-semibold text-[var(--violet-600)] hover:bg-[var(--violet-50)] transition-colors disabled:opacity-40"
          >
            Request Changes
          </button>
        </div>
      )}

      {offer.status === "accepted" && offer.proposalType === "cash" && offer.paymentStatus === "none" && (
        <div className="px-5 pb-5">
          <Link
            href={`/messages/${inquiryId}/checkout`}
            className="block w-full py-3.5 text-center rounded-[var(--radius-lg)] bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-sm font-bold shadow-[var(--shadow-button)] hover:shadow-lg transition-all"
          >
            Complete Payment →
          </Link>
        </div>
      )}

      {offer.status === "accepted" && offer.proposalType === "product" && (
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--mint-50)] border border-[var(--mint-100)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className="text-xs font-semibold text-[var(--mint-700)]">Accepted — awaiting vendor payment to confirm</p>
          </div>
        </div>
      )}

      {offer.status === "accepted" && offer.proposalType === "both" && (
        <div className="px-5 pb-5">
          <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius-lg)] bg-[var(--mint-50)] border border-[var(--mint-100)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className="text-xs font-semibold text-[var(--mint-700)]">Booking confirmed — no payment required</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Version History ──────────────────────────────────────────────────────────

function OfferVersionHistory({ offers, activeOfferId }) {
  const [expanded, setExpanded] = useState(false);
  const previous = offers.filter((o) => o.id !== activeOfferId);

  if (previous.length === 0) return null;

  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-[var(--gray-700)]">
          Previous versions ({previous.length})
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--gray-400)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-[var(--gray-100)] divide-y divide-[var(--gray-100)]">
          {[...previous].reverse().map((offer, i, arr) => {
            // arr is newest-first after reverse; arr[i-1] is the version that came AFTER this one
            const newerVersion = arr[i - 1];
            // priceDiff: positive = this version was revised UP, negative = revised DOWN
            const priceDiff = newerVersion ? newerVersion.totalPriceCents - offer.totalPriceCents : null;

            return (
              <div key={offer.id} className="px-5 py-4 opacity-60">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--gray-500)]">
                      v{offer.versionNumber}
                    </span>
                    <span className="text-xs text-[var(--gray-400)]">
                      {formatRelativeTime(offer.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {priceDiff !== null && priceDiff !== 0 && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        priceDiff > 0
                          ? "bg-[var(--coral-50)] text-[var(--coral-600)]"
                          : "bg-[var(--mint-50)] text-[var(--mint-600)]"
                      }`} title={priceDiff > 0 ? "Vendor revised up" : "Vendor revised down"}>
                        {priceDiff > 0 ? `↑ ${formatPrice(priceDiff)}` : `↓ ${formatPrice(Math.abs(priceDiff))}`}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-[var(--gray-700)]">
                      {formatPrice(offer.totalPriceCents)}
                    </span>
                  </div>
                </div>
                {offer.description && (
                  <p className="text-xs text-[var(--gray-500)] leading-relaxed line-clamp-2">
                    {offer.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function OfferSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--gray-100)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 w-24 bg-[var(--gray-100)] rounded-full animate-pulse" />
          </div>
          <div className="h-8 w-32 bg-[var(--gray-100)] rounded animate-pulse" />
          <div className="h-3.5 w-3/4 bg-[var(--gray-100)] rounded-full mt-3 animate-pulse" />
          <div className="h-3.5 w-1/2 bg-[var(--gray-100)] rounded-full mt-2 animate-pulse" />
        </div>
        {/* Breakdown rows */}
        <div className="px-5 py-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3.5 w-28 bg-[var(--gray-100)] rounded-full animate-pulse" />
              <div className="h-3.5 w-16 bg-[var(--gray-100)] rounded-full animate-pulse" />
            </div>
          ))}
        </div>
        {/* Action buttons */}
        <div className="px-5 pb-5 space-y-2">
          <div className="flex gap-3">
            <div className="flex-1 h-11 bg-[var(--gray-100)] rounded-[var(--radius-lg)] animate-pulse" />
            <div className="flex-1 h-11 bg-[var(--gray-100)] rounded-[var(--radius-lg)] animate-pulse" />
          </div>
          <div className="h-10 w-full bg-[var(--gray-100)] rounded-[var(--radius-lg)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function NoOfferState({ inquiryId, lastOffer }) {
  const waitingForTipReview = lastOffer?.status === "changes_requested";

  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center bg-[var(--gray-100)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
      <p className="text-sm font-semibold text-[var(--gray-700)]">
        {waitingForTipReview ? "Tip sent for review" : "No offer yet"}
      </p>
      <p className="text-xs text-[var(--gray-400)] mt-1 mb-5 max-w-xs">
        {waitingForTipReview
          ? "The vendor needs to review the updated tip and send a new offer before you can accept."
          : "The vendor hasn't sent a proposal yet. Check back after you've chatted."}
      </p>
      <Link
        href={`/messages/${inquiryId}`}
        className="text-sm font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)]"
      >
        ← Back to conversation
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OfferPage() {
  const { inquiryId } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [offers,              setOffers]              = useState([]);
  const [inquiry,             setInquiry]             = useState(null);
  const [loading,             setLoading]             = useState(true);
  const [accepting,           setAccepting]           = useState(false);
  const [declining,           setDeclining]           = useState(false);
  const [declined,            setDeclined]            = useState(false);
  const [showRequestChanges,  setShowRequestChanges]  = useState(false);
  const [requestText,         setRequestText]         = useState("");
  const [sendingRequest,      setSendingRequest]      = useState(false);
  const [error,               setError]               = useState(null);
  const [notice,              setNotice]              = useState(null);

  const refreshOfferState = useCallback(async () => {
    const [offerList, inq] = await Promise.all([listOffers(inquiryId), getInquiry(inquiryId)]);
    setOffers(offerList);
    setInquiry(inq);
  }, [inquiryId]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    refreshOfferState()
      .catch(() => setError("Failed to load offer."))
      .finally(() => setLoading(false));
  }, [user, router, refreshOfferState]);

  async function handleAccept() {
    const active = offers.find((o) => o.isActive);
    if (!active) return;
    setAccepting(true);
    setError(null);
    try {
      await acceptOffer(inquiryId, active.id);
      if (active.proposalType === "cash") {
        router.push(`/messages/${inquiryId}/checkout`);
      } else {
        router.push(`/messages/${inquiryId}`);
      }
    } catch (err) {
      setError(err.message ?? "Failed to accept offer.");
      setAccepting(false);
    }
  }

  async function handleDecline() {
    const active = offers.find((o) => o.isActive);
    if (!active) return;
    setDeclining(true);
    setError(null);
    try {
      await declineOffer(inquiryId, active.id);
      setDeclined(true);
      setTimeout(() => router.push(`/messages/${inquiryId}`), 1500);
    } catch (err) {
      setError(err.message ?? "Failed to decline offer.");
      setDeclining(false);
    }
  }

  async function handleSendRequest() {
    const text = requestText.trim();
    if (!text) return;
    setSendingRequest(true);
    setError(null);
    try {
      await sendMessage(inquiryId, text);
      router.push(`/messages/${inquiryId}`);
    } catch (err) {
      setError(err.message ?? "Failed to send request.");
      setSendingRequest(false);
    }
  }

  async function handleTipUpdate(newTipCents) {
    setError(null);
    setNotice(null);
    try {
      const result = await updateInquiryTip(inquiryId, newTipCents);
      await refreshOfferState();
      if (result?.requiresVendorReview) {
        setNotice("Tip updated. The vendor needs to review it and send a new offer before you can accept.");
      }
    } catch (err) {
      setError(err.message ?? "Failed to update tip.");
      throw err;
    }
  }

  if (!user) return null;

  const activeOffer = offers.find((o) => o.isActive);
  const lastOffer = offers.length > 0 ? offers.reduce((a, b) => (a.versionNumber > b.versionNumber ? a : b)) : null;
  const vendorName = inquiry?.vendor?.name ?? "Vendor";
  const displayTip = displayTipCents(inquiry);

  const isActiveExpired = activeOffer?.expiresAt && new Date(activeOffer.expiresAt) < new Date();
  const isActivePending = activeOffer?.status === "pending" && !isActiveExpired && !declined;
  const showFooter = isActivePending;

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] bg-[var(--gray-50)]">
      {/* Header */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-b border-[var(--gray-100)]">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <Link
            href={`/messages/${inquiryId}`}
            className="tap-scale-sm w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--gray-100)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[var(--gray-900)] text-[14px] truncate">{vendorName}</p>
            <p className="text-[11px] text-[var(--gray-500)]">Offer details</p>
          </div>
          {/* Active offer price in header when pending */}
          {activeOffer?.status === "pending" && !isActiveExpired && (
            <span className="flex-shrink-0 text-[13px] font-bold text-[var(--violet-600)] bg-[var(--violet-50)] px-3 py-1 rounded-full">
              {formatPrice(activeOffer.totalPriceCents + displayTip)}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-4" style={{ paddingBottom: showFooter ? "0" : "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>
          {loading ? (
            <OfferSkeleton />
          ) : !activeOffer ? (
            <NoOfferState inquiryId={inquiryId} lastOffer={lastOffer} />
          ) : (
            <>
              {notice && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] bg-[var(--violet-50)] border border-[var(--violet-100)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-sm text-[var(--violet-700)] font-medium">{notice}</p>
                </div>
              )}
              {declined && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] bg-[var(--gray-50)] border border-[var(--gray-200)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <p className="text-sm text-[var(--gray-700)] font-medium">Offer declined. Returning to messages…</p>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] bg-red-50 border border-red-200">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <OfferCard
                offer={activeOffer}
                tipCents={inquiry?.tipCents ?? 0}
                inquiryId={inquiryId}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onRequestChanges={() => setShowRequestChanges(true)}
                onTipUpdate={handleTipUpdate}
                accepting={accepting}
                declining={declining}
                actionsInFooter={isActivePending}
              />

              <OfferVersionHistory
                offers={offers}
                activeOfferId={activeOffer.id}
              />
            </>
          )}
          <div className="mt-6 pt-4 border-t border-[var(--gray-100)] text-center">
            <p className="text-[10px] text-[var(--gray-400)]">
              © {new Date().getFullYear()} Vehndr&nbsp;·&nbsp;
              <Link href="/terms" className="hover:text-[var(--gray-600)] transition-colors">Terms</Link>
              &nbsp;·&nbsp;
              <Link href="/privacy" className="hover:text-[var(--gray-600)] transition-colors">Privacy</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Sticky footer — action buttons or request-changes composer */}
      {showFooter && (
        <div
          className="flex-shrink-0 bg-white/95 backdrop-blur-xl border-t border-[var(--gray-100)] footer-safe"
          style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.07)" }}
        >
          {showRequestChanges ? (
            <div className="mx-auto max-w-2xl px-4 pt-4 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-bold text-[var(--gray-900)]">Request Changes</p>
                  <p className="text-[12px] text-[var(--gray-500)] mt-0.5 leading-snug">
                    Describe what you would like revised. The vendor will update their offer.
                  </p>
                </div>
                <button
                  onClick={() => { setShowRequestChanges(false); setRequestText(""); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--gray-100)] transition-colors flex-shrink-0 mt-0.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <textarea
                rows={3}
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                placeholder='e.g. "Can you lower the price to $X?" or "I need setup included…"'
                className="w-full px-4 py-3 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] text-sm text-[var(--gray-800)] outline-none focus:border-[var(--violet-400)] focus:bg-white focus:ring-2 focus:ring-[var(--violet-100)] transition-all resize-none leading-relaxed"
                autoFocus
              />
              <button
                onClick={handleSendRequest}
                disabled={sendingRequest || !requestText.trim()}
                className="tap-scale w-full py-3.5 rounded-xl text-white text-[14px] font-bold disabled:opacity-40 transition-all"
                style={{ background: sendingRequest || !requestText.trim() ? "var(--gray-300)" : "var(--gradient-vendor)" }}
              >
                {sendingRequest ? "Sending…" : "Send Request"}
              </button>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl px-4 pt-3.5 pb-3.5">
              {/* Price reminder */}
              {activeOffer && (
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-[12px] text-[var(--gray-500)]">Offer from <span className="font-semibold text-[var(--gray-700)]">{vendorName}</span></p>
                  <p className="text-[15px] font-bold text-[var(--gray-900)]">{formatPrice(activeOffer.totalPriceCents + displayTip)}</p>
                </div>
              )}
              {/* Accept — full-width, prominent */}
              <button
                onClick={handleAccept}
                disabled={accepting || declining}
                className="tap-scale w-full py-4 rounded-2xl text-white text-[15px] font-bold mb-2.5 disabled:opacity-40 transition-all"
                style={{
                  background: accepting || declining ? "var(--gray-300)" : "linear-gradient(135deg, var(--mint-500) 0%, var(--mint-600) 100%)",
                  boxShadow: accepting || declining ? "none" : "0 4px 16px rgba(16,185,129,0.3)",
                }}
              >
                {accepting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Accepting…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Accept Offer
                  </span>
                )}
              </button>
              {/* Secondary row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDecline}
                  disabled={declining || accepting}
                  className="tap-scale-sm flex-1 py-3 rounded-xl border border-[var(--gray-200)] text-[13px] font-semibold text-[var(--gray-600)] hover:bg-[var(--gray-50)] transition-colors disabled:opacity-40"
                >
                  {declining ? "Declining…" : "Decline"}
                </button>
                <button
                  onClick={() => setShowRequestChanges(true)}
                  disabled={accepting || declining}
                  className="tap-scale-sm flex-1 py-3 rounded-xl border border-[var(--violet-200)] text-[13px] font-semibold text-[var(--violet-600)] hover:bg-[var(--violet-50)] transition-colors disabled:opacity-40"
                >
                  Request Changes
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
