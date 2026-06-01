"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { listMessages, sendMessage, updateInquiryTip } from "../../../services/inquiries";
import { listOffers, createOffer, updateOffer, acceptOffer, declineOffer } from "../../../services/offers";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: "submitted",      label: "Sent"    },
  { key: "viewed",         label: "Viewed"  },
  { key: "discussed",      label: "Chat"    },
  { key: "actions_needed", label: "Offer"   },
  { key: "offer_updated",  label: "Revised" },
  { key: "scheduled",      label: "Booked"  },
  { key: "completed",      label: "Done"    },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

const STATUS_LABELS = {
  submitted:      "Proposal Sent",
  viewed:         "Viewed by Vendor",
  discussed:      "In Discussion",
  actions_needed: "Offer Received",
  offer_updated:  "Offer Revised",
  offer_declined: "Offer Declined",
  scheduled:      "Booked",
  completed:      "Completed",
  expired:        "Expired",
};

const STATUS_LABELS_VENDOR = {
  submitted:      "New Proposal",
  viewed:         "Viewed",
  discussed:      "In Discussion",
  actions_needed: "Offer Sent",
  offer_updated:  "Offer Revised",
  offer_declined: "Offer Declined",
  scheduled:      "Booked",
  completed:      "Completed",
  expired:        "Expired",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr) {
  const date     = new Date(dateStr);
  const now      = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)   return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shouldShowTimestamp(messages, index) {
  if (index === 0) return true;
  const prev = new Date(messages[index - 1].createdAt);
  const curr = new Date(messages[index].createdAt);
  return curr - prev > 5 * 60 * 1000;
}

function formatPrice(cents) {
  if (!cents && cents !== 0) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cents / 100);
}

function dollarsToC(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : Math.round(n * 100);
}

// ─── Fee preview helpers (mirrors MarketplacePricing in the API) ──────────────
const MP_TAX_RATE        = 0.0825;
const MP_COORD_FEE       = 0.10;
const MP_STRIPE_RATE     = 0.029;
const MP_STRIPE_FIXED    = 30;   // cents

function mpTax(base)          { return Math.round(base * MP_TAX_RATE); }
function mpCoordFee(base)     { return Math.round(base * MP_COORD_FEE); }
function mpPreStripeTotal(base, tipCents = 0) { return base + mpTax(base) + mpCoordFee(base) + tipCents; }
function mpGrossTotal(base, tipCents = 0) {
  return mpPreStripeTotal(base, tipCents);
}
function mpStripeFee(total) { return Math.round(total * MP_STRIPE_RATE + MP_STRIPE_FIXED); }
function mpVendorPayout(base, tipCents = 0) {
  return Math.max(base - Math.round(base * 0.10) - mpStripeFee(mpGrossTotal(base, tipCents)), 0) + tipCents;
}
function mpVendorPayoutWithTip(base, tipCents) { return mpVendorPayout(base, tipCents); }

