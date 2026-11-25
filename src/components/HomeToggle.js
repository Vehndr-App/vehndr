"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SearchFilters from "./SearchFilters";
import { EVENT_TYPES } from "../constants/categories";
import {
  SERVICE_AREA_NOTE,
  SERVICE_AREA_OPTIONS,
  getServiceAreaOption,
} from "../constants/serviceAreas";
import { useAuth } from "../contexts/AuthContext";

export default function HomeToggle({ categories = [], initialMode = "vendors" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: authLoading } = useAuth();
  const canSeeEvents = true;
  const [mode, setMode] = useState(initialMode);

  // Sync mode from URL
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "events" || urlMode === "vendors") {
      setMode(urlMode);
    }
  }, [searchParams]);

  // Redirect away from events mode if user can't see events (wait for auth to finish loading)
  useEffect(() => {
    if (authLoading) return;
    if (mode === "events" && !canSeeEvents) {
      setMode("vendors");
      const params = new URLSearchParams(searchParams.toString());
      params.set("mode", "vendors");
      params.delete("search");
      params.delete("type");
      params.delete("event_type");
      router.push(`/?${params.toString()}`);
    }
  }, [mode, canSeeEvents, authLoading, searchParams, router]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", newMode);
    // Clear filters when switching modes
    params.delete("search");
    params.delete("category");
    params.delete("type");
    params.delete("event_type");
    params.delete("minPrice");
    params.delete("maxPrice");
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-col items-center gap-5 sm:gap-6">
      {/* Mode toggle floats over video */}
      <div className="inline-flex bg-black/30 backdrop-blur-md rounded-full p-1 border border-white/20 shadow-lg">
        <button
          onClick={() => handleModeChange("vendors")}
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
            mode === "vendors"
              ? "bg-white text-[var(--gray-900)] shadow-lg"
              : "text-white/85 hover:text-white hover:bg-white/10"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Vendors
          </span>
        </button>
        {canSeeEvents && (
          <button
            onClick={() => handleModeChange("events")}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              mode === "events"
                ? "bg-white text-[var(--gray-900)] shadow-lg"
                : "text-white/85 hover:text-white hover:bg-white/10"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Events
            </span>
          </button>
        )}
      </div>

      {/* Title floats over video */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/25 backdrop-blur-md border border-white/15 text-white/90 text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint-500)] animate-pulse" />
          {mode === "vendors" ? "75+ trusted vendors" : "Live at 50+ events"}
        </div>

        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white tracking-tight mb-3 drop-shadow-md">
          {mode === "vendors"
            ? "Book local vendors for every part of your event"
            : "Discover amazing events"}
        </h1>

        <p className="text-white/85 text-sm sm:text-base max-w-lg mx-auto drop-shadow-sm">
          {mode === "vendors"
            ? "Makers, creatives & event vendors — all in one place."
            : "Find events near you, RSVP, and connect with event organizers and vendors."}
        </p>
      </div>

      {/* Search card floats over video */}
      <div className="w-full max-w-5xl mx-auto">
        {mode === "vendors" ? (
          <SearchFilters categories={categories} glass />
        ) : (
          <EventSearchFilters glass />
        )}
      </div>
    </div>
  );
}

