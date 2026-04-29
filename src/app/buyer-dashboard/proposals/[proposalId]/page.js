"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../contexts/AuthContext";
import { getInquiry, deleteInquiry } from "../../../../services/inquiries";
import { getEvent } from "../../../../services/events";
import { addMarketplaceTip, confirmMarketplaceTip } from "../../../../services/checkout";
import TipSelector from "../../../../components/TipSelector";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: "submitted",      label: "Sent" },
  { key: "viewed",         label: "Viewed" },
  { key: "discussed",      label: "Discussing" },
  { key: "actions_needed", label: "Offer Received" },
  { key: "scheduled",      label: "Booked" },
  { key: "completed",      label: "Completed" },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

const STATUS_LABEL = {
  submitted:      "Proposal Sent",
  viewed:         "Viewed by Vendor",
  discussed:      "In Discussion",
  actions_needed: "Offer Received",
  offer_updated:  "Offer Revised",
  scheduled:      "Booked",
  completed:      "Completed",
  expired:        "Expired",
};

const STATUS_COLOR = {
  submitted:      "amber",
  viewed:         "blue",
  discussed:      "violet",
  actions_needed: "coral",
  offer_updated:  "coral",
  scheduled:      "mint",
  completed:      "mint",
  expired:        "gray",
};

const BADGE = {
  amber:  "bg-[var(--amber-50)]  text-[var(--amber-700)]  ring-1 ring-[var(--amber-200)]",
  blue:   "bg-[var(--info-50)]   text-[var(--info)]        ring-1 ring-[var(--info-100)]",
  violet: "bg-[var(--violet-50)] text-[var(--violet-700)] ring-1 ring-[var(--violet-200)]",
  coral:  "bg-[var(--coral-50)]  text-[var(--coral-600)]  ring-1 ring-[var(--coral-100)]",
  mint:   "bg-[var(--mint-50)]   text-[var(--mint-700)]   ring-1 ring-[var(--mint-100)]",
  gray:   "bg-[var(--gray-100)]  text-[var(--gray-500)]   ring-1 ring-[var(--gray-200)]",
};

// ─── Fee estimate helpers (mirrors MarketplacePricing) ───────────────────────

const FEE_TAX_RATE     = 0.0825;
const FEE_COORD_RATE   = 0.10;
const FEE_STRIPE_RATE  = 0.029;
const FEE_STRIPE_FIXED = 30; // cents

function feePreStripe(base, tip = 0)  { return base + Math.round(base * FEE_TAX_RATE) + Math.round(base * FEE_COORD_RATE) + tip; }
function feeGrossTotal(base, tip = 0) { return Math.ceil((feePreStripe(base, tip) + FEE_STRIPE_FIXED) / (1 - FEE_STRIPE_RATE)); }
function feeStripe(base, tip = 0)     { return feeGrossTotal(base, tip) - feePreStripe(base, tip); }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(raw, opts = { month: "long", day: "numeric", year: "numeric" }) {
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString("en-US", opts);
}

function fmtTime(raw) {
  if (!raw) return null;
  return new Date(raw).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatPrice(cents) {
  if (!cents) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cents / 100);
}

function YesNo({ value }) {
  return value ? (
    <span className="flex items-center gap-1 text-[var(--mint-600)] font-medium text-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Yes
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[var(--gray-400)] text-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      No
    </span>
  );
}

const CHIP_LABELS = {
  yes: "Yes", no: "No", na: "N/A",
  paid: "Paid Parking",
  indoor: "Indoor", outdoor: "Outdoor",
};

function LogisticChip({ value }) {
  if (!value) return <span className="text-sm text-[var(--gray-300)]">—</span>;
  const isPositive = value === "yes" || value === "indoor" || value === "outdoor";
  const isNeutral = value === "na" || value === "paid";
  return (
    <span
      className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{
        background: isPositive ? "var(--mint-50)" : isNeutral ? "var(--amber-50)" : "var(--gray-100)",
        color: isPositive ? "var(--mint-700)" : isNeutral ? "var(--amber-700)" : "var(--gray-500)",
      }}
    >
      {CHIP_LABELS[value] ?? value}
    </span>
  );
}

