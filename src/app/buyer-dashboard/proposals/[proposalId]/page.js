"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../contexts/AuthContext";
import { getInquiry, deleteInquiry } from "../../../../services/inquiries";
import { getEvent } from "../../../../services/events";
import { addMarketplaceTip, confirmMarketplaceTip } from "../../../../services/checkout";
import TipSelector from "../../../../components/TipSelector";
import CancelBookingModal from "../../../../components/CancelBookingModal";
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

// ─── Fee helpers (matches MarketplacePricing) ────────────────────────────────

const VEHNDR_FEE_RATE   = 0.10;
const STRIPE_FEE_RATE   = 0.029;
const STRIPE_FEE_FIXED  = 30; // cents
const TAX_RATE          = 0.0825;

function calcVehndrFee(base)       { return Math.round(base * VEHNDR_FEE_RATE); }
function calcStripeFee(total)      { return Math.round(total * STRIPE_FEE_RATE) + STRIPE_FEE_FIXED; }
function calcTaxFee(base)          { return Math.round(base * TAX_RATE); }
function calcVendorPayout(base, tip = 0) {
  return base + tip - calcVehndrFee(base) - calcStripeFee(base + tip) - calcTaxFee(base);
}

const fmtC = (c) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(c / 100);

function formatLoadTime(stored) {
  if (!stored) return stored;
  const m = stored.match(/^(\d{4}-\d{2}-\d{2}) (.+)$/);
  if (!m) return stored;
  const d = new Date(m[1] + "T00:00:00");
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${m[2]}`;
}

// ─── Proposal details card (pre-offer) ────────────────────────────────────────

function ProposalDetailsCard({ budgetCents, tipCents, coordinatorType, vendorLoadIn, vendorLoadOut }) {
  const budget = budgetCents ?? 0;
  const tip    = tipCents ?? 0;
  const total  = budget + tip;
  const hasPricing   = budget > 0 || tip > 0;
  const hasLogistics = vendorLoadIn || vendorLoadOut;

  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-spring-up" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="h-1.5 w-full" style={{ background: "var(--gradient-vendor)" }} />
      <div className="px-4 sm:px-6 py-4 border-b border-[var(--gray-100)]">
        <h3 className="font-semibold text-[var(--gray-900)] text-[15px]">Your Proposal</h3>
      </div>
      <div className="px-4 sm:px-6 py-5 space-y-3">
        {budget > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--gray-500)]">Budget</span>
            <span className="font-medium text-[var(--gray-800)]">{fmtC(budget)}</span>
          </div>
        )}
        {tip > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--gray-500)]">Committed tip</span>
            <span className="font-medium text-[var(--violet-600)]">+{fmtC(tip)}</span>
          </div>
        )}
        {total > 0 && (
          <div className="flex justify-between text-sm pt-2.5 border-t border-[var(--gray-100)]">
            <span className="font-semibold text-[var(--gray-700)]">Total proposed</span>
            <span className="font-bold text-[var(--gray-900)]">{fmtC(total)}</span>
          </div>
        )}
        {coordinatorType && (
          <div className={`flex justify-between text-sm ${hasPricing ? "pt-2.5 border-t border-[var(--gray-100)]" : ""}`}>
            <span className="text-[var(--gray-500)]">Coordinator type</span>
            <span className="font-medium text-[var(--gray-800)] capitalize">{coordinatorType.replace(/_/g, " ")}</span>
          </div>
        )}
        {hasLogistics && (
          <div className={`space-y-3 ${hasPricing || coordinatorType ? "pt-2.5 border-t border-[var(--gray-100)]" : ""}`}>
            {vendorLoadIn && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--gray-500)]">Vendor load-in</span>
                <span className="font-medium text-[var(--gray-800)]">{formatLoadTime(vendorLoadIn)}</span>
              </div>
            )}
            {vendorLoadOut && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--gray-500)]">Vendor load-out</span>
                <span className="font-medium text-[var(--gray-800)]">{formatLoadTime(vendorLoadOut)}</span>
              </div>
            )}
          </div>
        )}
        {!hasPricing && !coordinatorType && !hasLogistics && (
          <p className="text-sm text-[var(--gray-400)]">No details provided.</p>
        )}
      </div>
    </div>
  );
}

// ─── Pricing card (post-offer) ────────────────────────────────────────────────

function PricingCard({ offer, tipCents, booking }) {
  const [youPayOpen, setYouPayOpen] = useState(false);

  const base         = offer.totalPriceCents;
  const committedTip = tipCents ?? 0;
  const extraTip     = Math.max(0, (booking?.tipCents ?? 0) - committedTip);
  const totalTip     = committedTip + extraTip;
  const total        = base + totalTip;

  const ChevronIcon = ({ open }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );

  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-spring-up" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="h-1.5 w-full" style={{ background: "var(--gradient-vendor)" }} />
      <div className="px-4 sm:px-6 py-4 border-b border-[var(--gray-100)]">
        <h3 className="font-semibold text-[var(--gray-900)] text-[15px]">Pricing</h3>
      </div>

      {/* You Pay */}
      <div>
        <button
          type="button"
          onClick={() => setYouPayOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 sm:px-6 py-5 text-left hover:bg-[var(--gray-50)] transition-colors"
        >
          <div>
            <p className="text-[11px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-1">You Pay</p>
            <p className="text-[40px] font-bold text-[var(--gray-900)] leading-none tracking-tight">{fmtC(total)}</p>
          </div>
          <span className="text-[var(--gray-400)] flex-shrink-0 ml-3"><ChevronIcon open={youPayOpen} /></span>
        </button>
        {youPayOpen && (
          <div className="px-4 sm:px-6 pb-5 border-t border-[var(--gray-100)] space-y-2.5 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-500)]">Base service</span>
              <span className="font-medium text-[var(--gray-800)]">{fmtC(base)}</span>
            </div>
            {committedTip > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--gray-500)]">Tip</span>
                <span className="font-medium text-[var(--violet-600)]">+{fmtC(committedTip)}</span>
              </div>
            )}
            {extraTip > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--gray-500)]">Additional tip</span>
                <span className="font-medium text-[var(--violet-600)]">+{fmtC(extraTip)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2.5 border-t border-[var(--gray-100)]">
              <span className="font-semibold text-[var(--gray-700)]">Total</span>
              <span className="font-bold text-[var(--gray-900)]">{fmtC(total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(raw, opts = { month: "long", day: "numeric", year: "numeric" }) {
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString("en-US", opts);
}

function fmtDateTime(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
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
  const pct = isExpired ? 0 : Math.round((currentIdx / (STATUS_STEPS.length - 1)) * 100);

  return (
    <>
      {/* Mobile: compact progress bar */}
      <div className="sm:hidden">
        <div className="flex items-start justify-between mb-2.5 gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--violet-700)]">
              {isExpired ? "Expired" : (STATUS_STEPS[currentIdx]?.label ?? "—")}
            </p>
            {!isExpired && (
              <p className="text-[10px] text-[var(--gray-400)] mt-0.5">Step {currentIdx + 1} of {STATUS_STEPS.length}</p>
            )}
          </div>
        </div>
        <div className="relative h-1.5 w-full bg-[var(--gray-100)] rounded-full">
          <div
            className="absolute inset-y-0 left-0 bg-[var(--violet-600)] rounded-full transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {STATUS_STEPS.map((step, i) => (
            <div
              key={step.key}
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                i <= currentIdx && !isExpired ? "bg-[var(--violet-600)]" : "bg-[var(--gray-100)]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop: full horizontal timeline */}
      <div className="hidden sm:block overflow-x-auto pb-2">
        <div className="flex items-center gap-0 min-w-max">
          {STATUS_STEPS.map((step, i) => {
            const done    = i <= currentIdx && !isExpired;
            const current = i === currentIdx && !isExpired;
            const last    = i === STATUS_STEPS.length - 1;

            return (
              <div key={step.key} className="flex items-center flex-1">
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

                {!last && (
                  <div className={`flex-1 h-[2px] mx-1 rounded-full ${
                    i < currentIdx && !isExpired ? "bg-[var(--violet-600)]" : "bg-[var(--gray-200)]"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-[var(--gray-50)] last:border-0">
      <span className="text-sm text-[var(--gray-500)] flex-shrink-0 min-w-[90px] sm:min-w-[140px]">{label}</span>
      <span className="text-sm font-medium text-[var(--gray-800)] text-right min-w-0">{children ?? value ?? "—"}</span>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({ title, icon, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${className}`} style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2.5 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--gray-100)]">
        {icon && <span className="text-[var(--gray-400)]">{icon}</span>}
        <h3 className="font-semibold text-[var(--gray-900)] text-[15px]">{title}</h3>
      </div>
      <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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
              <p className="text-xs text-[var(--gray-400)]">Processed securely by Stripe.</p>
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
  const [showCancelModal, setShowCancelModal] = useState(false);

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
      <div className="max-w-4xl mx-auto px-4 py-5 sm:py-8 space-y-4">
        <div className="h-8 bg-[var(--gray-100)] rounded w-48 animate-pulse" />
        <div className="bg-white rounded-2xl h-40 animate-pulse" style={{ boxShadow: "var(--shadow-card)" }} />
        <div className="bg-white rounded-2xl h-56 animate-pulse" style={{ boxShadow: "var(--shadow-card)" }} />
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-[var(--error)] mb-4">{error ?? "Proposal not found."}</p>
        <Link href="/buyer-dashboard/proposals" className="text-sm text-[var(--violet-600)] hover:underline">← Back to proposals</Link>
      </div>
    );
  }

  const { vendor, status, activeOffer, initialMessage, createdAt, budgetCents, tipCents, coordinatorType } = inquiry;
  const initial   = vendor?.name?.charAt(0)?.toUpperCase() ?? "V";
  const color     = STATUS_COLOR[status] ?? "gray";
  const hasOffer    = activeOffer?.status === "pending";
  const isCancelled = inquiry.marketplaceBooking?.status === "cancelled" || status === "cancelled";
  const isBooked    = (status === "scheduled" || activeOffer?.status === "accepted") && !isCancelled;
  const isExpired = status === "expired";
  const isPaid    = activeOffer?.paymentStatus === "deposit_paid" || activeOffer?.paymentStatus === "fully_paid" || status === "scheduled";
  const canEdit   = !isPaid && activeOffer?.status !== "accepted" && status !== "scheduled" && status !== "completed" && status !== "expired";
  const booking          = inquiry.marketplaceBooking;
  const isCash           = activeOffer?.proposalType === "cash";
  const hasPostPaymentTip = (booking?.tipCents ?? 0) > (tipCents ?? 0);
  const canTip           = isPaid && isCash && !!booking && !hasPostPaymentTip && !isCancelled;
  // Deletable only until the vendor views it; cancellable once viewed (any non-terminal state).
  const TERMINAL_STATUSES = ["completed", "expired", "vendor_declined", "cancelled"];
  const canDelete = status === "submitted" && !isCancelled;
  const canCancel = !canDelete && !isCancelled && !TERMINAL_STATUSES.includes(status);
  const cancelLabel = booking ? "Cancel Booking" : "Cancel Proposal";

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 sm:py-8 space-y-4 sm:space-y-6">

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
      <div className="bg-white rounded-2xl overflow-hidden animate-spring-up" style={{ boxShadow: "var(--shadow-card)" }}>
        {/* Top gradient band */}
        <div className="h-1.5 w-full" style={{ background: isBooked ? "var(--gradient-organizer)" : isExpired ? "var(--gray-200)" : "var(--gradient-vendor)" }} />

        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-bold text-base sm:text-xl flex-shrink-0 overflow-hidden"
                style={{ background: "var(--gradient-vendor)", boxShadow: "0 4px 16px rgba(139,92,246,0.25)" }}
              >
                {vendor?.heroImage
                  ? <img src={vendor.heroImage} alt="" className="w-full h-full object-cover" />
                  : initial
                }
              </div>
              <div>
                <h1 className="text-[16px] sm:text-lg font-display font-bold text-[var(--gray-900)] leading-tight">{vendor?.name}</h1>
                {event && <p className="text-[13px] text-[var(--gray-500)] mt-0.5">for {event.name}</p>}
                <p className="text-[11px] text-[var(--gray-400)] mt-1">Submitted {fmtDateTime(createdAt)}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full ${BADGE[color]}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>

          {/* Timeline */}
          {!isExpired && !isCancelled && (
            <div className="mt-5 sm:mt-8 mb-2">
              <Timeline status={status} />
            </div>
          )}

          {isExpired && (
            <div className="mt-5 p-3 rounded-xl bg-[var(--gray-50)] text-sm text-[var(--gray-500)] text-center">
              This proposal has expired with no response from the vendor.
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-5">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">

            {/* Primary CTAs — full-width on mobile */}
            <Link
              href={`/messages/${inquiry.id}`}
              className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[var(--gray-900)] text-white text-sm font-semibold hover:bg-[var(--gray-700)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              Open Thread
            </Link>

            {hasOffer && (
              <Link
                href={`/messages/${inquiry.id}/offer`}
                className="tap-scale flex items-center justify-center gap-2 h-11 px-5 rounded-2xl text-white text-[13px] font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--coral-500) 0%, var(--coral-600) 100%)",
                  boxShadow: "0 4px 16px rgba(255,107,107,0.35)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Review Offer — {formatPrice(activeOffer.totalPriceCents + (inquiry.marketplaceBooking?.tipCents ?? tipCents ?? 0))}
              </Link>
            )}

            {isBooked && activeOffer?.proposalType === "cash" && !isPaid && (
              <Link
                href={`/messages/${inquiry.id}/checkout`}
                className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-[var(--mint-500)] to-[var(--mint-600)] text-white text-sm font-semibold hover:shadow-md transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Complete Payment
              </Link>
            )}

            {isBooked && activeOffer?.proposalType === "product" && !isPaid && status !== "scheduled" && (
              <span className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[var(--mint-50)] border border-[var(--mint-200)] text-[var(--mint-700)] text-xs font-semibold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Awaiting vendor payment
              </span>
            )}

            {/* Secondary CTAs — row on mobile, inline on desktop */}
            {(canEdit || canTip || vendor?.id || canDelete || canCancel) && (
              <div className="flex flex-row flex-wrap gap-2 sm:contents">
                {canEdit && (
                  <Link
                    href={`/buyer-dashboard/proposals/${proposalId}/edit`}
                    className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[var(--violet-200)] text-[var(--violet-700)] text-sm font-semibold hover:bg-[var(--violet-50)] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit Proposal
                  </Link>
                )}
                {canTip && (
                  <button
                    onClick={() => setShowTipModal(true)}
                    className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-[var(--violet-50)] to-[var(--magenta-50)] border border-[var(--violet-200)] text-[var(--violet-700)] text-sm font-semibold hover:shadow-sm transition-all"
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
                    className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[var(--gray-200)] text-[var(--gray-600)] text-sm font-medium hover:bg-[var(--gray-50)] transition-colors"
                  >
                    View Storefront
                  </Link>
                )}

                {canDelete && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors sm:ml-auto"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                    Delete
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors sm:ml-auto"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    {cancelLabel}
                  </button>
                )}
              </div>
            )}
          </div>
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

      {/* ── Cancel booking modal ── */}
      {showCancelModal && (
        <CancelBookingModal
          inquiry={inquiry}
          booking={booking}
          role="coordinator"
          onClose={() => setShowCancelModal(false)}
          onCancelled={() => { setShowCancelModal(false); refreshInquiry(); }}
        />
      )}

      {/* ── Cancelled banner ── */}
      {isCancelled && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <div className="text-sm text-red-700">
            <p className="font-semibold">This {booking ? "booking" : "proposal"} was cancelled{booking?.cancelledByRole ? ` by the ${booking.cancelledByRole}` : ""}.</p>
            {(booking?.refundAmountCents ?? 0) > 0 && (
              <p className="mt-0.5">A refund of {formatPrice(booking.refundAmountCents)} {booking?.refundStatus === "full_refund" ? "(full)" : "(partial)"} is being processed.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Pricing summary ── */}
      {activeOffer?.proposalType === "cash" && activeOffer?.totalPriceCents > 0 ? (
        <PricingCard offer={activeOffer} tipCents={tipCents} booking={booking} />
      ) : (budgetCents > 0 || tipCents > 0 || coordinatorType || event?.vendorLoadIn || event?.vendorLoadOut) && (
        <ProposalDetailsCard
          budgetCents={budgetCents}
          tipCents={tipCents}
          coordinatorType={coordinatorType}
          vendorLoadIn={event?.vendorLoadIn}
          vendorLoadOut={event?.vendorLoadOut}
        />
      )}

      {/* ── Event + Message side by side ── */}
      <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${event && initialMessage ? "sm:grid-cols-2" : ""}`}>

        {/* Event card — links to full event page */}
        {event && (
          <Link
            href={`/buyer-dashboard/events/${event.id}`}
            className="block bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="h-1 w-full" style={{ background: "var(--gradient-organizer)" }} />
            <div className="px-4 sm:px-5 py-4">
              <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-1">Event</p>
              <p className="text-[15px] font-bold text-[var(--gray-900)] leading-snug">{event.name}</p>
              {(event.startDate) && (
                <p className="text-xs text-[var(--gray-500)] mt-1">
                  {fmt(event.startDate)}{event.endDate && event.endDate !== event.startDate ? ` – ${fmt(event.endDate)}` : ""}
                </p>
              )}
              {(event.streetAddress || event.location) && (
                <p className="text-xs text-[var(--gray-400)] mt-0.5 truncate">{event.streetAddress || event.location}</p>
              )}
              <p className="text-xs font-semibold text-[var(--violet-600)] mt-3 flex items-center gap-1">
                View event
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </p>
            </div>
          </Link>
        )}

        {/* Initial message */}
        {initialMessage && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="h-1 w-full bg-[var(--gray-100)]" />
            <div className="px-4 sm:px-5 py-4">
              <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-2">Your Message</p>
              <p className="text-sm text-[var(--gray-600)] leading-relaxed whitespace-pre-wrap">{initialMessage}</p>
            </div>
          </div>
        )}

      </div>

      {/* Offer review CTA — only when offer is pending response */}
      {hasOffer && (
        <Link
          href={`/messages/${inquiry.id}/offer`}
          className="flex items-center justify-center gap-2 w-full h-11 rounded-2xl bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-sm font-semibold hover:shadow-[var(--shadow-button)] transition-all"
        >
          Review &amp; Respond to Offer
        </Link>
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
