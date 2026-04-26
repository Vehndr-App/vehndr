"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../contexts/AuthContext";
import { listMessages } from "../../../../services/inquiries";
import {
  createMarketplacePaymentIntent,
  confirmMarketplacePayment,
} from "../../../../services/checkout";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// ── Marketplace fee constants (mirror MarketplacePricing in the API) ──────────
const MARKETPLACE_TAX_RATE            = 0.0825;  // 8.25%
const MARKETPLACE_SERVICE_FEE_PERCENT = 0.05;    // 5%

function calcTax(cents)        { return Math.round(cents * MARKETPLACE_TAX_RATE); }
function calcServiceFee(cents) { return Math.round(cents * MARKETPLACE_SERVICE_FEE_PERCENT); }
function calcTotal(cents)      { return cents + calcTax(cents) + calcServiceFee(cents); }
// ─────────────────────────────────────────────────────────────────────────────

function formatPrice(cents) {
  if (!cents && cents !== 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ─── Stripe Payment Form ──────────────────────────────────────────────────────

function StripePaymentForm({ amountCents, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement onReady={() => setReady(true)} />
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!ready || processing}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-base tracking-tight shadow-lg hover:shadow-xl hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {!ready ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            Loading…
          </span>
        ) : processing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            Processing…
          </span>
        ) : (
          `Pay ${formatPrice(amountCents)}`
        )}
      </button>
    </form>
  );
}

// ─── Dev Mode Payment ─────────────────────────────────────────────────────────

function DevPaymentForm({ amountCents, onSuccess }) {
  const [processing, setProcessing] = useState(false);

  async function handleSimulate() {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 800));
    onSuccess();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 flex-shrink-0">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p className="text-xs font-medium text-amber-700">Development mode — no real payment will be taken</p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
            <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Payment form (dev)</p>
        <p className="text-xs text-gray-400">Stripe Elements not shown in development</p>
      </div>

      <button
        onClick={handleSimulate}
        disabled={processing}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-base tracking-tight shadow-lg hover:shadow-xl hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-40"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            Simulating…
          </span>
        ) : (
          `Simulate Payment · ${formatPrice(amountCents)}`
        )}
      </button>
    </div>
  );
}

// ─── Confirmation Screen ──────────────────────────────────────────────────────

