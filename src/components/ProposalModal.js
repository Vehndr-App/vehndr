"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createEvent, getMyEvents } from "../services/events";
import { api } from "../services/api";

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
  1: { title: "About Your Event",    subtitle: "Give the vendor context on what you're organizing." },
  2: { title: "Venue & Location",    subtitle: "Where will this event take place?" },
  3: { title: "Date & Time",         subtitle: "When is the event happening?" },
  4: { title: "Your Audience",       subtitle: "Help vendors understand who they'll be serving." },
  5: { title: "Venue Setup",         subtitle: "Help vendors prepare for the space and logistics." },
};

const INITIAL_FORM = {
  importUrl: "",
  name: "",
  description: "",
  streetAddress: "",
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
      return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return null; }
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
                                {fmt(event.startDate || event.start_date)}
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
                  Walk through a quick setup — takes about 2 minutes
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

// ─── Step 1: Name & Description ───────────────────────────────────────────────

const PLATFORM_PILLS = [
  { label: "Luma",       hint: "lu.ma/…",         color: "bg-[#f0f4ff] text-[#4361ee] hover:bg-[#e0e8ff]" },
  { label: "Eventbrite", hint: "eventbrite.com/…", color: "bg-[#fff5f0] text-[#f05537] hover:bg-[#ffe8e2]" },
  { label: "Partiful",   hint: "partiful.com/…",   color: "bg-[#f5f0ff] text-[#7c3aed] hover:bg-[#ede8ff]" },
];

function Step1({ form, setField, importing, onImport, onNext, onBack, error }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Import section */}
        <div className="rounded-2xl border border-[var(--gray-200)] overflow-hidden">
          <div className="px-4 pt-4 pb-3 bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[var(--violet-600)]">{Icons.link}</span>
              <p className="text-xs font-bold text-[var(--gray-700)] uppercase tracking-wider">Import from a platform</p>
            </div>
            <p className="text-xs text-[var(--gray-400)]">Paste your event link and we&apos;ll fill in the details.</p>
            <div className="flex gap-1.5 mt-2.5">
              {PLATFORM_PILLS.map((p) => (
                <span key={p.label} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${p.color}`}>
                  {p.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 p-3 bg-white">
            <input
              type="url"
              value={form.importUrl}
              onChange={(e) => setField("importUrl", e.target.value)}
              placeholder="https://lu.ma/your-event"
              className="input flex-1 text-sm h-10 rounded-lg"
            />
            <button
              type="button"
              onClick={onImport}
              disabled={importing || !form.importUrl.trim()}
              className="h-10 px-4 rounded-lg bg-[var(--gray-900)] text-white text-sm font-semibold hover:bg-[var(--gray-700)] transition-colors disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
            >
              {importing
                ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><span>{Icons.spark}</span> Import</>
              }
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--gray-200)]" />
          <span className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">or enter manually</span>
          <div className="flex-1 h-px bg-[var(--gray-200)]" />
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <FieldLabel required>Event name</FieldLabel>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Summer Product Launch 2025"
              className="input"
              autoFocus
            />
          </div>
          <div>
            <FieldLabel hint="Optional — helps vendors understand the vibe and what to prepare.">
              Event description
            </FieldLabel>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Tell vendors what makes this event special…"
              className="w-full rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3 text-sm text-[var(--gray-900)] leading-relaxed placeholder:text-[var(--gray-400)] outline-none focus:border-[var(--violet-500)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)] transition-all resize-none"
            />
          </div>
        </div>

        <ErrorBox message={error} />
      </div>
      <FooterNav onBack={onBack} onNext={onNext} />
    </>
  );
}

// ─── AddressAutocomplete ──────────────────────────────────────────────────────

function AddressAutocomplete({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  function handleInput(e) {
    const v = e.target.value;
    onChange(v);
    clearTimeout(timerRef.current);
    if (v.length < 3) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(v)}&addressdetails=1&limit=5&countrycodes=us`,
          { headers: { "Accept-Language": "en-US" } }
        );
        const data = await res.json();
        const formatted = data.map((item) => {
          const a = item.address;
          return [
            [a.house_number, a.road].filter(Boolean).join(" "),
            a.city || a.town || a.village || a.county,
            a.state,
            a.postcode,
          ].filter(Boolean).join(", ");
        }).filter(Boolean);
        setSuggestions(formatted);
        setOpen(formatted.length > 0);
      } catch {
        setSuggestions([]); setOpen(false);
      }
    }, 350);
  }

  function pick(s) {
    onChange(s);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none z-10">
        {Icons.pin}
      </span>
      <input
        type="text"
        value={value}
        onChange={handleInput}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="e.g. 1234 Main St, Los Angeles, CA 90012"
        className="input pl-9"
        autoFocus
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[var(--gray-200)] overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => pick(s)}
                className="w-full text-left px-4 py-2.5 text-sm text-[var(--gray-700)] hover:bg-[var(--violet-50)] flex items-start gap-2.5 border-b border-[var(--gray-100)] last:border-0"
              >
                <span className="mt-0.5 flex-shrink-0 text-[var(--violet-400)]">{Icons.pin}</span>
                <span className="leading-snug">{s}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Step 2: Address ──────────────────────────────────────────────────────────

