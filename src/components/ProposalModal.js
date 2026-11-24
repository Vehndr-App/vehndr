"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEvent, getMyEvents, updateEvent } from "../services/events";
import { createInquiry } from "../services/inquiries";
import { getCoordinatorStripeAccount } from "../services/coordinators";
import { api } from "../services/api";
import { formatSalesTaxLabel, vendorTaxOptions } from "../utils/salesTaxRates";
import { marketplaceBreakdown } from "../utils/marketplacePricing";
import AddressAutocomplete from "./AddressAutocomplete";
import MarketplaceComingSoonPanel from "./MarketplaceComingSoonPanel";
import { isVendorMarketplaceBookable } from "../utils/vendorMarketplace";
import { useAuth } from "../contexts/AuthContext";
import {
  clearBookingDraft,
  saveBookingDraft,
} from "../utils/bookingDraft";

function isUnauthorizedError(err) {
  const status = err?.status ?? err?.details?.status;
  const message = String(err?.message || err?.details?.error || "").toLowerCase();
  return status === 401 || message.includes("not authorized") || message.includes("unauthorized");
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const AGE_GROUPS = ["All Ages", "Family / Kids Welcome", "18+", "21+", "Seniors (55+)"];

function dateRange(start, end) {
  const dates = [];
  let cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    dates.push(cur.toISOString().split("T")[0]);
    cur = new Date(cur.getTime() + 86400000);
  }
  return dates;
}

function fmtDayLabel(dateStr) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch { return dateStr; }
}

const STEP_META = {
  create: { title: "Event details", subtitle: "A few basics — then send your request." },
  send: { title: "Send Request", subtitle: "Choose how you're booking, then send your message." },
};

const COORDINATOR_TYPES = [
  {
    value: "hiring_vendor",
    label: "Hiring a vendor",
    description: "I'm paying the vendor to work at my event",
  },
  {
    value: "charges_fees",
    label: "Charging vending fees",
    description: "Vendors pay me a fee to sell at my event",
  },
  {
    value: "no_fees",
    label: "Free to vend",
    description: "No fees — vendors join at no cost",
  },
];

