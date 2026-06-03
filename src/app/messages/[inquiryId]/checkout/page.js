"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../contexts/AuthContext";
import { listMessages } from "../../../../services/inquiries";
import {
  createMarketplacePaymentIntent,
  confirmMarketplacePayment,
  addMarketplaceTip,
  confirmMarketplaceTip,
} from "../../../../services/checkout";
import TipSelector from "../../../../components/TipSelector";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  marketplaceBreakdown,
  marketplaceChargeTotalCents,
  marketplacePayerFeeCents,
  marketplaceRecipientPayoutCents,
  marketplaceStripeFeeCents,
  marketplaceTaxCents,
} from "../../../../utils/marketplacePricing";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// ── Fee helpers — payer pays one 10% fee; recipient absorbs 10% + Stripe ─────
function calcBuyerFee(base)          { return marketplacePayerFeeCents(base); }
function calcVehndrFee(base)         { return marketplaceBreakdown(base).vehndrFeeCents; }
function calcStripeProcessing(total) { return marketplaceStripeFeeCents(total); }
function calcTax(base)               { return marketplaceTaxCents(base); }
function calcChargeTotal(base, tip = 0) { return marketplaceChargeTotalCents(base, tip); }
function calcVendorPayout(base, tip = 0) { return marketplaceRecipientPayoutCents(base, tip); }

function fmt(cents) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtExact(cents) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

// ── Stripe Payment Form ───────────────────────────────────────────────────────

function StripePaymentForm({ amountCents, label = "Pay", onSuccess, onError }) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
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
          `${label} ${fmtExact(amountCents)}`
        )}
      </button>
    </form>
  );
}

// ── Dev Mode Payment ──────────────────────────────────────────────────────────

function DevPaymentForm({ amountCents, label = "Pay", onSuccess }) {
  const [processing, setProcessing] = useState(false);
  async function handle() {
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
        <p className="text-xs font-medium text-amber-700">Development mode — no real payment taken</p>
      </div>
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
            <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-0.5">Payment form (dev)</p>
        <p className="text-xs text-gray-400">Stripe Elements not shown in development</p>
      </div>
      <button
        onClick={handle}
        disabled={processing}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-base tracking-tight shadow-lg hover:shadow-xl disabled:opacity-40"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            Simulating…
          </span>
        ) : (
          `Simulate ${label} · ${fmtExact(amountCents)}`
        )}
      </button>
    </div>
  );
}

// ── Money Flow Bar ────────────────────────────────────────────────────────────

