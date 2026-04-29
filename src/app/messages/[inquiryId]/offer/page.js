"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../contexts/AuthContext";
import { listOffers, acceptOffer, declineOffer } from "../../../../services/offers";
import { getInquiry, sendMessage } from "../../../../services/inquiries";

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

// ─── Fee helpers ──────────────────────────────────────────────────────────────
const OF_TAX    = 0.0825;
const OF_COORD  = 0.10;
const OF_ST_PCT = 0.029;
const OF_ST_FIX = 30;

function ofTax(b)             { return Math.round(b * OF_TAX); }
function ofCoord(b)           { return Math.round(b * OF_COORD); }
function ofPreStripe(b, tip=0){ return b + ofTax(b) + ofCoord(b) + tip; }
function ofGrossTotal(b, tip=0){ return Math.ceil((ofPreStripe(b, tip) + OF_ST_FIX) / (1 - OF_ST_PCT)); }
function ofStripe(b, tip=0)   { return ofGrossTotal(b, tip) - ofPreStripe(b, tip); }

function CostBreakdown({ offer, tipCents = 0 }) {
  const base       = offer.totalPriceCents;
  const tip        = tipCents ?? 0;
  const coord      = ofCoord(base);
  const tax        = ofTax(base);
  const stripe     = ofStripe(base, tip);
  const total      = ofGrossTotal(base, tip);
  const hasDeposit = offer.depositCents > 0;
  const depTotal   = hasDeposit ? ofGrossTotal(offer.depositCents) : 0;

  return (
    <div className="rounded-2xl border border-[var(--violet-100)] bg-[var(--violet-50)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--violet-100)] flex items-center gap-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-[11px] font-semibold text-[var(--violet-700)] uppercase tracking-wider">What you&apos;ll pay at checkout</p>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--violet-700)]">Base service</span>
          <span className="font-semibold text-[var(--gray-800)]">{formatPrice(base)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--violet-700)]">VEHNDR platform fee (10%)</span>
          <span className="font-semibold text-[var(--gray-800)]">{formatPrice(coord)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--violet-700)]">Sales tax (8.25%)</span>
          <span className="font-semibold text-[var(--gray-800)]">{formatPrice(tax)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--violet-700)]">Processing fee (Stripe)</span>
          <span className="font-semibold text-[var(--gray-800)]">~{fmtExact(stripe)}</span>
        </div>
        {tip > 0 ? (
          <div className="flex justify-between text-xs">
            <span className="text-[var(--violet-700)]">Tip (100% to vendor)</span>
            <span className="font-semibold text-[var(--violet-700)]">{formatPrice(tip)}</span>
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
          {tip === 0 && (
            <p className="text-[10px] text-[var(--violet-500)] mt-1.5">
              + any tip you add · tip goes 100% to vendor
            </p>
          )}
        </div>
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

function OfferCard({ offer, tipCents, inquiryId, onAccept, onDecline, onRequestChanges, accepting, declining }) {
  const isExpired = offer.expiresAt && new Date(offer.expiresAt) < new Date();
  const isPending = offer.status === "pending" && !isExpired;
  const expiryInfo = getExpiryInfo(offer.expiresAt);

  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] shadow-[var(--shadow-card)] overflow-hidden">
      {/* Urgency banner */}
      {isPending && expiryInfo && (expiryInfo.urgency === "critical" || expiryInfo.urgency === "warning") && (
        <div className={`px-5 py-2.5 flex items-center gap-2 ${
          expiryInfo.urgency === "critical"
            ? "bg-[var(--coral-50)] border-b border-[var(--coral-100)]"
            : "bg-[var(--amber-50)] border-b border-[var(--amber-100)]"
        }`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={expiryInfo.urgency === "critical" ? "var(--coral-600)" : "var(--amber-700)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className={`text-xs font-semibold ${expiryInfo.urgency === "critical" ? "text-[var(--coral-700)]" : "text-[var(--amber-700)]"}`}>
            {expiryInfo.label} — accept now to lock in your booking
          </p>
        </div>
      )}

      {/* Card header */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--gray-100)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--violet-100)] text-[var(--violet-700)]">
                Latest Offer · v{offer.versionNumber}
              </span>
              {isExpired && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-500)]">
                  Expired
                </span>
              )}
              {offer.status === "accepted" && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--mint-50)] text-[var(--mint-700)]">
                  Accepted
                </span>
              )}
              {offer.status === "declined" && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-500)]">
                  Declined
                </span>
              )}
            </div>
            <p className={`text-3xl font-bold ${isExpired || offer.status === "declined" ? "text-[var(--gray-400)]" : "text-[var(--gray-900)]"}`}>
              {formatPrice(offer.totalPriceCents)}
            </p>
          </div>
        </div>

        {offer.description && (
          <p className="text-sm text-[var(--gray-600)] mt-3 leading-relaxed">
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

      {/* Cost breakdown for pending cash offers */}
      {isPending && offer.proposalType === "cash" && (
        <div className="px-5 pb-4">
          <CostBreakdown offer={offer} tipCents={tipCents} />
        </div>
      )}

      {/* Actions */}
      {isPending && (
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

function NoOfferState({ inquiryId }) {
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
      <p className="text-sm font-semibold text-[var(--gray-700)]">No offer yet</p>
      <p className="text-xs text-[var(--gray-400)] mt-1 mb-5 max-w-xs">
        The vendor hasn't sent a proposal yet. Check back after you've chatted.
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

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    Promise.all([listOffers(inquiryId), getInquiry(inquiryId)])
      .then(([offerList, inq]) => {
        setOffers(offerList);
        setInquiry(inq);
      })
      .catch(() => setError("Failed to load offer."))
      .finally(() => setLoading(false));
  }, [user, router, inquiryId]);

  async function handleAccept() {
    const active = offers.find((o) => o.isActive);
    if (!active) return;
    setAccepting(true);
    setError(null);
    try {
      await acceptOffer(inquiryId, active.id);
      router.push(`/messages/${inquiryId}`);
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

  if (!user) return null;

  const activeOffer = offers.find((o) => o.isActive);
  const vendorName = inquiry?.vendor?.name ?? "Vendor";

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-100)] sticky top-0 z-30">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <Link
            href={`/messages/${inquiryId}`}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--gray-100)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <p className="font-semibold text-[var(--gray-900)] text-sm">{vendorName}</p>
            <p className="text-xs text-[var(--gray-500)]">Offer details</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {loading ? (
          <OfferSkeleton />
        ) : !activeOffer ? (
          <NoOfferState inquiryId={inquiryId} />
        ) : (
          <>
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
              accepting={accepting}
              declining={declining}
            />

            {/* Request Changes panel */}
            {showRequestChanges && (
              <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--violet-100)] p-5 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-0.5">Request Changes</h3>
                  <p className="text-xs text-[var(--gray-500)]">Describe what you'd like the vendor to revise. They'll update their offer based on your feedback.</p>
                </div>
                <textarea
                  rows={4}
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  placeholder='e.g. "Can you lower the price to $X?" or "I need setup included in the package…"'
                  className="w-full px-4 py-3 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] text-sm text-[var(--gray-800)] outline-none focus:border-[var(--violet-400)] focus:bg-white focus:ring-2 focus:ring-[var(--violet-100)] transition-all resize-none leading-relaxed"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowRequestChanges(false); setRequestText(""); }}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-600)] hover:bg-[var(--gray-50)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendRequest}
                    disabled={sendingRequest || !requestText.trim()}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm disabled:opacity-40 transition-all"
                    style={{ background: sendingRequest || !requestText.trim() ? "var(--gray-400)" : "var(--gradient-vendor)" }}
                  >
                    {sendingRequest ? "Sending…" : "Send to Vendor"}
                  </button>
                </div>
              </div>
            )}

            <OfferVersionHistory
              offers={offers}
              activeOfferId={activeOffer.id}
            />
          </>
        )}
      </div>
    </div>
  );
}