function formatFee(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function buildSendMessage(vendor, event, coordinatorType, fields) {
  if (!vendor || !event) return "";
  const rawDate = event.startDate || event.start_date;
  const rawEndDate = event.endDate || event.end_date;
  const location = event.streetAddress || event.location || "[location TBD]";
  const attendees = event.attendees;
  const guestPart = attendees ? `approximately ${attendees} guests` : "guests";

  let datePart = "[date TBD]";
  if (rawDate) {
    try {
      const start = new Date(rawDate.includes("T") ? rawDate : rawDate + "T00:00:00");
      datePart = start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      if (rawEndDate && rawEndDate !== rawDate) {
        const end = new Date(rawEndDate.includes("T") ? rawEndDate : rawEndDate + "T00:00:00");
        if (start.toDateString() !== end.toDateString()) {
          datePart = `${datePart} – ${end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
        }
      }
    } catch { /* keep TBD */ }
  }

  if (coordinatorType === "hiring_vendor") {
    const budgetPart = fields.budget ? `$${Number(fields.budget).toLocaleString()}` : null;
    return [
      `Hi ${vendor.name}!`,
      `I'm organizing "${event.name}" on ${datePart} at ${location} for ${guestPart}.`,
      budgetPart ? `My budget for this is ${budgetPart}.` : null,
      `I'd love to discuss how you can be part of our event — are you available?`,
    ].filter(Boolean).join(" ");
  }

  if (coordinatorType === "charges_fees") {
    const feePart = fields.vendingFee ? `$${Number(fields.vendingFee).toLocaleString()}` : null;
    return [
      `Hi ${vendor.name}!`,
      `I'm hosting "${event.name}" on ${datePart} at ${location}, expecting ${guestPart}.`,
      `I'm looking for vendors to participate.`,
      feePart ? `The vending fee for this event is ${feePart}.` : null,
      `Payments are processed through VEHNDR. Would you be interested in joining?`,
    ].filter(Boolean).join(" ");
  }

  return [
    `Hi ${vendor.name}!`,
    `I'm hosting "${event.name}" on ${datePart} at ${location}, expecting ${guestPart}.`,
    `I'm looking for vendors to participate.`,
    `There are no vending fees for this event — it's free to join.`,
    `Would you be interested?`,
  ].filter(Boolean).join(" ");
}

const INITIAL_FORM = {
  importUrl: "",
  name: "",
  description: "",
  streetAddress: "",
  eventCity: "",
  eventState: "tx",
  eventPostalCode: "",
  startDate: "",
  endDate: "",
  isMultiDay: false,
  startTime: "18:00",
  endTime: "22:00",
  attendees: "",
  ageGroup: "All Ages",
  requiresCoi: false,
  // Venue logistics (Step 5) — event-level fields reused across vendors
  indoorOutdoor: "",
  accessToPower: "",
  accessToWater: "",
  parkingAvailable: "",
  canopyAllowed: "",
  venueAttendees: "",
  wifiAvailability: "",
  securityPresence: "",
  vendorLoadIn: "",
  vendorLoadOut: "",
  isPublic: false,
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icons = {
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  next: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  pin: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  people: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  spark: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  check: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  warn: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
};

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[46px] flex-shrink-0 cursor-pointer rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:ring-offset-2 ${
        checked
          ? "bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-500)] shadow-[0_2px_8px_rgba(139,92,246,0.4)]"
          : "bg-[var(--gray-200)]"
      }`}
    >
      <span
        className={`inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-sm ring-0 transition-all duration-200 ease-in-out mt-[2px] ${
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

// ─── ErrorBox ─────────────────────────────────────────────────────────────────

function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 p-3.5 bg-[var(--error-50)] border border-[var(--error-100)] rounded-xl">
      <span className="text-[var(--error)] flex-shrink-0 mt-0.5">{Icons.warn}</span>
      <p className="text-sm text-[var(--error)] leading-snug">{message}</p>
    </div>
  );
}

// ─── FieldLabel ───────────────────────────────────────────────────────────────

function FieldLabel({ children, required, hint }) {
  return (
    <div className="mb-1.5">
      <label className="block text-sm font-semibold text-[var(--gray-800)]">
        {children}
        {required && <span className="text-[var(--coral-500)] ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-[var(--gray-400)] mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}

// ─── StepIntro ────────────────────────────────────────────────────────────────

function StepIntro({ step }) {
  const meta = STEP_META[step];
  if (!meta) return null;
  return (
    <div className="pb-1">
      <h3 className="text-base font-bold text-[var(--gray-900)]">{meta.title}</h3>
      <p className="text-sm text-[var(--gray-500)] mt-0.5">{meta.subtitle}</p>
    </div>
  );
}

// ─── LogisticsRow ─────────────────────────────────────────────────────────────

function LogisticsRow({ question, hint, checked, onChange }) {
  return (
    <div
      className={`flex items-start justify-between gap-4 px-4 py-3.5 rounded-xl border transition-all cursor-pointer ${
        checked
          ? "border-[var(--violet-200)] bg-[var(--violet-50)]"
          : "border-[var(--gray-150,var(--gray-200))] bg-white hover:bg-[var(--gray-50)]"
      }`}
      onClick={() => onChange(!checked)}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${checked ? "text-[var(--violet-800)]" : "text-[var(--gray-800)]"}`}>
          {question}
        </p>
        {hint && <p className={`text-xs mt-0.5 leading-snug ${checked ? "text-[var(--violet-500)]" : "text-[var(--gray-400)]"}`}>{hint}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ─── ChipGroup ────────────────────────────────────────────────────────────────

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

// ─── FooterNav ────────────────────────────────────────────────────────────────

function FooterNav({ onBack, onNext, onSubmit, submitting, nextLabel = "Continue", showBack = true }) {
  return (
    <div className="border-t border-[var(--gray-100)] px-6 py-4 flex gap-2.5 safe-area-bottom bg-[var(--surface)]">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-[var(--gray-200)] text-[var(--gray-600)] text-sm font-semibold hover:bg-[var(--gray-50)] hover:border-[var(--gray-300)] transition-all disabled:opacity-40 flex-shrink-0"
        >
          {Icons.back}
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onSubmit || onNext}
        disabled={submitting}
        className="flex-1 h-11 px-5 rounded-xl bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-sm font-semibold hover:shadow-[0_4px_20px_rgba(139,92,246,0.35)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {nextLabel}
            {Icons.next}
          </>
        )}
      </button>
    </div>
  );
}

// ─── Step: Choose event ───────────────────────────────────────────────────────

function ChooseStep({ myEvents, loadingEvents, selectedEvent, onSelect, onCreateNew, onContinue, onImportUrl }) {
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const fmt = (raw) => {
    if (!raw) return null;
    try {
      const d = new Date(raw.includes("T") ? raw : raw + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return null; }
  };

  const fmtDateRange = (start, end) => {
    const s = fmt(start);
    if (!s || !end) return s;
    const sd = new Date(start.includes("T") ? start : start + "T00:00:00");
    const ed = new Date(end.includes("T") ? end : end + "T00:00:00");
    if (sd.toDateString() === ed.toDateString()) return s;
    return `${s} – ${fmt(end)}`;
  };

  const relativeTime = (raw) => {
    if (!raw) return null;
    const diff = new Date(raw) - new Date();
    const days = Math.round(diff / 86400000);
    if (days < 0) return "Past";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 7) return `In ${days} days`;
    if (days < 14) return "Next week";
    if (days < 30) return `In ${Math.round(days / 7)} weeks`;
    if (days < 60) return "Next month";
    return `In ${Math.round(days / 30)} months`;
  };

  async function handleImport() {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      await onImportUrl(importUrl.trim());
      // onImportUrl either redirects (full data) or transitions to step 1 (partial data)
    } catch {
      // Any import failure — just open the manual form
      onCreateNew();
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">

        {/* ── Import from URL ── */}
        <div className="px-6 pt-5 pb-4">
          <div className="rounded-2xl border border-[var(--gray-200)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
              <span className="text-[var(--violet-500)]">{Icons.link}</span>
              <div>
                <p className="text-xs font-bold text-[var(--gray-700)]">Import from Luma, Eventbrite, or Partiful</p>
                <p className="text-[11px] text-[var(--gray-400)] mt-0.5">Paste your event link — we&apos;ll create the event automatically.</p>
              </div>
            </div>
            {/* Platform pills */}
            <div className="flex gap-1.5 px-4 pt-3">
              {[
                { label: "Luma",       cls: "bg-[#f0f4ff] text-[#4361ee]" },
                { label: "Eventbrite", cls: "bg-[#fff5f0] text-[#f05537]" },
                { label: "Partiful",   cls: "bg-[#f5f0ff] text-[#7c3aed]" },
              ].map((p) => (
                <span key={p.label} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${p.cls}`}>{p.label}</span>
              ))}
            </div>
            {/* Input */}
            <div className="flex gap-2 p-3">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
                placeholder="https://lu.ma/your-event"
                className="input flex-1 text-sm h-10 rounded-lg"
              />
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || !importUrl.trim()}
                className="h-10 px-4 rounded-lg bg-[var(--gray-900)] text-white text-xs font-semibold hover:bg-[var(--gray-700)] transition-colors disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
              >
                {importing
                  ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : "Import"
                }
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-6 pb-4">
          <div className="flex-1 h-px bg-[var(--gray-200)]" />
          <span className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider">or choose an event</span>
          <div className="flex-1 h-px bg-[var(--gray-200)]" />
        </div>

        {/* Existing events */}
        {loadingEvents ? (
          <div className="px-6 space-y-3 pb-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-[var(--gray-100)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : myEvents.length > 0 ? (
          <div className="px-6 space-y-2.5 pb-4">
            <p className="text-[11px] font-bold text-[var(--gray-400)] uppercase tracking-widest">Your Events</p>
            {myEvents.map((event) => {
              const selected = selectedEvent?.id === event.id;
              const rel = relativeTime(event.startDate);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelect(selected ? null : event)}
                  className={`w-full text-left rounded-2xl border-2 transition-all duration-150 overflow-hidden ${
                    selected
                      ? "border-[var(--violet-500)] shadow-[0_0_0_4px_rgba(139,92,246,0.1)]"
                      : "border-[var(--gray-200)] hover:border-[var(--violet-300)] hover:shadow-sm"
                  }`}
                >
                  <div className={`flex items-stretch ${selected ? "bg-[var(--violet-50)]" : "bg-white"}`}>
                    <div className="w-1 flex-shrink-0 rounded-l-2xl" style={{ background: selected ? "var(--gradient-vendor)" : "var(--gray-200)" }} />
                    <div className="flex-1 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${selected ? "text-[var(--violet-800)]" : "text-[var(--gray-900)]"}`}>{event.name}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                            {(event.startDate || event.start_date) && (
                              <span className={`flex items-center gap-1 text-xs ${selected ? "text-[var(--violet-500)]" : "text-[var(--gray-500)]"}`}>
                                <span className={selected ? "text-[var(--violet-400)]" : "text-[var(--gray-400)]"}>{Icons.calendar}</span>
                                {fmtDateRange(event.startDate || event.start_date, event.endDate || event.end_date)}
                              </span>
                            )}
                            {(event.location || event.streetAddress) && (
                              <span className={`flex items-center gap-1 text-xs truncate max-w-[160px] ${selected ? "text-[var(--violet-500)]" : "text-[var(--gray-500)]"}`}>
                                <span className={selected ? "text-[var(--violet-400)]" : "text-[var(--gray-400)]"}>{Icons.pin}</span>
                                {event.location || event.streetAddress}
                              </span>
                            )}
                            {event.attendees > 0 && (
                              <span className={`flex items-center gap-1 text-xs ${selected ? "text-[var(--violet-500)]" : "text-[var(--gray-500)]"}`}>
                                <span className={selected ? "text-[var(--violet-400)]" : "text-[var(--gray-400)]"}>{Icons.people}</span>
                                {event.attendees.toLocaleString()} guests
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {rel && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${selected ? "bg-[var(--violet-100)] text-[var(--violet-600)]" : "bg-[var(--gray-100)] text-[var(--gray-500)]"}`}>
                              {rel}
                            </span>
                          )}
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected ? "bg-[var(--violet-600)] border-[var(--violet-600)]" : "border-[var(--gray-300)] bg-white"}`}>
                            {selected && Icons.check}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Create manually */}
        <div className="px-6 pb-6">
          {myEvents.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[var(--gray-200)]" />
              <span className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-[var(--gray-200)]" />
            </div>
          )}
          <button
            type="button"
            onClick={onCreateNew}
            className="group w-full rounded-2xl border-2 border-[var(--gray-200)] hover:border-[var(--violet-400)] bg-white hover:bg-[var(--violet-50)] transition-all duration-150 text-left overflow-hidden"
          >
            <div className="flex items-center gap-4 p-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)] flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(139,92,246,0.3)] group-hover:shadow-[0_6px_16px_rgba(139,92,246,0.4)] transition-shadow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-[var(--gray-900)] group-hover:text-[var(--violet-700)] transition-colors">
                  {myEvents.length > 0 ? "Create a new event" : "Create event manually"}
                </p>
                <p className="text-xs text-[var(--gray-400)] group-hover:text-[var(--violet-400)] transition-colors mt-0.5">
                  Name, place, date — then send your request
                </p>
              </div>
              <div className="text-[var(--gray-300)] group-hover:text-[var(--violet-400)] group-hover:translate-x-0.5 transition-all">
                {Icons.next}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Existing-event CTA */}
      {selectedEvent && (
        <div className="border-t border-[var(--gray-100)] px-6 py-4 safe-area-bottom bg-[var(--surface)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-[var(--violet-600)] flex items-center justify-center flex-shrink-0">{Icons.check}</div>
            <p className="text-xs text-[var(--gray-600)]">
              <span className="font-semibold text-[var(--gray-800)]">{selectedEvent.name}</span> selected
            </p>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-sm font-semibold hover:shadow-[0_4px_20px_rgba(139,92,246,0.35)] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            Continue with this event
            {Icons.next}
          </button>
        </div>
      )}
    </>
  );
}

// ─── Single event form (required + optional extras) ───────────────────────────

const CHIP_YES_NO       = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const CHIP_YES_NO_LTD   = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "limited", label: "Limited" }];
const CHIP_INDOOR_OUT   = [{ value: "indoor", label: "Indoor" }, { value: "outdoor", label: "Outdoor" }, { value: "both", label: "Both" }];