function MoneyFlowBar({ baseCents, tipCents = 0 }) {
  const total       = calcChargeTotal(baseCents, tipCents);
  const vehndrFee   = calcVehndrFee(baseCents);
  const stripeProc  = calcStripeProcessing(total);
  const tax         = calcTax(baseCents);
  const vendor      = calcVendorPayout(baseCents, tipCents);

  const segments = [
    { label: "Vendor",  value: vendor,       color: "bg-violet-500",  textColor: "text-violet-700",  bg: "bg-violet-50"  },
    { label: "VEHNDR",  value: vehndrFee,    color: "bg-emerald-500", textColor: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Stripe",  value: stripeProc,   color: "bg-gray-400",    textColor: "text-gray-600",    bg: "bg-gray-50"    },
    { label: "Tax",     value: tax,          color: "bg-amber-400",   textColor: "text-amber-700",   bg: "bg-amber-50"   },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Where your money goes</p>
      <div className="flex rounded-full overflow-hidden h-2.5 mb-3 gap-px">
        {segments.map(({ label, value, color }) => (
          <div key={label} className={`${color} transition-all`} style={{ width: `${(value / total) * 100}%`, minWidth: "4%" }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {segments.map(({ label, value, color, textColor, bg }) => (
          <div key={label} className={`flex items-center justify-between px-3 py-2 rounded-xl ${bg}`}>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
              <span className="text-[11px] text-gray-500 font-medium">{label}</span>
            </div>
            <span className={`text-xs font-bold ${textColor}`}>{fmtExact(value)}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-2.5 text-center leading-relaxed">
        Vendor payout reflects their VEHNDR fee and Stripe processing. Tip is included in vendor payout.
      </p>
    </div>
  );
}

// ── Post-Payment Tip ──────────────────────────────────────────────────────────

function PostPaymentTip({ booking, inquiry, onTipAdded }) {
  const [phase, setPhase]           = useState("idle");
  const [selectedTip, setSelectedTip] = useState(0);
  const [intentData, setIntentData] = useState(null);
  const [error, setError]           = useState(null);
  const [loading, setLoading]       = useState(false);

  const currentTip = booking?.tip_cents ?? booking?.tipCents ?? 0;

  async function handleAddTip() {
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

  async function handleTipSuccess(paymentIntentId) {
    try {
      const updated = await confirmMarketplaceTip({
        paymentIntentId: paymentIntentId ?? intentData?.paymentIntentId,
        bookingId:       intentData?.bookingId,
        tipCents:        intentData?.tipCents,
      });
      setPhase("done");
      if (onTipAdded) onTipAdded(updated);
    } catch (err) {
      setError(err.message ?? "Tip confirmed but not recorded. Contact support.");
    }
  }

  const baseCents = inquiry?.activeOffer?.totalPriceCents ?? 0;

  if (phase === "done") {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Tip sent!</p>
          <p className="text-xs text-emerald-600">{fmt(intentData?.tipCents)} tip payment completed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900">
            {currentTip > 0 ? "Add more to your tip" : `Leave a tip for ${inquiry?.vendor?.name}`}
          </p>
          {currentTip > 0 && (
            <span className="text-xs text-violet-600 font-medium bg-violet-50 px-2 py-0.5 rounded-full">
              {fmt(currentTip)} already tipped
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-4">Processed securely by Stripe.</p>

        {(phase === "idle" || phase === "selecting") && (
          <>
            <TipSelector
              subtotalCents={baseCents}
              onTipChange={(cents) => { setSelectedTip(cents); setPhase("selecting"); }}
            />
            {phase === "selecting" && selectedTip > 0 && (
              <button
                onClick={handleAddTip}
                disabled={loading}
                className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm shadow hover:shadow-md transition-all disabled:opacity-40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Preparing…
                  </span>
                ) : (
                  `Send ${fmt(selectedTip)} tip`
                )}
              </button>
            )}
          </>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
        )}
      </div>

      {phase === "paying" && intentData && (
        <div className="border-t border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700">Complete tip payment</p>
            <p className="text-lg font-bold text-violet-600">{fmt(intentData.tipCents)}</p>
          </div>
          {intentData.devMode ? (
            <DevPaymentForm amountCents={intentData.tipCents} label="Send tip" onSuccess={() => handleTipSuccess(null)} />
          ) : intentData.clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret: intentData.clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#7c3aed", borderRadius: "12px", fontFamily: "inherit" } } }}>
              <StripePaymentForm amountCents={intentData.tipCents} label="Send tip" onSuccess={(id) => handleTipSuccess(id)} onError={(err) => setError(err.message)} />
            </Elements>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Confirmation Screen ───────────────────────────────────────────────────────

function ConfirmationScreen({ inquiry, booking, paidCents, isDeposit, tipCents, onBackToThread }) {
  const [currentBooking, setCurrentBooking] = useState(booking);
  const [tipDone, setTipDone] = useState(false);
  const offer      = inquiry?.activeOffer;
  const fullyPaid  = isDeposit === false || currentBooking?.paymentStatus === "fully_paid" || currentBooking?.payment_status === "fully_paid";
  const baseCents  = offer?.totalPriceCents ?? 0;
  const isCash     = offer?.proposalType === "cash";
  const totalTip   = tipDone ? (currentBooking?.tip_cents ?? currentBooking?.tipCents ?? 0) : (tipCents ?? 0);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col items-center text-center pt-6">
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">
          {fullyPaid ? "You're all set!" : "Deposit received"}
        </h1>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          {fullyPaid
            ? `Your booking with ${inquiry?.vendor?.name} is confirmed.`
            : `Deposit of ${fmtExact(paidCents)} secured your spot with ${inquiry?.vendor?.name}.`}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-purple-600">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Receipt</p>
          <p className="text-2xl font-bold text-white mt-0.5">{fmtExact(paidCents)}</p>
        </div>
        <div className="divide-y divide-gray-50">
          <ReceiptRow label="Vendor" value={inquiry?.vendor?.name} bold />
          {offer?.totalPriceCents && <ReceiptRow label="Base service" value={fmtExact(baseCents)} />}
          {totalTip > 0 && <ReceiptRow label="Tip" value={fmtExact(totalTip)} accent />}
          <ReceiptRow label="Paid now" value={fmtExact(paidCents)} green />
          {!fullyPaid && offer?.remainingBalanceCents > 0 && (
            <ReceiptRow label="Balance due" value={fmtExact(offer.remainingBalanceCents)} amber />
          )}
          <div className="px-5 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-500">Status</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${fullyPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {fullyPaid ? "Fully paid" : "Deposit paid"}
            </span>
          </div>
        </div>
      </div>

      {isCash && baseCents > 0 && (
        <MoneyFlowBar baseCents={baseCents} tipCents={totalTip} />
      )}

      {!fullyPaid && offer?.remainingBalanceCents > 0 && (
        <p className="text-xs text-gray-400 text-center leading-relaxed px-4">
          Remaining {fmtExact(offer.remainingBalanceCents)} can be paid any time before your event from this conversation.
        </p>
      )}

      {isCash && fullyPaid && !tipDone && !(inquiry?.tipCents > 0) && (
        <PostPaymentTip
          booking={currentBooking}
          inquiry={inquiry}
          onTipAdded={(updated) => { setCurrentBooking(updated); setTipDone(true); }}
        />
      )}

      <button
        onClick={onBackToThread}
        className="w-full py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Back to conversation
      </button>

      <p className="text-center text-xs text-gray-400">Secured by Stripe · SSL encrypted</p>
    </div>
  );
}

function ReceiptRow({ label, value, bold, green, amber, accent }) {
  return (
    <div className="px-5 py-3 flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm ${bold ? "font-semibold text-gray-900" : green ? "font-semibold text-emerald-600" : amber ? "font-semibold text-amber-600" : accent ? "font-medium text-violet-600" : "font-medium text-gray-700"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function CheckoutSkeleton({ inquiryId }) {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] bg-gray-50">
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href={`/messages/${inquiryId}`} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <div className="h-4 w-24 bg-gray-100 rounded-full animate-pulse" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="h-1.5 w-full bg-gray-100 animate-pulse" />
            <div className="p-5 space-y-3">
              <div className="h-4 w-32 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-8 w-28 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-40 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          <div className="h-14 w-full bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MarketplaceCheckoutPage() {
  const { inquiryId } = useParams();
  const { user }      = useAuth();
  const router        = useRouter();

  const [inquiry,    setInquiry]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [confirmed,  setConfirmed]  = useState(false);

  const [payDeposit,  setPayDeposit]  = useState(true);
  const [tipCents,    setTipCents]    = useState(0);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Payment intent state
  const [intentData,     setIntentData]     = useState(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [intentError,    setIntentError]    = useState(null);

  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [paidCents,        setPaidCents]        = useState(null);

  // Debounce PI recreation when tip changes
  const intentTimerRef = useRef(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    listMessages(inquiryId)
      .then((res) => {
        const inq = res.inquiry ?? null;
        setInquiry(inq);
        if ((inq?.tipCents ?? 0) > 0) {
          setTipCents(inq.tipCents);
        }
      })
      .catch(() => setLoadError("Failed to load booking details."))
      .finally(() => setLoading(false));
  }, [user, inquiryId, router]);

  const offer           = inquiry?.activeOffer;
  const booking         = inquiry?.marketplaceBooking;
  const isCash          = offer?.proposalType === "cash";
  const depositAvailable = offer?.depositCents > 0 && booking?.paymentStatus === "pending";
  const remainingDue    = booking?.paymentStatus === "deposit_paid" && offer?.remainingBalanceCents > 0;
  const alreadyPaid     = booking?.paymentStatus === "fully_paid";

  const baseCents = depositAvailable
    ? (payDeposit ? offer.depositCents : offer.totalPriceCents)
    : offer?.remainingBalanceCents ?? offer?.totalPriceCents ?? 0;

  const effectiveTipCents = depositAvailable && payDeposit ? 0 : tipCents;
  const deferredTipCents = depositAvailable && payDeposit ? tipCents : 0;
  const estimatedChargeTotal = isCash ? calcChargeTotal(baseCents, effectiveTipCents) : baseCents + effectiveTipCents;
  const chargeTotal = intentData?.amountCents ?? estimatedChargeTotal;

  const handleTipChange = useCallback((cents) => setTipCents(cents), []);

  // Eagerly create / recreate PaymentIntent whenever booking, deposit choice, or tip changes
  useEffect(() => {
    if (!booking || !offer) return;

    clearTimeout(intentTimerRef.current);
    const delay = intentData ? 600 : 0; // debounce tip changes, immediate on first load
    intentTimerRef.current = setTimeout(async () => {
      setCreatingIntent(true);
      setIntentError(null);
      setIntentData(null);

      try {
        const data = await createMarketplacePaymentIntent({
          bookingId:  booking.id,
          payDeposit: depositAvailable && payDeposit,
          tipCents: effectiveTipCents,
        });
        setIntentData(data);
      } catch (err) {
        setIntentError(err.message ?? "Failed to initialize payment. Please try again.");
      } finally {
        setCreatingIntent(false);
      }
    }, delay);

    return () => clearTimeout(intentTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id, depositAvailable, payDeposit, effectiveTipCents]);

  async function handlePaymentSuccess(paymentIntentId) {
    try {
      const updatedBooking = await confirmMarketplacePayment({
        paymentIntentId: paymentIntentId ?? intentData?.paymentIntentId,
        bookingId:       intentData?.bookingId,
        isDeposit:       intentData?.isDeposit,
        tipCents:        intentData?.tipCents ?? effectiveTipCents,
      });
      setPaidCents(intentData?.amountCents);
      setConfirmedBooking(updatedBooking);
      setConfirmed(true);
    } catch (err) {
      setIntentError(err.message ?? "Payment confirmed but booking update failed. Contact support.");
    }
  }

  if (!user) return null;
  if (loading) return <CheckoutSkeleton inquiryId={inquiryId} />;

  // ── Error / no booking ────────────────────────────────────────────────────
  if (loadError || !booking || !offer) {
    return (
      <div className="flex flex-col h-[calc(100dvh-3.5rem)] bg-gray-50">
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

  // ── Already paid ──────────────────────────────────────────────────────────
  if (alreadyPaid) {
    return (
      <div className="flex flex-col h-[calc(100dvh-3.5rem)] bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <Link href={`/messages/${inquiryId}`} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </Link>
          <p className="font-semibold text-sm text-gray-900">Checkout</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 mb-1">Already paid</p>
            <p className="text-sm text-gray-500">This booking is fully paid.</p>
          </div>
          {isCash && !(inquiry?.tipCents > 0) && !(depositAvailable && payDeposit) && (
            <div className="w-full max-w-sm">
              <PostPaymentTip booking={booking} inquiry={inquiry} onTipAdded={() => {}} />
            </div>
          )}
          <Link href={`/messages/${inquiryId}`} className="text-sm font-semibold text-violet-600 hover:text-violet-700">
            Back to conversation
          </Link>
        </div>
      </div>
    );
  }

  // ── Confirmed ─────────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="flex flex-col h-[calc(100dvh-3.5rem)] bg-gray-50">
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center">
          <div className="w-9 h-9" />
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span className="text-xs font-semibold text-gray-900">Confirmed</span>
            </div>
          </div>
          <div className="w-9" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-lg px-4 py-6" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>
            <ConfirmationScreen
              inquiry={inquiry}
              booking={confirmedBooking ?? booking}
              paidCents={paidCents}
              isDeposit={intentData?.isDeposit}
              tipCents={intentData?.tipCents ?? effectiveTipCents}
              onBackToThread={() => router.push(`/messages/${inquiryId}`)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Main checkout (single-page: summary + payment together) ───────────────
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] bg-gray-50">

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link
          href={`/messages/${inquiryId}`}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">Complete Booking</p>
          {inquiry?.vendor?.name && (
            <p className="text-xs text-gray-400 truncate">{inquiry.vendor.name}</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="text-[11px] font-medium">Secure</span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-5 space-y-4" style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}>

          {/* ── Collapsible price breakdown card ─────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

            {/* Vendor row + total — always visible, tap to expand */}
            <button
              type="button"
              onClick={() => setBreakdownOpen(v => !v)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {inquiry?.vendor?.name?.charAt(0)?.toUpperCase() ?? "V"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{inquiry?.vendor?.name}</p>
                <p className="text-xs text-gray-400">{offer.description ? offer.description.slice(0, 40) + (offer.description.length > 40 ? "…" : "") : "Booking proposal"}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{fmtExact(chargeTotal)}</p>
                  <p className="text-[10px] text-gray-400">due today</p>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-gray-400 transition-transform duration-200 ${breakdownOpen ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </button>

            {/* Expanded breakdown */}
            {breakdownOpen && (
              <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Base service</span>
                  <span className="font-medium text-gray-900">{fmtExact(baseCents)}</span>
                </div>
                {depositAvailable && payDeposit && offer.remainingBalanceCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Remaining after today</span>
                    <span className="font-medium text-gray-900">{fmtExact(offer.remainingBalanceCents)}</span>
                  </div>
                )}
                {remainingDue && (
                  <div className="flex justify-between text-sm pt-0.5">
                    <span className="text-gray-500">Deposit</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Paid</span>
                  </div>
                )}
                {effectiveTipCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tip</span>
                    <span className="font-medium text-violet-600">{fmtExact(effectiveTipCents)}</span>
                  </div>
                )}
                {deferredTipCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tip due with final payment</span>
                    <span className="font-medium text-violet-600">{fmtExact(deferredTipCents)}</span>
                  </div>
                )}
                {isCash && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">VEHNDR fee (10%)</span>
                      <span className="font-medium text-gray-900">{fmtExact(intentData?.coordinatorFeeCents ?? calcBuyerFee(baseCents))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax (8.25%)</span>
                      <span className="font-medium text-gray-900">{fmtExact(intentData?.taxCents ?? calcTax(baseCents))}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-semibold text-sm pt-2 border-t border-gray-100">
                  <span className="text-gray-800">Total due today</span>
                  <span className="text-gray-900">{fmtExact(chargeTotal)}</span>
                </div>
                {isCash && (
                  <p className="text-[10px] text-gray-400 pt-1">Stripe processing is deducted from vendor payout.</p>
                )}

                {/* Money flow — collapsible sub-section */}
                {isCash && baseCents > 0 && (
                  <div className="pt-2">
                    <MoneyFlowBar baseCents={baseCents} tipCents={effectiveTipCents} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Tip selector ───────────────────────────────────────────── */}
          {isCash && !(inquiry?.tipCents > 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Add a Tip</p>
              <TipSelector
                key={inquiry?.tipCents ?? 0}
                subtotalCents={baseCents}
                onTipChange={handleTipChange}
                initialCents={inquiry?.tipCents ?? 0}
              />
            </div>
          )}

          {/* ── Deposit vs full payment toggle ─────────────────────────── */}
          {depositAvailable && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Pay today</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { isDeposit: true,  label: "Deposit",     amount: offer.depositCents,      sub: offer.depositType?.replace("_", "-") },
                  { isDeposit: false, label: "Pay in full",  amount: offer.totalPriceCents,   sub: "Skip the balance" },
                ].map(({ isDeposit, label, amount, sub }) => {
                  const selected = payDeposit === isDeposit;
                  return (
                    <button
                      key={label}
                      onClick={() => setPayDeposit(isDeposit)}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all ${selected ? "border-violet-500 bg-violet-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}
                    >
                      {selected && (
                        <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${selected ? "text-violet-600" : "text-gray-400"}`}>{label}</p>
                      <p className={`text-lg font-bold tracking-tight ${selected ? "text-violet-900" : "text-gray-900"}`}>{fmt(amount)}</p>
                      {sub && <p className={`text-[11px] mt-1 capitalize ${selected ? "text-violet-500" : "text-gray-400"}`}>{sub}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Balance due banner ─────────────────────────────────────── */}
          {remainingDue && (
            <div className="flex items-center gap-4 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Balance due</p>
                <p className="text-xl font-bold text-gray-900 tracking-tight">{fmtExact(offer.remainingBalanceCents)}</p>
                <p className="text-xs text-amber-600 mt-0.5">Deposit was already paid</p>
              </div>
            </div>
          )}

          {/* ── Payment form ───────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <p className="text-2xl font-bold text-gray-900">{fmtExact(chargeTotal)}</p>
                {intentData?.isDeposit && <span className="text-xs text-gray-400">deposit</span>}
              </div>
            </div>
            <div className="p-4">
              {intentError && !creatingIntent && (
                <div className="mb-4">
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 mb-3">{intentError}</div>
                  <button
                    onClick={() => {
                      setIntentError(null);
                      setCreatingIntent(true);
                      setIntentData(null);
                      createMarketplacePaymentIntent({
                        bookingId: booking.id,
                        payDeposit: depositAvailable && payDeposit,
                        tipCents: effectiveTipCents,
                      }).then(setIntentData).catch(err => setIntentError(err.message ?? "Failed to initialize payment.")).finally(() => setCreatingIntent(false));
                    }}
                    className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {(creatingIntent || (!intentData && !intentError)) ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-12 bg-gray-100 rounded-xl" />
                  <div className="h-12 bg-gray-100 rounded-xl" />
                  <div className="h-12 bg-gray-100 rounded-2xl" />
                </div>
              ) : intentData ? (
                intentData.devMode ? (
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
                        variables: { colorPrimary: "#7c3aed", borderRadius: "12px", fontFamily: "inherit", spacingUnit: "4px" },
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
                  <p className="text-sm text-red-500 text-center">Unable to initialize payment. Please try again.</p>
                )
              ) : null}
            </div>
          </div>

          <div className="pt-1 text-center space-y-1">
            <p className="text-xs text-gray-400">Secured by Stripe · SSL encrypted</p>
            <p className="text-[10px] text-gray-400">
              © {new Date().getFullYear()} Vehndr&nbsp;·&nbsp;
              <Link href="/terms" className="hover:text-gray-600">Terms</Link>
              &nbsp;·&nbsp;
              <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
