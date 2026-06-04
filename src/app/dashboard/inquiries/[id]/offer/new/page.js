"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGate from "../../../../../../components/AuthGate";
import { getInquiry } from "../../../../../../services/inquiries";
import { createOffer, updateOffer } from "../../../../../../services/offers";
import { marketplaceBreakdown } from "../../../../../../utils/marketplacePricing";

// ─── Fee helpers (mirrors MarketplacePricing) ─────────────────────────────────

function mp$fmt(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

function VendorFeePreview({ totalPrice }) {
  const base = Math.round(Number(totalPrice) * 100);
  if (!base || base <= 0) return null;

  const pricing   = marketplaceBreakdown(base);
  const coord     = pricing.coordinatorFeeCents;
  const vendorFee = pricing.vendorFeeCents;
  const tax       = pricing.taxCents;
  const stripe    = pricing.stripeFeeCents;
  const custTotal = pricing.totalChargeCents;
  const payout    = pricing.vendorPayoutCents;

  return (
    <div className="rounded-xl border border-[var(--gray-200)] overflow-hidden text-xs">
      {/* Customer's view */}
      <div className="px-3.5 py-2.5 bg-[var(--gray-50)] border-b border-[var(--gray-200)]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gray-500)] mb-2">Customer pays</p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-[var(--gray-600)]">Your service price</span>
            <span className="font-semibold text-[var(--gray-800)]">{mp$fmt(base)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--gray-500)]">VEHNDR fee (10%)</span>
            <span className="text-[var(--gray-700)]">{mp$fmt(coord)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--gray-500)]">Sales tax (8.25%)</span>
            <span className="text-[var(--gray-700)]">{mp$fmt(tax)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-[var(--gray-200)]">
            <span className="text-[var(--gray-800)]">Customer total</span>
            <span className="text-[var(--gray-900)]">{mp$fmt(custTotal)}</span>
          </div>
        </div>
      </div>
      {/* Vendor's payout */}
      <div className="px-3.5 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gray-500)] mb-2">Your payout</p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-[var(--gray-600)]">Your service price</span>
            <span className="font-semibold text-[var(--gray-800)]">{mp$fmt(base)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--gray-500)]">VEHNDR fee (10%)</span>
            <span className="text-[var(--error,#ef4444)]">-{mp$fmt(vendorFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--gray-500)]">Processing fee (Stripe)</span>
            <span className="text-[var(--error,#ef4444)]">-{mp$fmt(stripe)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-[var(--gray-200)]">
            <span className="text-[var(--gray-800)]">Est. your payout</span>
            <span className="text-[var(--mint-700,#15803d)]">{mp$fmt(payout)}</span>
          </div>
        </div>
        <p className="text-[10px] text-[var(--gray-400)] mt-2 leading-relaxed">
          Tax is remitted by VEHNDR and is not included in payout. Tips are shown separately at checkout.
        </p>
      </div>
    </div>
  );
}

