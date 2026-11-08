"use client";

import { useRef, useState } from "react";
import { US_STATE_OPTIONS } from "../utils/salesTaxRates";

const STATE_NAME_TO_VALUE = US_STATE_OPTIONS.reduce((acc, opt) => {
  acc[opt.label.toLowerCase()] = opt.value;
  acc[opt.value] = opt.value;
  return acc;
}, {});

function normalizeStateCode(stateName) {
  if (!stateName) return "";
  const trimmed = stateName.trim();
  if (trimmed.length === 2) {
    const lower = trimmed.toLowerCase();
    if (US_STATE_OPTIONS.some((o) => o.value === lower)) return lower;
  }
  return STATE_NAME_TO_VALUE[trimmed.toLowerCase()] || "";
}

function parseNominatimItem(item) {
  const a = item.address || {};
  const line1 = [a.house_number, a.road].filter(Boolean).join(" ");
  const city = a.city || a.town || a.village || a.county || "";
  const eventState = normalizeStateCode(a.state) || "tx";
  const eventPostalCode = (a.postcode || "").replace(/\D.*$/, "").slice(0, 5);
  const display = [line1, city, a.state, eventPostalCode].filter(Boolean).join(", ");

  return {
    display: display || item.display_name,
    streetAddress: line1,
    eventCity: city,
    eventState,
    eventPostalCode,
  };
}

const PinIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

/**
 * US address typeahead (OpenStreetMap Nominatim).
 * onStructuredSelect fills city / state / ZIP when user picks a suggestion.
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onStructuredSelect,
  placeholder = "Start typing your street address...",
  autoFocus = false,
  className = "",
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  function handleInput(e) {
    const v = e.target.value;
    onChange(v);
    clearTimeout(timerRef.current);
    if (v.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(v)}&addressdetails=1&limit=5&countrycodes=us`,
          { headers: { "Accept-Language": "en-US" } }
        );
        const data = await res.json();
        const parsed = (data || []).map(parseNominatimItem).filter((p) => p.display);
        setSuggestions(parsed);
        setOpen(parsed.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 350);
  }

  function pick(item) {
    onChange(item.streetAddress || item.display);
    onStructuredSelect?.({
      streetAddress: item.streetAddress,
      eventCity: item.eventCity,
      eventState: item.eventState,
      eventPostalCode: item.eventPostalCode,
    });
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none z-10">
        {PinIcon}
      </span>
      <input
        type="text"
        value={value}
        onChange={handleInput}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="input pl-9"
        autoFocus={autoFocus}
        autoComplete="street-address"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-[var(--gray-200)] overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((item, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => pick(item)}
                className="w-full text-left px-4 py-2.5 text-sm text-[var(--gray-700)] hover:bg-[var(--violet-50)] flex items-start gap-2.5 border-b border-[var(--gray-100)] last:border-0"
              >
                <span className="mt-0.5 flex-shrink-0 text-[var(--violet-400)]">{PinIcon}</span>
                <span className="leading-snug">{item.display}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
