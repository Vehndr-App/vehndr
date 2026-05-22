"use client";

import { useMemo, useRef, useState } from "react";
import {
  geolocationErrorMessage,
  getCurrentLocationString,
  searchLocationSuggestions
} from "../../utils/reverseGeocode";

export default function LocationField({
  value,
  onChange,
  radiusMiles = "",
  onRadiusChange,
  variant = "default",
  label = "Location",
  placeholder = "City, State or ZIP"
}) {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [radiusMode, setRadiusMode] = useState("custom");
  const suggestionAbortRef = useRef(null);
  const radiusValue = useMemo(() => {
    const numeric = Number(radiusMiles);
    if (!Number.isFinite(numeric) || numeric <= 0) return 25;
    return Math.max(1, Math.min(100, Math.round(numeric)));
  }, [radiusMiles]);

  const handleUseMyLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const locationString = await getCurrentLocationString();
      onChange(locationString);
    } catch (err) {
      setError(geolocationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLocationInput = async (nextValue) => {
    onChange(nextValue);
    setError(null);

    if (suggestionAbortRef.current) {
      suggestionAbortRef.current.abort();
      suggestionAbortRef.current = null;
    }

    const query = String(nextValue || "").trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    suggestionAbortRef.current = controller;
    setSearching(true);

    try {
      const results = await searchLocationSuggestions(query, { signal: controller.signal });
      setSuggestions(results);
    } catch (err) {
      if (err?.name !== "AbortError") {
        setSuggestions([]);
      }
    } finally {
      if (suggestionAbortRef.current === controller) {
        suggestionAbortRef.current = null;
      }
      setSearching(false);
    }
  };

  const isOnboarding = variant === "onboarding";

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[var(--gray-700)]">{label}</label>
      <div className="space-y-2">
        <div className={`flex gap-2 ${isOnboarding ? "flex-col sm:flex-row" : ""}`}>
          <div className="relative flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => handleLocationInput(e.target.value)}
              className={`input w-full ${isOnboarding ? "text-base py-3" : ""}`}
              placeholder={placeholder}
            />
            {(searching || suggestions.length > 0) && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white shadow-[var(--shadow-card)] max-h-52 overflow-y-auto">
                {searching ? (
                  <div className="px-3 py-2 text-sm text-[var(--gray-500)]">Searching locations...</div>
                ) : (
                  suggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.label}-${suggestion.latitude}-${suggestion.longitude}`}
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--gray-50)]"
                      onClick={() => {
                        onChange(suggestion.label);
                        setSuggestions([]);
                      }}
                    >
                      {suggestion.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={loading}
            className={`btn btn-secondary whitespace-nowrap ${isOnboarding ? "w-full sm:w-auto" : ""}`}
          >
            {loading ? "Locating…" : (
              <>
                <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Use my location
              </>
            )}
          </button>
        </div>
        {onRadiusChange ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-500)]">
              Service radius
            </p>
            <button
              type="button"
              className="w-full flex items-start justify-between text-left"
              onClick={() => {
                setRadiusMode("suggested");
                onRadiusChange("");
              }}
            >
              <span>
                <span className="block text-sm font-semibold text-[var(--gray-900)]">Suggested local radius</span>
                <span className="block text-sm text-[var(--gray-500)]">Show me listings from this general area.</span>
              </span>
              <span
                className={`mt-1 h-5 w-5 rounded-full border-2 ${
                  radiusMode === "suggested"
                    ? "border-[var(--violet-600)]"
                    : "border-[var(--gray-300)]"
                }`}
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              className="w-full flex items-start justify-between text-left"
              onClick={() => {
                setRadiusMode("custom");
                if (!radiusMiles) onRadiusChange("25");
              }}
            >
              <span>
                <span className="block text-sm font-semibold text-[var(--gray-900)]">Custom local radius</span>
                <span className="block text-sm text-[var(--gray-500)]">Only show listings within a specific distance.</span>
              </span>
              <span
                className={`mt-1 h-5 w-5 rounded-full border-2 ${
                  radiusMode === "custom"
                    ? "border-[var(--violet-600)]"
                    : "border-[var(--gray-300)]"
                }`}
                aria-hidden="true"
              />
            </button>

            <div className={radiusMode === "custom" ? "" : "opacity-50"}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[var(--gray-500)]">Distance</span>
                <span className="text-sm font-semibold text-[var(--gray-800)]">{radiusValue} mi</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={radiusValue}
                disabled={radiusMode !== "custom"}
                onChange={(e) => onRadiusChange(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        ) : null}
      </div>
      {error && (
        <p className="text-sm text-[var(--error)]">{error}</p>
      )}
    </div>
  );
}
