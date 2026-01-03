"use client";

import { useState, useEffect } from "react";
import { api } from "../services/api";

// Calendar helper functions
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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

export default function RescheduleModal({ booking, isOpen, onClose, onSuccess }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available time slots when date is selected
  useEffect(() => {
    if (!selectedDate || !booking?.vendorId) {
      setAvailableSlots([]);
      return;
    }

    const fetchTimeSlots = async () => {
      setLoadingSlots(true);
      setSelectedTimeSlot(null);
      setError(null);

      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/vendors/${booking.vendorId}/availabilities/time_slots?date=${dateStr}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch time slots');
        }

        const data = await response.json();
        setAvailableSlots(data.slots || []);
      } catch (error) {
        console.error('Error fetching time slots:', error);
        setError('Failed to load available time slots. Please try again.');
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchTimeSlots();
  }, [selectedDate, booking?.vendorId]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setAvailableSlots([]);
      setCurrentMonth(new Date());
      setError(null);
    }
  }, [isOpen]);

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      setError('Please select both a date and time');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      await api(`/bookings/${booking.id}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({
          booking_date: dateStr,
          start_time: selectedTimeSlot
        })
      });

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      setError(error.message || 'Failed to reschedule. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const calendarDays = generateCalendarDays(currentMonth);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[var(--radius-2xl)] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--gray-100)] px-6 py-4 rounded-t-[var(--radius-2xl)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--gray-900)]">Reschedule Appointment</h2>
              <p className="text-sm text-[var(--gray-500)] mt-1">{booking.serviceName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Booking Info */}
          <div className="p-4 bg-[var(--gray-50)] rounded-[var(--radius-lg)]">
            <p className="text-xs font-medium text-[var(--gray-500)] uppercase tracking-wider mb-2">Current Appointment</p>
            <div className="flex items-center gap-2 text-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-600)" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span className="font-medium text-[var(--gray-700)]">
                {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {booking.timeSlot}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">
              Select New Date <span className="text-[var(--coral-500)]">*</span>
            </label>

            {/* Calendar */}
            <div className="border border-[var(--gray-200)] rounded-[var(--radius-xl)] p-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                  className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
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
                  className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
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
                {calendarDays.map((day, index) => {
                  if (!day) return <div key={`empty-${index}`} />;

                  const isToday = day.toDateString() === new Date().toDateString();
                  const isPast = day < new Date().setHours(0,0,0,0);
                  const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => !isPast && setSelectedDate(day)}
                      disabled={isPast}
                      className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-[var(--violet-600)] text-white"
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
            </div>

            {selectedDate && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-[var(--violet-50)] rounded-[var(--radius-lg)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="text-sm font-medium text-[var(--violet-700)]">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>

          {/* Time Slot Selection */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">
                Select New Time <span className="text-[var(--coral-500)]">*</span>
              </label>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-3 border-[var(--violet-600)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8 px-4 bg-[var(--gray-50)] rounded-[var(--radius-lg)]">
                  <svg className="mx-auto mb-2" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-sm text-[var(--gray-500)]">No time slots available for this date</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedTimeSlot(slot.time)}
                      disabled={!slot.available}
                      className={`py-2.5 px-3 rounded-[var(--radius-lg)] text-sm font-medium transition-all ${
                        selectedTimeSlot === slot.time
                          ? "bg-[var(--violet-600)] text-white shadow-md"
                          : slot.available
                          ? "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--violet-100)] hover:text-[var(--violet-700)]"
                          : "bg-[var(--gray-50)] text-[var(--gray-400)] cursor-not-allowed"
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}

              {selectedTimeSlot && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-[var(--mint-50)] rounded-[var(--radius-lg)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span className="text-sm font-medium text-[var(--mint-700)]">
                    {selectedTimeSlot} • {booking.duration} min
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[var(--gray-100)] px-6 py-4 rounded-b-[var(--radius-2xl)] flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-11 rounded-[var(--radius-lg)] border border-[var(--gray-200)] text-[var(--gray-700)] text-sm font-medium hover:bg-[var(--gray-50)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleReschedule}
            disabled={!selectedDate || !selectedTimeSlot || submitting}
            className="flex-1 h-11 rounded-[var(--radius-lg)] bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Rescheduling...
              </>
            ) : (
              'Confirm Reschedule'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