function isOptionalSparse(form) {
  if (!form) return true;
  const noLogistics = !form.indoorOutdoor && !form.accessToPower && !form.accessToWater
    && !form.parkingAvailable && !form.canopyAllowed && !form.wifiAvailability
    && !form.securityPresence && !form.vendorLoadIn && !form.vendorLoadOut;
  const noDesc = !form.description?.trim();
  const defaultAge = !form.ageGroup || form.ageGroup === "All Ages";
  return noLogistics && noDesc && defaultAge && !form.requiresCoi;
}

function OptionalDetailsFields({ form, setField }) {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel hint="Optional — helps vendors understand the vibe.">Event description</FieldLabel>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Tell vendors what makes this event special…"
          className="w-full rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3 text-sm text-[var(--gray-900)] leading-relaxed placeholder:text-[var(--gray-400)] outline-none focus:border-[var(--violet-500)] focus:bg-white resize-none"
        />
      </div>

      <div>
        <FieldLabel>Primary age group</FieldLabel>
        <div className="flex flex-wrap gap-2 mt-0.5">
          {AGE_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setField("ageGroup", g)}
              className={`text-sm px-3.5 py-1.5 rounded-full border font-medium transition-all ${
                form.ageGroup === g
                  ? "border-[var(--violet-500)] bg-[var(--violet-50)] text-[var(--violet-700)]"
                  : "border-[var(--gray-200)] bg-white text-[var(--gray-600)] hover:border-[var(--gray-300)]"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`flex items-start justify-between gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
          form.requiresCoi
            ? "border-[var(--violet-300)] bg-[var(--violet-50)]"
            : "border-[var(--gray-200)] bg-white hover:border-[var(--gray-300)]"
        }`}
        onClick={() => setField("requiresCoi", !form.requiresCoi)}
      >
        <div>
          <p className={`text-sm font-semibold ${form.requiresCoi ? "text-[var(--violet-800)]" : "text-[var(--gray-800)]"}`}>
            Certificate of Insurance required
          </p>
          <p className={`text-xs mt-0.5 leading-snug ${form.requiresCoi ? "text-[var(--violet-500)]" : "text-[var(--gray-400)]"}`}>
            Vendors need proof of liability insurance.
          </p>
        </div>
        <Toggle checked={form.requiresCoi} onChange={(v) => setField("requiresCoi", v)} />
      </div>

      <div>
        <FieldLabel>Indoor or outdoor?</FieldLabel>
        <ChipGroup value={form.indoorOutdoor} onChange={(v) => setField("indoorOutdoor", v)} options={CHIP_INDOOR_OUT} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Access to power?</FieldLabel>
          <ChipGroup value={form.accessToPower} onChange={(v) => setField("accessToPower", v)} options={CHIP_YES_NO_LTD} />
        </div>
        <div>
          <FieldLabel>Access to water?</FieldLabel>
          <ChipGroup value={form.accessToWater} onChange={(v) => setField("accessToWater", v)} options={CHIP_YES_NO} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Parking?</FieldLabel>
          <ChipGroup value={form.parkingAvailable} onChange={(v) => setField("parkingAvailable", v)} options={CHIP_YES_NO_LTD} />
        </div>
        <div>
          <FieldLabel>Canopy / tent OK?</FieldLabel>
          <ChipGroup value={form.canopyAllowed} onChange={(v) => setField("canopyAllowed", v)} options={CHIP_YES_NO} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Wi-Fi available?</FieldLabel>
          <ChipGroup value={form.wifiAvailability} onChange={(v) => setField("wifiAvailability", v)} options={CHIP_YES_NO} />
        </div>
        <div>
          <FieldLabel>Security on site?</FieldLabel>
          <ChipGroup value={form.securityPresence} onChange={(v) => setField("securityPresence", v)} options={CHIP_YES_NO} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Vendor load-in</FieldLabel>
          <select value={form.vendorLoadIn} onChange={(e) => setField("vendorLoadIn", e.target.value)} className="input">
            <option value="">Not set</option>
            {TIME_SLOTS.map((s) => <option key={s.value} value={s.label}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Vendor load-out</FieldLabel>
          <select value={form.vendorLoadOut} onChange={(e) => setField("vendorLoadOut", e.target.value)} className="input">
            <option value="">Not set</option>
            {TIME_SLOTS.map((s) => <option key={s.value} value={s.label}>{s.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function EventForm({
  form,
  setField,
  dailySchedule,
  setDailySchedule,
  onBack,
  onSave,
  submitting,
  error,
}) {
  const [showMore, setShowMore] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);

  const addressFilled =
    form.eventCity?.trim() &&
    form.eventState &&
    /^\d{5}/.test((form.eventPostalCode || "").trim());

  const showPerDay = form.isMultiDay && form.startDate && form.endDate && dailySchedule.length > 1;

  function updateDay(date, field, value) {
    setDailySchedule((prev) => prev.map((d) => (d.date === date ? { ...d, [field]: value } : d)));
  }

  function applyAllHours() {
    const first = dailySchedule[0];
    if (!first?.startTime || !first?.endTime) {
      setScheduleError("Enter a start and end time for the first day before applying to all days.");
      return;
    }
    setScheduleError(null);
    setDailySchedule((prev) => prev.map((d) => ({ ...d, startTime: first.startTime, endTime: first.endTime })));
  }

  function applyLoadTimesToAll() {
    const first = dailySchedule[0];
    if (!first) return;
    setDailySchedule((prev) =>
      prev.map((d) => ({
        ...d,
        vendorLoadIn: first.vendorLoadIn,
        vendorLoadOut: first.vendorLoadOut,
      }))
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div>
          <FieldLabel required>Event name</FieldLabel>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="e.g. Summer Product Launch"
            className="input"
            autoFocus
          />
        </div>

        <div>
          <FieldLabel required hint="Start typing, then pick a suggestion — city, state, and ZIP fill in automatically.">
            Event address
          </FieldLabel>
          <AddressAutocomplete
            value={form.streetAddress}
            onChange={(v) => {
              setField("streetAddress", v);
              setField("eventCity", "");
              setField("eventPostalCode", "");
            }}
            onStructuredSelect={(parts) => {
              if (parts.eventCity) setField("eventCity", parts.eventCity);
              if (parts.eventState) setField("eventState", parts.eventState);
              if (parts.eventPostalCode) setField("eventPostalCode", parts.eventPostalCode);
            }}
            placeholder="Start typing an address…"
          />
          {addressFilled && (
            <p className="mt-2 text-xs text-[var(--mint-700)] bg-[var(--mint-50)] border border-[var(--mint-100)] rounded-lg px-3 py-2">
              {form.eventCity}, {form.eventState.toUpperCase()} {form.eventPostalCode}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <FieldLabel required>Event date</FieldLabel>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setField("startDate", e.target.value)}
              className="input"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-200)]">
            <div>
              <p className="text-sm font-semibold text-[var(--gray-800)]">Multi-day event</p>
              <p className="text-xs text-[var(--gray-400)] mt-0.5">Spans more than one calendar day</p>
            </div>
            <Toggle checked={form.isMultiDay} onChange={(v) => setField("isMultiDay", v)} />
          </div>

          {form.isMultiDay && (
            <div>
              <FieldLabel required>End date</FieldLabel>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => setField("endDate", e.target.value)}
                className="input"
              />
            </div>
          )}

          {showPerDay ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--gray-800)]">Hours per day</p>
                <button
                  type="button"
                  onClick={applyAllHours}
                  className="text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-800)] underline underline-offset-2"
                >
                  Same hours every day
                </button>
              </div>
              {scheduleError && <ErrorBox message={scheduleError} />}
              {dailySchedule.map((day) => (
                <div key={day.date} className="p-4 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)]">
                  <p className="text-xs font-bold text-[var(--gray-600)] uppercase tracking-wide mb-3">{fmtDayLabel(day.date)}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel required>Start</FieldLabel>
                      <select value={day.startTime} onChange={(e) => updateDay(day.date, "startTime", e.target.value)} className="input">
                        {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel required>End</FieldLabel>
                      <select value={day.endTime} onChange={(e) => updateDay(day.date, "endTime", e.target.value)} className="input">
                        {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Start time</FieldLabel>
                <select value={form.startTime} onChange={(e) => setField("startTime", e.target.value)} className="input">
                  {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel required>End time</FieldLabel>
                <select value={form.endTime} onChange={(e) => setField("endTime", e.target.value)} className="input">
                  {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        <div>
          <FieldLabel required hint="Helps vendors prepare staffing and stock.">
            Expected attendees
          </FieldLabel>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none">{Icons.people}</span>
            <input
              type="number"
              min="1"
              value={form.attendees}
              onChange={(e) => setField("attendees", e.target.value)}
              placeholder="e.g. 250"
              className="input pl-9"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="w-full text-left px-4 py-3 rounded-xl border border-dashed border-[var(--violet-200)] bg-[var(--violet-50)]/40 hover:border-[var(--violet-300)] hover:bg-[var(--violet-50)] transition-all"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--gray-800)]">
                {showMore ? "Hide extra details" : "Add more details (optional)"}
              </p>
              <p className="text-xs text-[var(--gray-500)] mt-1 leading-relaxed">
                Strongly recommended — the more vendors know (power, parking, age group, etc.), the faster they reply and the less back-and-forth after booking. You can also fill this in later; we&apos;ll remind you until it&apos;s done.
              </p>
            </div>
            <span className={`text-[var(--violet-500)] flex-shrink-0 transition-transform ${showMore ? "rotate-90" : ""}`}>{Icons.next}</span>
          </div>
        </button>

        {showMore && (
          <div className="space-y-5 pt-1 pb-2">
            <OptionalDetailsFields form={form} setField={setField} />

            {showPerDay && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel>Load times per day</FieldLabel>
                  <button type="button" onClick={applyLoadTimesToAll} className="text-xs font-semibold text-[var(--violet-600)] underline underline-offset-2">
                    Same times every day
                  </button>
                </div>
                {dailySchedule.map((day) => (
                  <div key={day.date} className="p-4 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)]">
                    <p className="text-xs font-bold text-[var(--gray-600)] uppercase tracking-wide mb-3">{fmtDayLabel(day.date)}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>Load-in</FieldLabel>
                        <select value={day.vendorLoadIn} onChange={(e) => updateDay(day.date, "vendorLoadIn", e.target.value)} className="input">
                          <option value="">Not set</option>
                          {TIME_SLOTS.map((s) => <option key={s.value} value={s.label}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Load-out</FieldLabel>
                        <select value={day.vendorLoadOut} onChange={(e) => updateDay(day.date, "vendorLoadOut", e.target.value)} className="input">
                          <option value="">Not set</option>
                          {TIME_SLOTS.map((s) => <option key={s.value} value={s.label}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <FieldLabel hint="Public events can show on the homepage. Private stays invite-only.">
                Event visibility
              </FieldLabel>
              <ChipGroup
                value={form.isPublic ? "public" : "private"}
                onChange={(v) => setField("isPublic", v === "public")}
                options={[
                  { value: "private", label: "Private" },
                  { value: "public", label: "Public" },
                ]}
              />
            </div>
          </div>
        )}

        <ErrorBox message={error} />
      </div>
      <FooterNav
        onBack={onBack}
        onSubmit={onSave}
        submitting={submitting}
        nextLabel={submitting ? "Saving…" : "Continue to send"}
      />
    </>
  );
}

// ─── Send request (same drawer — no second page) ──────────────────────────────

function buildEventPayload(form, dailySchedule) {
  const endDate = form.isMultiDay && form.endDate ? form.endDate : form.startDate;
  const logisticsPayload = {};
  if (form.indoorOutdoor) logisticsPayload.indoor_outdoor = form.indoorOutdoor;
  if (form.accessToPower) logisticsPayload.access_to_power = form.accessToPower;
  if (form.accessToWater) logisticsPayload.access_to_water = form.accessToWater;
  if (form.parkingAvailable) logisticsPayload.parking_available = form.parkingAvailable;
  if (form.canopyAllowed) logisticsPayload.canopy_allowed = form.canopyAllowed;
  if (form.wifiAvailability) logisticsPayload.wifi_availability = form.wifiAvailability;
  if (form.securityPresence) logisticsPayload.security_presence = form.securityPresence;
  const schedulePayload =
    form.isMultiDay && dailySchedule.length > 1
      ? dailySchedule.map((d) => ({
          date: d.date,
          startDate: d.date,
          startTime: d.startTime,
          endDate: d.date,
          endTime: d.endTime,
          vendorLoadIn: d.vendorLoadIn || "",
          vendorLoadOut: d.vendorLoadOut || "",
        }))
      : [];

  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    street_address: form.streetAddress.trim(),
    location: `${form.eventCity.trim()}, ${form.eventState.toUpperCase()} ${form.eventPostalCode.trim()}`,
    start_date: `${form.startDate}T${form.startTime}:00`,
    end_date: `${endDate}T${form.endTime}:00`,
    attendees: Number(form.attendees) || 0,
    age_group: form.ageGroup,
    requires_coi: form.requiresCoi,
    status: "draft",
    is_public: form.isPublic,
    daily_schedule: schedulePayload,
    vendor_load_in: form.vendorLoadIn || null,
    vendor_load_out: form.vendorLoadOut || null,
    ...logisticsPayload,
  };
}

function buildLocalEventFromForm(form) {
  const endDate = form.isMultiDay && form.endDate ? form.endDate : form.startDate;
  return {
    id: null,
    name: form.name.trim(),
    startDate: `${form.startDate}T${form.startTime}:00`,
    endDate: `${endDate}T${form.endTime}:00`,
    location: `${form.eventCity.trim()}, ${form.eventState.toUpperCase()} ${form.eventPostalCode.trim()}`,
    streetAddress: form.streetAddress.trim(),
    attendees: Number(form.attendees) || 0,
  };
}

function SendStep({
  vendor,
  event,
  form,
  dailySchedule = [],
  setField: setEventField,
  showOptionalNudge = false,
  createdEventInFlow = false,
  sendDraft = null,
  isLoggedIn = false,
  onNeedAuth,
  onBack,
  onClose,
  router,
}) {
  const [coordinatorType, setCoordinatorType] = useState(sendDraft?.coordinatorType || "hiring_vendor");
  const [fields, setFields] = useState(sendDraft?.fields || { budget: "", vendingFee: "", tip: "" });
  const [message, setMessage] = useState(sendDraft?.message || "");
  const [messageEdited, setMessageEdited] = useState(Boolean(sendDraft?.messageEdited));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [showOptionalEditor, setShowOptionalEditor] = useState(false);
  const [savingOptional, setSavingOptional] = useState(false);
  const [optionalSaved, setOptionalSaved] = useState(false);

  useEffect(() => {
    getCoordinatorStripeAccount()
      .then((res) => setStripeConnected(res?.chargesEnabled === true))
      .catch(() => setStripeConnected(false));
  }, []);

  useEffect(() => {
    if (!messageEdited && vendor && event) {
      setMessage(buildSendMessage(vendor, event, coordinatorType, fields));
    }
  }, [vendor, event, coordinatorType, fields, messageEdited]);

  function setField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleTypeChange(type) {
    setCoordinatorType(type);
    if (type !== "hiring_vendor") setField("budget", "");
    if (type !== "charges_fees") setField("vendingFee", "");
    setMessageEdited(false);
  }

  async function saveOptionalDetails() {
    if (!event?.id || !form) return;
    setSavingOptional(true);
    setError(null);
    try {
      const logisticsPayload = {};
      if (form.indoorOutdoor) logisticsPayload.indoor_outdoor = form.indoorOutdoor;
      if (form.accessToPower) logisticsPayload.access_to_power = form.accessToPower;
      if (form.accessToWater) logisticsPayload.access_to_water = form.accessToWater;
      if (form.parkingAvailable) logisticsPayload.parking_available = form.parkingAvailable;
      if (form.canopyAllowed) logisticsPayload.canopy_allowed = form.canopyAllowed;
      if (form.wifiAvailability) logisticsPayload.wifi_availability = form.wifiAvailability;
      if (form.securityPresence) logisticsPayload.security_presence = form.securityPresence;
      await updateEvent(event.id, {
        description: form.description?.trim() || null,
        age_group: form.ageGroup,
        requires_coi: form.requiresCoi,
        vendor_load_in: form.vendorLoadIn || null,
        vendor_load_out: form.vendorLoadOut || null,
        ...logisticsPayload,
      });
      setOptionalSaved(true);
      setShowOptionalEditor(false);
    } catch (err) {
      setError(err?.message ?? "Could not save event details. You can still send, or try again.");
    } finally {
      setSavingOptional(false);
    }
  }

  async function handleSubmit() {
    if (!message.trim()) {
      setError("Please add a message before sending.");
      return;
    }

    if (!isLoggedIn) {
      onNeedAuth?.({
        vendorId: vendor.id,
        form,
        dailySchedule,
        selectedEvent: event,
        coordinatorType,
        fields,
        message: message.trim(),
        messageEdited,
        createdEventInFlow: createdEventInFlow || !event?.id,
      });
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      let eventId = event?.id;

      if (!eventId && form) {
        const eventRes = await createEvent(buildEventPayload(form, dailySchedule));
        const saved = eventRes?.event ?? eventRes;
        eventId = saved?.id;
      }

      if (!eventId) {
        throw new Error("Could not create your event. Please try again.");
      }

      // Persist optional details if they filled them on this screen but didn't tap Save
      if (showOptionalEditor && form && eventId && !isOptionalSparse(form)) {
        try {
          const logisticsPayload = {};
          if (form.indoorOutdoor) logisticsPayload.indoor_outdoor = form.indoorOutdoor;
          if (form.accessToPower) logisticsPayload.access_to_power = form.accessToPower;
          if (form.accessToWater) logisticsPayload.access_to_water = form.accessToWater;
          if (form.parkingAvailable) logisticsPayload.parking_available = form.parkingAvailable;
          if (form.canopyAllowed) logisticsPayload.canopy_allowed = form.canopyAllowed;
          if (form.wifiAvailability) logisticsPayload.wifi_availability = form.wifiAvailability;
          if (form.securityPresence) logisticsPayload.security_presence = form.securityPresence;
          await updateEvent(eventId, {
            description: form.description?.trim() || null,
            age_group: form.ageGroup,
            requires_coi: form.requiresCoi,
            vendor_load_in: form.vendorLoadIn || null,
            vendor_load_out: form.vendorLoadOut || null,
            ...logisticsPayload,
          });
        } catch {
          // Don't block sending the request if the detail save fails
        }
      }
      const payload = {
        vendor_id: vendor.id,
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
      clearBookingDraft();
      onClose();
      router.push(`/buyer-dashboard/proposals/${inquiry.id}`);
    } catch (err) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Keep nudging until details are filled — no dismiss (encourages fewer vendor Q&As later)
  const showNudge = showOptionalNudge && isOptionalSparse(form);

  const budgetCents = Math.round(Number(fields.budget || 0) * 100);
  const tipCents = Math.round(Number(fields.tip || 0) * 100);
  const { collectTax, taxRate } = vendorTaxOptions(vendor);
  const pricing = budgetCents > 0
    ? marketplaceBreakdown(budgetCents, tipCents, collectTax, taxRate)
    : null;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div className="rounded-xl border border-[var(--gray-100)] bg-[var(--gray-50)] px-4 py-3">
          <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider">Event</p>
          <p className="text-sm font-semibold text-[var(--gray-900)] mt-0.5 truncate">{event?.name}</p>
        </div>

        {showNudge && !showOptionalEditor && (
          <div className="rounded-xl border border-[var(--amber-200)] bg-[var(--amber-50)] px-4 py-3.5 space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="text-[var(--amber-600)] flex-shrink-0 mt-0.5">{Icons.warn}</span>
              <div>
                <p className="text-sm font-semibold text-[var(--amber-900)]">Add venue details before you send</p>
                <p className="text-xs text-[var(--amber-800)] mt-1 leading-relaxed">
                  Strongly recommended — power, parking, age group, insurance, and similar info help vendors reply faster and cut down back-and-forth after you book. You can also add this later from your proposal or event page.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowOptionalEditor(true)}
              className="w-full h-10 rounded-xl bg-[var(--gray-900)] text-white text-xs font-semibold hover:bg-[var(--gray-700)] transition-colors"
            >
              Add details now
            </button>
          </div>
        )}

        {optionalSaved && !isOptionalSparse(form) && (
          <div className="rounded-xl border border-[var(--mint-100)] bg-[var(--mint-50)] px-4 py-3 text-xs text-[var(--mint-700)] font-medium">
            Venue details saved — vendors will see them with your request.
          </div>
        )}

        {showOptionalEditor && form && setEventField && (
          <div className="rounded-xl border border-[var(--violet-200)] bg-white px-4 py-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-[var(--gray-900)]">Recommended event details</p>
              <p className="text-xs text-[var(--gray-500)] mt-1 leading-relaxed">
                Filling these in now means fewer questions after the booking is confirmed.
              </p>
            </div>
            <OptionalDetailsFields form={form} setField={setEventField} />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={saveOptionalDetails}
                disabled={savingOptional}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-xs font-semibold disabled:opacity-50"
              >
                {savingOptional ? "Saving…" : "Save details"}
              </button>
              <button
                type="button"
                onClick={() => setShowOptionalEditor(false)}
                className="h-10 px-4 rounded-xl border border-[var(--gray-200)] text-[var(--gray-600)] text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">I am…</p>
          {COORDINATOR_TYPES.map((type) => {
            const selected = coordinatorType === type.value;
            const locked = type.value === "charges_fees" && !stripeConnected;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => !locked && handleTypeChange(type.value)}
                className="w-full flex items-start gap-3 px-3.5 py-3 rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: selected ? "var(--violet-500)" : "var(--gray-200)",
                  background: selected ? "var(--violet-50)" : "white",
                  opacity: locked ? 0.5 : 1,
                  cursor: locked ? "not-allowed" : "pointer",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${selected ? "text-[var(--violet-800)]" : "text-[var(--gray-800)]"}`}>
                    {type.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${selected ? "text-[var(--violet-500)]" : "text-[var(--gray-400)]"}`}>
                    {locked ? "Connect Stripe to enable this option" : type.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {coordinatorType === "hiring_vendor" && (
          <div className="space-y-3">
            <div>
              <FieldLabel hint="Optional — helps the vendor tailor their offer.">Your budget (USD)</FieldLabel>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fields.budget}
                  onChange={(e) => setField("budget", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="500"
                  className="input pl-8"
                />
              </div>
            </div>
            {pricing && (
              <div className="rounded-xl bg-[var(--violet-50)] border border-[var(--violet-100)] px-4 py-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--violet-700)]">You pay (est.)</span>
                  <span className="font-bold text-[var(--violet-900)]">~{formatFee(pricing.totalChargeCents)}</span>
                </div>
                {pricing.taxCents > 0 && (
                  <p className="text-[10px] text-[var(--violet-500)]">
                    Includes {formatSalesTaxLabel(vendor)} and platform fee
                  </p>
                )}
              </div>
            )}
            <div>
              <FieldLabel hint="Optional — you can also tip later.">Tip (USD)</FieldLabel>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none">$</span>
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
            </div>
          </div>
        )}

        {coordinatorType === "charges_fees" && (
          <div>
            <FieldLabel>Fee per vendor (USD)</FieldLabel>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none">$</span>
              <input
                type="number"
                min="1"
                value={fields.vendingFee}
                onChange={(e) => setField("vendingFee", e.target.value)}
                placeholder="150"
                className="input pl-8"
              />
            </div>
          </div>
        )}

        {coordinatorType === "no_fees" && (
          <div className="px-4 py-3 rounded-xl bg-[var(--mint-50)] border border-[var(--mint-100)]">
            <p className="text-xs text-[var(--mint-700)] leading-relaxed">
              Free to vend — no fees charged through VEHNDR for this invite.
            </p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel required>Your message</FieldLabel>
            {messageEdited && (
              <button
                type="button"
                onClick={() => {
                  setMessageEdited(false);
                  setMessage(buildSendMessage(vendor, event, coordinatorType, fields));
                }}
                className="text-xs font-medium text-[var(--violet-600)]"
              >
                Regenerate
              </button>
            )}
          </div>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setMessageEdited(true);
            }}
            className="w-full rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3 text-sm text-[var(--gray-900)] leading-relaxed outline-none focus:border-[var(--violet-500)] focus:bg-white resize-none"
          />
        </div>

        <ErrorBox message={error} />
      </div>
      <FooterNav
        onBack={onBack}
        onSubmit={handleSubmit}
        submitting={submitting}
        nextLabel={submitting ? "Sending…" : "Send request"}
      />
    </>
  );
}

// ─── Auth prompt ──────────────────────────────────────────────────────────────

function AuthState({ vendor, onClose, loginRedirect }) {
  const redirect = loginRedirect || `/store/${vendor.id}?resume_booking=1`;
  const registerHref = `/register?role=coordinator&redirect=${encodeURIComponent(redirect)}`;
  const loginHref = `/login?redirect=${encodeURIComponent(redirect)}`;
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--violet-100)] to-[var(--magenta-100)] flex items-center justify-center shadow-sm">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div>
        <p className="font-bold text-[var(--gray-900)] text-lg mb-1">Create an account to send</p>
        <p className="text-sm text-[var(--gray-500)] leading-relaxed">
          Your booking details are saved. Sign up or log in to send your request to {vendor?.name || "this vendor"}.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full">
        <Link href={registerHref} className="w-full btn btn-gradient text-sm h-11 flex items-center justify-center">
          Create account
        </Link>
        <Link
          href={loginHref}
          className="w-full h-11 rounded-2xl border border-[var(--gray-200)] text-[var(--gray-700)] font-semibold text-sm flex items-center justify-center hover:bg-[var(--gray-50)] transition-colors"
        >
          Log in
        </Link>
      </div>
      <button onClick={onClose} className="text-sm text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors">
        Keep editing
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProposalModal({ vendor, isOpen, onClose, loginRedirect, resumeDraft = null }) {
  const router = useRouter();
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [step, setStep] = useState("choose");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [dailySchedule, setDailySchedule] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdEventInFlow, setCreatedEventInFlow] = useState(false);
  const [sendDraft, setSendDraft] = useState(null);
  const resumeStartedRef = useRef(false);

  const defaultTimesRef = useRef({ startTime: INITIAL_FORM.startTime, endTime: INITIAL_FORM.endTime });
  useEffect(() => {
    defaultTimesRef.current = { startTime: form.startTime, endTime: form.endTime };
  });

  useEffect(() => {
    if (!form.isMultiDay || !form.startDate || !form.endDate || form.endDate <= form.startDate) {
      setDailySchedule([]);
      return;
    }
    const dates = dateRange(form.startDate, form.endDate);
    setDailySchedule((prev) => {
      const prevMap = Object.fromEntries(prev.map((d) => [d.date, d]));
      const { startTime, endTime } = defaultTimesRef.current;
      return dates.map((date) => prevMap[date] ?? { date, startTime, endTime, vendorLoadIn: "", vendorLoadOut: "" });
    });
  }, [form.isMultiDay, form.startDate, form.endDate]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isLoggedIn) {
      setMyEvents([]);
      setLoadingEvents(false);
      return;
    }
    setLoadingEvents(true);
    getMyEvents()
      .then((data) => setMyEvents(Array.isArray(data) ? data : []))
      .catch(() => setMyEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [isOpen, isLoggedIn]);

  useEffect(() => {
    if (!isOpen) {
      setStep("choose");
      setSelectedEvent(null);
      setForm(INITIAL_FORM);
      setDailySchedule([]);
      setError(null);
      setAuthGateOpen(false);
      setCreatedEventInFlow(false);
      setSendDraft(null);
      resumeStartedRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !resumeDraft || resumeStartedRef.current) return;
    if (!isLoggedIn) return;
    if (String(resumeDraft.vendorId) !== String(vendor?.id)) return;

    resumeStartedRef.current = true;
    const restoredForm = { ...INITIAL_FORM, ...(resumeDraft.form || {}) };
    setForm(restoredForm);
    setDailySchedule(Array.isArray(resumeDraft.dailySchedule) ? resumeDraft.dailySchedule : []);
    setSelectedEvent(resumeDraft.selectedEvent || null);
    setCreatedEventInFlow(Boolean(resumeDraft.createdEventInFlow));
    setSendDraft({
      coordinatorType: resumeDraft.coordinatorType || "hiring_vendor",
      fields: resumeDraft.fields || { budget: "", vendingFee: "", tip: "" },
      message: resumeDraft.message || "",
      messageEdited: Boolean(resumeDraft.messageEdited),
    });
    setStep("send");
    setAuthGateOpen(false);
  }, [isOpen, resumeDraft, vendor?.id, isLoggedIn]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleImportUrl(url) {
    let res = null;
    try {
      res = await api("/api/events/parse_url", { method: "POST", body: { url } });
    } catch (err) {
      setError(err?.message || "Couldn’t read that event link. Try creating the event manually.");
      setSelectedEvent(null);
      setStep("create");
      return;
    }

    const startDate = res?.startDate ? res.startDate.split("T")[0] : "";
    const endDate   = res?.endDate   ? res.endDate.split("T")[0]   : startDate;
    const startTime = res?.startDate?.includes("T") ? res.startDate.split("T")[1].substring(0, 5) : "18:00";
    const endTime   = res?.endDate?.includes("T")   ? res.endDate.split("T")[1].substring(0, 5)   : "22:00";

    // Pre-populate form with whatever was extracted
    if (res?.name) {
      setForm((prev) => ({
        ...prev,
        name:          res.name        || prev.name,
        description:   res.description || prev.description,
        streetAddress: res.location    || prev.streetAddress,
        startDate:     startDate       || prev.startDate,
        endDate:       endDate         || prev.endDate,
        startTime:     res.startDate?.includes("T") ? startTime : prev.startTime,
        endTime:       res.endDate?.includes("T")   ? endTime   : prev.endTime,
        attendees:     res.attendees > 0 ? String(res.attendees) : prev.attendees,
        isMultiDay:    !!(res.endDate && res.startDate && endDate !== startDate),
      }));
      setError(null);
    } else {
      setError("Couldn’t pull details from that link. Fill in the event manually — or double-check it’s a public Partiful/Luma/Eventbrite page.");
    }

    // Open the single event form so the user can review/fill in what's missing
    setSelectedEvent(null);
    setStep("create");
  }

  function validateCreateForm() {
    if (!form.name.trim()) { setError("Event name is required."); return false; }
    if (!form.streetAddress.trim()) { setError("Please enter the event address."); return false; }
    if (!form.eventCity.trim() || !form.eventState || !/^\d{5}(-\d{4})?$/.test(form.eventPostalCode.trim())) {
      setError("Pick an address from the suggestions so city, state, and ZIP fill in automatically.");
      return false;
    }
    if (!form.startDate) { setError("Please pick a start date."); return false; }
    if (form.isMultiDay && !form.endDate) { setError("Please pick an end date for your multi-day event."); return false; }
    if (!form.attendees || Number(form.attendees) < 1) { setError("Please enter the expected number of attendees."); return false; }
    return true;
  }

  function handleContinueExisting() {
    setError(null);
    setCreatedEventInFlow(false);
    setStep("send");
  }

  function continueAsGuestWithLocalEvent() {
    setSelectedEvent(buildLocalEventFromForm(form));
    setCreatedEventInFlow(true);
    setStep("send");
  }

  async function handleSaveEvent() {
    setError(null);

    // Guests keep details local until the final send (account required then).
    if (!isLoggedIn) {
      continueAsGuestWithLocalEvent();
      return;
    }

    setSubmitting(true);
    try {
      const endDate = form.isMultiDay && form.endDate ? form.endDate : form.startDate;
      const eventRes = await createEvent(buildEventPayload(form, dailySchedule));
      const saved = eventRes?.event ?? eventRes;
      const eventId = saved?.id;
      setSelectedEvent({
        id: eventId,
        name: saved?.name || form.name.trim(),
        startDate: saved?.startDate || saved?.start_date || `${form.startDate}T${form.startTime}:00`,
        endDate: saved?.endDate || saved?.end_date || `${endDate}T${form.endTime}:00`,
        location: saved?.location || `${form.eventCity.trim()}, ${form.eventState.toUpperCase()} ${form.eventPostalCode.trim()}`,
        streetAddress: saved?.streetAddress || saved?.street_address || form.streetAddress.trim(),
        attendees: saved?.attendees ?? (Number(form.attendees) || 0),
      });
      setCreatedEventInFlow(true);
      setStep("send");
    } catch (err) {
      // Stale/expired login cookie: keep going locally, ask for account at send.
      if (isUnauthorizedError(err)) {
        continueAsGuestWithLocalEvent();
        return;
      }
      setError(err?.message ?? "Failed to save your event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNeedAuth(draft) {
    saveBookingDraft(draft);
    setAuthGateOpen(true);
  }

  if (!isOpen) return null;

  const marketplaceBookable = isVendorMarketplaceBookable(vendor);
  const vendorInitial = vendor?.name?.charAt(0)?.toUpperCase() || "V";
  const headerTitle =
    step === "choose"
      ? "Which event is this for?"
      : STEP_META[step]?.title ?? "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in-overlay"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative flex flex-col w-full sm:w-[440px] h-full bg-[var(--surface)] shadow-2xl animate-slide-in-right">

        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-[var(--gray-100)]">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm"
              style={{ background: "var(--gradient-vendor)" }}
            >
              {vendorInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider truncate">{vendor?.name}</p>
              <h2 className="text-base font-bold text-[var(--gray-900)] leading-tight truncate mt-0.5">{headerTitle}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors flex-shrink-0 text-[var(--gray-400)] hover:text-[var(--gray-700)]"
              aria-label="Close"
            >
              {Icons.close}
            </button>
          </div>

          {(step === "create" || step === "send") && (
            <p className="text-xs text-[var(--gray-400)] mt-3">{STEP_META[step]?.subtitle}</p>
          )}
        </div>

        {/* Step content */}
        <div className="flex flex-col flex-1 min-h-0">
          {!marketplaceBookable ? (
            <MarketplaceComingSoonPanel onClose={onClose} />
          ) : authGateOpen ? (
            <AuthState
              vendor={vendor}
              onClose={() => setAuthGateOpen(false)}
              loginRedirect={
                loginRedirect
                  ? `${loginRedirect}${loginRedirect.includes("?") ? "&" : "?"}resume_booking=1`
                  : `/store/${vendor.id}?resume_booking=1`
              }
            />
          ) : step === "choose" ? (
            <ChooseStep
              myEvents={myEvents}
              loadingEvents={loadingEvents}
              selectedEvent={selectedEvent}
              onSelect={setSelectedEvent}
              onCreateNew={() => { setSelectedEvent(null); setStep("create"); }}
              onContinue={handleContinueExisting}
              onImportUrl={handleImportUrl}
            />
          ) : step === "create" ? (
            <EventForm
              form={form}
              setField={setField}
              dailySchedule={dailySchedule}
              setDailySchedule={setDailySchedule}
              onBack={() => { setError(null); setStep("choose"); }}
              onSave={() => {
                setError(null);
                if (!validateCreateForm()) return;
                handleSaveEvent();
              }}
              submitting={submitting}
              error={error}
            />
          ) : step === "send" ? (
            <SendStep
              key={sendDraft ? "resumed" : "fresh"}
              vendor={vendor}
              event={selectedEvent}
              form={form}
              dailySchedule={dailySchedule}
              setField={setField}
              showOptionalNudge={createdEventInFlow && isOptionalSparse(form)}
              createdEventInFlow={createdEventInFlow}
              sendDraft={sendDraft}
              isLoggedIn={isLoggedIn}
              onNeedAuth={handleNeedAuth}
              onBack={() => {
                setError(null);
                setStep(createdEventInFlow ? "create" : "choose");
              }}
              onClose={onClose}
              router={router}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