function fmtExact(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

// ─── Cost Preview Card — shown before buyer accepts a cash offer ───────────────

function CostPreviewCard({ offer, tipCents = 0 }) {
  const base      = offer.totalPriceCents;
  const coordFee  = mpCoordFee(base);
  const tax       = mpTax(base);
  const estTotal  = mpGrossTotal(base, tipCents);

  const hasDeposit = offer.depositCents > 0;
  const depGross   = hasDeposit ? mpGrossTotal(offer.depositCents ?? 0) : 0;

  return (
    <div className="rounded-2xl border border-[var(--violet-100)] bg-[var(--violet-50)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--violet-100)] flex items-center gap-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-[11px] font-semibold text-[var(--violet-700)] uppercase tracking-wider">
          What you&apos;ll pay at checkout
        </p>
      </div>

      <div className="px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--violet-600)]">Base service</span>
          <span className="font-semibold text-[var(--gray-800)]">{formatPrice(base)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--violet-600)]">VEHNDR platform fee (10%)</span>
          <span className="font-semibold text-[var(--gray-800)]">{formatPrice(coordFee)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--violet-600)]">Tax (8.25%)</span>
          <span className="font-semibold text-[var(--gray-800)]">{formatPrice(tax)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--violet-500)]">Tip</span>
          {tipCents > 0
            ? <span className="font-semibold text-[var(--violet-700)]">{formatPrice(tipCents)}</span>
            : <span className="text-[var(--gray-400)] italic">Optional · set below</span>
          }
        </div>

        <div className="pt-1.5 mt-0.5 border-t border-[var(--violet-200)]">
          <div className="flex justify-between">
            <span className="text-xs font-bold text-[var(--violet-800)]">
              {hasDeposit ? "Full booking total" : "Est. total due"}
            </span>
            <span className="text-sm font-bold text-[var(--gray-900)]">{fmtExact(estTotal)}</span>
          </div>
          {hasDeposit && (
            <div className="flex justify-between mt-1">
              <span className="text-xs font-semibold text-[var(--violet-700)]">Est. deposit today</span>
              <span className="text-xs font-bold text-[var(--violet-800)]">{fmtExact(depGross)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isVendor }) {
  const labels = isVendor ? STATUS_LABELS_VENDOR : STATUS_LABELS;

  const styles = {
    submitted:      "bg-[var(--amber-50)]   text-[var(--amber-700)]",
    viewed:         "bg-[var(--info-50)]    text-[var(--info)]",
    discussed:      "bg-[var(--violet-100)] text-[var(--violet-700)]",
    actions_needed: "bg-[var(--coral-50)]   text-[var(--coral-600)]",
    offer_updated:  "bg-[var(--coral-50)]   text-[var(--coral-600)]",
    offer_declined: "bg-[var(--gray-100)]   text-[var(--gray-500)]",
    scheduled:      "bg-[var(--mint-50)]    text-[var(--mint-700)]",
    completed:      "bg-[var(--mint-50)]    text-[var(--mint-700)]",
    expired:        "bg-[var(--gray-100)]   text-[var(--gray-500)]",
  };

  const dotColors = {
    submitted:      "bg-[var(--amber-500)]",
    viewed:         "bg-[var(--info)]",
    discussed:      "bg-[var(--violet-500)]",
    actions_needed: "bg-[var(--coral-500)]",
    offer_updated:  "bg-[var(--coral-500)]",
    offer_declined: "bg-[var(--gray-400)]",
    scheduled:      "bg-[var(--mint-500)]",
    completed:      "bg-[var(--mint-500)]",
    expired:        "bg-[var(--gray-300)]",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full ${styles[status] ?? styles.submitted}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[status] ?? dotColors.submitted}`} />
      {labels[status] ?? status}
    </span>
  );
}

// ─── Status Timeline ──────────────────────────────────────────────────────────

const STEP_TIMESTAMP_KEY = {
  submitted:      "submittedAt",
  viewed:         "viewedAt",
  discussed:      "discussedAt",
  actions_needed: "actionsNeededAt",
  offer_updated:  "offerUpdatedAt",
  scheduled:      "scheduledAt",
  completed:      "completedAt",
  expired:        "expiredAt",
};

function formatStepTime(dateStr) {
  if (!dateStr) return null;
  const date     = new Date(dateStr);
  const now      = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffDays < 7)   return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusTimeline({ inquiry }) {
  const status    = inquiry?.status ?? "submitted";
  const isExpired = status === "expired";

  const stepsToRender = isExpired
    ? [
        ...STATUS_STEPS.filter((s) => inquiry?.[STEP_TIMESTAMP_KEY[s.key]]),
        { key: "expired", label: "Expired" },
      ]
    : STATUS_STEPS;

  const currentIndex = stepsToRender.findIndex(
    (s) => s.key === (isExpired ? "expired" : status)
  );

  return (
    <div className="min-w-0 bg-white border-b border-[var(--gray-100)] overflow-x-auto scrollbar-none">
      <div className="flex items-start gap-0 px-5 py-2 min-w-max mx-auto max-w-2xl">
        {stepsToRender.map((step, i) => {
          const ts            = inquiry?.[STEP_TIMESTAMP_KEY[step.key]];
          const reached       = i <= currentIndex;
          const isCurrent     = i === currentIndex;
          const isExpiredStep = step.key === "expired";

          return (
            <div key={step.key} className="flex items-start">
              {i > 0 && (
                <div className={`h-px w-6 flex-shrink-0 mt-[9px] transition-colors duration-500 ${
                  reached
                    ? isExpiredStep ? "bg-[var(--gray-300)]" : "bg-[var(--violet-400)]"
                    : "bg-[var(--gray-200)]"
                }`} />
              )}
              <div className="flex flex-col items-center gap-1">
                <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                  isCurrent && isExpiredStep
                    ? "bg-[var(--gray-400)] ring-4 ring-[var(--gray-100)]"
                    : isCurrent
                    ? "bg-[var(--violet-600)] ring-4 ring-[var(--violet-100)]"
                    : reached
                    ? "bg-[var(--violet-500)]"
                    : "bg-[var(--gray-200)]"
                }`}>
                  {reached && !isCurrent && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isCurrent && isExpiredStep && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <span className={`text-[9px] font-semibold uppercase tracking-widest whitespace-nowrap ${
                  isCurrent && isExpiredStep
                    ? "text-[var(--gray-500)]"
                    : isCurrent
                    ? "text-[var(--violet-600)]"
                    : reached
                    ? "text-[var(--gray-500)]"
                    : "text-[var(--gray-300)]"
                }`}>
                  {step.label}
                </span>
                {reached && ts && (
                  <span className="text-[8px] text-[var(--gray-300)] whitespace-nowrap tabular-nums leading-none">
                    {formatStepTime(ts)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Offer Card (in message stream) ──────────────────────────────────────────

function OfferCard({ offer }) {
  const statusConfig = {
    pending:  { label: "Awaiting review", style: "bg-[var(--amber-50)] text-[var(--amber-700)]" },
    accepted: { label: "Accepted",        style: "bg-[var(--mint-50)] text-[var(--mint-700)]"   },
    declined: { label: "Declined",        style: "bg-[var(--gray-100)] text-[var(--gray-500)]"  },
  };
  const cfg = statusConfig[offer.status] ?? statusConfig.pending;

  return (
    <div className="my-3 bg-white rounded-2xl overflow-hidden border border-[var(--gray-100)]" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--gray-100)]">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-400)]">
          Offer · v{offer.versionNumber ?? 1}
        </span>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-wide ${cfg.style}`}>
          {cfg.label}
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="text-2xl font-bold text-[var(--gray-900)] tracking-tight">{formatPrice(offer.totalPriceCents)}</p>
        {offer.depositCents > 0 && (
          <p className="text-xs text-[var(--gray-400)] mt-0.5">
            {formatPrice(offer.depositCents)} deposit · <span className="capitalize">{offer.depositType?.replace("_", "-")}</span>
          </p>
        )}
        {offer.description && (
          <p className="text-sm text-[var(--gray-500)] mt-2 leading-relaxed">{offer.description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Offer Form ───────────────────────────────────────────────────────────────

function OfferForm({ inquiryId, existingOffer, onSaved }) {
  const isRevision = !!existingOffer && existingOffer.status === "pending";

  const [form, setForm] = useState({
    description:   existingOffer?.description ?? "",
    totalPrice:    existingOffer ? (existingOffer.totalPriceCents / 100).toString() : "",
    depositAmount: existingOffer?.depositCents ? (existingOffer.depositCents / 100).toString() : "",
    depositType:   existingOffer?.depositType ?? "non_refundable",
    expiresAt:     existingOffer?.expiresAt ? existingOffer.expiresAt.split("T")[0] : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const hasDeposit    = form.depositAmount && parseFloat(form.depositAmount) > 0;
  const totalCents    = dollarsToC(form.totalPrice);
  const depositCents  = hasDeposit ? dollarsToC(form.depositAmount) : null;
  const remainingCents = totalCents && depositCents ? totalCents - depositCents : null;

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!totalCents || totalCents <= 0)             { setError("Total price is required."); return; }
    if (depositCents && depositCents >= totalCents) { setError("Deposit must be less than total."); return; }

    setSaving(true);
    setError(null);

    const payload = {
      description:             form.description.trim() || null,
      total_price_cents:       totalCents,
      deposit_cents:           depositCents,
      deposit_type:            hasDeposit ? form.depositType : null,
      remaining_balance_cents: remainingCents,
      expires_at:              form.expiresAt || null,
    };

    try {
      if (isRevision) {
        await updateOffer(inquiryId, existingOffer.id, payload);
      } else {
        await createOffer(inquiryId, payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message ?? "Failed to save offer.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] text-base sm:text-sm text-[var(--gray-800)] outline-none focus:border-[var(--violet-400)] focus:bg-white focus:ring-2 focus:ring-[var(--violet-100)] transition-all";
  const labelClass = "block text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-400)] mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Description */}
      <div>
        <label className={labelClass}>
          Description <span className="normal-case font-normal tracking-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What's included, any notes for the customer…"
          className={`${inputClass} resize-none leading-relaxed`}
        />
      </div>

      {/* Total price */}
      <div>
        <label className={labelClass}>
          Total price <span className="text-[var(--coral-500)] normal-case tracking-normal font-normal">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--gray-400)] pointer-events-none">$</span>
          <input
            type="number" min="0" step="0.01"
            value={form.totalPrice}
            onChange={(e) => set("totalPrice", e.target.value)}
            placeholder="0"
            className={`${inputClass} pl-8`}
          />
        </div>
      </div>

      {/* Deposit */}
      <div>
        <label className={labelClass}>
          Deposit <span className="normal-case font-normal tracking-normal">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--gray-400)] pointer-events-none">$</span>
          <input
            type="number" min="0" step="0.01"
            value={form.depositAmount}
            onChange={(e) => set("depositAmount", e.target.value)}
            placeholder="0"
            className={`${inputClass} pl-8`}
          />
        </div>
        {hasDeposit && remainingCents !== null && (
          <p className="text-xs text-[var(--gray-400)] mt-1.5">Remaining balance: {formatPrice(remainingCents)}</p>
        )}
      </div>

      {/* Deposit type */}
      {hasDeposit && (
        <div>
          <label className={labelClass}>Deposit type</label>
          <div className="flex gap-2">
            {["non_refundable", "refundable"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => set("depositType", type)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all tracking-wide ${
                  form.depositType === type
                    ? "border-[var(--violet-300)] bg-[var(--violet-50)] text-[var(--violet-700)]"
                    : "border-[var(--gray-200)] bg-white text-[var(--gray-500)] hover:bg-[var(--gray-50)]"
                }`}
              >
                {type === "non_refundable" ? "Non-refundable" : "Refundable"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expiry */}
      <div>
        <label className={labelClass}>
          Offer expires <span className="normal-case font-normal tracking-normal">(optional)</span>
        </label>
        <input
          type="date"
          value={form.expiresAt}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => set("expiresAt", e.target.value)}
          className={inputClass}
        />
      </div>

      {error && <p className="text-xs text-[var(--error)] font-medium">{error}</p>}

      <button
        type="submit"
        disabled={saving || !form.totalPrice}
        className="w-full py-3.5 rounded-xl text-white text-sm font-semibold tracking-wide active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: saving || !form.totalPrice ? "var(--gray-400)" : "var(--gradient-vendor)" }}
      >
        {saving ? "Sending…" : isRevision ? "Update Offer →" : "Send Offer →"}
      </button>
    </form>
  );
}

// ─── Vendor Offer Panel ───────────────────────────────────────────────────────

function VendorOfferPanel({ inquiryId, offers, onOfferSaved, tipCents = 0 }) {
  const [showForm, setShowForm] = useState(false);
  const activeOffer    = offers.find((o) => o.isActive);
  const previousOffers = offers.filter((o) => !o.isActive);

  useEffect(() => {
    if (offers.length === 0) setShowForm(true);
  }, [offers.length]);

  function handleSaved() {
    setShowForm(false);
    onOfferSaved();
  }

  return (
    <div className="space-y-4">

      {/* Active offer summary */}
      {activeOffer && !showForm && (
        <div className="bg-white rounded-2xl overflow-hidden border border-[var(--gray-100)]" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="h-1" style={{ background: activeOffer.status === "accepted" ? "linear-gradient(90deg,var(--mint-400),var(--mint-500))" : "var(--gradient-vendor)" }} />

          <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-400)] mb-1">
                Current offer · v{activeOffer.versionNumber}
              </p>
              <p className="text-2xl font-bold text-[var(--gray-900)] tracking-tight">
                {formatPrice(activeOffer.totalPriceCents)}
              </p>
            </div>
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-wide mt-0.5 ${
              activeOffer.status === "accepted"
                ? "bg-[var(--mint-50)] text-[var(--mint-700)]"
                : activeOffer.status === "declined"
                ? "bg-[var(--gray-100)] text-[var(--gray-500)]"
                : "bg-[var(--amber-50)] text-[var(--amber-700)]"
            }`}>
              {activeOffer.status === "accepted" ? "Accepted"
               : activeOffer.status === "declined" ? "Declined"
               : "Pending"}
            </span>
          </div>

          <div className="px-5 py-4">
            {activeOffer.description && (
              <p className="text-sm text-[var(--gray-500)] leading-relaxed mb-3">{activeOffer.description}</p>
            )}
            {activeOffer.depositCents > 0 && (
              <p className="text-xs text-[var(--gray-400)] mb-3">
                Deposit: {formatPrice(activeOffer.depositCents)} · <span className="capitalize">{activeOffer.depositType?.replace("_", "-")}</span>
              </p>
            )}
            {tipCents > 0 && (
              <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-xl bg-[var(--violet-50)] border border-[var(--violet-100)]">
                <span className="text-xs font-semibold text-[var(--violet-700)]">Customer tip</span>
                <span className="text-xs font-bold text-[var(--violet-800)]">{formatPrice(tipCents)}</span>
              </div>
            )}
            <div className="mb-3 px-3 py-2 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-100)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--gray-400)] uppercase tracking-wider font-semibold">Est. your payout</span>
                <span className="text-sm font-bold text-[var(--gray-800)]">
                  ~{formatPrice(mpVendorPayoutWithTip(activeOffer.totalPriceCents, tipCents))}
                </span>
              </div>
              <p className="text-[10px] text-[var(--gray-400)] mt-0.5">
                Base minus vendor fee and Stripe, plus tip (~{fmtExact(mpStripeFee(mpGrossTotal(activeOffer.totalPriceCents, tipCents)))})
              </p>
            </div>
            {activeOffer.status === "pending" && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-2.5 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-600)] hover:bg-[var(--gray-50)] hover:border-[var(--gray-300)] transition-all"
              >
                Revise Offer
              </button>
            )}
          </div>

          {activeOffer.status === "accepted" && (
            <div className="flex items-center justify-between gap-3 bg-[var(--mint-50)] border-t border-[var(--mint-100)] px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--mint-500)] animate-pulse" />
                <p className="text-xs font-semibold text-[var(--mint-700)]">Customer accepted</p>
              </div>
              <span className="text-xs text-[var(--mint-600,#059669)]">Awaiting payment</span>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl overflow-hidden border border-[var(--gray-100)]" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gray-100)]">
            <h3 className="text-sm font-semibold text-[var(--gray-800)]">
              {activeOffer ? "Revise Offer" : "Send an Offer"}
            </h3>
            {activeOffer && (
              <button
                onClick={() => setShowForm(false)}
                className="text-xs text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="px-5 py-5">
            <OfferForm inquiryId={inquiryId} existingOffer={activeOffer} onSaved={handleSaved} />
          </div>
        </div>
      )}

      {/* Empty CTA */}
      {!activeOffer && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-[var(--violet-200)] text-sm font-semibold text-[var(--violet-600)] hover:bg-[var(--violet-50)] hover:border-[var(--violet-300)] transition-all"
        >
          + Send an Offer
        </button>
      )}

      {/* Previous versions */}
      {previousOffers.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden border border-[var(--gray-100)]" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-400)] border-b border-[var(--gray-100)]">
            Previous versions
          </p>
          <div className="divide-y divide-[var(--gray-50)]">
            {[...previousOffers].reverse().map((offer) => (
              <div key={offer.id} className="px-5 py-3 opacity-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--gray-400)]">v{offer.versionNumber} · {formatTime(offer.createdAt)}</span>
                  <span className="text-sm font-semibold text-[var(--gray-600)]">{formatPrice(offer.totalPriceCents)}</span>
                </div>
                {offer.description && (
                  <p className="text-xs text-[var(--gray-400)] mt-0.5 line-clamp-1">{offer.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mobile Offer Panel ───────────────────────────────────────────────────────
// Full-screen scrollable panel for customer offer view on mobile.

function MobileOfferPanel({ inquiry, inquiryId, offers, fetchMessages, fetchOffers, tipCents = 0, onTipUpdate }) {
  const [accepting,          setAccepting]          = useState(false);
  const [declining,          setDeclining]          = useState(false);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [requestText,        setRequestText]        = useState("");
  const [sendingRequest,     setSendingRequest]     = useState(false);
  const [actionError,        setActionError]        = useState(null);
  const [editingTip,         setEditingTip]         = useState(false);
  const [tipInput,           setTipInput]           = useState("");
  const [savingTip,          setSavingTip]          = useState(false);

  const activeOffer   = offers.find((o) => o.isActive);
  const lastOffer     = offers.length > 0 ? offers.reduce((a, b) => (a.versionNumber > b.versionNumber ? a : b)) : null;
  const offerDeclined = !activeOffer && lastOffer?.status === "declined";
  const isExpired     = activeOffer?.expiresAt && new Date(activeOffer.expiresAt) < new Date();
  const isPending     = activeOffer?.status === "pending" && !isExpired;
  const isAccepted    = activeOffer?.status === "accepted";

  const expiryInfo = activeOffer?.expiresAt
    ? (() => {
        const diffMs    = new Date(activeOffer.expiresAt) - new Date();
        if (diffMs <= 0) return { label: "Expired", urgent: true, expired: true };
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays  = Math.floor(diffMs / 86400000);
        if (diffHours < 24) return { label: `Expires in ${diffHours}h`, urgent: true };
        if (diffDays <= 2)  return { label: `Expires in ${diffDays}d`, urgent: true };
        if (diffDays <= 7)  return { label: `${diffDays} days left`, urgent: false };
        return { label: new Date(activeOffer.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }), urgent: false };
      })()
    : null;

  async function handleAccept() {
    if (!activeOffer) return;
    setAccepting(true);
    setActionError(null);
    try {
      await acceptOffer(inquiryId, activeOffer.id);
      await Promise.all([fetchMessages(false), fetchOffers()]);
    } catch (err) {
      setActionError(err.message ?? "Failed to accept offer.");
    } finally {
      setAccepting(false);
    }
  }

  async function handleDecline() {
    if (!activeOffer) return;
    setDeclining(true);
    setActionError(null);
    try {
      await declineOffer(inquiryId, activeOffer.id);
      await Promise.all([fetchMessages(false), fetchOffers()]);
    } catch (err) {
      setActionError(err.message ?? "Failed to decline offer.");
    } finally {
      setDeclining(false);
    }
  }

  async function handleSaveTip() {
    setEditingTip(false);
    const newCents = Math.round(parseFloat(tipInput || 0) * 100);
    if (isNaN(newCents) || newCents < 0 || newCents === tipCents) return;
    setSavingTip(true);
    try {
      await onTipUpdate?.(newCents);
    } finally {
      setSavingTip(false);
    }
  }

  async function handleSendRequest() {
    const text = requestText.trim();
    if (!text) return;
    setSendingRequest(true);
    setActionError(null);
    try {
      await sendMessage(inquiryId, text);
      await fetchMessages(false);
      setRequestText("");
      setShowRequestChanges(false);
    } catch (err) {
      setActionError(err.message ?? "Failed to send request.");
    } finally {
      setSendingRequest(false);
    }
  }

  const previousOffers = offers.filter((o) => !o.isActive);

  return (
    <div className="p-4 pb-28 space-y-4">

      {/* Declined offer state */}
      {offerDeclined && (
        <div className="rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--gray-200)] text-[var(--gray-600)] uppercase tracking-wide">
              Offer Declined
            </span>
          </div>
          <p className="text-2xl font-bold text-[var(--gray-300)] tracking-tight line-through mb-1">
            {formatPrice(lastOffer.totalPriceCents)}
          </p>
          <p className="text-xs text-[var(--gray-500)] leading-relaxed">
            You declined this offer. The vendor can send a new proposal.
          </p>
        </div>
      )}

      {/* No offer yet */}
      {!activeOffer && !offerDeclined && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--gray-200)] p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center bg-[var(--violet-50)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--gray-700)] mb-1">Proposal sent</p>
          <p className="text-xs text-[var(--gray-400)] leading-relaxed max-w-xs mx-auto">
            The vendor will reach out once they&apos;ve reviewed your proposal. You&apos;ll be able to message and receive offers once they reply.
          </p>
        </div>
      )}

      {/* Offer card */}
      {activeOffer && (
        <div className="bg-white rounded-2xl overflow-hidden border border-[var(--gray-100)]" style={{ boxShadow: "var(--shadow-card)" }}>

          {/* Urgency banner */}
          {isPending && expiryInfo?.urgent && (
            <div className="px-4 py-2.5 bg-[var(--coral-50)] border-b border-[var(--coral-100)] flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--coral-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="text-[11px] font-semibold text-[var(--coral-700)]">{expiryInfo.label}</span>
            </div>
          )}

          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--violet-100)] text-[var(--violet-700)]">
                v{activeOffer.versionNumber}
              </span>
              {inquiry?.status === "offer_updated" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--violet-50)] text-[var(--violet-600)]">
                  Revised
                </span>
              )}
            </div>

            <p className={`text-3xl font-bold tracking-tight ${isAccepted ? "text-[var(--mint-700)]" : isExpired ? "text-[var(--gray-400)]" : "text-[var(--gray-900)]"}`}>
              {formatPrice(activeOffer.totalPriceCents)}
            </p>

            {activeOffer.description && (
              <p className="text-sm text-[var(--gray-600)] mt-2 leading-relaxed">{activeOffer.description}</p>
            )}

            <div className="mt-3 space-y-2">
              {activeOffer.depositCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-[var(--gray-500)]">
                    {activeOffer.depositType === "refundable" ? "Refundable deposit" : "Non-refundable deposit"}
                  </span>
                  <span className="text-xs font-semibold text-[var(--gray-700)]">{formatPrice(activeOffer.depositCents)}</span>
                </div>
              )}
              {activeOffer.remainingBalanceCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs text-[var(--gray-500)]">Remaining balance</span>
                  <span className="text-xs font-semibold text-[var(--gray-700)]">{formatPrice(activeOffer.remainingBalanceCents)}</span>
                </div>
              )}
              {expiryInfo && !expiryInfo.expired && (
                <div className="flex justify-between">
                  <span className="text-xs text-[var(--gray-500)]">Offer expires</span>
                  <span className={`text-xs font-semibold ${expiryInfo.urgent ? "text-[var(--coral-600)]" : "text-[var(--gray-700)]"}`}>
                    {expiryInfo.label}
                  </span>
                </div>
              )}
              {activeOffer.proposalType === "cash" && (!inquiry?.marketplaceBooking || inquiry?.marketplaceBooking?.paymentStatus === "pending") && (
                <div className="flex justify-between items-center pt-2 border-t border-[var(--gray-100)]">
                  <span className="text-xs text-[var(--gray-500)]">Tip</span>
                  {editingTip ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[var(--gray-400)]">$</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={tipInput}
                        onChange={(e) => setTipInput(e.target.value)}
                        onBlur={handleSaveTip}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveTip(); if (e.key === "Escape") setEditingTip(false); }}
                        autoFocus
                        disabled={savingTip}
                        className="w-20 text-base sm:text-xs text-right px-2 py-1 rounded-lg border border-[var(--violet-300)] bg-white outline-none focus:ring-1 focus:ring-[var(--violet-100)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setEditingTip(true); setTipInput(tipCents > 0 ? (tipCents / 100).toFixed(2) : ""); }}
                      disabled={savingTip}
                      className="flex items-center gap-1 text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)] transition-colors disabled:opacity-50"
                    >
                      {savingTip ? (
                        <span className="text-[var(--gray-400)] font-normal">Saving…</span>
                      ) : tipCents > 0 ? (
                        <>{formatPrice(tipCents)} <span className="text-[10px] text-[var(--gray-400)] font-normal">· edit</span></>
                      ) : (
                        <span className="italic font-normal text-[var(--violet-400)]">Add tip</span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cost preview — cash pending */}
      {isPending && activeOffer?.proposalType === "cash" && (
        <CostPreviewCard offer={activeOffer} tipCents={tipCents} />
      )}

      {/* Accepted → pay */}
      {isAccepted && activeOffer?.proposalType === "cash" && inquiry?.marketplaceBooking?.paymentStatus === "pending" && (
        <Link
          href={`/messages/${inquiryId}/checkout`}
          className="block w-full py-4 text-center rounded-2xl text-white text-sm font-bold shadow-sm"
          style={{ background: "var(--gradient-vendor)" }}
        >
          Complete Payment →
        </Link>
      )}

      {/* Accepted → awaiting vendor payment */}
      {isAccepted && activeOffer?.proposalType === "product" && inquiry?.marketplaceBooking?.paymentStatus === "pending" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--mint-50)] border border-[var(--mint-100)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <p className="text-xs font-semibold text-[var(--mint-700)]">Awaiting payment from vendor</p>
        </div>
      )}

      {/* Accepted + paid */}
      {isAccepted && inquiry?.marketplaceBooking?.paymentStatus !== "pending" && inquiry?.marketplaceBooking && (
        <div className="flex items-center gap-3 bg-[var(--mint-50)] rounded-xl px-4 py-3 border border-[var(--mint-100)]">
          <div className="w-8 h-8 rounded-full bg-[var(--mint-100)] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint-700)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--mint-800)]">Booking confirmed</p>
            <p className="text-xs text-[var(--mint-600)] mt-0.5">Your vendor is booked</p>
          </div>
        </div>
      )}

      {/* Pending offer actions */}
      {isPending && !showRequestChanges && (
        <div className="space-y-2">
          <button
            onClick={handleAccept}
            disabled={accepting || declining}
            className="w-full py-3.5 rounded-xl text-white text-sm font-semibold shadow-sm active:scale-[0.99] transition-all disabled:opacity-40"
            style={{ background: "var(--gradient-vendor)" }}
          >
            {accepting ? "Accepting…" : "Accept Offer"}
          </button>
          <button
            onClick={() => { setShowRequestChanges(true); setActionError(null); }}
            disabled={accepting || declining}
            className="w-full py-2.5 rounded-xl border border-[var(--violet-200)] text-sm font-semibold text-[var(--violet-600)] hover:bg-[var(--violet-50)] transition-all disabled:opacity-40"
          >
            Request Changes
          </button>
          <button
            onClick={handleDecline}
            disabled={declining || accepting}
            className="w-full py-2.5 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-500)] hover:bg-[var(--gray-50)] transition-all disabled:opacity-40"
          >
            {declining ? "Declining…" : "Decline"}
          </button>
        </div>
      )}

      {/* Request changes form */}
      {isPending && showRequestChanges && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-400)] mb-2">
              What would you like changed?
            </label>
            <textarea
              rows={4}
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder='e.g. "Can you lower the price to $X?" or "I also need setup included…"'
              className="w-full px-4 py-3 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] text-base sm:text-sm text-[var(--gray-800)] outline-none focus:border-[var(--violet-400)] focus:bg-white focus:ring-2 focus:ring-[var(--violet-100)] transition-all resize-none leading-relaxed"
            />
          </div>
          <button
            onClick={handleSendRequest}
            disabled={sendingRequest || !requestText.trim()}
            className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-all"
            style={{ background: sendingRequest || !requestText.trim() ? "var(--gray-400)" : "var(--gradient-vendor)" }}
          >
            {sendingRequest ? "Sending…" : "Send Request"}
          </button>
          <button
            onClick={() => { setShowRequestChanges(false); setRequestText(""); setActionError(null); }}
            className="w-full py-2 text-xs text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {actionError && (
        <p className="text-xs text-[var(--error)] text-center font-medium">{actionError}</p>
      )}

      {/* Proposal details */}
      {inquiry && (
        <div className="bg-[var(--gray-50)] rounded-xl p-4 space-y-3 border border-[var(--gray-100)]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-400)]">Proposal Details</p>
          {inquiry.event && (
            <div className="flex items-start gap-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div>
                <p className="text-[10px] text-[var(--gray-400)]">Event</p>
                <p className="text-xs font-semibold text-[var(--gray-700)]">{inquiry.event.name}</p>
              </div>
            </div>
          )}
          {inquiry.budgetCents > 0 && (
            <div className="flex items-start gap-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[var(--gray-400)]">Budget</p>
                <p className="text-xs font-semibold text-[var(--gray-700)]">{formatPrice(inquiry.budgetCents)}</p>
              </div>
            </div>
          )}
          {inquiry.initialMessage && (
            <div className="flex items-start gap-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <div>
                <p className="text-[10px] text-[var(--gray-400)]">Your message</p>
                <p className="text-xs text-[var(--gray-600)] leading-relaxed">{inquiry.initialMessage}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Offer history */}
      {previousOffers.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-400)] mb-2">Offer History</p>
          <div className="space-y-1.5">
            {[...previousOffers].reverse().map((offer) => (
              <div key={offer.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-100)] opacity-60">
                <span className="text-xs text-[var(--gray-500)]">v{offer.versionNumber}</span>
                <span className="text-xs font-semibold text-[var(--gray-600)]">{formatPrice(offer.totalPriceCents)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                  offer.status === "declined"
                    ? "bg-[var(--gray-100)] text-[var(--gray-500)]"
                    : "bg-[var(--amber-50)] text-[var(--amber-700)]"
                }`}>{offer.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Customer Sidebar (desktop only) ─────────────────────────────────────────

function CustomerSidebar({ inquiry, inquiryId, offers, fetchMessages, fetchOffers, tipCents = 0, onTipUpdate }) {
  const [accepting,          setAccepting]          = useState(false);
  const [declining,          setDeclining]          = useState(false);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const [requestText,        setRequestText]        = useState("");
  const [sendingRequest,     setSendingRequest]     = useState(false);
  const [actionError,        setActionError]        = useState(null);
  const [editingTip,         setEditingTip]         = useState(false);
  const [tipInput,           setTipInput]           = useState('');
  const [savingTip,          setSavingTip]          = useState(false);

  const activeOffer   = offers.find((o) => o.isActive);
  const lastOffer     = offers.length > 0 ? offers.reduce((a, b) => (a.versionNumber > b.versionNumber ? a : b)) : null;
  const offerDeclined = !activeOffer && lastOffer?.status === "declined";
  const isExpired     = activeOffer?.expiresAt && new Date(activeOffer.expiresAt) < new Date();
  const isPending     = activeOffer?.status === "pending" && !isExpired;
  const isAccepted    = activeOffer?.status === "accepted";

  const expiryInfo = activeOffer?.expiresAt
    ? (() => {
        const diffMs    = new Date(activeOffer.expiresAt) - new Date();
        if (diffMs <= 0) return { label: "Expired", urgent: true, expired: true };
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays  = Math.floor(diffMs / 86400000);
        if (diffHours < 24) return { label: `Expires in ${diffHours}h`, urgent: true };
        if (diffDays <= 2)  return { label: `Expires in ${diffDays}d`, urgent: true };
        if (diffDays <= 7)  return { label: `${diffDays} days left`, urgent: false };
        return { label: new Date(activeOffer.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }), urgent: false };
      })()
    : null;

  async function handleAccept() {
    if (!activeOffer) return;
    setAccepting(true);
    setActionError(null);
    try {
      await acceptOffer(inquiryId, activeOffer.id);
      await Promise.all([fetchMessages(false), fetchOffers()]);
    } catch (err) {
      setActionError(err.message ?? "Failed to accept offer.");
    } finally {
      setAccepting(false);
    }
  }

  async function handleDecline() {
    if (!activeOffer) return;
    setDeclining(true);
    setActionError(null);
    try {
      await declineOffer(inquiryId, activeOffer.id);
      await Promise.all([fetchMessages(false), fetchOffers()]);
    } catch (err) {
      setActionError(err.message ?? "Failed to decline offer.");
    } finally {
      setDeclining(false);
    }
  }

  async function handleSaveTip() {
    setEditingTip(false);
    const newCents = Math.round(parseFloat(tipInput || 0) * 100);
    if (isNaN(newCents) || newCents < 0 || newCents === tipCents) return;
    setSavingTip(true);
    try {
      await onTipUpdate?.(newCents);
    } finally {
      setSavingTip(false);
    }
  }

  async function handleSendRequest() {
    const text = requestText.trim();
    if (!text) return;
    setSendingRequest(true);
    setActionError(null);
    try {
      await sendMessage(inquiryId, text);
      await fetchMessages(false);
      setRequestText("");
      setShowRequestChanges(false);
    } catch (err) {
      setActionError(err.message ?? "Failed to send request.");
    } finally {
      setSendingRequest(false);
    }
  }

  const previousOffers = offers.filter((o) => !o.isActive);

  return (
    <div className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 border-l border-[var(--gray-100)] overflow-y-auto bg-white">

      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--gray-100)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--gray-900)]">
          {activeOffer ? "Current Offer" : offerDeclined ? "Last Offer" : "Proposal Status"}
        </h3>
        {(activeOffer || offerDeclined) && (
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-wide ${
            isAccepted
              ? "bg-[var(--mint-50)] text-[var(--mint-700)]"
              : offerDeclined
              ? "bg-[var(--gray-100)] text-[var(--gray-500)]"
              : isPending
              ? "bg-[var(--coral-50)] text-[var(--coral-600)]"
              : "bg-[var(--gray-100)] text-[var(--gray-500)]"
          }`}>
            {isAccepted ? "Accepted ✓" : offerDeclined ? "Declined" : isExpired ? "Expired" : isPending ? "Review Needed" : activeOffer?.status}
          </span>
        )}
      </div>

      <div className="flex-1 p-5 space-y-4 overflow-y-auto">

        {/* Declined offer state */}
        {offerDeclined && (
          <div className="rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--gray-200)] text-[var(--gray-600)] uppercase tracking-wide">
                Offer Declined
              </span>
            </div>
            <p className="text-2xl font-bold text-[var(--gray-300)] tracking-tight line-through mb-1">
              {formatPrice(lastOffer.totalPriceCents)}
            </p>
            <p className="text-xs text-[var(--gray-500)] leading-relaxed">
              You declined this offer. The vendor can send a new proposal.
            </p>
          </div>
        )}

        {/* No offer yet */}
        {!activeOffer && !offerDeclined && (
          <div className="rounded-2xl border-2 border-dashed border-[var(--gray-200)] p-6 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center bg-[var(--violet-50)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[var(--gray-700)] mb-1">Proposal sent</p>
            <p className="text-xs text-[var(--gray-400)] leading-relaxed">
              The vendor will reach out once they&apos;ve reviewed your proposal. You&apos;ll be able to message and receive offers once they reply.
            </p>
          </div>
        )}

        {/* Offer card */}
        {activeOffer && (
          <div className="bg-[var(--gray-50)] rounded-2xl overflow-hidden border border-[var(--gray-100)]">

            {/* Urgency banner */}
            {isPending && expiryInfo?.urgent && (
              <div className="px-4 py-2 bg-[var(--coral-50)] border-b border-[var(--coral-100)] flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--coral-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span className="text-[11px] font-semibold text-[var(--coral-700)]">{expiryInfo.label}</span>
              </div>
            )}

            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--violet-100)] text-[var(--violet-700)]">
                  v{activeOffer.versionNumber}
                </span>
                {inquiry?.status === "offer_updated" && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--violet-50)] text-[var(--violet-600)]">
                    Revised
                  </span>
                )}
              </div>

              <p className={`text-3xl font-bold tracking-tight ${isAccepted ? "text-[var(--mint-700)]" : isExpired ? "text-[var(--gray-400)]" : "text-[var(--gray-900)]"}`}>
                {formatPrice(activeOffer.totalPriceCents)}
              </p>

              {activeOffer.description && (
                <p className="text-sm text-[var(--gray-600)] mt-2 leading-relaxed">{activeOffer.description}</p>
              )}

              <div className="mt-3 space-y-1.5">
                {activeOffer.depositCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--gray-500)]">
                      {activeOffer.depositType === "refundable" ? "Refundable deposit" : "Non-refundable deposit"}
                    </span>
                    <span className="text-xs font-semibold text-[var(--gray-700)]">{formatPrice(activeOffer.depositCents)}</span>
                  </div>
                )}
                {activeOffer.remainingBalanceCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--gray-500)]">Remaining balance</span>
                    <span className="text-xs font-semibold text-[var(--gray-700)]">{formatPrice(activeOffer.remainingBalanceCents)}</span>
                  </div>
                )}
                {expiryInfo && !expiryInfo.expired && (
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--gray-500)]">Offer expires</span>
                    <span className={`text-xs font-semibold ${expiryInfo.urgent ? "text-[var(--coral-600)]" : "text-[var(--gray-700)]"}`}>
                      {expiryInfo.label}
                    </span>
                  </div>
                )}
                {activeOffer.proposalType === "cash" && (!inquiry?.marketplaceBooking || inquiry?.marketplaceBooking?.paymentStatus === "pending") && (
                  <div className="flex justify-between items-center pt-2 border-t border-[var(--gray-100)]">
                    <span className="text-xs text-[var(--gray-500)]">Tip</span>
                    {editingTip ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[var(--gray-400)]">$</span>
                        <input
                          type="number" min="0" step="0.01"
                          value={tipInput}
                          onChange={(e) => setTipInput(e.target.value)}
                          onBlur={handleSaveTip}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveTip(); if (e.key === "Escape") setEditingTip(false); }}
                          autoFocus
                          disabled={savingTip}
                          className="w-20 text-base sm:text-xs text-right px-2 py-1 rounded-lg border border-[var(--violet-300)] bg-white outline-none focus:ring-1 focus:ring-[var(--violet-100)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingTip(true); setTipInput(tipCents > 0 ? (tipCents / 100).toFixed(2) : ''); }}
                        disabled={savingTip}
                        className="flex items-center gap-1 text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)] transition-colors disabled:opacity-50"
                      >
                        {savingTip ? (
                          <span className="text-[var(--gray-400)] font-normal">Saving…</span>
                        ) : tipCents > 0 ? (
                          <>{formatPrice(tipCents)} <span className="text-[10px] text-[var(--gray-400)] font-normal">· edit</span></>
                        ) : (
                          <span className="italic font-normal text-[var(--violet-400)]">Add tip</span>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Accepted → pay (cash: buyer pays vendor) */}
        {isAccepted && activeOffer?.proposalType === "cash" && inquiry?.marketplaceBooking?.paymentStatus === "pending" && (
          <Link
            href={`/messages/${inquiryId}/checkout`}
            className="block w-full py-3.5 text-center rounded-xl text-white text-sm font-bold shadow-sm"
            style={{ background: "var(--gradient-vendor)" }}
          >
            Complete Payment →
          </Link>
        )}

        {/* Accepted → awaiting vendor payment (product: vendor pays organizer) */}
        {isAccepted && activeOffer?.proposalType === "product" && inquiry?.marketplaceBooking?.paymentStatus === "pending" && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--mint-50)] border border-[var(--mint-100)]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className="text-xs font-semibold text-[var(--mint-700)]">Awaiting payment from vendor</p>
          </div>
        )}

        {/* Accepted + paid */}
        {isAccepted && inquiry?.marketplaceBooking?.paymentStatus !== "pending" && inquiry?.marketplaceBooking && (
          <div className="flex items-center gap-3 bg-[var(--mint-50)] rounded-xl px-4 py-3 border border-[var(--mint-100)]">
            <div className="w-8 h-8 rounded-full bg-[var(--mint-100)] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint-700)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--mint-800)]">Booking confirmed</p>
              <p className="text-xs text-[var(--mint-600)] mt-0.5">Your vendor is booked</p>
            </div>
          </div>
        )}

        {/* Cost preview */}
        {isPending && activeOffer?.proposalType === "cash" && (
          <CostPreviewCard offer={activeOffer} tipCents={tipCents} />
        )}

        {/* Pending offer actions */}
        {isPending && !showRequestChanges && (
          <div className="space-y-2">
            <button
              onClick={handleAccept}
              disabled={accepting || declining}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold shadow-sm active:scale-[0.99] transition-all disabled:opacity-40"
              style={{ background: "var(--gradient-vendor)" }}
            >
              {accepting ? "Accepting…" : "Accept Offer"}
            </button>
            <button
              onClick={() => { setShowRequestChanges(true); setActionError(null); }}
              disabled={accepting || declining}
              className="w-full py-2.5 rounded-xl border border-[var(--violet-200)] text-sm font-semibold text-[var(--violet-600)] hover:bg-[var(--violet-50)] transition-all disabled:opacity-40"
            >
              Request Changes
            </button>
            <button
              onClick={handleDecline}
              disabled={declining || accepting}
              className="w-full py-2.5 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-500)] hover:bg-[var(--gray-50)] transition-all disabled:opacity-40"
            >
              {declining ? "Declining…" : "Decline"}
            </button>
          </div>
        )}

        {/* Request changes form */}
        {isPending && showRequestChanges && (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-400)] mb-2">
                What would you like changed?
              </label>
              <textarea
                rows={4}
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                placeholder='e.g. "Can you lower the price to $X?" or "I also need setup included…"'
                className="w-full px-4 py-3 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] text-base sm:text-sm text-[var(--gray-800)] outline-none focus:border-[var(--violet-400)] focus:bg-white focus:ring-2 focus:ring-[var(--violet-100)] transition-all resize-none leading-relaxed"
              />
            </div>
            <button
              onClick={handleSendRequest}
              disabled={sendingRequest || !requestText.trim()}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-all"
              style={{ background: sendingRequest || !requestText.trim() ? "var(--gray-400)" : "var(--gradient-vendor)" }}
            >
              {sendingRequest ? "Sending…" : "Send Request"}
            </button>
            <button
              onClick={() => { setShowRequestChanges(false); setRequestText(""); setActionError(null); }}
              className="w-full py-2 text-xs text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {actionError && (
          <p className="text-xs text-[var(--error)] text-center font-medium">{actionError}</p>
        )}

        {/* Proposal details */}
        {inquiry && (
          <div className="bg-[var(--gray-50)] rounded-xl p-4 space-y-3 border border-[var(--gray-100)]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-400)]">Proposal Details</p>
            {inquiry.event && (
              <div className="flex items-start gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <div>
                  <p className="text-[10px] text-[var(--gray-400)]">Event</p>
                  <p className="text-xs font-semibold text-[var(--gray-700)]">{inquiry.event.name}</p>
                </div>
              </div>
            )}
            {inquiry.budgetCents > 0 && (
              <div className="flex items-start gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--gray-400)]">Budget</p>
                  <p className="text-xs font-semibold text-[var(--gray-700)]">{formatPrice(inquiry.budgetCents)}</p>
                  <div className="mt-1.5 rounded-lg bg-[var(--violet-50)] border border-[var(--violet-100)] px-2.5 py-2 space-y-1">
                    <p className="text-[10px] font-semibold text-[var(--violet-700)] uppercase tracking-wide">Est. cost if vendor matches budget</p>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[var(--violet-600)]">Base</span>
                        <span className="text-[var(--gray-700)]">{formatPrice(inquiry.budgetCents)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[var(--violet-600)]">VEHNDR fee (10%)</span>
                        <span className="text-[var(--gray-700)]">{formatPrice(mpCoordFee(inquiry.budgetCents))}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[var(--violet-600)]">Tax (8.25%)</span>
                        <span className="text-[var(--gray-700)]">{formatPrice(mpTax(inquiry.budgetCents))}</span>
                      </div>
                      {(inquiry.tipCents ?? 0) > 0 && (
                        <div className="flex justify-between text-[10px]">
                          <span className="text-[var(--violet-600)]">Tip</span>
                          <span className="text-[var(--gray-700)]">{formatPrice(inquiry.tipCents)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] font-bold pt-1 border-t border-[var(--violet-200)]">
                      <span className="text-[var(--violet-800)]">Est. total</span>
                      <span className="text-[var(--violet-900)]">~{formatPrice(mpGrossTotal(inquiry.budgetCents, inquiry.tipCents ?? 0))}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {inquiry.initialMessage && (
              <div className="flex items-start gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <div>
                  <p className="text-[10px] text-[var(--gray-400)]">Your message</p>
                  <p className="text-xs text-[var(--gray-600)] leading-relaxed">{inquiry.initialMessage}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Offer history */}
        {previousOffers.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-400)] mb-2">Offer History</p>
            <div className="space-y-1.5">
              {[...previousOffers].reverse().map((offer) => (
                <div key={offer.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-100)] opacity-60">
                  <span className="text-xs text-[var(--gray-500)]">v{offer.versionNumber}</span>
                  <span className="text-xs font-semibold text-[var(--gray-600)]">{formatPrice(offer.totalPriceCents)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                    offer.status === "declined"
                      ? "bg-[var(--gray-100)] text-[var(--gray-500)]"
                      : "bg-[var(--amber-50)] text-[var(--amber-700)]"
                  }`}>{offer.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InquiryThreadPage() {
  const { inquiryId } = useParams();
  const { user }      = useAuth();
  const router        = useRouter();

  const [mobileTab, setMobileTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [inquiry,  setInquiry]  = useState(null);
  const [offers,   setOffers]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [body,     setBody]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState(null);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const pollRef     = useRef(null);

  const isVendor = inquiry ? inquiry.customer?.id !== user?.id : false;

  const fetchMessages = useCallback(async (scrollToBottom = false) => {
    try {
      const res = await listMessages(inquiryId);
      setMessages(res.messages ?? []);
      if (res.inquiry) setInquiry(res.inquiry);
      if (scrollToBottom) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  }, [inquiryId]);

  const fetchOffers = useCallback(async () => {
    try {
      const data = await listOffers(inquiryId);
      setOffers(data);
    } catch (err) {
      console.error("Failed to fetch offers", err);
    }
  }, [inquiryId]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    Promise.all([fetchMessages(true), fetchOffers()]).finally(() => setLoading(false));
  }, [user, router, fetchMessages, fetchOffers]);

  useEffect(() => {
    pollRef.current = setInterval(() => fetchMessages(false), 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  function handleBodyChange(e) {
    setBody(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);
    setBody("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const optimistic = {
      id:         `optimistic-${Date.now()}`,
      body:       text,
      senderType: isVendor ? "vendor" : "customer",
      senderId:   user.id,
      senderName: user.name,
      createdAt:  new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      await sendMessage(inquiryId, text);
      await fetchMessages(false);
    } catch {
      setError("Failed to send. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(text);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  async function handleOfferSaved() {
    await fetchOffers();
    await fetchMessages(false);
  }

  async function handleTipUpdate(newTipCents) {
    try {
      await updateInquiryTip(inquiryId, newTipCents);
      setInquiry((prev) => prev ? { ...prev, tipCents: newTipCents } : prev);
    } catch (err) {
      console.error("Failed to update tip", err);
    }
  }

  if (!user) return null;

  const status            = inquiry?.status ?? "submitted";
  const activeOffer       = offers.find((o) => o.isActive);
  const lastOffer         = offers.length > 0 ? offers.reduce((a, b) => (a.versionNumber > b.versionNumber ? a : b)) : null;
  const offerDeclined     = !activeOffer && lastOffer?.status === "declined";
  const effectiveStatus   = !isVendor && offerDeclined ? "offer_declined" : status;
  const otherPartyName    = isVendor ? (inquiry?.customer?.name ?? "Customer") : (inquiry?.vendor?.name ?? "Vendor");
  const otherPartyInitial = otherPartyName.charAt(0).toUpperCase();

  const hasPendingOffer = activeOffer?.status === "pending";

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)]" style={{ background: "var(--background)" }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-b border-[var(--gray-100)] sticky top-0 z-40" style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.05)" }}>
        <div className="mx-auto max-w-5xl px-3 sm:px-5 py-2.5 flex items-center gap-2.5">

          {/* Back */}
          <Link
            href={isVendor ? "/dashboard/inquiries" : "/messages"}
            className="tap-scale-sm w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--gray-100)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
            style={{ background: "var(--gradient-vendor)", boxShadow: "0 2px 8px rgba(139,92,246,0.22)" }}
          >
            {otherPartyInitial}
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[var(--gray-900)] text-[14px] truncate leading-tight">{otherPartyName}</p>
            {inquiry && <StatusBadge status={effectiveStatus} isVendor={isVendor} />}
          </div>

          {/* Vendor: accepted badge + view inquiry button */}
          {isVendor && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {activeOffer?.status === "accepted" && (
                <span className="hidden sm:inline-flex text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--mint-50)] text-[var(--mint-700)] tracking-wide">
                  Accepted ✓
                </span>
              )}
              {inquiry && (
                <Link
                  href={`/dashboard/inquiries/${inquiryId}`}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl border border-[var(--gray-200)] text-xs font-semibold text-[var(--gray-600)] hover:bg-[var(--gray-50)] hover:border-[var(--violet-200)] hover:text-[var(--violet-600)] transition-all"
                >
                  View Inquiry
                </Link>
              )}
            </div>
          )}

          {/* Customer: info link */}
          {!isVendor && inquiry && (
            <Link
              href={`/buyer-dashboard/proposals/${inquiryId}`}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--gray-100)] transition-colors text-[var(--gray-400)] hover:text-[var(--violet-600)]"
              title="View proposal details"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </Link>
          )}
        </div>

        {/* Customer: status timeline */}
        {!isVendor && inquiry && <StatusTimeline inquiry={inquiry} />}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden lg:flex-row">

        {/* ── Messages panel: always on desktop, chat tab on mobile ── */}
        <div className={`flex flex-col flex-1 overflow-hidden ${!isVendor && mobileTab !== "chat" ? "hidden lg:flex" : "flex"}`}>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl px-4 py-5 space-y-0.5">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-7 h-7 border-2 border-[var(--violet-400)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "var(--gradient-browse)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[var(--gray-700)]">
                    {isVendor ? "No messages yet" : "Proposal sent"}
                  </p>
                  {isVendor && (
                    <p className="text-xs text-[var(--gray-400)] mt-1">Start the conversation below.</p>
                  )}
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isOwn = isVendor
                    ? msg.senderType === "vendor"
                    : msg.senderId === user?.id || msg.senderType === "customer";

                  const showTime = shouldShowTimestamp(messages, i);
                  const isOfferContextMessage =
                    activeOffer && msg.senderType === "vendor" && i === messages.length - 2;

                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <div className="flex justify-center my-4">
                          <span className="text-[10px] text-[var(--gray-400)] font-medium px-3 py-1 bg-[var(--gray-100)] rounded-full tracking-wide">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      <div className={`flex items-end gap-2 mb-0.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                        {!isOwn && (
                          <div
                            className="w-7 h-7 rounded-2xl flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-0.5 select-none"
                            style={{ background: "var(--gradient-vendor)", boxShadow: "0 2px 6px rgba(139,92,246,0.2)" }}
                          >
                            {otherPartyInitial}
                          </div>
                        )}

                        <div
                          className={`max-w-[78%] px-4 py-3 text-[14px] leading-relaxed ${
                            isOwn
                              ? "text-white rounded-[18px] rounded-br-[4px]"
                              : "bg-white text-[var(--gray-800)] border border-[var(--gray-100)] rounded-[18px] rounded-bl-[4px]"
                          } ${msg.optimistic ? "opacity-50" : ""}`}
                          style={isOwn
                            ? { background: "var(--gradient-vendor)", boxShadow: "0 2px 10px rgba(139,92,246,0.28)" }
                            : { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }
                          }
                        >
                          {msg.body}
                        </div>
                      </div>

                      {isOfferContextMessage && activeOffer && (
                        <div className="ml-9">
                          <OfferCard offer={activeOffer} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div className="pt-4 pb-2 text-center">
                <p className="text-[10px] text-[var(--gray-300)]">
                  © {new Date().getFullYear()} Vehndr&nbsp;·&nbsp;
                  <Link href="/terms" className="hover:text-[var(--gray-500)] transition-colors">Terms</Link>
                  &nbsp;·&nbsp;
                  <Link href="/privacy" className="hover:text-[var(--gray-500)] transition-colors">Privacy</Link>
                </p>
              </div>
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Send error */}
          {error && (
            <div className="mx-auto max-w-2xl w-full px-4">
              <p className="text-xs text-[var(--error)] text-center py-2 font-medium">{error}</p>
            </div>
          )}

          {/* Composer */}
          {!isVendor && inquiry && ["submitted", "viewed"].includes(status) ? (
            <div className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-t border-[var(--gray-100)]">
              <div className="mx-auto max-w-2xl px-4 py-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--amber-50)] border border-[var(--amber-100)]">
                  <span className="w-2 h-2 rounded-full bg-[var(--amber-500)] animate-pulse flex-shrink-0" />
                  <p className="text-[13px] text-[var(--amber-700)] font-medium leading-tight">
                    {status === "submitted"
                      ? "Proposal sent"
                      : "Vendor has viewed your proposal"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex-shrink-0 bg-white/90 backdrop-blur-xl border-t border-[var(--gray-100)] ${isVendor ? "footer-safe" : ""}`} style={{ boxShadow: "0 -1px 0 rgba(0,0,0,0.04)" }}>
              <form onSubmit={handleSend} className="mx-auto max-w-2xl px-3 py-2.5 flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={body}
                  onChange={handleBodyChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message…"
                  className="flex-1 resize-none rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3 text-[16px] sm:text-[14px] text-[var(--gray-800)] placeholder:text-[var(--gray-400)] outline-none focus:border-[var(--violet-300)] focus:bg-white focus:ring-2 focus:ring-[var(--violet-100)] transition-all leading-relaxed overflow-hidden"
                  style={{ minHeight: "44px" }}
                />
                <button
                  type="submit"
                  disabled={!body.trim() || sending}
                  className="tap-scale flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30"
                  style={{
                    background: body.trim() ? "var(--gradient-vendor)" : "var(--gray-300)",
                    boxShadow: body.trim() ? "0 2px 12px rgba(139,92,246,0.35)" : "none",
                  }}
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Mobile Offer Tab Panel ── */}
        {!isVendor && mobileTab === "offer" && (
          <div className="lg:hidden flex flex-col flex-1 overflow-y-auto bg-[var(--gray-50)]">
            <MobileOfferPanel
              inquiry={inquiry}
              inquiryId={inquiryId}
              offers={offers}
              fetchMessages={fetchMessages}
              fetchOffers={fetchOffers}
              tipCents={inquiry?.tipCents ?? 0}
              onTipUpdate={handleTipUpdate}
            />
          </div>
        )}

        {/* ── Desktop customer sidebar ── */}
        {!isVendor && (
          <CustomerSidebar
            inquiry={inquiry}
            inquiryId={inquiryId}
            offers={offers}
            fetchMessages={fetchMessages}
            fetchOffers={fetchOffers}
            tipCents={inquiry?.tipCents ?? 0}
            onTipUpdate={handleTipUpdate}
          />
        )}
      </div>

      {/* ── Mobile bottom tab bar (customers only) ── */}
      {!isVendor && (
        <div
          className="lg:hidden flex-shrink-0 bg-white/95 backdrop-blur-xl border-t border-[var(--gray-100)] footer-safe"
          style={{ boxShadow: "0 -2px 16px rgba(0,0,0,0.06)" }}
        >
          <div className="flex h-[52px] gap-1.5 px-3 py-1.5">
            {/* Chat tab */}
            <button
              onClick={() => setMobileTab("chat")}
              className={`tap-scale-sm flex-1 flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                mobileTab === "chat"
                  ? "bg-[var(--gray-900)] text-white shadow-sm"
                  : "text-[var(--gray-500)] hover:bg-[var(--gray-100)]"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Chat
            </button>

            {/* Offer tab */}
            <button
              onClick={() => setMobileTab("offer")}
              className={`tap-scale-sm flex-1 flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-all duration-150 relative ${
                mobileTab === "offer"
                  ? "bg-[var(--gray-900)] text-white shadow-sm"
                  : hasPendingOffer
                  ? "bg-[var(--coral-50)] text-[var(--coral-600)] border border-[var(--coral-100)]"
                  : "text-[var(--gray-500)] hover:bg-[var(--gray-100)]"
              }`}
            >
              {hasPendingOffer && mobileTab !== "offer" && (
                <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-[var(--coral-500)] animate-pulse" />
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
              </svg>
              {hasPendingOffer ? "Offer!" : "Offer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
