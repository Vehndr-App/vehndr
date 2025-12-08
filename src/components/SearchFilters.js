"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchFilters({ categories = [], variant = "full" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    distance: searchParams.get("distance") || "",
    rating: searchParams.get("rating") || "",
    availability: searchParams.get("availability") || "",
  });
  
  const dateRef = useRef(null);
  const filtersRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRef.current && !dateRef.current.contains(event.target)) {
        setIsDateOpen(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setIsFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get user location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
        // Auto-set a default distance when location is obtained
        if (!filters.distance) {
          setFilters(prev => ({ ...prev, distance: "10" }));
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationLoading(false);
        alert("Unable to get your location. Please enable location services.");
      }
    );
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (filters.category) params.set("category", filters.category);
    if (filters.minPrice) params.set("minPrice", filters.minPrice);
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
    if (filters.distance) params.set("distance", filters.distance);
    if (filters.rating) params.set("rating", filters.rating);
    if (selectedDate) params.set("date", selectedDate.toISOString().split('T')[0]);
    if (userLocation) {
      params.set("lat", userLocation.lat.toString());
      params.set("lng", userLocation.lng.toString());
    }
    
    router.push(`/?${params.toString()}`);
    setIsFiltersOpen(false);
    setIsDateOpen(false);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilters({
      category: "",
      minPrice: "",
      maxPrice: "",
      distance: "",
      rating: "",
      availability: "",
    });
    setSelectedDate(null);
    setUserLocation(null);
    router.push("/");
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (selectedDate ? 1 : 0) + (userLocation ? 1 : 0);

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const days = generateCalendarDays();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  if (variant === "compact") {
    return (
      <button
        onClick={() => setIsFiltersOpen(true)}
        className="flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-[var(--gray-200)] shadow-sm hover:shadow-md transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="text-sm text-[var(--gray-500)]">Search vendors...</span>
      </button>
    );
  }

  return (
    <>
      {/* Main Search Bar - Airbnb Style */}
      <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] border border-[var(--gray-100)] p-2">
        <div className="flex flex-col sm:flex-row gap-2">
          
          {/* Search Input */}
          <div className="flex-[2] relative">
            <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] hover:bg-[var(--gray-50)] transition-colors">
              <div className="w-10 h-10 rounded-full bg-[var(--coral-100)] flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--coral-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--gray-500)]">Search</div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  placeholder="Vendors, products, services..."
                  className="w-full text-sm font-semibold text-[var(--gray-900)] placeholder:text-[var(--gray-400)] placeholder:font-normal bg-transparent border-none outline-none"
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px bg-[var(--gray-200)] my-2" />

          {/* Date Picker */}
          <div ref={dateRef} className="relative flex-1">
            <button
              onClick={() => { setIsDateOpen(!isDateOpen); setIsFiltersOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] hover:bg-[var(--gray-50)] transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-[var(--gray-500)]">When</div>
                <div className="text-sm font-semibold text-[var(--gray-900)] truncate">
                  {selectedDate 
                    ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : "Any date"
                  }
                </div>
              </div>
            </button>

            {/* Calendar Dropdown - Opens upward on mobile */}
            {isDateOpen && (
              <div className="absolute bottom-full sm:bottom-auto sm:top-full left-0 sm:left-auto sm:right-0 mb-2 sm:mb-0 sm:mt-2 w-[300px] bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] border border-[var(--gray-100)] p-4 z-[100]">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button 
                    onClick={() => navigateMonth(-1)}
                    className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <span className="font-semibold text-[var(--gray-900)]">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                  <button 
                    onClick={() => navigateMonth(1)}
                    className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-[var(--gray-400)] py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    if (!day) return <div key={`empty-${index}`} />;
                    
                    const isSelected = selectedDate && 
                      day.toDateString() === selectedDate.toDateString();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isPast = day < new Date().setHours(0,0,0,0);
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => {
                          setSelectedDate(day);
                          setIsDateOpen(false);
                        }}
                        disabled={isPast}
                        className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? "bg-[var(--violet-600)] text-white"
                            : isToday
                            ? "bg-[var(--violet-100)] text-[var(--violet-700)]"
                            : isPast
                            ? "text-[var(--gray-300)] cursor-not-allowed"
                            : "hover:bg-[var(--gray-100)] text-[var(--gray-700)]"
                        }`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Options */}
                <div className="mt-4 pt-4 border-t border-[var(--gray-100)] flex flex-wrap gap-2">
                  <button
                    onClick={() => { setSelectedDate(new Date()); setIsDateOpen(false); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--gray-100)] hover:bg-[var(--gray-200)] transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => { 
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setSelectedDate(tomorrow); 
                      setIsDateOpen(false); 
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--gray-100)] hover:bg-[var(--gray-200)] transition-colors"
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => { 
                      const weekend = new Date();
                      weekend.setDate(weekend.getDate() + (6 - weekend.getDay()));
                      setSelectedDate(weekend); 
                      setIsDateOpen(false); 
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--gray-100)] hover:bg-[var(--gray-200)] transition-colors"
                  >
                    This Weekend
                  </button>
                  {selectedDate && (
                    <button
                      onClick={() => { setSelectedDate(null); setIsDateOpen(false); }}
                      className="px-3 py-1.5 text-xs font-medium rounded-full text-[var(--error)] hover:bg-red-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px bg-[var(--gray-200)] my-2" />

          {/* Filters Button */}
          <div className="flex-1">
            <button
              onClick={() => { setIsFiltersOpen(true); setIsDateOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] hover:bg-[var(--gray-50)] transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--magenta-100)] flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--magenta-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-[var(--gray-500)]">Filters</div>
                <div className="text-sm font-semibold text-[var(--gray-900)] truncate">
                  {activeFilterCount > 0 
                    ? `${activeFilterCount} active`
                    : "All"
                  }
                </div>
              </div>
              {activeFilterCount > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-[var(--violet-600)] text-white text-xs font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Button */}
          <button
            onClick={applyFilters}
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

      {/* Filters Modal/Drawer */}
      {isFiltersOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[100]"
            onClick={() => setIsFiltersOpen(false)}
          />
          
          {/* Filters Panel */}
          <div 
            ref={filtersRef}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[var(--radius-3xl)] z-[101] max-h-[85vh] overflow-y-auto animate-slide-up"
          >
            {/* Handle */}
            <div className="sticky top-0 bg-white pt-3 pb-2 px-6 border-b border-[var(--gray-100)] z-10">
              <div className="w-10 h-1 bg-[var(--gray-300)] rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--gray-900)]">Filters</h2>
                <button
                  onClick={() => setIsFiltersOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">
                  Location
                </label>
                <button
                  onClick={getUserLocation}
                  disabled={locationLoading}
                  className={`w-full flex items-center gap-3 p-4 rounded-[var(--radius-xl)] border-2 transition-all ${
                    userLocation 
                      ? "border-[var(--violet-500)] bg-[var(--violet-50)]"
                      : "border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    userLocation ? "bg-[var(--violet-500)] text-white" : "bg-[var(--gray-100)]"
                  }`}>
                    {locationLoading ? (
                      <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
                      </svg>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-[var(--gray-900)]">
                      {userLocation ? "Location enabled" : "Use my location"}
                    </div>
                    <div className="text-xs text-[var(--gray-500)]">
                      {userLocation ? "Finding vendors near you" : "Find vendors nearby"}
                    </div>
                  </div>
                  {userLocation && (
                    <svg className="ml-auto text-[var(--violet-500)]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
                
                {/* Distance slider - only show when location is enabled */}
                {userLocation && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[var(--gray-600)]">Search radius</span>
                      <span className="text-sm font-semibold text-[var(--violet-600)]">
                        {filters.distance || "10"} miles
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {["5", "10", "25", "50"].map(dist => (
                        <button
                          key={dist}
                          onClick={() => setFilters({ ...filters, distance: dist })}
                          className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                            filters.distance === dist
                              ? "bg-[var(--violet-600)] text-white"
                              : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                          }`}
                        >
                          {dist} mi
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  <FilterChip 
                    label="All" 
                    active={!filters.category}
                    onClick={() => setFilters({ ...filters, category: "" })}
                  />
                  {categories.map(cat => (
                    <FilterChip 
                      key={cat}
                      label={cat} 
                      active={filters.category === cat}
                      onClick={() => setFilters({ ...filters, category: cat })}
                    />
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">
                  Price Range
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)]">$</span>
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                        className="w-full h-12 pl-8 pr-4 rounded-[var(--radius-lg)] border border-[var(--gray-200)] focus:border-[var(--violet-500)] focus:ring-2 focus:ring-[var(--violet-500)]/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <span className="text-[var(--gray-400)]">—</span>
                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)]">$</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                        className="w-full h-12 pl-8 pr-4 rounded-[var(--radius-lg)] border border-[var(--gray-200)] focus:border-[var(--violet-500)] focus:ring-2 focus:ring-[var(--violet-500)]/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
                {/* Quick Price Options */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <PriceChip label="Under $25" onClick={() => setFilters({ ...filters, minPrice: "", maxPrice: "25" })} />
                  <PriceChip label="$25-$50" onClick={() => setFilters({ ...filters, minPrice: "25", maxPrice: "50" })} />
                  <PriceChip label="$50-$100" onClick={() => setFilters({ ...filters, minPrice: "50", maxPrice: "100" })} />
                  <PriceChip label="$100+" onClick={() => setFilters({ ...filters, minPrice: "100", maxPrice: "" })} />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">
                  Minimum Rating
                </label>
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="Any" active={!filters.rating} onClick={() => setFilters({ ...filters, rating: "" })} />
                  <FilterChip 
                    label={<span className="flex items-center gap-1">4.5+ <StarIcon /></span>} 
                    active={filters.rating === "4.5"} 
                    onClick={() => setFilters({ ...filters, rating: "4.5" })} 
                  />
                  <FilterChip 
                    label={<span className="flex items-center gap-1">4.0+ <StarIcon /></span>} 
                    active={filters.rating === "4"} 
                    onClick={() => setFilters({ ...filters, rating: "4" })} 
                  />
                  <FilterChip 
                    label={<span className="flex items-center gap-1">3.5+ <StarIcon /></span>} 
                    active={filters.rating === "3.5"} 
                    onClick={() => setFilters({ ...filters, rating: "3.5" })} 
                  />
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">
                  Availability
                </label>
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="All" active={!filters.availability} onClick={() => setFilters({ ...filters, availability: "" })} />
                  <FilterChip label="Open Now" active={filters.availability === "open"} onClick={() => setFilters({ ...filters, availability: "open" })} />
                  <FilterChip label="Takes Pre-orders" active={filters.availability === "preorder"} onClick={() => setFilters({ ...filters, availability: "preorder" })} />
                  <FilterChip label="Instant Booking" active={filters.availability === "instant"} onClick={() => setFilters({ ...filters, availability: "instant" })} />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-[var(--gray-100)] p-4 flex gap-3 safe-area-bottom">
              <button
                onClick={clearFilters}
                className="flex-1 h-12 rounded-[var(--radius-xl)] border border-[var(--gray-200)] font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 h-12 rounded-[var(--radius-xl)] bg-gradient-primary text-white font-semibold hover:shadow-lg transition-all"
              >
                Show Results
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active
          ? "bg-[var(--violet-600)] text-white"
          : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
      }`}
    >
      {label}
    </button>
  );
}

function PriceChip({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--gray-200)] transition-colors"
    >
      {label}
    </button>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--amber-500)" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
