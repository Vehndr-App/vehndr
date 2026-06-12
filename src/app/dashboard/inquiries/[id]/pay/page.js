"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGate from "../../../../../components/AuthGate";
import { getInquiry } from "../../../../../services/inquiries";
import { createVendorPaymentIntent, confirmVendorPayment } from "../../../../../services/checkout";
import { vendorBoothBreakdown } from "../../../../../utils/marketplacePricing";
import {
  WALLET_FIRST_PAYMENT_METHOD_ORDER,
  WALLET_PAYMENT_ELEMENT_OPTIONS,
} from "../../../../../utils/stripePaymentOptions";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;


function formatPrice(cents) {
  if (!cents && cents !== 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default function VendorPayPage() {
  return <AuthGate><VendorPayInner /></AuthGate>;
}

// ─── Stripe form ──────────────────────────────────────────────────────────────

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
      <PaymentElement onReady={() => setReady(true)} options={WALLET_PAYMENT_ELEMENT_OPTIONS} />
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}
      <button
        type="submit"
        disabled={!ready || processing}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {!ready ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Loading…
          </span>
        ) : processing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Processing…
          </span>
        ) : `Pay ${formatPrice(amountCents)}`}
      </button>
    </form>
  );
}

// ─── Dev mode form ────────────────────────────────────────────────────────────

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
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-40"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Simulating…
          </span>
        ) : `Simulate Payment · ${formatPrice(amountCents)}`}
      </button>
    </div>
  );
}

// ─── Confirmation ─────────────────────────────────────────────────────────────

function ConfirmationScreen({ inquiry, onBack }) {
  return (
    <div className="flex flex-col items-center text-center pt-8 pb-6 px-4">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">You&apos;re confirmed!</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-xs leading-relaxed">
        Your payment was received. Your spot{inquiry?.event?.name ? ` at ${inquiry.event.name}` : ""} is confirmed.
      </p>
      <button
        onClick={onBack}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm shadow-lg"
      >
        Back to Inquiry
      </button>
    </div>
  );
}

// ─── Main inner component ─────────────────────────────────────────────────────

function VendorPayInner() {
  const { id } = useParams();
  const router = useRouter();

  const [inquiry,  setInquiry]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [intent,   setIntent]   = useState(null);   // { clientSecret, paymentIntentId, amountCents, bookingId, devMode }
  const [intentLoading, setIntentLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const activeOffer = inquiry?.activeOffer;
  const boothPricing = activeOffer ? vendorBoothBreakdown(activeOffer.totalPriceCents) : null;
  const estimatedTotalCents = boothPricing?.totalCents ?? null;

  useEffect(() => {
    if (!id) return;
    getInquiry(id)
      .then((inq) => {
        setInquiry(inq);
        const offer = inq?.activeOffer;
        const booking = inq?.marketplaceBooking;
        if (offer?.proposalType !== "product") {
          setError("No vendor payment required for this inquiry.");
        } else if (booking?.paymentStatus === "fully_paid") {
          setConfirmed(true);
        }
      })
      .catch(() => setError("Failed to load inquiry."))
      .finally(() => setLoading(false));
  }, [id]);

  async function startPayment() {
    setIntentLoading(true);
    setError(null);
    try {
      const data = await createVendorPaymentIntent({ inquiryId: id });
      setIntent(data);
    } catch (err) {
      setError(err?.message ?? "Failed to start payment. Please try again.");
    } finally {
      setIntentLoading(false);
    }
  }

  async function handleSuccess(paymentIntentId) {
    try {
      await confirmVendorPayment({ paymentIntentId, bookingId: intent.bookingId });
      setConfirmed(true);
    } catch (err) {
      setError(err?.message ?? "Payment confirmed but booking update failed. Contact support.");
    }
  }

  async function handleDevSuccess() {
    try {
      await confirmVendorPayment({ paymentIntentId: intent.paymentIntentId, bookingId: intent.bookingId });
      setConfirmed(true);
    } catch (err) {
      setError(err?.message ?? "Simulated payment failed.");
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-100)]">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-5">
          <Link
            href={`/dashboard/inquiries/${id}`}
            className="text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)] flex items-center gap-1 mb-3"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to Inquiry
          </Link>
          <h1 className="text-xl font-bold text-[var(--gray-900)]">Pay Vending Fee</h1>
          {inquiry?.event?.name && (
            <p className="text-sm text-[var(--gray-500)] mt-1">{inquiry.event.name}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 space-y-4">
        {confirmed ? (
          <div className="bg-white rounded-2xl border border-[var(--gray-100)] overflow-hidden">
            <ConfirmationScreen inquiry={inquiry} onBack={() => router.push(`/dashboard/inquiries/${id}`)} />
          </div>
        ) : (
          <>
            {/* Amount summary */}
            {activeOffer && (
              <div className="bg-white rounded-2xl border border-[var(--gray-100)] p-5">
                <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider mb-3">Participation Fee</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-[var(--gray-900)]">
                      {formatPrice(estimatedTotalCents)}
                    </p>
                    <p className="text-xs text-[var(--gray-500)] mt-1">Payable today</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--gray-100)] space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--gray-500)]">Booth fee</span>
                    <span className="font-semibold text-[var(--gray-800)]">{formatPrice(activeOffer.totalPriceCents)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--gray-500)]">VEHNDR fee (10%)</span>
                    <span className="font-semibold text-[var(--gray-800)]">{formatPrice(boothPricing.vehndrFeeCents)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--gray-500)]">Tax (8.25%)</span>
                    <span className="font-semibold text-[var(--gray-800)]">{formatPrice(boothPricing.taxCents)}</span>
                  </div>
                </div>

                {/* Coordinator receives */}
                <div className="mt-3 pt-3 border-t border-[var(--gray-100)] space-y-1.5">
                  <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-wider mb-2">Coordinator receives</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--gray-500)]">Booth fee collected</span>
                    <span className="font-semibold text-[var(--gray-800)]">{formatPrice(activeOffer.totalPriceCents)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--gray-500)]">VEHNDR fee (10%)</span>
                    <span className="font-semibold text-red-400">−{formatPrice(boothPricing.ecRecipientFeeCents)}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5 border-t border-[var(--gray-100)]">
                    <span className="font-semibold text-[var(--gray-700)]">Coordinator payout</span>
                    <span className="font-bold text-emerald-600">{formatPrice(boothPricing.ecPayoutCents)}</span>
                  </div>
                </div>
                {activeOffer.description && (
                  <p className="text-sm text-[var(--gray-600)] mt-3 pt-3 border-t border-[var(--gray-100)] leading-relaxed">
                    {activeOffer.description}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
            )}

            {/* Payment form */}
            <div className="bg-white rounded-2xl border border-[var(--gray-100)] p-5">
              {!intent ? (
                <button
                  onClick={startPayment}
                  disabled={intentLoading || !!error}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {intentLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      Setting up…
                    </span>
                  ) : `Pay ${estimatedTotalCents != null ? formatPrice(estimatedTotalCents) : ""} →`}
                </button>
              ) : intent.devMode ? (
                <DevPaymentForm amountCents={intent.amountCents} onSuccess={handleDevSuccess} />
              ) : (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: intent.clientSecret,
                    loader: "auto",
                    paymentMethodOrder: WALLET_FIRST_PAYMENT_METHOD_ORDER,
                  }}
                >
                  <StripePaymentForm
                    amountCents={intent.amountCents}
                    onSuccess={handleSuccess}
                    onError={(e) => setError(e.message)}
                  />
                </Elements>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