function ConfirmationScreen({ inquiry, booking, paidCents, isDeposit, onBackToThread }) {
  const offer = inquiry?.activeOffer;
  const fullyPaid = isDeposit === false || booking?.paymentStatus === "fully_paid" || booking?.payment_status === "fully_paid";

  return (
    <div className="flex flex-col items-center text-center pt-8 pb-6 px-4">
      {/* Success icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
        {fullyPaid ? "You're all set!" : "Deposit received"}
      </h1>
      <p className="text-sm text-gray-500 mb-8 max-w-xs leading-relaxed">
        {fullyPaid
          ? `Your booking with ${inquiry?.vendor?.name} is confirmed.`
          : `Deposit of ${formatPrice(paidCents)} secured your booking with ${inquiry?.vendor?.name}.`}
      </p>

      {/* Receipt card */}
      <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5 text-left">
        <div className="px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Receipt</p>
          <p className="text-xl font-bold text-white mt-0.5">{formatPrice(paidCents)}</p>
        </div>
        <div className="divide-y divide-gray-50">
          <div className="px-5 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-500">Vendor</span>
            <span className="text-sm font-semibold text-gray-900">{inquiry?.vendor?.name}</span>
          </div>
          {offer && (
            <div className="px-5 py-3 flex justify-between items-center">
              <span className="text-sm text-gray-500">Booking total</span>
              <span className="text-sm font-semibold text-gray-900">{formatPrice(offer.totalPriceCents)}</span>
            </div>
          )}
          <div className="px-5 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-500">Paid now</span>
            <span className="text-sm font-semibold text-emerald-600">{formatPrice(paidCents)}</span>
          </div>
          {!fullyPaid && offer?.remainingBalanceCents > 0 && (
            <div className="px-5 py-3 flex justify-between items-center">
              <span className="text-sm text-gray-500">Balance due</span>
              <span className="text-sm font-semibold text-gray-700">{formatPrice(offer.remainingBalanceCents)}</span>
            </div>
          )}
          <div className="px-5 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-500">Status</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${fullyPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {fullyPaid ? "Fully paid" : "Deposit paid"}
            </span>
          </div>
        </div>
      </div>

      {!fullyPaid && offer?.remainingBalanceCents > 0 && (
        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
          The remaining {formatPrice(offer.remainingBalanceCents)} can be paid any time before your event from this conversation.
        </p>
      )}

      <button
        onClick={onBackToThread}
        className="w-full py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Back to conversation
      </button>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function CheckoutSkeleton({ inquiryId }) {
  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-4">
          <Link href={`/messages/${inquiryId}`} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          {/* Step indicator skeleton */}
          <div className="flex-1 flex items-center justify-center gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-3 w-8 bg-gray-100 rounded-full animate-pulse" />
                {i < 3 && <div className="w-8 h-px bg-gray-200" />}
              </div>
            ))}
          </div>
          <div className="w-9" />
        </div>
      </div>

      {/* Body skeleton */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
          {/* Vendor + offer card */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="h-1.5 w-full bg-gray-100 animate-pulse" />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 bg-gray-100 rounded-full animate-pulse" />
                  <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="h-7 w-20 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="space-y-2 pt-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3.5 w-24 bg-gray-100 rounded-full animate-pulse" />
                    <div className="h-3.5 w-16 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment toggle skeleton */}
          <div className="grid grid-cols-2 gap-2">
            <div className="h-24 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            <div className="h-24 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          </div>

          {/* CTA skeleton */}
          <div className="h-14 w-full bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketplaceCheckoutPage() {
  const { inquiryId } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // stage: "summary" | "payment" | "confirmed"
  const [stage, setStage] = useState("summary");
  const [payDeposit, setPayDeposit] = useState(true);

  const [intentData, setIntentData] = useState(null); // { clientSecret, paymentIntentId, amountCents, isDeposit, bookingId, devMode }
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState(null);

  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [paidCents, setPaidCents] = useState(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    listMessages(inquiryId)
      .then((res) => setInquiry(res.inquiry ?? null))
      .catch(() => setLoadError("Failed to load booking details."))
      .finally(() => setLoading(false));
  }, [user, inquiryId, router]);

  const offer = inquiry?.activeOffer;
  const booking = inquiry?.marketplaceBooking;

  const depositAvailable = offer?.depositCents > 0 && booking?.paymentStatus === "pending";
  const remainingDue = booking?.paymentStatus === "deposit_paid" && offer?.remainingBalanceCents > 0;
  const alreadyPaid = booking?.paymentStatus === "fully_paid";

  const subtotalCents = depositAvailable
    ? (payDeposit ? offer.depositCents : offer.totalPriceCents)
    : offer?.remainingBalanceCents ?? offer?.totalPriceCents;

  // Fees only apply when the customer is paying (proposal_type === "cash")
  const isCashOffer      = offer?.proposalType === "cash";
  const taxCentsLocal    = isCashOffer ? calcTax(subtotalCents)        : 0;
  const feeCentsLocal    = isCashOffer ? calcServiceFee(subtotalCents) : 0;
  const chargeAmount     = isCashOffer ? calcTotal(subtotalCents)      : subtotalCents;

  async function handleProceedToPayment() {
    if (!booking) return;
    setCreatingIntent(true);
    setIntentError(null);
    const shouldPayDeposit = depositAvailable && payDeposit;
    try {
      const data = await createMarketplacePaymentIntent({
        bookingId: booking.id,
        payDeposit: shouldPayDeposit,
      });
      setIntentData(data);
      setStage("payment");
    } catch (err) {
      setIntentError(err.message ?? "Failed to start checkout. Please try again.");
    } finally {
      setCreatingIntent(false);
    }
  }

  async function handlePaymentSuccess(paymentIntentId) {
    try {
      const updatedBooking = await confirmMarketplacePayment({
        paymentIntentId: paymentIntentId ?? intentData?.paymentIntentId,
        bookingId: intentData?.bookingId,
        isDeposit: intentData?.isDeposit,
      });
      setPaidCents(intentData?.amountCents);
      setConfirmedBooking(updatedBooking);
      setStage("confirmed");
    } catch (err) {
      setIntentError(err.message ?? "Payment confirmed but booking update failed. Contact support.");
    }
  }

  if (!user) return null;

  if (loading) {
    return <CheckoutSkeleton inquiryId={inquiryId} />;
  }

  if (loadError || !booking || !offer) {
    return (
      <div className="flex flex-col h-[100dvh] bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <Link href={`/messages/${inquiryId}`} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <p className="font-semibold text-sm text-gray-900">Checkout</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">{loadError ?? "No active booking"}</p>
            <p className="text-xs text-gray-400 mb-5">Accept an offer first to proceed to payment.</p>
            <Link href={`/messages/${inquiryId}`} className="text-sm font-semibold text-violet-600 hover:text-violet-700">
              ← Back to conversation
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (alreadyPaid) {
    return (
      <div className="flex flex-col h-[100dvh] bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <Link href={`/messages/${inquiryId}`} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <p className="font-semibold text-sm text-gray-900">Checkout</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="text-base font-bold text-gray-900 mb-1">Already paid</p>
          <p className="text-sm text-gray-500 mb-6">This booking is fully paid.</p>
          <Link href={`/messages/${inquiryId}`} className="text-sm font-semibold text-violet-600 hover:text-violet-700">
            Back to conversation
          </Link>
        </div>
      </div>
    );
  }

  const stepLabels = ["Review", "Pay", "Done"];
  const stepIndex = stage === "summary" ? 0 : stage === "payment" ? 1 : 2;

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-4">
          {/* Back button */}
          {stage === "payment" ? (
            <button onClick={() => setStage("summary")} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          ) : stage === "confirmed" ? (
            <div className="w-9 h-9" />
          ) : (
            <Link href={`/messages/${inquiryId}`} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </Link>
          )}

          {/* Step indicator */}
          <div className="flex-1 flex items-center justify-center gap-2">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    i < stepIndex ? "bg-violet-600 text-white" :
                    i === stepIndex ? "bg-violet-600 text-white ring-4 ring-violet-100" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {i < stepIndex ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (i + 1)}
                  </div>
                  <span className={`text-xs font-semibold ${i === stepIndex ? "text-gray-900" : "text-gray-400"}`}>
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`w-8 h-px ${i < stepIndex ? "bg-violet-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="w-9" />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-6">

          {/* ── Confirmed ── */}
          {stage === "confirmed" && (
            <ConfirmationScreen
              inquiry={inquiry}
              booking={confirmedBooking ?? booking}
              paidCents={paidCents}
              isDeposit={intentData?.isDeposit}
              onBackToThread={() => router.push(`/messages/${inquiryId}`)}
            />
          )}

          {/* ── Summary ── */}
          {stage === "summary" && (
            <div className="space-y-4">

              {/* Vendor + offer card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Gradient banner */}
                <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

                <div className="p-5">
                  {/* Vendor row */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {inquiry?.vendor?.name?.charAt(0)?.toUpperCase() ?? "V"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{inquiry?.vendor?.name}</p>
                      <p className="text-xs text-gray-400">Booking proposal</p>
                    </div>
                    <div className="ml-auto text-right flex-shrink-0">
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatPrice(offer.totalPriceCents)}</p>
                      <p className="text-xs text-gray-400">total</p>
                    </div>
                  </div>

                  {/* Description */}
                  {offer.description && (
                    <p className="text-sm text-gray-500 leading-relaxed mb-5 pb-5 border-b border-gray-50">
                      {offer.description}
                    </p>
                  )}

                  {/* Price breakdown */}
                  <div className="space-y-2">
                    {depositAvailable && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Deposit</span>
                        <span className="font-medium text-gray-900">{formatPrice(offer.depositCents)}</span>
                      </div>
                    )}
                    {(depositAvailable || remainingDue) && offer.remainingBalanceCents > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Remaining balance</span>
                        <span className="font-medium text-gray-900">{formatPrice(offer.remainingBalanceCents)}</span>
                      </div>
                    )}
                    {remainingDue && (
                      <div className="flex justify-between text-sm pt-1">
                        <span className="text-gray-500">Deposit status</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Paid</span>
                      </div>
                    )}

                    {/* Tax & service fee breakdown (cash offers only) */}
                    {isCashOffer && (
                      <div className="pt-2 mt-2 border-t border-gray-50 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="font-medium text-gray-900">{formatPrice(subtotalCents)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Service fee ({(MARKETPLACE_SERVICE_FEE_PERCENT * 100).toFixed(0)}%)</span>
                          <span className="font-medium text-gray-900">{formatPrice(feeCentsLocal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Tax ({(MARKETPLACE_TAX_RATE * 100).toFixed(2)}%)</span>
                          <span className="font-medium text-gray-900">{formatPrice(taxCentsLocal)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-100">
                          <span className="text-gray-700">Total due today</span>
                          <span className="text-gray-900">{formatPrice(chargeAmount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment toggle — only when deposit is available */}
              {depositAvailable && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Pay today</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPayDeposit(true)}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                        payDeposit
                          ? "border-violet-500 bg-violet-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      {payDeposit && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${payDeposit ? "text-violet-600" : "text-gray-400"}`}>
                        Deposit
                      </p>
                      <p className={`text-xl font-bold tracking-tight ${payDeposit ? "text-violet-900" : "text-gray-900"}`}>
                        {formatPrice(offer.depositCents)}
                      </p>
                      {offer.depositType && (
                        <p className={`text-[11px] mt-1 capitalize ${payDeposit ? "text-violet-500" : "text-gray-400"}`}>
                          {offer.depositType.replace("_", "-")}
                        </p>
                      )}
                    </button>

                    <button
                      onClick={() => setPayDeposit(false)}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                        !payDeposit
                          ? "border-violet-500 bg-violet-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      {!payDeposit && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${!payDeposit ? "text-violet-600" : "text-gray-400"}`}>
                        Pay in full
                      </p>
                      <p className={`text-xl font-bold tracking-tight ${!payDeposit ? "text-violet-900" : "text-gray-900"}`}>
                        {formatPrice(offer.totalPriceCents)}
                      </p>
                      <p className={`text-[11px] mt-1 ${!payDeposit ? "text-violet-500" : "text-gray-400"}`}>
                        Save the balance reminder
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Balance due banner — deposit already paid */}
              {remainingDue && (
                <div className="flex items-center gap-4 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Balance due</p>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatPrice(offer.remainingBalanceCents)}</p>
                    <p className="text-xs text-amber-600 mt-0.5">Deposit was already paid</p>
                  </div>
                </div>
              )}

              {intentError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 text-center">
                  {intentError}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleProceedToPayment}
                disabled={creatingIntent}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-base tracking-tight shadow-lg hover:shadow-xl hover:from-violet-500 hover:to-purple-500 transition-all disabled:opacity-40"
              >
                {creatingIntent ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    Preparing…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Continue to pay {formatPrice(chargeAmount)}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                Secured by Stripe · SSL encrypted
              </p>
            </div>
          )}

          {/* ── Payment ── */}
          {stage === "payment" && intentData && (
            <div className="space-y-4">
              {/* Amount reminder */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4">
                  <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-0.5">
                    {intentData.isDeposit ? "Deposit" : "Total"} · {inquiry?.vendor?.name}
                  </p>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {formatPrice(intentData.amountCents)}
                  </p>
                </div>
                {/* Fee breakdown */}
                {(intentData.taxCents > 0 || intentData.serviceFeeCents > 0) && (
                  <div className="divide-y divide-gray-50">
                    <div className="px-5 py-2.5 flex justify-between items-center">
                      <span className="text-xs text-gray-500">Subtotal</span>
                      <span className="text-xs font-medium text-gray-700">{formatPrice(intentData.subtotalCents)}</span>
                    </div>
                    {intentData.serviceFeeCents > 0 && (
                      <div className="px-5 py-2.5 flex justify-between items-center">
                        <span className="text-xs text-gray-500">Service fee ({(MARKETPLACE_SERVICE_FEE_PERCENT * 100).toFixed(0)}%)</span>
                        <span className="text-xs font-medium text-gray-700">{formatPrice(intentData.serviceFeeCents)}</span>
                      </div>
                    )}
                    {intentData.taxCents > 0 && (
                      <div className="px-5 py-2.5 flex justify-between items-center">
                        <span className="text-xs text-gray-500">Tax ({(MARKETPLACE_TAX_RATE * 100).toFixed(2)}%)</span>
                        <span className="text-xs font-medium text-gray-700">{formatPrice(intentData.taxCents)}</span>
                      </div>
                    )}
                  </div>
                )}
                {intentData.isDeposit && offer?.remainingBalanceCents > 0 && (
                  <div className="px-5 py-3 flex justify-between items-center bg-violet-50/50">
                    <span className="text-xs text-violet-600">Remaining after deposit</span>
                    <span className="text-xs font-semibold text-violet-700">{formatPrice(offer.remainingBalanceCents)}</span>
                  </div>
                )}
              </div>

              {/* Payment form */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                {intentData.devMode ? (
                  <DevPaymentForm
                    amountCents={intentData.amountCents}
                    onSuccess={() => handlePaymentSuccess(null)}
                  />
                ) : intentData.clientSecret ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret: intentData.clientSecret,
                      appearance: {
                        theme: "stripe",
                        variables: {
                          colorPrimary: "#7c3aed",
                          borderRadius: "12px",
                          fontFamily: "inherit",
                          spacingUnit: "4px",
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      amountCents={intentData.amountCents}
                      onSuccess={(id) => handlePaymentSuccess(id)}
                      onError={(err) => setIntentError(err.message)}
                    />
                  </Elements>
                ) : (
                  <p className="text-sm text-red-500 text-center">Unable to initialize payment. Please go back and try again.</p>
                )}
              </div>

              {intentError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 text-center">
                  {intentError}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
