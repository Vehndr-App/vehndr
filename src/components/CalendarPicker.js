"use client";

import { useState } from "react";

// Calendar helper functions
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function generateCalendarDays(currentMonth) {
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
}

export default function CalendarPicker({
  selectedDates = null,
  onDateSelect,
  multiSelect = false,
  disablePastDates = true,
  minDate = null,
  maxDate = null,
  highlightedDates = [],
  className = ""
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handleDateClick = (day) => {
    if (!day) return;

    const isPast = disablePastDates && day < new Date().setHours(0, 0, 0, 0);
    if (isPast) return;

    if (minDate && day < minDate) return;
    if (maxDate && day > maxDate) return;

    if (multiSelect) {
      const dateStr = day.toISOString();
      const dates = Array.isArray(selectedDates) ? selectedDates : [];
      const isSelected = dates.some(
        (d) => new Date(d).toDateString() === day.toDateString()
      );

      if (isSelected) {
        // Remove date
        onDateSelect(dates.filter(
          (d) => new Date(d).toDateString() !== day.toDateString()
        ));
      } else {
        // Add date
        onDateSelect([...dates, dateStr]);
      }
    } else {
      onDateSelect(day);
    }
  };

  const isDateSelected = (day) => {
    if (!day) return false;

    if (multiSelect) {
      const dates = Array.isArray(selectedDates) ? selectedDates : [];
      return dates.some(
        (d) => new Date(d).toDateString() === day.toDateString()
      );
    } else {
      return selectedDates && selectedDates.toDateString && day.toDateString() === selectedDates.toDateString();
    }
  };

  const isDateHighlighted = (day) => {
    if (!day || highlightedDates.length === 0) return false;
    return highlightedDates.some(
      (d) => new Date(d).toDateString() === day.toDateString()
    );
  };

  const calendarDays = generateCalendarDays(currentMonth);

  return (
    <div className={`border border-[var(--gray-200)] rounded-[var(--radius-xl)] p-4 ${className}`}>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1))}
          className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="font-semibold text-[var(--gray-900)]">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1))}
          className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-[var(--gray-400)] py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} />;

          const isToday = day.toDateString() === new Date().toDateString();
          const isPast = disablePastDates && day < new Date().setHours(0, 0, 0, 0);
          const isSelected = isDateSelected(day);
          const isHighlighted = isDateHighlighted(day);
          const isDisabled =
            isPast ||
            (minDate && day < minDate) ||
            (maxDate && day > maxDate);

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? "bg-[var(--violet-600)] text-white shadow-sm"
                  : isHighlighted
                  ? "bg-[var(--mint-100)] text-[var(--mint-700)] ring-2 ring-[var(--mint-400)]"
                  : isToday
                  ? "ring-2 ring-[var(--violet-400)] text-[var(--violet-700)]"
                  : isDisabled
                  ? "text-[var(--gray-300)] cursor-not-allowed"
                  : "hover:bg-[var(--gray-100)] text-[var(--gray-700)]"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {/* Multi-select helper text */}
      {multiSelect && Array.isArray(selectedDates) && selectedDates.length > 0 && (
        <div className="mt-3 text-xs text-[var(--gray-500)] text-center">
          {selectedDates.length} {selectedDates.length === 1 ? "date" : "dates"} selected
        </div>
      )}
    </div>
  );
}
