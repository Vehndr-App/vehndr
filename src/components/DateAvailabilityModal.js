"use client";

import { useState, useEffect } from "react";
import CalendarPicker from "./CalendarPicker";

export default function DateAvailabilityModal({
  vendorId,
  isOpen,
  onClose,
  onSuccess,
  editingAvailability = null
}) {
  const [selectedDates, setSelectedDates] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [formData, setFormData] = useState({
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    employeeCount: 1,
    breakDuration: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDates([]);
      setIsBlocked(false);
      setFormData({
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        employeeCount: 1,
        breakDuration: 0
      });
      setError(null);
    } else if (editingAvailability) {
      setSelectedDates([editingAvailability.date]);
      setIsBlocked(editingAvailability.isBlocked);
      if (!editingAvailability.isBlocked) {
        setFormData({
          startTime: editingAvailability.startTime?.substring(0, 5) || '09:00',
          endTime: editingAvailability.endTime?.substring(0, 5) || '17:00',
          slotDuration: editingAvailability.slotDuration || 30,
          employeeCount: editingAvailability.employeeCount || 1,
          breakDuration: editingAvailability.breakDuration || 0
        });
      }
    }
  }, [isOpen, editingAvailability]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedDates.length === 0) {
      setError('Please select at least one date');
      return;
    }

    if (!isBlocked && (!formData.startTime || !formData.endTime)) {
      setError('Please enter start and end times');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('vehndr_token');

      if (editingAvailability) {
        // Update existing
        const response = await fetch(
          `${apiUrl}/api/vendors/${vendorId}/date_availabilities/${editingAvailability.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              vendor_date_availability: {
                date: selectedDates[0],
                is_blocked: isBlocked,
                ...(!isBlocked && {
                  start_time: formData.startTime,
                  end_time: formData.endTime,
                  slot_duration: parseInt(formData.slotDuration),
                  employee_count: parseInt(formData.employeeCount),
                  break_duration: parseInt(formData.breakDuration)
                })
              }
            })
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.errors?.join(', ') || 'Failed to update availability');
        }
      } else {
        // Create new (bulk create for multiple dates)
        const response = await fetch(
          `${apiUrl}/api/vendors/${vendorId}/date_availabilities`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              dates: selectedDates.map(d => new Date(d).toISOString().split('T')[0]),
              vendor_date_availability: {
                is_blocked: isBlocked,
                ...(!isBlocked && {
                  start_time: formData.startTime,
                  end_time: formData.endTime,
                  slot_duration: parseInt(formData.slotDuration),
                  employee_count: parseInt(formData.employeeCount),
                  break_duration: parseInt(formData.breakDuration)
                })
              }
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (data.errors) {
            throw new Error(data.errors.map(e => `${e.date}: ${e.errors.join(', ')}`).join('\n'));
          }
          throw new Error('Failed to create availability');
        }
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Error saving date availability:', error);
      setError(error.message || 'Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[var(--radius-2xl)] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--gray-100)] px-6 py-4 rounded-t-[var(--radius-2xl)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--gray-900)]">
                {editingAvailability ? 'Edit Special Date' : 'Add Special Date Availability'}
              </h2>
              <p className="text-sm text-[var(--gray-500)] mt-1">
                {isBlocked ? 'Mark dates as unavailable' : 'Set hours for specific dates (e.g., festivals, events)'}
              </p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* Blocked Toggle */}
          <div className="flex items-center gap-3 p-4 bg-[var(--gray-50)] rounded-[var(--radius-lg)]">
            <input
              type="checkbox"
              id="isBlocked"
              checked={isBlocked}
              onChange={(e) => setIsBlocked(e.target.checked)}
              className="w-5 h-5 rounded border-[var(--gray-300)] text-[var(--coral-600)] focus:ring-[var(--coral-500)]"
            />
            <label htmlFor="isBlocked" className="flex-1 cursor-pointer">
              <div className="font-medium text-[var(--gray-900)]">Mark as unavailable (blocked)</div>
              <div className="text-xs text-[var(--gray-500)] mt-0.5">
                Block these dates completely (vacation, holidays, etc.)
              </div>
            </label>
          </div>

          {/* Calendar */}
          <div>
            <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">
              Select Date{!editingAvailability && 's'} <span className="text-[var(--coral-500)]">*</span>
            </label>
            {editingAvailability && (
              <p className="text-xs text-[var(--gray-500)] mb-3">
                Cannot change date when editing. Delete and create new to change date.
              </p>
            )}
            <CalendarPicker
              selectedDates={selectedDates}
              onDateSelect={setSelectedDates}
              multiSelect={!editingAvailability}
              disablePastDates={true}
            />
            {selectedDates.length > 0 && !editingAvailability && (
              <div className="mt-3 p-3 bg-[var(--violet-50)] rounded-[var(--radius-lg)]">
                <p className="text-sm text-[var(--violet-700)]">
                  <span className="font-semibold">{selectedDates.length}</span> {selectedDates.length === 1 ? 'date' : 'dates'} selected
                </p>
              </div>
            )}
          </div>

          {/* Time Configuration (hidden if blocked) */}
          {!isBlocked && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                    Start Time <span className="text-[var(--coral-500)]">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="input"
                    required={!isBlocked}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                    End Time <span className="text-[var(--coral-500)]">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="input"
                    required={!isBlocked}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                  Slot Duration
                </label>
                <select
                  value={formData.slotDuration}
                  onChange={(e) => setFormData({ ...formData, slotDuration: e.target.value })}
                  className="input"
                  required={!isBlocked}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                  Number of Employees
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.employeeCount}
                  onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                  className="input"
                  placeholder="1"
                  required={!isBlocked}
                />
                <p className="text-xs text-[var(--gray-500)] mt-1">
                  Number of concurrent bookings allowed per time slot
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                  Break Duration (minutes)
                </label>
                <select
                  value={formData.breakDuration}
                  onChange={(e) => setFormData({ ...formData, breakDuration: e.target.value })}
                  className="input"
                  required={!isBlocked}
                >
                  <option value="0">No break (0 min)</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
                <p className="text-xs text-[var(--gray-500)] mt-1">
                  Non-bookable time added after each appointment for preparation
                </p>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-[var(--gray-100)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-11 rounded-[var(--radius-lg)] border border-[var(--gray-200)] text-[var(--gray-700)] text-sm font-medium hover:bg-[var(--gray-50)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedDates.length === 0}
              className="flex-1 h-11 rounded-[var(--radius-lg)] bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                editingAvailability ? 'Update' : `Add ${selectedDates.length > 0 ? selectedDates.length : ''} ${selectedDates.length === 1 ? 'Date' : 'Dates'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
