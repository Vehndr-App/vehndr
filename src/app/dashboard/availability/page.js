"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import AuthGate from "../../../components/AuthGate";
import { api } from "../../../services/api";

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

const DAY_GROUPS = [
  { value: 'weekdays', label: 'Weekdays (Mon-Fri)', days: [1, 2, 3, 4, 5] },
  { value: 'weekends', label: 'Weekends (Sat-Sun)', days: [6, 0] },
  { value: 'all', label: 'Every Day', days: [0, 1, 2, 3, 4, 5, 6] }
];

export default function AvailabilityPage() {
  return (
    <AuthGate allowedRoles={["vendor"]}>
      <AvailabilityInner />
    </AuthGate>
  );
}

function AvailabilityInner() {
  const { user } = useAuth();
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [availabilityForm, setAvailabilityForm] = useState({
    selectedDays: [1], // Array of selected day numbers
    dayGroup: '', // 'weekdays', 'weekends', 'all', or ''
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    employeeCount: 1
  });

  useEffect(() => {
    fetchAvailabilities();
  }, [user]);

  const fetchAvailabilities = async () => {
    if (!user?.vendorId) return;

    try {
      setLoading(true);
      const response = await api(`/api/vendors/${user.vendorId}/availabilities`);
      setAvailabilities(response.vendorAvailabilities || response);
    } catch (error) {
      console.error('Error fetching availabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingAvailability) {
        // When editing, only update the single availability
        const payload = {
          vendor_availability: {
            day_of_week: availabilityForm.selectedDays[0],
            start_time: availabilityForm.startTime,
            end_time: availabilityForm.endTime,
            slot_duration: parseInt(availabilityForm.slotDuration),
            employee_count: parseInt(availabilityForm.employeeCount)
          }
        };

        await api(`/api/vendors/${user.vendorId}/availabilities/${editingAvailability.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        setSuccessMessage('Availability updated successfully!');
      } else {
        // When creating, create one for each selected day
        const createPromises = availabilityForm.selectedDays.map(dayOfWeek => {
          const payload = {
            vendor_availability: {
              day_of_week: dayOfWeek,
              start_time: availabilityForm.startTime,
              end_time: availabilityForm.endTime,
              slot_duration: parseInt(availabilityForm.slotDuration),
              employee_count: parseInt(availabilityForm.employeeCount)
            }
          };

          return api(`/api/vendors/${user.vendorId}/availabilities`, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        });

        await Promise.all(createPromises);
        const daysCount = availabilityForm.selectedDays.length;
        setSuccessMessage(`Availability created for ${daysCount} ${daysCount === 1 ? 'day' : 'days'}!`);
      }

      setShowModal(false);
      setEditingAvailability(null);
      setAvailabilityForm({
        selectedDays: [1],
        dayGroup: '',
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        employeeCount: 1
      });
      fetchAvailabilities();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this availability?')) return;

    try {
      await api(`/api/vendors/${user.vendorId}/availabilities/${id}`, {
        method: 'DELETE'
      });
      setSuccessMessage('Availability deleted successfully!');
      fetchAvailabilities();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting availability:', error);
      alert('Failed to delete availability. Please try again.');
    }
  };

  const openModal = (availability = null) => {
    if (availability) {
      setEditingAvailability(availability);
      setAvailabilityForm({
        selectedDays: [availability.dayOfWeek],
        dayGroup: '',
        startTime: availability.startTime.substring(0, 5), // Extract HH:MM from time
        endTime: availability.endTime.substring(0, 5),
        slotDuration: availability.slotDuration,
        employeeCount: availability.employeeCount
      });
    } else {
      setEditingAvailability(null);
      setAvailabilityForm({
        selectedDays: [1],
        dayGroup: '',
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        employeeCount: 1
      });
    }
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[var(--violet-600)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--gray-500)]">Loading availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gray-50)] pb-24">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-[var(--mint-600)] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="font-semibold">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--violet-600)] via-[var(--magenta-500)] to-[var(--coral-500)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdi0yMGgtNjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </Link>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl text-white tracking-tight">
                  Availability Schedule
                </h1>
                <p className="text-white/80 text-sm">
                  Set your working hours and staff capacity
                </p>
              </div>
            </div>
            <button
              onClick={() => openModal()}
              className="h-11 px-6 rounded-[var(--radius-xl)] bg-white text-[var(--violet-600)] font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Hours
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 -mt-6 relative z-10">
        {/* Info Card */}
        <div className="bg-[var(--violet-50)] rounded-[var(--radius-2xl)] p-4 mb-6 flex items-start gap-3">
          <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div className="text-sm text-[var(--violet-700)]">
            <p className="font-semibold mb-1">How it works:</p>
            <ul className="space-y-1 text-[var(--violet-600)]">
              <li>• Use quick select buttons (Weekdays, Weekends, Every Day) or pick individual days</li>
              <li>• Set your operating hours for selected days</li>
              <li>• Specify how many staff members are working (concurrent booking capacity)</li>
              <li>• Choose time slot duration (e.g., 30 minutes)</li>
              <li>• Example: 2 employees = 2 customers can book the same time slot</li>
            </ul>
          </div>
        </div>

        {/* Availabilities List */}
        {availabilities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS_OF_WEEK.map(day => {
              const dayAvailability = availabilities.find(a => a.dayOfWeek === day.value);

              return (
                <div
                  key={day.value}
                  className={`bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] overflow-hidden ${
                    !dayAvailability ? 'opacity-50' : ''
                  }`}
                >
                  <div className={`p-4 ${dayAvailability ? 'bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)]' : 'bg-[var(--gray-100)]'}`}>
                    <h3 className={`font-semibold ${dayAvailability ? 'text-white' : 'text-[var(--gray-500)]'}`}>
                      {day.label}
                    </h3>
                  </div>

                  {dayAvailability ? (
                    <div className="p-4 space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-[var(--gray-600)]">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <span>{dayAvailability.startTime} - {dayAvailability.endTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--gray-600)]">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          <span>{dayAvailability.employeeCount} {dayAvailability.employeeCount === 1 ? 'employee' : 'employees'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--gray-600)]">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          <span>{dayAvailability.slotDuration} min slots</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-[var(--gray-100)]">
                        <button
                          onClick={() => openModal(dayAvailability)}
                          className="flex-1 h-9 rounded-[var(--radius-lg)] border border-[var(--violet-200)] text-[var(--violet-600)] text-sm font-medium hover:bg-[var(--violet-50)] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(dayAvailability.id)}
                          className="flex-1 h-9 rounded-[var(--radius-lg)] border border-[var(--coral-200)] text-[var(--coral-600)] text-sm font-medium hover:bg-[var(--coral-50)] transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-[var(--gray-400)] mb-3">Closed</p>
                      <button
                        onClick={() => {
                          setAvailabilityForm({
                            ...availabilityForm,
                            selectedDays: [day.value],
                            dayGroup: ''
                          });
                          openModal();
                        }}
                        className="text-sm text-[var(--violet-600)] font-medium hover:underline"
                      >
                        Set Hours
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
              <span className="text-4xl">📅</span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-2">
              No availability set
            </h2>
            <p className="text-[var(--gray-500)] mb-6 max-w-sm mx-auto">
              Set your working hours to start accepting service bookings
            </p>
            <button
              onClick={() => openModal()}
              className="btn btn-gradient inline-flex items-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Your First Hours
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[var(--radius-2xl)] max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--gray-100)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--gray-900)]">
                  {editingAvailability ? 'Edit Availability' : 'Add Availability'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingAvailability && (
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-3">Select Days</label>

                  {/* Quick Selection Buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {DAY_GROUPS.map(group => (
                      <button
                        key={group.value}
                        type="button"
                        onClick={() => {
                          setAvailabilityForm({
                            ...availabilityForm,
                            selectedDays: group.days,
                            dayGroup: group.value
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          availabilityForm.dayGroup === group.value
                            ? 'bg-[var(--violet-600)] text-white'
                            : 'bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]'
                        }`}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>

                  {/* Individual Day Selection */}
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = availabilityForm.selectedDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            const newSelectedDays = isSelected
                              ? availabilityForm.selectedDays.filter(d => d !== day.value)
                              : [...availabilityForm.selectedDays, day.value];
                            setAvailabilityForm({
                              ...availabilityForm,
                              selectedDays: newSelectedDays,
                              dayGroup: '' // Clear group when manually selecting
                            });
                          }}
                          className={`aspect-square rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-[var(--violet-600)] text-white shadow-sm'
                              : 'bg-white border border-[var(--gray-200)] text-[var(--gray-600)] hover:border-[var(--violet-300)]'
                          }`}
                        >
                          {day.short}
                        </button>
                      );
                    })}
                  </div>
                  {availabilityForm.selectedDays.length === 0 && (
                    <p className="text-xs text-[var(--coral-600)] mt-2">Please select at least one day</p>
                  )}
                </div>
              )}

              {editingAvailability && (
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Day of Week</label>
                  <input
                    type="text"
                    value={DAYS_OF_WEEK.find(d => d.value === availabilityForm.selectedDays[0])?.label}
                    className="input bg-[var(--gray-50)]"
                    disabled
                  />
                  <p className="text-xs text-[var(--gray-500)] mt-1">Cannot change day when editing. Delete and create new to change day.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Start Time</label>
                  <input
                    type="time"
                    value={availabilityForm.startTime}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, startTime: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">End Time</label>
                  <input
                    type="time"
                    value={availabilityForm.endTime}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, endTime: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Slot Duration (minutes)</label>
                <select
                  value={availabilityForm.slotDuration}
                  onChange={(e) => setAvailabilityForm({ ...availabilityForm, slotDuration: e.target.value })}
                  className="input"
                  required
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Number of Employees</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={availabilityForm.employeeCount}
                  onChange={(e) => setAvailabilityForm({ ...availabilityForm, employeeCount: e.target.value })}
                  className="input"
                  placeholder="1"
                  required
                />
                <p className="text-xs text-[var(--gray-500)] mt-1">
                  Number of concurrent bookings allowed per time slot
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-11 rounded-[var(--radius-xl)] border-2 border-[var(--gray-200)] text-[var(--gray-600)] font-medium hover:bg-[var(--gray-50)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || availabilityForm.selectedDays.length === 0}
                  className="flex-1 h-11 rounded-[var(--radius-xl)] bg-gradient-primary text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : editingAvailability ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
