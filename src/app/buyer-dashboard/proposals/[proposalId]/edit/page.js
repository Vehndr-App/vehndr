"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGate from "../../../../../components/AuthGate";
import { getInquiry, updateInquiry } from "../../../../../services/inquiries";
import { getCoordinatorStripeAccount } from "../../../../../services/coordinators";


const COORDINATOR_TYPES = [
  {
    value: "hiring_vendor",
    label: "Hiring a vendor",
    description: "I'll pay the vendor for their services",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  },
  {
    value: "charges_fees",
    label: "Charging vending fees",
    description: "Vendors pay me a fee to sell at my event",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    value: "no_fees",
    label: "No fees",
    description: "Vendors join at no cost",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
];

export default function EditProposalPage() {
  return <AuthGate allowedRoles={["coordinator", "customer", "vendor"]}><EditProposalInner /></AuthGate>;
}

function EditProposalInner() {
  const { proposalId } = useParams();
  const router = useRouter();

  const [inquiry, setInquiry]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);

  const [coordinatorType, setCoordinatorType] = useState("hiring_vendor");
  const [message, setMessage]       = useState("");
  const [budget, setBudget]         = useState("");
  const [tip, setTip]               = useState("");
  const [vendingFee, setVendingFee] = useState("");
  const [stripeConnected, setStripeConnected] = useState(false);

  useEffect(() => {
    getCoordinatorStripeAccount()
      .then((res) => setStripeConnected(res?.chargesEnabled === true))
      .catch(() => setStripeConnected(false));
  }, []);

  useEffect(() => {
    getInquiry(proposalId)
      .then((inq) => {
        if (inq?.activeOffer?.status === "accepted") {
          setLoadError("This proposal cannot be edited after the offer has been accepted.");
          return;
        }
        setInquiry(inq);
        setCoordinatorType(inq.coordinatorType ?? "hiring_vendor");
        setMessage(inq.initialMessage ?? "");
        setBudget(inq.budgetCents ? String(inq.budgetCents / 100) : "");
        setTip(inq.tipCents ? String(inq.tipCents / 100) : "");
        setVendingFee(inq.vendingFeeCents ? String(inq.vendingFeeCents / 100) : "");
      })
      .catch(() => setLoadError("Proposal not found."))
      .finally(() => setLoading(false));
  }, [proposalId]);


  function handleTypeChange(type) {
    setCoordinatorType(type);
    if (type !== "hiring_vendor") { setBudget(""); setTip(""); }
    if (type !== "charges_fees") setVendingFee("");
  }

async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) { setError("Message cannot be empty."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        coordinator_type: coordinatorType,
        initial_message: message.trim(),
        budget_cents: coordinatorType === "hiring_vendor" && budget ? Math.round(Number(budget) * 100) : 0,
        tip_cents: coordinatorType === "hiring_vendor" && tip ? Math.round(Number(tip) * 100) : 0,
        vending_fee_cents: coordinatorType === "charges_fees" && vendingFee ? Math.round(Number(vendingFee) * 100) : 0,
      };

      await updateInquiry(proposalId, payload);
      router.push(`/buyer-dashboard/proposals/${proposalId}`);
    } catch (err) {
      setError(err?.message ?? "Failed to save changes. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="h-6 bg-[var(--gray-100)] rounded w-40 animate-pulse" />
        <div className="h-28 bg-[var(--gray-100)] rounded-2xl animate-pulse" />
        <div className="h-56 bg-[var(--gray-100)] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-[var(--error)] mb-4">{loadError}</p>
        <Link href={`/buyer-dashboard/proposals/${proposalId}`} className="text-sm text-[var(--violet-600)] hover:underline">
          ← Back to proposal
        </Link>
      </div>
    );
  }

  const vendorName = inquiry?.vendor?.name ?? "Vendor";
  const eventName  = inquiry?.event?.name;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--gray-400)]">
        <Link href="/buyer-dashboard/proposals" className="hover:text-[var(--violet-600)] transition-colors">Proposals</Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <Link href={`/buyer-dashboard/proposals/${proposalId}`} className="hover:text-[var(--violet-600)] transition-colors truncate max-w-[140px]">{vendorName}</Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="text-[var(--gray-600)] font-medium">Edit</span>
      </div>

      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--gray-900)]">Edit Proposal</h1>
        {eventName && <p className="text-sm text-[var(--gray-500)] mt-1">{eventName}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Coordinator type */}
        <div className="bg-white rounded-2xl p-6 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">I am…</p>
          <div className="space-y-2">
            {COORDINATOR_TYPES.map((type) => {
              const selected = coordinatorType === type.value;
              const locked = type.value === "charges_fees" && !stripeConnected;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => !locked && handleTypeChange(type.value)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius-lg)] border-2 text-left transition-all"
                  style={{
                    borderColor: selected ? "var(--violet-500)" : "var(--gray-200)",
                    background: selected ? "var(--violet-50)" : "white",
                    opacity: locked ? 0.5 : 1,
                    cursor: locked ? "not-allowed" : "pointer",
                  }}
                >
                  <span style={{ color: selected ? "var(--violet-600)" : "var(--gray-400)" }}>{type.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-tight ${selected ? "text-[var(--violet-800)]" : "text-[var(--gray-800)]"}`}>{type.label}</p>
                    <p className={`text-xs mt-0.5 leading-tight ${selected ? "text-[var(--violet-500)]" : "text-[var(--gray-400)]"}`}>
                      {locked ? "Connect your Stripe account to enable this option" : type.description}
                    </p>
                  </div>
                  {locked ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: selected ? "var(--violet-500)" : "var(--gray-300)", background: selected ? "var(--violet-500)" : "white" }}
                    >
                      {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Proposal details */}
        <div className="bg-white rounded-2xl p-6 space-y-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">Proposal Details</p>

          {coordinatorType === "hiring_vendor" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">Your budget (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--gray-400)] font-medium pointer-events-none">$</span>
                  <input
                    type="number" min="1" value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="500" className="input pl-8"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                  Tip <span className="text-[var(--gray-400)] font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--gray-400)] font-medium pointer-events-none">$</span>
                  <input
                    type="number" min="0" step="0.01" value={tip}
                    onChange={(e) => setTip(e.target.value)}
                    placeholder="0" className="input pl-8"
                  />
                </div>
              </div>
            </div>
          )}

          {coordinatorType === "charges_fees" && (
            <div>
              <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">Fee per vendor (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--gray-400)] font-medium pointer-events-none">$</span>
                <input
                  type="number" min="1" value={vendingFee}
                  onChange={(e) => setVendingFee(e.target.value)}
                  placeholder="150" className="input pl-8"
                />
              </div>
            </div>
          )}

          {coordinatorType === "no_fees" && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-[var(--mint-50)] border border-[var(--mint-100)] rounded-[var(--radius-lg)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <p className="text-xs text-[var(--mint-700)] leading-relaxed">
                <span className="font-semibold">Free to vend.</span> No fees are charged through VEHNDR.
              </p>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="bg-white rounded-2xl p-6 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">Message to vendor</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="input resize-none"
            placeholder="Describe what you're looking for…"
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
        )}

        <div className="flex gap-3">
          <Link
            href={`/buyer-dashboard/proposals/${proposalId}`}
            className="flex-1 h-12 rounded-2xl flex items-center justify-center text-sm font-semibold text-[var(--gray-700)] border border-[var(--gray-200)] hover:bg-[var(--gray-50)] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 h-12 rounded-2xl text-white font-bold text-sm disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(to right, var(--violet-600), var(--magenta-600))", boxShadow: "0 4px 16px rgba(139,92,246,0.3)" }}
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
