"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createInquiry } from "../services/inquiries";
import { marketplaceBreakdown } from "../utils/marketplacePricing";



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

// ─── Yes / No / NA chip group ─────────────────────────────────────────────────

function ChipGroup({ value, onChange, options }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(selected ? null : opt.value)}
            className="px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all"
            style={{
              borderColor: selected ? "var(--violet-500)" : "var(--gray-200)",
              background: selected ? "var(--violet-50)" : "white",
              color: selected ? "var(--violet-700)" : "var(--gray-500)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const YES_NO_NA = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "na", label: "N/A" }];
const YES_NO_PAID = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "paid", label: "Paid Parking" }];
const INDOOR_OUTDOOR = [{ value: "indoor", label: "Indoor" }, { value: "outdoor", label: "Outdoor" }];

// ─── Fee estimate helpers (mirrors MarketplacePricing) ───────────────────────

function _feeBase(dollars)   { return Math.round(Number(dollars) * 100); }

function _fmt(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

function BudgetFeeEstimate({ budgetDollars, tipDollars, collectTax = true }) {
  const base = _feeBase(budgetDollars);
  if (!base || base <= 0) return null;
  const tip = _feeBase(tipDollars) || 0;
  const pricing = marketplaceBreakdown(base, tip, collectTax);

  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--violet-50)] border border-[var(--violet-100)] overflow-hidden">
      <div className="px-3.5 py-2 border-b border-[var(--violet-100)] flex items-center gap-1.5">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-[10px] font-semibold text-[var(--violet-700)] uppercase tracking-wider">Estimated amount you pay if vendor matches your budget</p>
      </div>
      <div className="px-3.5 py-2.5 space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--violet-600)]">Your budget</span>
          <span className="font-semibold text-[var(--gray-800)]">{_fmt(base)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[var(--violet-600)]">VEHNDR fee (10%)</span>
          <span className="font-semibold text-[var(--gray-800)]">+ {_fmt(pricing.coordinatorFeeCents)}</span>
        </div>
        {pricing.taxCents > 0 && (
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--violet-600)]">Tax (8.25%)</span>
            <span className="font-semibold text-[var(--gray-800)]">+ {_fmt(pricing.taxCents)}</span>
          </div>
        )}
        {tip > 0 && (
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--violet-600)]">Tip</span>
            <span className="font-semibold text-[var(--gray-800)]">+ {_fmt(tip)}</span>
          </div>
        )}
        <div className="flex justify-between text-[11px] font-bold pt-1.5 mt-0.5 border-t border-[var(--violet-200)]">
          <span className="text-[var(--violet-900)]">You pay</span>
          <span className="text-[var(--violet-900)]">~{_fmt(pricing.totalChargeCents)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Message builder ──────────────────────────────────────────────────────────

function buildMessage(vendor, coordinatorType, fields) {
  const { eventName, eventDate, location, guestCount, serviceRequested, budget, vendingFee, eventLink } = fields;
  if (!eventName && !serviceRequested) return "";

  const datePart = eventDate
    ? new Date(eventDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "[date TBD]";
  const locationPart = location || "[location TBD]";
  const guestPart = guestCount ? `approximately ${guestCount} guests` : "guests";

  // Build venue logistics blurb
  const {
    boothWidth, boothDepth, canopyAllowed, indoorOutdoor, attendees,
    accessToPower, accessToWater, wifiAvailability,
    vendorLoadIn, vendorLoadOut, eventHours,
    parkingAvailable, securityPresence,
  } = fields;

  const venueDetails = [];
  if (boothWidth && boothDepth) venueDetails.push(`Booth size: ${boothWidth} ft × ${boothDepth} ft`);
  else if (boothWidth || boothDepth) venueDetails.push(`Booth size: ${boothWidth || "?"}ft × ${boothDepth || "?"}ft`);
  if (indoorOutdoor) venueDetails.push(`${indoorOutdoor === "indoor" ? "Indoor" : "Outdoor"} event`);
  if (attendees) venueDetails.push(`${attendees} attendees`);
  if (canopyAllowed) venueDetails.push(`Canopy ${canopyAllowed === "yes" ? "allowed" : "not allowed"}`);
  if (accessToPower) venueDetails.push(`Power ${accessToPower === "yes" ? "available" : "not available"}`);
  if (accessToWater) venueDetails.push(`Water ${accessToWater === "yes" ? "available" : "not available"}`);
  if (wifiAvailability) venueDetails.push(`WiFi ${wifiAvailability === "yes" ? "available" : "not available"}`);
  if (parkingAvailable === "yes") venueDetails.push("On-site parking available");
  else if (parkingAvailable === "no") venueDetails.push("No on-site parking");
  else if (parkingAvailable === "paid") venueDetails.push("Paid parking on site");
  if (securityPresence === "yes") venueDetails.push("Security on site");
  else if (securityPresence === "no") venueDetails.push("No security on site");
  if (vendorLoadIn) venueDetails.push(`Load-in: ${vendorLoadIn}`);
  if (vendorLoadOut) venueDetails.push(`Load-out: ${vendorLoadOut}`);
  if (eventHours) venueDetails.push(`Event hours: ${eventHours}`);

  const venueLine = venueDetails.length > 0
    ? `Venue details — ${venueDetails.join(", ")}.`
    : null;

  if (coordinatorType === "hiring_vendor") {
    const budgetPart = budget ? `$${Number(budget).toLocaleString()}` : null;
    return [
      `Hi ${vendor.name}!`,
      `I'm organizing "${eventName || "my event"}" on ${datePart} at ${locationPart} for ${guestPart}.`,
      serviceRequested ? `I'm looking for ${serviceRequested}.` : null,
      budgetPart ? `My budget for this is ${budgetPart}.` : null,
      venueLine,
      `I'd love to discuss how you can be part of our event — are you available?`,
      eventLink ? `You can view more details here: ${eventLink}` : null,
    ].filter(Boolean).join(" ");
  }

  if (coordinatorType === "charges_fees") {
    const feePart = vendingFee ? `$${Number(vendingFee).toLocaleString()}` : null;
    return [
      `Hi ${vendor.name}!`,
      `I'm hosting "${eventName || "my event"}" on ${datePart} at ${locationPart}, expecting ${guestPart}.`,
      `I'm looking for vendors to participate${serviceRequested ? `, specifically ${serviceRequested}` : ""}.`,
      feePart ? `The vending fee for this event is ${feePart}.` : null,
      venueLine,
      `Payments are processed through VEHNDR. Would you be interested in joining?`,
      eventLink ? `You can view more details here: ${eventLink}` : null,
    ].filter(Boolean).join(" ");
  }

  // no_fees
  return [
    `Hi ${vendor.name}!`,
    `I'm hosting "${eventName || "my event"}" on ${datePart} at ${locationPart}, expecting ${guestPart}.`,
    `I'm looking for vendors to participate${serviceRequested ? `, specifically ${serviceRequested}` : ""}.`,
    `There are no vending fees for this event — it's free to join.`,
    venueLine,
    `Would you be interested?`,
    eventLink ? `You can view more details here: ${eventLink}` : null,
  ].filter(Boolean).join(" ");
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function InquiryModal({ vendor, isOpen, onClose, defaultCoordinatorType = "hiring_vendor" }) {
  const router = useRouter();

  const [coordinatorType, setCoordinatorType] = useState(defaultCoordinatorType);
  const [fields, setFields] = useState({
    eventName: "",
    eventDate: "",
    eventEndDate: "",
    location: "",
    guestCount: "",
    serviceRequested: "",
    budget: "",
    tip: "",
    vendingFee: "",
    eventLink: "",
    // venue logistics
    boothWidth: "",
    boothDepth: "",
    canopyAllowed: null,
    indoorOutdoor: null,
    attendees: "",
    accessToPower: null,
    accessToWater: null,
    wifiAvailability: null,
    eventHours: "",
    parkingAvailable: null,
    securityPresence: null,
  });
  const [message, setMessage] = useState("");
  const [messageEdited, setMessageEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const token = typeof window !== "undefined" ? window.localStorage?.getItem("vehndr_token") : null;
    setNeedsAuth(!token);
  }, [isOpen]);

  // Regenerate message whenever fields or coordinator type change (unless manually edited)
  useEffect(() => {
    if (!messageEdited && vendor) {
      setMessage(buildMessage(vendor, coordinatorType, fields));
    }
  }, [fields, coordinatorType, vendor, messageEdited]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCoordinatorType(defaultCoordinatorType);
      setFields({
        eventName: "", eventDate: "", eventEndDate: "", location: "", guestCount: "",
        serviceRequested: "", budget: "", tip: "", vendingFee: "", eventLink: "",
        boothWidth: "", boothDepth: "", canopyAllowed: null, indoorOutdoor: null,
        attendees: "", accessToPower: null, accessToWater: null, wifiAvailability: null,
        eventHours: "", parkingAvailable: null, securityPresence: null,
      });
      setMessage("");
      setMessageEdited(false);
      setError(null);
      setNeedsAuth(false);
    }
  }, [isOpen, defaultCoordinatorType]);

  const set = useCallback((key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  function handleMessageChange(e) {
    setMessage(e.target.value);
    setMessageEdited(true);
  }

  function regenerateMessage() {
    setMessageEdited(false);
    setMessage(buildMessage(vendor, coordinatorType, fields));
  }

  function handleTypeChange(type) {
    setCoordinatorType(type);
    // Clear the fee field that's no longer relevant
    if (type !== "hiring_vendor") set("budget", "");
    if (type !== "charges_fees") set("vendingFee", "");
    // Re-generate message
    setMessageEdited(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError("Please add a message before sending.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vendor_id: vendor.id,
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

      // Venue logistics (only include fields that have values)
      const logistics = {};
      if (fields.boothWidth && fields.boothDepth) logistics.booth_size = `${fields.boothWidth}x${fields.boothDepth}`;
      if (fields.canopyAllowed) logistics.canopy_allowed = fields.canopyAllowed;
      if (fields.indoorOutdoor) logistics.indoor_outdoor = fields.indoorOutdoor;
      if (fields.attendees) logistics.attendees = Number(fields.attendees);
      if (fields.accessToPower) logistics.access_to_power = fields.accessToPower;
      if (fields.accessToWater) logistics.access_to_water = fields.accessToWater;
      if (fields.wifiAvailability) logistics.wifi_availability = fields.wifiAvailability;
      if (fields.eventHours) logistics.event_hours = fields.eventHours;
      if (fields.parkingAvailable) logistics.parking_available = fields.parkingAvailable;
      if (fields.securityPresence) logistics.security_presence = fields.securityPresence;
      if (Object.keys(logistics).length > 0) payload.venue_logistics = logistics;

      const res = await createInquiry(payload);
      const inquiry = res?.inquiry ?? res;
      onClose();
      router.push(`/messages/${inquiry.id}`);
    } catch (err) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const vendorInitial = vendor?.name?.charAt(0)?.toUpperCase() || "V";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="overlay absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bottom-sheet sm:rounded-[var(--radius-2xl)] shadow-2xl max-h-[92dvh] flex flex-col animate-slide-up">

        {/* Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="bottom-sheet-handle" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-2 pb-4 sm:pt-5 border-b border-[var(--gray-100)]">
          <div className="w-10 h-10 rounded-full bg-gradient-vendor flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm">
            {vendorInitial}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--gray-900)] leading-tight">Request to Book</h2>
            <p className="text-xs text-[var(--gray-500)] truncate mt-0.5">{vendor?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Auth gate */}
        {needsAuth ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--violet-100)] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[var(--gray-900)] mb-1">Log in to continue</p>
              <p className="text-sm text-[var(--gray-500)]">You need an account to contact vendors and send inquiries.</p>
            </div>
            <button
              onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/store/${vendor.id}`)}`)}
              className="w-full btn btn-gradient text-sm"
            >
              Log in or Sign up
            </button>
            <button onClick={onClose} className="text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)]">
              Maybe later
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* ── Coordinator type ── */}
              <section className="space-y-2.5">
                <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">
                  I am&hellip;
                </p>
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
                        <span style={{ color: selected ? "var(--violet-600)" : "var(--gray-400)" }}>
                          {type.icon}
                        </span>
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
                          {selected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ── Event details ── */}
              <section className="space-y-3">
                <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">
                  Event Details
                </p>

                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                    Event name <span className="text-[var(--coral-500)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fields.eventName}
                    onChange={(e) => set("eventName", e.target.value)}
                    placeholder="e.g. Sarah's Birthday Party"
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                      Start Date <span className="text-[var(--coral-500)]">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={fields.eventDate}
                      onChange={(e) => set("eventDate", e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                      End Date <span className="text-xs font-normal text-[var(--gray-400)]">(multi-day)</span>
                    </label>
                    <input
                      type="date"
                      value={fields.eventEndDate}
                      min={fields.eventDate || undefined}
                      onChange={(e) => set("eventEndDate", e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                      Guests <span className="text-[var(--coral-500)]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={fields.guestCount}
                      onChange={(e) => set("guestCount", e.target.value)}
                      placeholder="50"
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                    Location <span className="text-[var(--coral-500)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fields.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="e.g. Los Angeles, CA"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                    What are you looking for? <span className="text-[var(--coral-500)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fields.serviceRequested}
                    onChange={(e) => set("serviceRequested", e.target.value)}
                    placeholder="e.g. a DJ for 4 hours, catering for 80 people"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                    Event link <span className="text-xs font-normal text-[var(--gray-400)]">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={fields.eventLink}
                    onChange={(e) => set("eventLink", e.target.value)}
                    placeholder="e.g. partiful.com/events/..."
                    className="input"
                  />
                  <p className="text-xs text-[var(--gray-400)] mt-1.5">
                    Share a Partiful, Eventbrite, or other event page link.
                  </p>
                </div>
              </section>

              {/* ── Conditional fee section ── */}
              {coordinatorType === "hiring_vendor" && (
                <section className="space-y-3">
                  <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">Budget</p>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                        Your budget (USD) <span className="text-[var(--coral-500)]">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--gray-400)] font-medium pointer-events-none">$</span>
                        <input
                          type="number"
                          required
                          min="1"
                          value={fields.budget}
                          onChange={(e) => set("budget", e.target.value)}
                          placeholder="500"
                          className="input pl-8"
                        />
                      </div>
                      <p className="text-xs text-[var(--gray-400)] mt-1.5">
                        Helps the vendor tailor their offer to your budget.
                      </p>
                    </div>
                    {fields.budget && Number(fields.budget) > 0 && (
                      <BudgetFeeEstimate budgetDollars={fields.budget} tipDollars={fields.tip} collectTax={vendor?.collectTax !== false} />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                      Add a tip <span className="text-xs font-normal text-[var(--gray-400)]">(optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--gray-400)] font-medium pointer-events-none">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={fields.tip}
                        onChange={(e) => set("tip", e.target.value)}
                        placeholder="0"
                        className="input pl-8"
                      />
                    </div>
                    <p className="text-xs text-[var(--gray-400)] mt-1.5">
                      You can also tip after service is complete, or add more to current tip 🤪 once the booking is completed.
                    </p>
                  </div>
                </section>
              )}

              {coordinatorType === "charges_fees" && (
                <section className="space-y-3">
                  <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">Vending Fee</p>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                      Fee per vendor (USD) <span className="text-[var(--coral-500)]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--gray-400)] font-medium pointer-events-none">$</span>
                      <input
                        type="number"
                        required
                        min="1"
                        value={fields.vendingFee}
                        onChange={(e) => set("vendingFee", e.target.value)}
                        placeholder="150"
                        className="input pl-8"
                      />
                    </div>
                    <p className="text-xs text-[var(--gray-400)] mt-1.5">
                      Payments are collected through VEHNDR.
                    </p>
                  </div>
                </section>
              )}

              {coordinatorType === "no_fees" && (
                <div className="flex items-start gap-3 px-4 py-3.5 bg-[var(--mint-50)] border border-[var(--mint-100)] rounded-[var(--radius-lg)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <p className="text-xs text-[var(--mint-700)] leading-relaxed">
                    <span className="font-semibold">Free to vend.</span> No fees are charged. Any transactions or agreements between you and the vendor will be facilitated through the VEHNDR platform.
                  </p>
                </div>
              )}

              {/* ── Venue Logistics ── */}
              <section className="space-y-4">
                <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">
                  Venue Logistics
                </p>

                {/* Booth Size */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                    Booth Size (ft)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={fields.boothWidth}
                      onChange={(e) => set("boothWidth", e.target.value)}
                      placeholder="10"
                      className="input w-20 text-center"
                    />
                    <span className="text-sm text-[var(--gray-400)] font-medium">ft × </span>
                    <input
                      type="number"
                      min="1"
                      value={fields.boothDepth}
                      onChange={(e) => set("boothDepth", e.target.value)}
                      placeholder="10"
                      className="input w-20 text-center"
                    />
                    <span className="text-sm text-[var(--gray-400)]">ft</span>
                  </div>
                </div>

                {/* Indoor / Outdoor */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                    Indoor or Outdoor Event
                  </label>
                  <ChipGroup value={fields.indoorOutdoor} onChange={(v) => set("indoorOutdoor", v)} options={INDOOR_OUTDOOR} />
                </div>

                {/* Canopy Allowed */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                    Canopy Allowed?
                  </label>
                  <ChipGroup value={fields.canopyAllowed} onChange={(v) => set("canopyAllowed", v)} options={YES_NO} />
                </div>

                {/* Number of Attendees */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                    Number of Event Attendees
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={fields.attendees}
                    onChange={(e) => set("attendees", e.target.value)}
                    placeholder="e.g. 200"
                    className="input"
                  />
                </div>

                {/* Utilities row */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                      Access to Power
                    </label>
                    <ChipGroup value={fields.accessToPower} onChange={(v) => set("accessToPower", v)} options={YES_NO} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                      Access to Water
                    </label>
                    <ChipGroup value={fields.accessToWater} onChange={(v) => set("accessToWater", v)} options={YES_NO} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                      WiFi Availability
                    </label>
                    <ChipGroup value={fields.wifiAvailability} onChange={(v) => set("wifiAvailability", v)} options={YES_NO} />
                  </div>
                </div>

                {/* Event Date / Hours */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                    Event Date / Hours
                  </label>
                  <input
                    type="text"
                    value={fields.eventHours}
                    onChange={(e) => set("eventHours", e.target.value)}
                    placeholder="e.g. Saturday, April 20, 12:00 PM – 8:00 PM"
                    className="input"
                  />
                </div>

                {/* Parking */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                    Is Parking Available On Site?
                  </label>
                  <ChipGroup value={fields.parkingAvailable} onChange={(v) => set("parkingAvailable", v)} options={YES_NO_PAID} />
                </div>

                {/* Security */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-1.5">
                    Security Presence
                  </label>
                  <ChipGroup value={fields.securityPresence} onChange={(v) => set("securityPresence", v)} options={YES_NO_NA} />
                </div>
              </section>

              {/* ── Message ── */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">
                    Your Message
                  </p>
                  {messageEdited && (
                    <button
                      type="button"
                      onClick={regenerateMessage}
                      className="text-xs font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)] flex items-center gap-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                      </svg>
                      Regenerate
                    </button>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={handleMessageChange}
                    placeholder="Fill in the details above and your message will auto-generate here&hellip;"
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
              </section>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-[var(--error-50)] border border-[var(--error-100)] rounded-[var(--radius-lg)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-sm text-[var(--error)]">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--gray-100)] px-5 py-4 flex gap-3 safe-area-bottom bg-[var(--surface)]">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 h-11 rounded-[var(--radius-lg)] border border-[var(--gray-200)] text-[var(--gray-700)] text-sm font-semibold hover:bg-[var(--gray-50)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-2 h-11 px-6 rounded-[var(--radius-lg)] bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-sm font-semibold hover:shadow-[var(--shadow-button)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending&hellip;
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Send Inquiry
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