function Step2({ form, setField, onNext, onBack, error }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div>
          <FieldLabel required hint="Include street, city, and state so vendors can plan travel and delivery.">
            Venue address
          </FieldLabel>
          <AddressAutocomplete
            value={form.streetAddress}
            onChange={(v) => setField("streetAddress", v)}
          />
        </div>

        <ErrorBox message={error} />
      </div>
      <FooterNav onBack={onBack} onNext={onNext} />
    </>
  );
}

// ─── Step 3: Date & Time ──────────────────────────────────────────────────────

function Step3({ form, setField, dailySchedule, setDailySchedule, onNext, onBack, error }) {
  const [scheduleError, setScheduleError] = useState(null);

  const showPerDay = form.isMultiDay && form.startDate && form.endDate && dailySchedule.length > 1;

  function updateDay(date, field, value) {
    setDailySchedule((prev) => prev.map((d) => d.date === date ? { ...d, [field]: value } : d));
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

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div className="space-y-4">
          <div>
            <FieldLabel required>Event date</FieldLabel>
            <input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} className="input" />
          </div>

          {/* Multi-day toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-200)]">
            <div>
              <p className="text-sm font-semibold text-[var(--gray-800)]">Multi-day event</p>
              <p className="text-xs text-[var(--gray-400)] mt-0.5">This event spans more than one calendar day</p>
            </div>
            <Toggle checked={form.isMultiDay} onChange={(v) => setField("isMultiDay", v)} />
          </div>

          {form.isMultiDay && (
            <div>
              <FieldLabel required>End date</FieldLabel>
              <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setField("endDate", e.target.value)} className="input" />
            </div>
          )}

          {/* Times — per day when multi-day, single pair otherwise */}
          {showPerDay ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--gray-800)]">Hours per day</p>
                <button
                  type="button"
                  onClick={applyAllHours}
                  className="text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-800)] underline underline-offset-2 transition-colors flex-shrink-0"
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
                      <FieldLabel required>Start time</FieldLabel>
                      <select value={day.startTime} onChange={(e) => updateDay(day.date, "startTime", e.target.value)} className="input">
                        {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel required>End time</FieldLabel>
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

        <ErrorBox message={error} />
      </div>
      <FooterNav onBack={onBack} onNext={onNext} />
    </>
  );
}

// ─── Step 4: Audience ─────────────────────────────────────────────────────────

function Step4({ form, setField, onSave, onBack, error, submitting, nextLabel }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div className="space-y-4">
          <div>
            <FieldLabel required hint="This helps vendors prepare the right stock and staffing levels.">
              Expected number of attendees
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
                autoFocus
              />
            </div>
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

          {/* COI toggle */}
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
                Vendors will need to provide proof of liability insurance to participate.
              </p>
            </div>
            <Toggle checked={form.requiresCoi} onChange={(v) => setField("requiresCoi", v)} />
          </div>
        </div>

        <ErrorBox message={error} />
      </div>
      <FooterNav
        onBack={onBack}
        onSubmit={onSave}
        submitting={submitting}
        nextLabel={nextLabel ?? (submitting ? "Saving…" : "Save & Continue")}
      />
    </>
  );
}

