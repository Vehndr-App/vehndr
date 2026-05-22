"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function EventFilters({ categories = [], eventTypes = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [eventType, setEventType] = useState(searchParams.get("event_type") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingEnd, setSelectingEnd] = useState(false);
  
  const calendarRef = useRef(null);
  const filtersRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setIsFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (eventType) params.set("event_type", eventType);
    if (category) params.set("category", category);
    if (selectedStartDate) params.set("startDate", selectedStartDate.toISOString().split('T')[0]);
    if (selectedEndDate) params.set("endDate", selectedEndDate.toISOString().split('T')[0]);
    
    router.push(`/events?${params.toString()}`);
    setIsCalendarOpen(false);
    setIsFiltersOpen(false);
  };

  const clearDates = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setSelectingEnd(false);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const days = generateCalendarDays();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleDateSelect = (day) => {
    if (!selectingEnd || !selectedStartDate) {
      setSelectedStartDate(day);
      setSelectedEndDate(null);
      setSelectingEnd(true);
    } else {
      if (day < selectedStartDate) {
        setSelectedStartDate(day);
        setSelectedEndDate(null);
      } else {
        setSelectedEndDate(day);
        setSelectingEnd(false);
      }
    }
  };

  const isInRange = (day) => {
    if (!selectedStartDate || !day) return false;
    if (!selectedEndDate) return day.toDateString() === selectedStartDate.toDateString();
    return day >= selectedStartDate && day <= selectedEndDate;
  };

  const isRangeStart = (day) => {
    return day && selectedStartDate && day.toDateString() === selectedStartDate.toDateString();
  };

  const isRangeEnd = (day) => {
    return day && selectedEndDate && day.toDateString() === selectedEndDate.toDateString();
  };

  const formatDateRange = () => {
    if (!selectedStartDate) return "Any dates";
    if (!selectedEndDate) return selectedStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${selectedStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${selectedEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search Input */}
      <div className="flex-1 relative">
        <div className="flex items-center gap-3 h-12 px-4 rounded-[var(--radius-xl)] bg-[var(--gray-50)] border border-[var(--gray-200)] focus-within:border-[var(--violet-400)] focus-within:ring-2 focus-within:ring-[var(--violet-500)]/20 transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="Search events..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--gray-400)]"
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>

      <select
        value={eventType}
        onChange={(e) => setEventType(e.target.value)}
        className="h-12 px-4 rounded-[var(--radius-xl)] bg-[var(--gray-50)] border border-[var(--gray-200)] text-sm font-medium text-[var(--gray-700)] outline-none"
      >
        <option value="">All event types</option>
        {eventTypes.map((type) => (
          <option key={type.slug} value={type.slug}>
            {type.label}
          </option>
        ))}
      </select>

      {categories.length > 0 && (
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-12 px-4 rounded-[var(--radius-xl)] bg-[var(--gray-50)] border border-[var(--gray-200)] text-sm font-medium text-[var(--gray-700)] outline-none"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      )}

      {/* Date Range Picker */}
      <div ref={calendarRef} className="relative">
        <button
          onClick={() => { setIsCalendarOpen(!isCalendarOpen); setIsFiltersOpen(false); }}
          className="flex items-center gap-3 h-12 px-4 rounded-[var(--radius-xl)] bg-[var(--gray-50)] border border-[var(--gray-200)] hover:border-[var(--gray-300)] transition-all w-full sm:w-auto"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="text-sm font-medium text-[var(--gray-700)]">{formatDateRange()}</span>
          {(selectedStartDate || selectedEndDate) && (
            <button
              onClick={(e) => { e.stopPropagation(); clearDates(); }}
              className="ml-1 w-5 h-5 rounded-full bg-[var(--gray-200)] hover:bg-[var(--gray-300)] flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </button>

        {/* Calendar Dropdown */}
        {isCalendarOpen && (
          <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-[320px] bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] border border-[var(--gray-100)] p-4 z-[100]">
            <div className="text-center mb-3">
              <p className="text-xs text-[var(--gray-500)]">
                {selectingEnd ? "Select end date" : "Select start date"}
              </p>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
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
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
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
                
                const isToday = day.toDateString() === new Date().toDateString();
                const isPast = day < new Date().setHours(0,0,0,0);
                const inRange = isInRange(day);
                const isStart = isRangeStart(day);
                const isEnd = isRangeEnd(day);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => !isPast && handleDateSelect(day)}
                    disabled={isPast}
                    className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                      isStart || isEnd
                        ? "bg-[var(--violet-600)] text-white"
                        : inRange
                        ? "bg-[var(--violet-100)] text-[var(--violet-700)]"
                        : isToday
                        ? "ring-2 ring-[var(--violet-400)] text-[var(--violet-700)]"
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
            <div className="mt-4 pt-4 border-t border-[var(--gray-100)] grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const today = new Date();
                  const nextWeek = new Date();
                  nextWeek.setDate(today.getDate() + 7);
                  setSelectedStartDate(today);
                  setSelectedEndDate(nextWeek);
                  setSelectingEnd(false);
                }}
                className="px-3 py-2 text-xs font-medium rounded-[var(--radius-lg)] bg-[var(--gray-100)] hover:bg-[var(--gray-200)] transition-colors"
              >
                Next 7 days
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const nextMonth = new Date();
                  nextMonth.setMonth(today.getMonth() + 1);
                  setSelectedStartDate(today);
                  setSelectedEndDate(nextMonth);
                  setSelectingEnd(false);
                }}
                className="px-3 py-2 text-xs font-medium rounded-[var(--radius-lg)] bg-[var(--gray-100)] hover:bg-[var(--gray-200)] transition-colors"
              >
                Next 30 days
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const endOfYear = new Date(today.getFullYear(), 11, 31);
                  setSelectedStartDate(today);
                  setSelectedEndDate(endOfYear);
                  setSelectingEnd(false);
                }}
                className="px-3 py-2 text-xs font-medium rounded-[var(--radius-lg)] bg-[var(--gray-100)] hover:bg-[var(--gray-200)] transition-colors"
              >
                Rest of year
              </button>
              <button
                onClick={clearDates}
                className="px-3 py-2 text-xs font-medium rounded-[var(--radius-lg)] text-[var(--error)] hover:bg-red-50 transition-colors"
              >
                Clear dates
              </button>
            </div>

            {/* Apply Button */}
            <button
              onClick={applyFilters}
              className="w-full mt-3 h-10 rounded-[var(--radius-lg)] bg-gradient-primary text-white text-sm font-semibold hover:shadow-md transition-all"
            >
              Apply Dates
            </button>
          </div>
        )}
      </div>

      {/* Search Button */}
      <button
        onClick={applyFilters}
        className="flex items-center justify-center gap-2 h-12 px-6 rounded-[var(--radius-xl)] bg-gradient-primary text-white font-semibold hover:shadow-lg hover:shadow-[var(--violet-500)]/25 transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="hidden sm:inline">Search</span>
      </button>
    </div>
  );
}

