"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getVendorProfile } from "../../../../services/vendors";
import { getEvent, updateEvent } from "../../../../services/events";
import { createInquiry } from "../../../../services/inquiries";

const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hour = h % 12 || 12;
      const period = h < 12 ? "AM" : "PM";
      slots.push({
        label: `${hour}:${m.toString().padStart(2, "0")} ${period}`,
        value: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      });
    }
  }
  return slots;
})();

// ─── Coordinator types ────────────────────────────────────────────────────────

const COORDINATOR_TYPES = [
  {
    value: "hiring_vendor",
    label: "Hiring a vendor",
    description: "I'm paying the vendor to work at my event",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    value: "charges_fees",
    label: "Charging vending fees",
    description: "Vendors pay me a fee to sell at my event",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    value: "no_fees",
    label: "Free to vend",
    description: "No fees — vendors join at no cost",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
];

// ─── Fee estimate helpers (mirrors MarketplacePricing) ───────────────────────

const FEE_TAX_RATE     = 0.0825;
const FEE_COORD_RATE   = 0.10;
const FEE_STRIPE_RATE  = 0.029;
const FEE_STRIPE_FIXED = 30; // cents

function feeBase(dollars)              { return Math.round(Number(dollars) * 100); }
function feeTax(base)                  { return Math.round(base * FEE_TAX_RATE); }
function feeCoord(base)                { return Math.round(base * FEE_COORD_RATE); }
function feePreStripe(base, tip = 0)   { return base + feeTax(base) + feeCoord(base) + tip; }
function feeGrossTotal(base, tip = 0)  {
  const pre = feePreStripe(base, tip);
  return Math.ceil((pre + FEE_STRIPE_FIXED) / (1 - FEE_STRIPE_RATE));
}
function feeStripeToCustomer(base, tip = 0) { return feeGrossTotal(base, tip) - feePreStripe(base, tip); }

function formatFee(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

function FeeEstimateCard({ budgetDollars, tipDollars }) {
  const [open, setOpen] = useState(false);
  const base = feeBase(budgetDollars);
  if (!base || base <= 0) return null;
  const tip    = feeBase(tipDollars) || 0;
  const coord  = feeCoord(base);
  const tax    = feeTax(base);
  const stripe = feeStripeToCustomer(base, tip);
  const total  = feeGrossTotal(base, tip);

  return (
    <div className="rounded-xl bg-[var(--violet-50)] border border-[var(--violet-100)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="text-xs font-semibold text-[var(--violet-700)]">Est. total</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--violet-900)]">~{formatFee(total)}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-[var(--violet-100)] space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--violet-700)]">Your budget (base)</span>
            <span className="font-semibold text-[var(--gray-800)]">{formatFee(base)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--violet-700)]">VEHNDR platform fee (10%)</span>
            <span className="font-semibold text-[var(--gray-800)]">{formatFee(coord)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--violet-700)]">Sales tax (8.25%)</span>
            <span className="font-semibold text-[var(--gray-800)]">{formatFee(tax)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--violet-700)]">Processing fee (Stripe)</span>
            <span className="font-semibold text-[var(--gray-800)]">~{formatFee(stripe)}</span>
          </div>
          {tip > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-[var(--violet-700)]">Tip</span>
              <span className="font-semibold text-[var(--gray-800)]">{formatFee(tip)}</span>
            </div>
          )}
          <p className="text-[10px] text-[var(--violet-500)] leading-relaxed pt-1">
            Estimate based on your budget. The vendor sets the final price in their offer.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Message builder ──────────────────────────────────────────────────────────

