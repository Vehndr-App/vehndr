"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SearchFilters from "./SearchFilters";

export default function HomeToggle({ categories = [], initialMode = "vendors" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState(initialMode);

  // Sync mode from URL
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "events" || urlMode === "vendors") {
      setMode(urlMode);
    }
  }, [searchParams]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", newMode);
    // Clear filters when switching modes
    params.delete("search");
    params.delete("category");
    params.delete("minPrice");
    params.delete("maxPrice");
    router.push(`/?${params.toString()}`);
  };

  return (
    <>
      {/* Mode Toggle - Airbnb Style */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-white/10 backdrop-blur-md rounded-full p-1">
          <button
            onClick={() => handleModeChange("vendors")}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              mode === "vendors"
                ? "bg-white text-[var(--gray-900)] shadow-lg"
                : "text-white/80 hover:text-white hover:bg-white/10"
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
          <button
            onClick={() => handleModeChange("events")}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              mode === "events"
                ? "bg-white text-[var(--gray-900)] shadow-lg"
                : "text-white/80 hover:text-white hover:bg-white/10"
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
        </div>
      </div>

      {/* Dynamic Title based on mode */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint-500)] animate-pulse"></span>
          {mode === "vendors" ? "50+ trusted vendors" : "Live at 50+ events"}
        </div>
        
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white tracking-tight mb-3">
          {mode === "vendors" 
            ? "Shop Your Favorite Vendors" 
            : "Discover amazing events"}
        </h1>
        
        <p className="text-white/80 text-sm sm:text-base max-w-lg mx-auto">
          {mode === "vendors"
            ? "Browse storefronts, add to cart, and book services for your next event."
            : "Find events near you, RSVP, and connect with event organizers and vendors."}
        </p>
      </div>
      
      {/* Search Filters - Changes based on mode */}
      <div className="max-w-3xl mx-auto">
        {mode === "vendors" ? (
          <SearchFilters categories={categories} />
        ) : (
          <EventSearchFilters />
        )}
      </div>
    </>
  );
}

function EventSearchFilters() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [date, setDate] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("mode", "events");
    if (search) params.set("search", search);
    if (eventType) params.set("type", eventType);
    if (date) params.set("date", date);
    router.push(`/?${params.toString()}`);
  };

  const eventTypes = [
    { id: "", label: "All Events" },
    { id: "party", label: "Parties" },
    { id: "wedding", label: "Weddings" },
    { id: "corporate", label: "Corporate" },
    { id: "festival", label: "Festivals" },
    { id: "concert", label: "Concerts" },
    { id: "wellness", label: "Wellness" },
  ];

  return (
    <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] border border-[var(--gray-100)] p-2">
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search Input */}
        <div className="flex-[2] relative">
          <label 
            htmlFor="event-search" 
            className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] hover:bg-[var(--gray-50)] focus-within:bg-[var(--gray-50)] focus-within:ring-2 focus-within:ring-[var(--violet-500)]/20 transition-colors cursor-text"
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
        <div className="hidden sm:block w-px bg-[var(--gray-200)] my-2" />

        {/* Event Type */}
        <div className="flex-1">
          <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] hover:bg-[var(--gray-50)] transition-colors">
            <div className="w-10 h-10 rounded-full bg-[var(--coral-100)] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--coral-600)" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--gray-500)]">Type</div>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full text-sm font-semibold text-[var(--gray-900)] bg-transparent border-none outline-none cursor-pointer"
                style={{ fontSize: '16px' }}
              >
                {eventTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-[var(--gray-200)] my-2" />

        {/* Date */}
        <div className="flex-1">
          <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] hover:bg-[var(--gray-50)] transition-colors">
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
    </div>
  );
}