const PROPOSAL_TYPES = [
  {
    value: "cash",
    label: "Paid",
    description: "Customer pays me",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    value: "product",
    label: "I'll pay a fee",
    description: "I/vendor pays to participate",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    value: "both",
    label: "Free",
    description: "No payment",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
];

export default function NewProposalPage() {
  return (
    <AuthGate>
      <NewProposalInner />
    </AuthGate>
  );
}

function NewProposalInner() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [activeOffer, setActiveOffer] = useState(null);
  const [prefillOffer, setPrefillOffer] = useState(null);
  const isEditing = !!activeOffer;
  const isPrefilledFromChangeRequest = !isEditing && !!prefillOffer;

  // Form state
  const [proposalType, setProposalType] = useState("cash");
  const [description, setDescription] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [hasDeposit, setHasDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositType, setDepositType] = useState("refundable");
  const [expiresAt, setExpiresAt] = useState("");

  // Auto-calculated remaining balance
  const remaining =
    totalPrice && depositAmount
      ? Math.max(0, parseFloat(totalPrice) - parseFloat(depositAmount))
      : null;

  useEffect(() => {
    if (!id) return;
    getInquiry(id)
      .then((inquiry) => {
        const active = inquiry?.activeOffer?.status === "pending" ? inquiry.activeOffer : null;
        const requested = !active && inquiry?.lastOffer?.status === "changes_requested" ? inquiry.lastOffer : null;
        const offer = active || requested;

        setActiveOffer(active);
        setPrefillOffer(requested);

        if (offer) {
          setProposalType(offer.proposalType ?? "cash");
          setDescription(offer.description ?? "");
          setTotalPrice(offer.totalPriceCents ? (offer.totalPriceCents / 100).toString() : "");
          if (offer.depositCents > 0) {
            setHasDeposit(true);
            setDepositAmount((offer.depositCents / 100).toString());
            setDepositType(offer.depositType ?? "refundable");
          }
          if (offer.expiresAt) {
            // Format for datetime-local input
            setExpiresAt(new Date(offer.expiresAt).toISOString().slice(0, 16));
          }
        }
      })
      .catch(() => setError("Failed to load inquiry."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    const isFree = proposalType === "both";
    if (!isFree && (!totalPrice || parseFloat(totalPrice) <= 0)) {
      setError("Please enter a valid total price.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const isPaid = proposalType === "cash";
    const priceCents = isFree ? 0 : Math.round(parseFloat(totalPrice) * 100);

    const payload = {
      proposal_type: proposalType,
      description: description.trim() || null,
      total_price_cents: priceCents,
      deposit_cents: isPaid && hasDeposit && depositAmount ? Math.round(parseFloat(depositAmount) * 100) : null,
      deposit_type: isPaid && hasDeposit && depositAmount ? depositType : null,
      remaining_balance_cents:
        isPaid && hasDeposit && depositAmount && remaining !== null
          ? Math.round(remaining * 100)
          : null,
      expires_at: expiresAt || null,
    };

    try {
      if (isEditing) {
        await updateOffer(id, activeOffer.id, payload);
      } else {
        await createOffer(id, payload);
      }
      router.push(`/dashboard/inquiries/${id}`);
    } catch (err) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-[var(--gray-50)] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-100)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
          <Link
            href={`/dashboard/inquiries/${id}`}
            className="text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)] flex items-center gap-1 mb-3"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Inquiry
          </Link>
          <h1 className="text-xl font-bold text-[var(--gray-900)]">
            {isEditing || isPrefilledFromChangeRequest ? "Respond to Proposal" : "Create Proposal"}
          </h1>
          {isEditing && (
            <p className="text-sm text-[var(--gray-500)] mt-1">
              This will create a new version (v{activeOffer.versionNumber + 1}) and notify the customer.
            </p>
          )}
          {isPrefilledFromChangeRequest && (
            <p className="text-sm text-[var(--gray-500)] mt-1">
              The coordinator updated the tip. Review the terms and send a new version.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 sm:px-6 py-4 space-y-5">
        {/* Proposal type */}
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] p-4">
          <p className="text-sm font-semibold text-[var(--gray-700)] mb-3">Proposal Type</p>
          <div className="grid grid-cols-3 gap-2">
            {PROPOSAL_TYPES.map((type) => {
              const selected = proposalType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setProposalType(type.value)}
                  className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-lg)] border-2 transition-all text-center"
                  style={{
                    borderColor: selected ? "var(--violet-500)" : "var(--gray-200)",
                    background: selected ? "var(--violet-50)" : "white",
                    color: selected ? "var(--violet-700)" : "var(--gray-600)",
                  }}
                >
                  <span style={{ color: selected ? "var(--violet-600)" : "var(--gray-400)" }}>
                    {type.icon}
                  </span>
                  <span className="text-xs font-semibold leading-tight">{type.label}</span>
                  <span className="text-[10px] leading-tight" style={{ color: selected ? "var(--violet-500)" : "var(--gray-400)" }}>
                    {type.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] p-4 space-y-4">
          <p className="text-sm font-semibold text-[var(--gray-700)]">Pricing</p>

          <div>
            <label className="block text-xs font-medium text-[var(--gray-600)] mb-1.5">
              {proposalType === "cash"
                ? <>Customer Pays Total Price <span className="text-[var(--error)]">*</span></>
                : proposalType === "product"
                ? <>I/Vendor Pays Total Price <span className="text-[var(--error)]">*</span></>
                : "Total Price"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--gray-400)] font-medium">$</span>
              <input
                type="number"
                inputMode="decimal"
                min={proposalType === "both" ? "0" : "0.01"}
                step="0.01"
                value={proposalType === "both" ? "0" : totalPrice}
                onChange={(e) => proposalType !== "both" && setTotalPrice(e.target.value)}
                placeholder="0.00"
                disabled={proposalType === "both"}
                required={proposalType !== "both"}
                className="w-full pl-7 pr-3 py-2.5 text-sm border border-[var(--gray-200)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-300)] focus:border-[var(--violet-400)] disabled:bg-[var(--gray-50)] disabled:text-[var(--gray-400)] disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Fee breakdown — cash offers only */}
          {proposalType === "cash" && totalPrice && Number(totalPrice) > 0 && (
            <VendorFeePreview totalPrice={totalPrice} />
          )}

          {/* Deposit toggle — only for Paid (cash) */}
          {proposalType === "cash" && (
            <div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => {
                    setHasDeposit(!hasDeposit);
                    if (hasDeposit) setDepositAmount("");
                  }}
                  className="relative rounded-full transition-colors"
                  style={{
                    background: hasDeposit ? "var(--violet-500)" : "var(--gray-300)",
                    height: "22px",
                    width: "40px",
                    flexShrink: 0,
                  }}
                >
                  <div
                    className="absolute top-0.5 rounded-full bg-white shadow transition-transform"
                    style={{
                      width: "18px",
                      height: "18px",
                      transform: hasDeposit ? "translateX(20px)" : "translateX(2px)",
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-[var(--gray-700)]">Require a deposit</span>
              </label>

              {hasDeposit && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--gray-600)] mb-1.5">Deposit Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--gray-400)] font-medium">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2.5 text-sm border border-[var(--gray-200)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-300)] focus:border-[var(--violet-400)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--gray-600)] mb-1.5">Deposit Type</label>
                    <div className="flex gap-2">
                      {["refundable", "non_refundable"].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setDepositType(type)}
                          className="flex-1 py-2 text-xs font-medium rounded-[var(--radius-md)] border transition-colors"
                          style={{
                            borderColor: depositType === type ? "var(--violet-400)" : "var(--gray-200)",
                            background: depositType === type ? "var(--violet-50)" : "white",
                            color: depositType === type ? "var(--violet-700)" : "var(--gray-500)",
                          }}
                        >
                          {type === "refundable" ? "Refundable" : "Non-refundable"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Remaining balance display */}
          {proposalType === "cash" && hasDeposit && remaining !== null && (
            <div className="bg-[var(--gray-50)] rounded-[var(--radius-md)] px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-[var(--gray-500)]">Remaining balance due</span>
              <span className="text-sm font-semibold text-[var(--gray-900)]">
                ${remaining.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] p-4">
          <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
            Description <span className="text-[var(--gray-400)] font-normal text-xs">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what's included in this proposal — services, deliverables, terms, etc."
            rows={4}
            className="w-full px-3 py-2.5 text-sm border border-[var(--gray-200)] rounded-[var(--radius-md)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--violet-300)] focus:border-[var(--violet-400)] placeholder-[var(--gray-300)]"
          />
        </div>

        {/* Expiration */}
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] p-4">
          <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
            Offer Expires <span className="text-[var(--gray-400)] font-normal text-xs">(optional)</span>
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-[var(--gray-200)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-300)] focus:border-[var(--violet-400)]"
          />
        </div>

        {error && (
          <p className="text-sm text-[var(--error)] text-center px-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-[var(--radius-xl)] text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: "var(--violet-600)" }}
        >
          {submitting
            ? isEditing
              ? "Updating…"
              : "Sending…"
            : isEditing
            ? "Update Proposal"
            : "Send Proposal"}
        </button>
      </form>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      <div className="bg-white border-b border-[var(--gray-100)] px-4 py-5">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="h-3 w-16 bg-[var(--gray-100)] rounded animate-pulse" />
          <div className="h-6 w-40 bg-[var(--gray-100)] rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] p-4">
            <div className="h-20 bg-[var(--gray-50)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