function buildMessage(vendor, event, coordinatorType, fields) {
  if (!vendor || !event) return "";

  const rawDate = event.startDate || event.start_date;
  const location = event.streetAddress || event.location;
  const attendees = event.attendees;

  const datePart = rawDate
    ? new Date(rawDate.includes("T") ? rawDate : rawDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : "[date TBD]";
  const locationPart = location || "[location TBD]";
  const guestPart = attendees ? `approximately ${attendees} guests` : "guests";

  if (coordinatorType === "hiring_vendor") {
    const budgetPart = fields.budget ? `$${Number(fields.budget).toLocaleString()}` : null;
    return [
      `Hi ${vendor.name}!`,
      `I'm organizing "${event.name}" on ${datePart} at ${locationPart} for ${guestPart}.`,
      fields.serviceRequested ? `I'm looking for ${fields.serviceRequested}.` : null,
      budgetPart ? `My budget for this is ${budgetPart}.` : null,
      `I'd love to discuss how you can be part of our event — are you available?`,
    ].filter(Boolean).join(" ");
  }

  if (coordinatorType === "charges_fees") {
    const feePart = fields.vendingFee ? `$${Number(fields.vendingFee).toLocaleString()}` : null;
    return [
      `Hi ${vendor.name}!`,
      `I'm hosting "${event.name}" on ${datePart} at ${locationPart}, expecting ${guestPart}.`,
      `I'm looking for vendors to participate${fields.serviceRequested ? `, specifically ${fields.serviceRequested}` : ""}.`,
      feePart ? `The vending fee for this event is ${feePart}.` : null,
      `Payments are processed through VEHNDR. Would you be interested in joining?`,
    ].filter(Boolean).join(" ");
  }

  return [
    `Hi ${vendor.name}!`,
    `I'm hosting "${event.name}" on ${datePart} at ${locationPart}, expecting ${guestPart}.`,
    `I'm looking for vendors to participate${fields.serviceRequested ? `, specifically ${fields.serviceRequested}` : ""}.`,
    `There are no vending fees for this event — it's free to join.`,
    `Would you be interested?`,
  ].filter(Boolean).join(" ");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function NewProposalPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("vendor_id");
  const eventId = searchParams.get("event_id");

  const [vendor, setVendor] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [coordinatorType, setCoordinatorType] = useState("hiring_vendor");
  const [fields, setFields] = useState({ serviceRequested: "", budget: "", vendingFee: "", tip: "" });
  const [logistics, setLogistics] = useState({ boothSize: "", vendorLoadIn: "", vendorLoadOut: "" });
  const [message, setMessage] = useState("");
  const [messageEdited, setMessageEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vendorId || !eventId) { setLoading(false); return; }
    Promise.all([getVendorProfile(vendorId), getEvent(eventId)])
      .then(([v, e]) => { setVendor(v); setEvent(e); })
      .catch(() => setError("Could not load proposal details."))
      .finally(() => setLoading(false));
  }, [vendorId, eventId]);

  // Auto-generate message
  useEffect(() => {
    if (!messageEdited && vendor && event) {
      setMessage(buildMessage(vendor, event, coordinatorType, fields));
    }
  }, [vendor, event, coordinatorType, fields, messageEdited]);

  const setField = useCallback((key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  function handleTypeChange(type) {
    setCoordinatorType(type);
    if (type !== "hiring_vendor") setField("budget", "");
    if (type !== "charges_fees") setField("vendingFee", "");
    setMessageEdited(false);
  }

  function handleMessageChange(e) {
    setMessage(e.target.value);
    setMessageEdited(true);
  }

  function regenerateMessage() {
    setMessageEdited(false);
    setMessage(buildMessage(vendor, event, coordinatorType, fields));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) { setError("Please add a message before sending."); return; }
    setError(null);
    setSubmitting(true);
    try {
      // Save vendor-specific logistics to the event
      const logUpdate = {};
      if (logistics.boothSize) logUpdate.booth_size = logistics.boothSize;
      if (logistics.vendorLoadIn) logUpdate.vendor_load_in = TIME_SLOTS.find((s) => s.value === logistics.vendorLoadIn)?.label ?? logistics.vendorLoadIn;
      if (logistics.vendorLoadOut) logUpdate.vendor_load_out = TIME_SLOTS.find((s) => s.value === logistics.vendorLoadOut)?.label ?? logistics.vendorLoadOut;
      if (Object.keys(logUpdate).length > 0) {
        await updateEvent(eventId, logUpdate);
      }

      const payload = {
        vendor_id: vendorId,
        event_id: eventId,
        coordinator_type: coordinatorType,
        initial_message: message.trim(),
      };
      if (coordinatorType === "hiring_vendor" && fields.budget) {
        payload.budget_cents = Math.round(Number(fields.budget) * 100);
      }
      if (coordinatorType === "hiring_vendor" && fields.tip) {
        payload.tip_cents = Math.round(Number(fields.tip) * 100);
      }
      if (coordinatorType === "charges_fees" && fields.vendingFee) {
        payload.vending_fee_cents = Math.round(Number(fields.vendingFee) * 100);
      }
      const res = await createInquiry(payload);
      const inquiry = res?.inquiry ?? res;
      setSubmitted(true);
      setTimeout(() => router.push(`/messages/${inquiry.id}`), 1200);
    } catch (err) {
      setError(err?.message ?? "Something went wrong. Please try again.");
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

  if (!vendorId || !eventId || error) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-[var(--error)] mb-4">{error ?? "Missing proposal context."}</p>
        <Link href="/buyer-dashboard/proposals" className="text-sm text-[var(--violet-600)] hover:underline">
          ← Back to proposals
        </Link>
      </div>
    );
  }

  const vendorInitial = vendor?.name?.charAt(0)?.toUpperCase() ?? "V";

  const fmt = (raw) => {
    if (!raw) return null;
    try {
      return new Date(raw.includes("T") ? raw : raw + "T00:00:00").toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
    } catch { return null; }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--gray-400)]">
        <Link href="/buyer-dashboard/proposals" className="hover:text-[var(--violet-600)] transition-colors">
          Proposals
        </Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-[var(--gray-600)] font-medium">New Proposal</span>
      </div>

      <h1 className="text-2xl font-display font-bold text-[var(--gray-900)]">Submit a Proposal</h1>

      {/* Vendor + Event summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vendor card */}
        {vendor && (
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ background: "var(--gradient-vendor)" }}>
              {vendorInitial}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[var(--gray-400)] uppercase tracking-wider mb-0.5">Vendor</p>
              <p className="font-semibold text-[var(--gray-900)] truncate">{vendor.name}</p>
              {vendor.location && <p className="text-xs text-[var(--gray-500)] truncate">{vendor.location}</p>}
            </div>
          </div>
        )}

        {/* Event card */}
        {event && (
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="w-11 h-11 rounded-xl bg-[var(--violet-50)] flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-[var(--gray-400)] uppercase tracking-wider mb-0.5">Event</p>
              <p className="font-semibold text-[var(--gray-900)] truncate">{event.name}</p>
              {(event.startDate || event.start_date) && (
                <p className="text-xs text-[var(--gray-500)]">{fmt(event.startDate || event.start_date)}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Proposal form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Coordinator type */}
        <div className="bg-white rounded-2xl p-6 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">I am…</p>
          <div className="space-y-2">
            {COORDINATOR_TYPES.map((type) => {
              const selected = coordinatorType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-[var(--radius-lg)] border-2 text-left transition-all"
                  style={{
                    borderColor: selected ? "var(--violet-500)" : "var(--gray-200)",
                    background: selected ? "var(--violet-50)" : "white",
                  }}
                >
                  <span style={{ color: selected ? "var(--violet-600)" : "var(--gray-400)" }}>{type.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-tight ${selected ? "text-[var(--violet-800)]" : "text-[var(--gray-800)]"}`}>
                      {type.label}
                    </p>
                    <p className={`text-xs mt-0.5 leading-tight ${selected ? "text-[var(--violet-500)]" : "text-[var(--gray-400)]"}`}>
                      {type.description}
                    </p>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                    style={{
                      borderColor: selected ? "var(--violet-500)" : "var(--gray-300)",
                      background: selected ? "var(--violet-500)" : "white",
                    }}
                  >
                    {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Proposal details */}
        <div className="bg-white rounded-2xl p-6 space-y-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">Proposal Details</p>

          {/* What you're looking for */}
          <div>
            <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
              What are you looking for?
            </label>
            <input
              type="text"
              value={fields.serviceRequested}
              onChange={(e) => setField("serviceRequested", e.target.value)}
              placeholder={
                coordinatorType === "hiring_vendor"
                  ? "e.g. a DJ for 4 hours, catering for 80 people"
                  : "e.g. food vendors, craft sellers, clothing boutiques"
              }
              className="input"
            />
          </div>

          {/* Budget (hiring_vendor) */}
          {coordinatorType === "hiring_vendor" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">Your budget (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--gray-400)] font-medium pointer-events-none">$</span>
                  <input
                    type="number"
                    min="1"
                    value={fields.budget}
                    onChange={(e) => setField("budget", e.target.value)}
                    placeholder="500"
                    className="input pl-8"
                  />
                </div>
                <p className="text-xs text-[var(--gray-400)] mt-1.5">Helps the vendor tailor their offer to your budget.</p>
              </div>
              {fields.budget && Number(fields.budget) > 0 && (
                <FeeEstimateCard budgetDollars={fields.budget} tipDollars={fields.tip} />
              )}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                  Add a tip <span className="text-[var(--gray-400)] font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--gray-400)] font-medium pointer-events-none">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fields.tip}
                    onChange={(e) => setField("tip", e.target.value)}
                    placeholder="0"
                    className="input pl-8"
                  />
                </div>
                <p className="text-xs text-[var(--gray-400)] mt-1.5">Collected at checkout.</p>
              </div>
            </div>
          )}

          {/* Vending fee (charges_fees) */}
          {coordinatorType === "charges_fees" && (
            <div>
              <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">Fee per vendor (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--gray-400)] font-medium pointer-events-none">$</span>
                <input
                  type="number"
                  min="1"
                  value={fields.vendingFee}
                  onChange={(e) => setField("vendingFee", e.target.value)}
                  placeholder="150"
                  className="input pl-8"
                />
              </div>
              <p className="text-xs text-[var(--gray-400)] mt-1.5">Payments are collected through VEHNDR.</p>
            </div>
          )}

          {/* No fees info */}
          {coordinatorType === "no_fees" && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-[var(--mint-50)] border border-[var(--mint-100)] rounded-[var(--radius-lg)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="text-xs text-[var(--mint-700)] leading-relaxed">
                <span className="font-semibold">Free to vend.</span> No fees are charged. Any transactions will be facilitated through the VEHNDR platform.
              </p>
            </div>
          )}
        </div>

        {/* Vendor Logistics */}
        <div className="bg-white rounded-2xl p-6 space-y-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <div>
            <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">Vendor Logistics</p>
            <p className="text-xs text-[var(--gray-400)] mt-1">Optional details specific to this vendor — may differ from other vendors at the same event.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">Booth / space size</label>
            <input
              type="text"
              value={logistics.boothSize}
              onChange={(e) => setLogistics((prev) => ({ ...prev, boothSize: e.target.value }))}
              placeholder="e.g. 10×10 ft"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">Vendor load-in</label>
              <select
                value={logistics.vendorLoadIn}
                onChange={(e) => setLogistics((prev) => ({ ...prev, vendorLoadIn: e.target.value }))}
                className="input"
              >
                <option value="">Select time</option>
                {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">Vendor load-out</label>
              <select
                value={logistics.vendorLoadOut}
                onChange={(e) => setLogistics((prev) => ({ ...prev, vendorLoadOut: e.target.value }))}
                className="input"
              >
                <option value="">Select time</option>
                {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="bg-white rounded-2xl p-6 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">Your Message</p>
            {messageEdited && (
              <button
                type="button"
                onClick={regenerateMessage}
                className="text-xs font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)] flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Regenerate
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              required
              rows={6}
              value={message}
              onChange={handleMessageChange}
              placeholder="Fill in the details above and your message will auto-generate here…"
              className="w-full rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3.5 text-sm text-[var(--gray-900)] leading-relaxed placeholder:text-[var(--gray-400)] outline-none focus:border-[var(--violet-500)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] transition-all resize-none"
            />
            {!messageEdited && message && (
              <div className="absolute bottom-3 right-3">
                <span className="text-[10px] font-medium text-[var(--violet-500)] bg-[var(--violet-50)] px-2 py-0.5 rounded-full">
                  Auto-generated
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-[var(--error-50)] border border-[var(--error-100)] rounded-[var(--radius-lg)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || submitted || !message.trim()}
          className="w-full h-12 rounded-[var(--radius-lg)] text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            background: submitted
              ? "var(--mint-600, #16a34a)"
              : "linear-gradient(to right, var(--violet-600), var(--magenta-600))",
            boxShadow: submitted ? "none" : undefined,
          }}
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending…
            </>
          ) : submitted ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Proposal Sent to {vendor?.name ?? "Vendor"}
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send Proposal to {vendor?.name ?? "Vendor"}
            </>
          )}
        </button>

        <p className="text-xs text-center text-[var(--gray-400)]">
          By submitting you agree to VEHNDR&apos;s{" "}
          <Link href="/terms" className="underline hover:text-[var(--gray-600)]">Terms of Service</Link>.
        </p>
      </form>
    </div>
  );
}

export default function NewProposalPage() {
  return (
    <Suspense>
      <NewProposalPageInner />
    </Suspense>
  );
}