function EventSearchFilters({ glass = false }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [date, setDate] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [isWhereOpen, setIsWhereOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!glass);
  const selectedArea = getServiceAreaOption(serviceArea);

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("mode", "events");
    if (search) params.set("search", search);
    if (eventType) params.set("event_type", eventType);
    if (date) params.set("date", date);
    if (serviceArea) params.set("location", serviceArea);
    router.push(`/?${params.toString()}`);
  };

  const eventTypes = [{ slug: "", label: "All Events" }, ...EVENT_TYPES];
  const shellClass = glass
    ? "bg-white/90 rounded-[var(--radius-2xl)] shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/70 p-2"
    : "bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] border border-[var(--gray-100)] p-2";
  const rowHover = glass
    ? "hover:bg-black/[0.04] focus-within:bg-black/[0.04]"
    : "hover:bg-[var(--gray-50)] focus-within:bg-[var(--gray-50)]";
  const rowHoverBtn = glass ? "hover:bg-black/[0.04]" : "hover:bg-[var(--gray-50)]";
  const dividerClass = glass ? "hidden sm:block w-px bg-[var(--gray-200)] my-2" : "hidden sm:block w-px bg-[var(--gray-200)] my-2";

  if (glass && !isExpanded) {
    const summary =
      search ||
      (serviceArea ? selectedArea.label : null) ||
      (eventType ? "Filtered" : null) ||
      (date || null);
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-full bg-white/90 shadow-[0_16px_40px_rgba(0,0,0,0.3)] border border-white/70 text-left hover:bg-white transition-colors"
        aria-expanded="false"
        aria-label="Open search"
      >
        <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[var(--gray-900)] truncate">
            {summary || "Search events"}
          </div>
          <div className="text-xs text-[var(--gray-500)] truncate">
            {summary ? "Tap to edit search" : "TX & AZ · type · date"}
          </div>
        </div>
        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </span>
      </button>
    );
  }

  return (
    <div className={shellClass}>
      {glass && (
        <div className="flex items-center justify-end px-2 pt-1 pb-0">
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="text-xs font-medium text-[var(--gray-500)] hover:text-[var(--gray-800)] px-2 py-1 rounded-full hover:bg-black/[0.04]"
          >
            Close
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search Input */}
        <div className="flex-[2] relative">
          <label 
            htmlFor="event-search" 
            className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] ${rowHover} focus-within:ring-2 focus-within:ring-[var(--violet-500)]/20 transition-colors cursor-text`}
          >
            <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--gray-500)]">Search</div>
              <input
                id="event-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Event name or location..."
                className="w-full text-sm font-semibold text-[var(--gray-900)] placeholder:text-[var(--gray-400)] placeholder:font-normal bg-transparent border-none outline-none"
                style={{ fontSize: '16px' }}
                inputMode="search"
              />
            </div>
          </label>
        </div>

        {/* Divider */}
        <div className={dividerClass} />

        {/* Where */}
        <div className="relative flex-1 min-w-[7.5rem]">
          <button
            type="button"
            onClick={() => setIsWhereOpen(!isWhereOpen)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] ${rowHoverBtn} transition-colors text-left`}
          >
            <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-[var(--gray-500)]">Where</div>
              <div className="text-sm font-semibold text-[var(--gray-900)] truncate">
                {serviceArea ? selectedArea.label : "TX & AZ"}
              </div>
            </div>
          </button>
          {isWhereOpen && (
            <div className="absolute bottom-full sm:bottom-auto sm:top-full left-0 mb-2 sm:mb-0 sm:mt-2 w-[260px] bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] border border-[var(--gray-100)] z-[9999] overflow-hidden">
              <div className="px-3 py-2.5 bg-[var(--violet-50)] border-b border-[var(--violet-100)]">
                <p className="text-[11px] font-semibold text-[var(--violet-700)] leading-snug">
                  {SERVICE_AREA_NOTE}
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {SERVICE_AREA_OPTIONS.map((opt) => (
                  <button
                    key={opt.value || "all"}
                    type="button"
                    onClick={() => {
                      setServiceArea(opt.value);
                      setIsWhereOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      serviceArea === opt.value
                        ? "bg-[var(--violet-50)] text-[var(--violet-700)] font-semibold"
                        : "text-[var(--gray-800)] hover:bg-[var(--gray-50)]"
                    } ${opt.kind === "city" ? "pl-5" : ""}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={dividerClass} />

        {/* Event Type */}
        <div className="flex-1">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] ${rowHoverBtn} transition-colors`}>
            <div className="w-10 h-10 rounded-full bg-[var(--coral-100)] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--coral-600)" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--gray-500)]">Event Type</div>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full text-sm font-semibold text-[var(--gray-900)] bg-transparent border-none outline-none cursor-pointer"
                style={{ fontSize: '16px' }}
              >
                {eventTypes.map(type => (
                  <option key={type.slug} value={type.slug}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className={dividerClass} />

        {/* Date */}
        <div className="flex-1">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] ${rowHoverBtn} transition-colors`}>
            <div className="w-10 h-10 rounded-full bg-[var(--magenta-100)] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--magenta-600)" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--gray-500)]">When</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full text-sm font-semibold text-[var(--gray-900)] bg-transparent border-none outline-none cursor-pointer"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-primary text-white font-semibold rounded-[var(--radius-xl)] hover:shadow-lg hover:shadow-[var(--violet-500)]/25 transition-all sm:px-8"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span className="hidden sm:inline">Search</span>
        </button>
      </div>
      <p className={`mt-2 text-center text-xs ${glass ? "text-white/80 drop-shadow-sm" : "text-[var(--gray-500)]"}`}>
        {SERVICE_AREA_NOTE}
      </p>
    </div>
  );
}