// ─── Step 5: Venue logistics ──────────────────────────────────────────────────

const CHIP_YES_NO       = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const CHIP_YES_NO_LTD   = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "limited", label: "Limited" }];
const CHIP_INDOOR_OUT   = [{ value: "indoor", label: "Indoor" }, { value: "outdoor", label: "Outdoor" }, { value: "both", label: "Both" }];

function Step5({ form, setField, dailySchedule, setDailySchedule, onSave, onBack, error, submitting }) {
  const showPerDay = form.isMultiDay && dailySchedule.length > 1;

  function updateDay(date, field, value) {
    setDailySchedule((prev) => prev.map((d) => d.date === date ? { ...d, [field]: value } : d));
  }

  function applyLoadTimesToAll() {
    const first = dailySchedule[0];
    if (!first) return;
    setDailySchedule((prev) => prev.map((d) => ({
      ...d,
      vendorLoadIn: first.vendorLoadIn,
      vendorLoadOut: first.vendorLoadOut,
    })));
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <p className="text-xs text-[var(--gray-400)] leading-relaxed">
          All optional — fill in what you know so vendors can plan ahead. You can update these later.
        </p>

        {/* Indoor / outdoor */}
        <div>
          <FieldLabel hint="Will vendors be set up inside, outside, or both?">Indoor or outdoor?</FieldLabel>
          <ChipGroup value={form.indoorOutdoor} onChange={(v) => setField("indoorOutdoor", v)} options={CHIP_INDOOR_OUT} />
        </div>

        {/* Power + Water */}
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

        {/* Parking + Canopy */}
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

        {/* WiFi + Security */}
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

        {/* Vendor Load-In / Load-Out */}
        {showPerDay ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel hint="When can vendors load in and out each day?">Load times per day</FieldLabel>
              <button
                type="button"
                onClick={applyLoadTimesToAll}
                className="text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-800)] underline underline-offset-2 transition-colors flex-shrink-0"
              >
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
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel hint="When can vendors begin setting up?">Vendor load-in</FieldLabel>
              <select value={form.vendorLoadIn} onChange={(e) => setField("vendorLoadIn", e.target.value)} className="input">
                <option value="">Not set</option>
                {TIME_SLOTS.map((s) => <option key={s.value} value={s.label}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel hint="When must vendors be fully packed out?">Vendor load-out</FieldLabel>
              <select value={form.vendorLoadOut} onChange={(e) => setField("vendorLoadOut", e.target.value)} className="input">
                <option value="">Not set</option>
                {TIME_SLOTS.map((s) => <option key={s.value} value={s.label}>{s.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Public / Private visibility */}
        <div
          className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--gray-200)] cursor-pointer select-none"
          onClick={() => setField("isPublic", !form.isPublic)}
        >
          <div>
            <p className="text-sm font-semibold text-[var(--gray-900)]">
              {form.isPublic ? "Public event" : "Private event"}
            </p>
            <p className="text-xs text-[var(--gray-400)] mt-0.5 leading-relaxed">
              {form.isPublic
                ? "Vendors can discover this event on the homepage."
                : "Only vendors you invite will see this event."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.isPublic}
            className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
              form.isPublic ? "bg-[var(--violet-600)]" : "bg-[var(--gray-300)]"
            }`}
            onClick={(e) => { e.stopPropagation(); setField("isPublic", !form.isPublic); }}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
              form.isPublic ? "translate-x-5" : "translate-x-0"
            }`} />
          </button>
        </div>

        <ErrorBox message={error} />
      </div>
      <FooterNav
        onBack={onBack}
        onSubmit={onSave}
        submitting={submitting}
        nextLabel={submitting ? "Saving…" : "Save & Continue"}
      />
    </>
  );
}

// ─── Auth prompt ──────────────────────────────────────────────────────────────

function AuthState({ vendor, onClose, router }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--violet-100)] to-[var(--magenta-100)] flex items-center justify-center shadow-sm">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div>
        <p className="font-bold text-[var(--gray-900)] text-lg mb-1">Sign in to continue</p>
        <p className="text-sm text-[var(--gray-500)] leading-relaxed">
          You need an account to submit proposals and contact vendors.
        </p>
      </div>
      <button
        onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/store/${vendor.id}`)}`)}
        className="w-full btn btn-gradient text-sm h-11"
      >
        Log in or Sign up
      </button>
      <button onClick={onClose} className="text-sm text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors">
        Maybe later
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProposalModal({ vendor, isOpen, onClose }) {
  const router = useRouter();

  const [needsAuth, setNeedsAuth] = useState(false);
  const [step, setStep] = useState("choose");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [dailySchedule, setDailySchedule] = useState([]);
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
    const token = typeof window !== "undefined" ? window.localStorage?.getItem("vehndr_token") : null;
    setNeedsAuth(!token);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || needsAuth) return;
    setLoadingEvents(true);
    getMyEvents()
      .then((data) => setMyEvents(Array.isArray(data) ? data : []))
      .catch(() => setMyEvents([]))
      .finally(() => setLoadingEvents(false));
  }, [isOpen, needsAuth]);

  useEffect(() => {
    if (!isOpen) {
      setStep("choose");
      setSelectedEvent(null);
      setForm(INITIAL_FORM);
      setDailySchedule([]);
      setError(null);
      setNeedsAuth(false);
    }
  }, [isOpen]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleImportUrl(url) {
    let res = null;
    try {
      res = await api("/api/events/parse_url", { method: "POST", body: { url } });
    } catch {
      // Scraping failed — fall through to manual form
    }

    const startDate = res?.startDate ? res.startDate.split("T")[0] : "";
    const endDate   = res?.endDate   ? res.endDate.split("T")[0]   : startDate;
    const startTime = res?.startDate?.includes("T") ? res.startDate.split("T")[1].substring(0, 5) : "18:00";
    const endTime   = res?.endDate?.includes("T")   ? res.endDate.split("T")[1].substring(0, 5)   : "22:00";

    // Pre-populate form with whatever was extracted
    if (res) {
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
    }

    // Always go to step 1 so the user can review/fill in what's missing
    setSelectedEvent(null);
    setStep(1);
  }

  async function handleImport() {
    if (!form.importUrl.trim()) return;
    setImporting(true);
    setError(null);
    try {
      const res = await api("/api/events/parse_url", { method: "POST", body: { url: form.importUrl.trim() } });
      setForm((prev) => ({
        ...prev,
        name: res.name || prev.name,
        description: res.description || prev.description,
        streetAddress: res.location || prev.streetAddress,
        startDate: res.startDate ? res.startDate.split("T")[0] : prev.startDate,
        endDate: res.endDate ? res.endDate.split("T")[0] : prev.endDate,
        startTime: res.startDate?.includes("T") ? res.startDate.split("T")[1].substring(0, 5) : prev.startTime,
        endTime: res.endDate?.includes("T") ? res.endDate.split("T")[1].substring(0, 5) : prev.endTime,
        attendees: res.attendees > 0 ? String(res.attendees) : prev.attendees,
        isMultiDay: !!(res.endDate && res.startDate && res.endDate.split("T")[0] !== res.startDate.split("T")[0]),
      }));
    } catch (err) {
      setError(err?.message ?? "Could not import event details. Please fill in manually.");
    } finally {
      setImporting(false);
    }
  }

  function validateStep() {
    switch (step) {
      case 1:
        if (!form.name.trim()) { setError("Event name is required."); return false; }
        return true;
      case 2:
        if (!form.streetAddress.trim()) { setError("Please enter your venue address."); return false; }
        return true;
      case 3:
        if (!form.startDate) { setError("Please pick a start date."); return false; }
        if (form.isMultiDay && !form.endDate) { setError("Please pick an end date for your multi-day event."); return false; }
        return true;
      case 4:
        if (!form.attendees || Number(form.attendees) < 1) { setError("Please enter the expected number of attendees."); return false; }
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  }

  function next() {
    setError(null);
    if (!validateStep()) return;
    setStep((s) => (typeof s === "number" ? s + 1 : s));
  }

  function back() {
    setError(null);
    if (step === 1) setStep("choose");
    else if (typeof step === "number") setStep((s) => s - 1);
  }

  function handleContinueExisting() {
    onClose();
    router.push(`/buyer-dashboard/proposals/new?vendor_id=${vendor.id}&event_id=${selectedEvent.id}`);
  }

  async function handleSaveEvent() {
    setError(null);
    setSubmitting(true);
    try {
      const endDate = form.isMultiDay && form.endDate ? form.endDate : form.startDate;
      const logisticsPayload = {};
      if (form.indoorOutdoor)    logisticsPayload.indoor_outdoor    = form.indoorOutdoor;
      if (form.accessToPower)    logisticsPayload.access_to_power   = form.accessToPower;
      if (form.accessToWater)    logisticsPayload.access_to_water   = form.accessToWater;
      if (form.parkingAvailable) logisticsPayload.parking_available = form.parkingAvailable;
      if (form.canopyAllowed)    logisticsPayload.canopy_allowed    = form.canopyAllowed;
      if (form.wifiAvailability) logisticsPayload.wifi_availability = form.wifiAvailability;
      if (form.securityPresence) logisticsPayload.security_presence = form.securityPresence;
      const schedulePayload = form.isMultiDay && dailySchedule.length > 1
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
      const eventRes = await createEvent({
        name: form.name.trim(),
        description: form.description.trim() || null,
        location: form.streetAddress.trim(),
        street_address: form.streetAddress.trim(),
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
      });
      const eventId = eventRes?.event?.id ?? eventRes?.id;
      onClose();
      router.push(`/buyer-dashboard/proposals/new?vendor_id=${vendor.id}&event_id=${eventId}`);
    } catch (err) {
      setError(err?.message ?? "Failed to save your event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const vendorInitial = vendor?.name?.charAt(0)?.toUpperCase() || "V";
  const isNumberStep = typeof step === "number";
  const progress = isNumberStep ? step / 5 : 0;
  const headerTitle = step === "choose" ? "Which event is this for?" : STEP_META[step]?.title ?? "";

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

          {/* Step progress */}
          {isNumberStep && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`h-1 rounded-full transition-all duration-500 ${
                        n < step
                          ? "bg-[var(--violet-600)] w-6"
                          : n === step
                          ? "bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-500)] w-8"
                          : "bg-[var(--gray-200)] w-6"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-bold text-[var(--gray-400)]">
                  {step} <span className="font-normal">of</span> 5
                </span>
              </div>
              <p className="text-xs text-[var(--gray-400)]">{STEP_META[step]?.subtitle}</p>
            </div>
          )}
        </div>

        {/* Step content (each step owns its own scroll + footer) */}
        <div className="flex flex-col flex-1 min-h-0">
          {needsAuth ? (
            <AuthState vendor={vendor} onClose={onClose} router={router} />
          ) : step === "choose" ? (
            <ChooseStep
              myEvents={myEvents}
              loadingEvents={loadingEvents}
              selectedEvent={selectedEvent}
              onSelect={setSelectedEvent}
              onCreateNew={() => { setSelectedEvent(null); setStep(1); }}
              onContinue={handleContinueExisting}
              onImportUrl={handleImportUrl}
            />
          ) : step === 1 ? (
            <Step1 form={form} setField={setField} importing={importing} onImport={handleImport} onNext={next} onBack={back} error={error} />
          ) : step === 2 ? (
            <Step2 form={form} setField={setField} onNext={next} onBack={back} error={error} />
          ) : step === 3 ? (
            <Step3 form={form} setField={setField} dailySchedule={dailySchedule} setDailySchedule={setDailySchedule} onNext={next} onBack={back} error={error} />
          ) : step === 4 ? (
            <Step4 form={form} setField={setField} onSave={next} onBack={back} error={error} submitting={false} nextLabel="Continue" />
          ) : step === 5 ? (
            <Step5 form={form} setField={setField} dailySchedule={dailySchedule} setDailySchedule={setDailySchedule} onSave={handleSaveEvent} onBack={back} error={error} submitting={submitting} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