// ─── Status timeline ──────────────────────────────────────────────────────────

function Timeline({ status }) {
  const currentIdx = STATUS_ORDER.indexOf(status === "offer_updated" ? "actions_needed" : status);
  const isExpired  = status === "expired";

  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done    = i <= currentIdx && !isExpired;
        const current = i === currentIdx && !isExpired;
        const last    = i === STATUS_STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center flex-1">
            {/* Node */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  done
                    ? current
                      ? "bg-[var(--violet-600)] ring-4 ring-[var(--violet-100)] shadow-[0_0_0_2px_var(--violet-600)]"
                      : "bg-[var(--violet-600)]"
                    : isExpired
                    ? "bg-[var(--gray-200)]"
                    : "bg-[var(--gray-100)] ring-2 ring-[var(--gray-200)]"
                }`}
              >
                {done && !current ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : current ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                ) : null}
              </div>
              <p className={`mt-1.5 text-[10px] font-medium text-center leading-tight ${
                done ? "text-[var(--violet-700)]" : "text-[var(--gray-300)]"
              }`} style={{ width: 56 }}>
                {step.label}
              </p>
            </div>

            {/* Connector */}
            {!last && (
              <div className={`flex-1 h-[2px] mx-1 rounded-full ${
                i < currentIdx && !isExpired ? "bg-[var(--violet-600)]" : "bg-[var(--gray-200)]"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--gray-50)] last:border-0">
      <span className="text-sm text-[var(--gray-500)] flex-shrink-0 min-w-[160px]">{label}</span>
      <span className="text-sm font-medium text-[var(--gray-800)] text-right">{children ?? value ?? "—"}</span>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({ title, icon, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${className}`} style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[var(--gray-100)]">
        {icon && <span className="text-[var(--gray-400)]">{icon}</span>}
        <h3 className="font-semibold text-[var(--gray-900)] text-[15px]">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Tip modal ───────────────────────────────────────────────────────────────

function TipStripeForm({ amountCents, onSuccess, onError }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [ready, setReady]           = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError]           = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements || !ready || processing) return;
    setProcessing(true);
    setError(null);
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
      if (onError) onError(stripeError);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      setError("Payment did not complete. Please try again.");
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement onReady={() => setReady(true)} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!ready || processing}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white font-semibold text-sm shadow disabled:opacity-40"
      >
        {!ready ? "Loading…" : processing ? "Processing…" : `Send ${formatPrice(amountCents)} tip`}
      </button>
    </form>
  );
}

function TipModal({ booking, inquiry, onClose, onTipPaid }) {
  const [phase, setPhase]           = useState("idle");
  const [selectedTip, setSelectedTip] = useState(0);
  const [intentData, setIntentData] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const baseCents = inquiry?.activeOffer?.totalPriceCents ?? 0;

  async function handleProceed() {
    if (selectedTip <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await addMarketplaceTip({ bookingId: booking.id, tipCents: selectedTip });
      setIntentData(data);
      setPhase("paying");
    } catch (err) {
      setError(err.message ?? "Failed to start tip payment.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSuccess(paymentIntentId) {
    try {
      await confirmMarketplaceTip({
        paymentIntentId: paymentIntentId ?? intentData?.paymentIntentId,
        bookingId:       intentData?.bookingId,
        tipCents:        intentData?.tipCents,
      });
      setPhase("done");
      if (onTipPaid) onTipPaid();
    } catch (err) {
      setError(err.message ?? "Tip confirmed but not recorded. Contact support.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gray-100)]">
          <p className="font-semibold text-[var(--gray-900)]">Tip {inquiry?.vendor?.name}</p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--gray-100)] text-[var(--gray-400)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-5">
          {phase === "done" ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--mint-500)] flex items-center justify-center mx-auto">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[var(--gray-900)]">Tip sent!</p>
                <p className="text-sm text-[var(--gray-500)] mt-0.5">
                  {formatPrice(intentData?.tipCents)} goes directly to {inquiry?.vendor?.name}.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
              >
                Done
              </button>
            </div>
          ) : phase === "paying" && intentData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--gray-700)]">Complete tip payment</p>
                <p className="text-lg font-bold text-[var(--violet-600)]">{formatPrice(intentData.tipCents)}</p>
              </div>
              {intentData.devMode ? (
                <DevTipForm amountCents={intentData.tipCents} onSuccess={() => handleSuccess(null)} />
              ) : intentData.clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: intentData.clientSecret,
                    appearance: { theme: "stripe", variables: { colorPrimary: "#7c3aed", borderRadius: "12px", fontFamily: "inherit" } },
                  }}
                >
                  <TipStripeForm
                    amountCents={intentData.tipCents}
                    onSuccess={(id) => handleSuccess(id)}
                    onError={(err) => setError(err.message)}
                  />
                </Elements>
              ) : null}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[var(--gray-400)]">100% goes directly to the vendor. Processed securely by Stripe.</p>
              <TipSelector subtotalCents={baseCents} onTipChange={(c) => setSelectedTip(c)} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={handleProceed}
                disabled={loading || selectedTip <= 0}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white font-semibold text-sm shadow disabled:opacity-40"
              >
                {loading ? "Preparing…" : selectedTip > 0 ? `Send ${formatPrice(selectedTip)} tip` : "Select a tip amount"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DevTipForm({ amountCents, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  async function handle() {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 600));
    onSuccess();
  }
  return (
    <button
      onClick={handle}
      disabled={processing}
      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white font-semibold text-sm shadow disabled:opacity-40"
    >
      {processing ? "Simulating…" : `Simulate tip · ${formatPrice(amountCents)}`}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProposalDetailPage() {
  const { proposalId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [inquiry, setInquiry] = useState(null);
  const [event, setEvent]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [showTipModal, setShowTipModal] = useState(false);

  async function refreshInquiry() {
    try {
      const inq = await getInquiry(proposalId);
      setInquiry(inq);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    getInquiry(proposalId)
      .then(async (inq) => {
        setInquiry(inq);
        if (inq?.event?.id) {
          try {
            const evt = await getEvent(inq.event.id);
            setEvent(evt);
          } catch { /* ignore */ }
        }
      })
      .catch(() => setError("Proposal not found."))
      .finally(() => setLoading(false));
  }, [proposalId, user, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="h-8 bg-[var(--gray-100)] rounded w-48 animate-pulse" />
        <div className="bg-white rounded-2xl h-40 animate-pulse" style={{ boxShadow: "var(--shadow-card)" }} />
        <div className="bg-white rounded-2xl h-56 animate-pulse" style={{ boxShadow: "var(--shadow-card)" }} />
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-[var(--error)] mb-4">{error ?? "Proposal not found."}</p>
        <Link href="/buyer-dashboard/proposals" className="text-sm text-[var(--violet-600)] hover:underline">← Back to proposals</Link>
      </div>
    );
  }

  const { vendor, status, activeOffer, initialMessage, createdAt, budgetCents, tipCents } = inquiry;
  const initial   = vendor?.name?.charAt(0)?.toUpperCase() ?? "V";
  const color     = STATUS_COLOR[status] ?? "gray";
  const hasOffer  = activeOffer?.status === "pending";
  const isBooked  = status === "scheduled" || activeOffer?.status === "accepted";
  const isExpired = status === "expired";
  const isPaid    = activeOffer?.paymentStatus === "deposit_paid" || activeOffer?.paymentStatus === "fully_paid" || status === "scheduled";
  const canDelete = !isPaid;
  const booking          = inquiry.marketplaceBooking;
  const isCash           = activeOffer?.proposalType === "cash";
  const hasPostPaymentTip = (booking?.tipCents ?? 0) > (tipCents ?? 0);
  const canTip           = isPaid && isCash && !!booking && !hasPostPaymentTip;

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteInquiry(proposalId);
      router.push("/buyer-dashboard/proposals");
    } catch (err) {
      setDeleteError(err.message ?? "Failed to delete proposal.");
      setDeleting(false);
    }
  }

  const hasLogistics = event && (
    event.boothSize || event.canopyAllowed || event.indoorOutdoor ||
    event.venueAttendees || event.accessToPower || event.accessToWater ||
    event.wifiAvailability || event.vendorLoadIn || event.vendorLoadOut ||
    event.eventHours || event.parkingAvailable || event.securityPresence
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-[var(--gray-400)]">
        <Link href="/buyer-dashboard/proposals" className="hover:text-[var(--violet-600)] transition-colors">
          Proposals
        </Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-[var(--gray-600)] font-medium truncate">{vendor?.name}</span>
      </div>

      {/* ── Hero card: vendor + status ── */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        {/* Top band */}
        <div className="h-2 w-full" style={{ background: isBooked ? "var(--gradient-organizer)" : isExpired ? "var(--gray-200)" : "var(--gradient-vendor)" }} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                style={{ background: "var(--gradient-vendor)", boxShadow: "0 4px 16px rgba(139,92,246,0.25)" }}
              >
                {initial}
              </div>
              <div>
                <h1 className="text-lg font-display font-bold text-[var(--gray-900)]">{vendor?.name}</h1>
                {event && <p className="text-sm text-[var(--gray-500)] mt-0.5">for {event.name}</p>}
                <p className="text-xs text-[var(--gray-400)] mt-0.5">Submitted {fmt(createdAt)}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${BADGE[color]}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>

          {/* Timeline */}
          {!isExpired && (
            <div className="mt-8 mb-2 overflow-x-auto pb-2">
              <div style={{ minWidth: 480 }}>
                <Timeline status={status} />
              </div>
            </div>
          )}

          {isExpired && (
            <div className="mt-5 p-3 rounded-xl bg-[var(--gray-50)] text-sm text-[var(--gray-500)] text-center">
              This proposal has expired with no response from the vendor.
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2 px-6 pb-5">
          <Link
            href={`/messages/${inquiry.id}`}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[var(--gray-900)] text-white text-sm font-semibold hover:bg-[var(--gray-700)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            Open Thread
          </Link>

          {hasOffer && (
            <Link
              href={`/messages/${inquiry.id}/offer`}
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-[var(--coral-500)] to-[var(--coral-600)] text-white text-sm font-semibold hover:shadow-md transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/>
              </svg>
              Review Offer · {formatPrice(activeOffer.totalPriceCents)}{(tipCents ?? 0) > 0 ? ` + ${formatPrice(tipCents)} tip` : ""}
            </Link>
          )}

          {isBooked && activeOffer?.proposalType === "cash" && !isPaid && (
            <Link
              href={`/messages/${inquiry.id}/checkout`}
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-[var(--mint-500)] to-[var(--mint-600)] text-white text-sm font-semibold hover:shadow-md transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Complete Payment
            </Link>
          )}

          {isBooked && activeOffer?.proposalType === "product" && !isPaid && status !== "scheduled" && (
            <span className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[var(--mint-50)] border border-[var(--mint-200)] text-[var(--mint-700)] text-xs font-semibold">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Awaiting vendor payment
            </span>
          )}

          {canTip && (
            <button
              onClick={() => setShowTipModal(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-[var(--violet-50)] to-[var(--magenta-50)] border border-[var(--violet-200)] text-[var(--violet-700)] text-sm font-semibold hover:shadow-sm transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
              Tip Vendor
            </button>
          )}

          {vendor?.id && (
            <Link
              href={`/store/${vendor.id}`}
              className="flex items-center gap-2 h-9 px-4 rounded-xl border border-[var(--gray-200)] text-[var(--gray-600)] text-sm font-medium hover:bg-[var(--gray-50)] transition-colors"
            >
              View Storefront
            </Link>
          )}

          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors ml-auto"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-[var(--gray-900)] text-center mb-1">Delete this proposal?</h2>
            <p className="text-sm text-[var(--gray-500)] text-center mb-5">
              This will permanently remove your proposal to <strong>{vendor?.name}</strong>. This cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 text-center mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteError(null); }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Event details */}
        {event && (
          <Card
            title="Event Details"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            }
          >
            <div className="divide-y divide-[var(--gray-50)]">
              <InfoRow label="Event name" value={event.name} />
              {event.description && (
                <InfoRow label="Description">
                  <span className="text-sm text-[var(--gray-600)] leading-relaxed">{event.description}</span>
                </InfoRow>
              )}
              <InfoRow label="Date">
                {event.startDate ? (
                  <>
                    {fmt(event.startDate)}
                    {event.endDate && event.endDate !== event.startDate && ` → ${fmt(event.endDate)}`}
                  </>
                ) : "—"}
              </InfoRow>
              {(event.streetAddress || event.location) && (
                <InfoRow label="Venue" value={event.streetAddress || event.location} />
              )}
              {event.attendees > 0 && (
                <InfoRow label="Expected attendees" value={event.attendees.toLocaleString()} />
              )}
              {event.ageGroup && (
                <InfoRow label="Primary audience" value={event.ageGroup} />
              )}
              <InfoRow label="Certificate of Insurance">
                <YesNo value={event.requiresCoi} />
              </InfoRow>
            </div>
          </Card>
        )}

        {/* Proposal details */}
        <Card
          title="Proposal Details"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
          }
        >
          <div className="divide-y divide-[var(--gray-50)]">
            <InfoRow label="Status" >
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${BADGE[color]}`}>
                {STATUS_LABEL[status] ?? status}
              </span>
            </InfoRow>
            <InfoRow label="Submitted" value={fmt(createdAt)} />
            {inquiry.viewedAt && <InfoRow label="Viewed by vendor" value={fmt(inquiry.viewedAt)} />}
            {inquiry.discussedAt && <InfoRow label="Discussion started" value={fmt(inquiry.discussedAt)} />}
            {inquiry.actionsNeededAt && <InfoRow label="Offer received" value={fmt(inquiry.actionsNeededAt)} />}
            {inquiry.scheduledAt && <InfoRow label="Booked" value={fmt(inquiry.scheduledAt)} />}
            {inquiry.completedAt && <InfoRow label="Completed" value={fmt(inquiry.completedAt)} />}
            {inquiry.expiredAt && <InfoRow label="Expired" value={fmt(inquiry.expiredAt)} />}
            {budgetCents && (
              <>
                <InfoRow label="Your budget" value={formatPrice(budgetCents)} />
                {(tipCents ?? 0) > 0 && (
                  <InfoRow label="Tip (100% to vendor)" value={formatPrice(tipCents)} />
                )}
                <InfoRow label="Est. grand total">
                  <span className="font-semibold text-[var(--violet-700)]">~{formatPrice(feeGrossTotal(budgetCents, tipCents ?? 0))}</span>
                  <span className="block text-[10px] text-[var(--gray-400)] font-normal mt-0.5">
                    Includes 10% fee, 8.25% tax, processing{(tipCents ?? 0) > 0 ? ", and tip" : ""}
                  </span>
                </InfoRow>
              </>
            )}
          </div>
        </Card>

        {/* Offer details */}
        {activeOffer && (
          <Card
            title={activeOffer.status === "accepted" ? "Accepted Offer" : "Offer from Vendor"}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            }
          >
            <div className="divide-y divide-[var(--gray-50)]">
              <InfoRow label="Offer price">
                <span className="font-bold text-[var(--gray-900)] text-base">{formatPrice(activeOffer.totalPriceCents)}</span>
              </InfoRow>
              {(tipCents ?? 0) > 0 && (
                <InfoRow label="Committed tip">
                  <span className="font-medium text-[var(--violet-700)]">{formatPrice(tipCents)}</span>
                </InfoRow>
              )}
              {activeOffer.depositCents && (
                <InfoRow label="Deposit">
                  {formatPrice(activeOffer.depositCents)}
                  {activeOffer.depositType && (
                    <span className="text-xs text-[var(--gray-400)] ml-1">({activeOffer.depositType.replace("_", " ")})</span>
                  )}
                </InfoRow>
              )}
              {activeOffer.remainingBalanceCents && (
                <InfoRow label="Remaining balance" value={formatPrice(activeOffer.remainingBalanceCents)} />
              )}
              <InfoRow label="Offer status">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  activeOffer.status === "accepted" ? BADGE.mint : activeOffer.status === "declined" ? BADGE.gray : BADGE.coral
                }`}>
                  {activeOffer.status === "accepted" ? "Accepted" : activeOffer.status === "declined" ? "Declined" : "Awaiting response"}
                </span>
              </InfoRow>
              {activeOffer.paymentStatus && activeOffer.paymentStatus !== "none" && (
                <InfoRow label="Payment" value={activeOffer.paymentStatus.replace("_", " ")} />
              )}
              {activeOffer.expiresAt && (
                <InfoRow label="Offer expires" value={fmt(activeOffer.expiresAt)} />
              )}
            </div>

            {hasOffer && (
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/messages/${inquiry.id}/offer`}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-sm font-semibold hover:shadow-[var(--shadow-button)] transition-all"
                >
                  Review & Respond
                </Link>
              </div>
            )}
          </Card>
        )}

        {/* Tips card */}
        {isPaid && (booking?.tipCents ?? 0) > 0 && (
          <Card
            title="Tips"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            }
          >
            <div className="divide-y divide-[var(--gray-50)]">
              {(tipCents ?? 0) > 0 && (
                <InfoRow label="Paid with booking" value={formatPrice(tipCents)} />
              )}
              {(booking.tipCents - (tipCents ?? 0)) > 0 && (
                <InfoRow label="Additional tips sent">
                  <span className="font-semibold text-[var(--violet-700)]">{formatPrice(booking.tipCents - (tipCents ?? 0))}</span>
                </InfoRow>
              )}
              <InfoRow label="Total sent to vendor">
                <span className="font-bold text-[var(--gray-900)]">{formatPrice(booking.tipCents)}</span>
              </InfoRow>
            </div>
          </Card>
        )}

        {/* Venue logistics */}
        {hasLogistics && (
          <Card
            title="Venue Logistics"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            }
          >
            <div className="divide-y divide-[var(--gray-50)]">
              {event.boothSize && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">Booth size</span>
                  <span className="text-sm font-medium text-[var(--gray-800)]">
                    {event.boothSize.replace("x", " ft × ")} ft
                  </span>
                </div>
              )}
              {event.indoorOutdoor && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">Indoor or outdoor</span>
                  <LogisticChip value={event.indoorOutdoor} />
                </div>
              )}
              {event.canopyAllowed && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">Canopy allowed</span>
                  <LogisticChip value={event.canopyAllowed} />
                </div>
              )}
              {event.venueAttendees && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">Event attendees</span>
                  <span className="text-sm font-medium text-[var(--gray-800)]">{Number(event.venueAttendees).toLocaleString()}</span>
                </div>
              )}
              {event.accessToPower && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">Access to power</span>
                  <LogisticChip value={event.accessToPower} />
                </div>
              )}
              {event.accessToWater && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">Access to water</span>
                  <LogisticChip value={event.accessToWater} />
                </div>
              )}
              {event.wifiAvailability && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">WiFi availability</span>
                  <LogisticChip value={event.wifiAvailability} />
                </div>
              )}
              {event.vendorLoadIn && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">Vendor load-in</span>
                  <span className="text-sm font-medium text-[var(--gray-800)]">{event.vendorLoadIn}</span>
                </div>
              )}
              {event.vendorLoadOut && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">Vendor load-out</span>
                  <span className="text-sm font-medium text-[var(--gray-800)]">{event.vendorLoadOut}</span>
                </div>
              )}
              {event.eventHours && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">Event date / hours</span>
                  <span className="text-sm font-medium text-[var(--gray-800)]">{event.eventHours}</span>
                </div>
              )}
              {event.parkingAvailable && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">Parking on site</span>
                  <LogisticChip value={event.parkingAvailable} />
                </div>
              )}
              {event.securityPresence && (
                <div className="flex items-start justify-between gap-4 py-3">
                  <span className="text-sm text-[var(--gray-500)]">Security presence</span>
                  <LogisticChip value={event.securityPresence} />
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* ── Initial message ── */}
      {initialMessage && (
        <Card
          title="Your Initial Message"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          }
        >
          <p className="text-sm text-[var(--gray-600)] leading-relaxed whitespace-pre-wrap">{initialMessage}</p>
        </Card>
      )}

      {/* ── Tip modal ── */}
      {showTipModal && (
        <TipModal
          booking={booking}
          inquiry={inquiry}
          onClose={() => setShowTipModal(false)}
          onTipPaid={refreshInquiry}
        />
      )}
    </div>
  );
}
