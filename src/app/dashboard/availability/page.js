"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import AuthGate from "../../../components/AuthGate";
import { api } from "../../../services/api";

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun', letter: 'S' },
  { value: 1, label: 'Monday', short: 'Mon', letter: 'M' },
  { value: 2, label: 'Tuesday', short: 'Tue', letter: 'T' },
  { value: 3, label: 'Wednesday', short: 'Wed', letter: 'W' },
  { value: 4, label: 'Thursday', short: 'Thu', letter: 'T' },
  { value: 5, label: 'Friday', short: 'Fri', letter: 'F' },
  { value: 6, label: 'Saturday', short: 'Sat', letter: 'S' }
];

const DAY_GROUPS = [
  { value: 'weekdays', label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { value: 'weekends', label: 'Weekends', days: [6, 0] },
  { value: 'all', label: 'Every Day', days: [0, 1, 2, 3, 4, 5, 6] }
];

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
  const [dateAvailabilities, setDateAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // { type: 'recurring' | 'specific', data: ... }
  const [successMessage, setSuccessMessage] = useState(null);
  const [vendorSettings, setVendorSettings] = useState({
    bookingAdvanceMinutes: 60
  });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  // Unified form state for the modal
  const [modalForm, setModalForm] = useState({
    mode: 'recurring', // 'recurring' or 'specific'
    selectedDays: [1],
    dayGroup: '',
    selectedDates: [],
    isBlocked: false,
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    employeeCount: 1,
    breakDuration: 0
  });

  useEffect(() => {
    fetchAvailabilities();
    fetchDateAvailabilities();
    fetchVendorSettings();
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

  const fetchDateAvailabilities = async () => {
    if (!user?.vendorId) return;

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);

      const response = await api(
        `/api/vendors/${user.vendorId}/date_availabilities?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`
      );
      setDateAvailabilities(response.vendorDateAvailabilities || response);
    } catch (error) {
      console.error('Error fetching date availabilities:', error);
    }
  };

  const fetchVendorSettings = async () => {
    if (!user?.vendorId) return;

    try {
      const response = await api(`/api/vendors/${user.vendorId}`);
      setVendorSettings({
        bookingAdvanceMinutes: response.bookingAdvanceMinutes || 60
      });
    } catch (error) {
      console.error('Error fetching vendor settings:', error);
    }
  };

  // Get availability info for a specific calendar date
  const getDateInfo = (date) => {
    if (!date) return null;

    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Check for specific date override first
    const specificDate = dateAvailabilities.find(da => da.date === dateStr);
    if (specificDate) {
      return {
        type: 'specific',
        isBlocked: specificDate.isBlocked,
        data: specificDate
      };
    }

    // Check for recurring availability
    const recurring = availabilities.find(a => a.dayOfWeek === dayOfWeek);
    if (recurring) {
      return {
        type: 'recurring',
        isBlocked: false,
        data: recurring
      };
    }

    return null;
  };

  // Calendar days with availability info
  const calendarDays = useMemo(() => {
    return generateCalendarDays(calendarMonth);
  }, [calendarMonth]);

  const resetModalForm = () => {
    setModalForm({
      mode: 'recurring',
      selectedDays: [1],
      dayGroup: '',
      selectedDates: [],
      isBlocked: false,
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 30,
      employeeCount: 1,
      breakDuration: 0
    });
  };

  const openAddModal = (preselectedDate = null) => {
    resetModalForm();
    if (preselectedDate) {
      setModalForm(prev => ({
        ...prev,
        mode: 'specific',
        selectedDates: [preselectedDate.toISOString()]
      }));
    }
    setEditingItem(null);
    setShowAddModal(true);
  };

  const openEditModal = (type, data) => {
    setEditingItem({ type, data });
    if (type === 'recurring') {
      setModalForm({
        mode: 'recurring',
        selectedDays: [data.dayOfWeek],
        dayGroup: '',
        selectedDates: [],
        isBlocked: false,
        startTime: data.startTime.substring(0, 5),
        endTime: data.endTime.substring(0, 5),
        slotDuration: data.slotDuration,
        employeeCount: data.employeeCount,
        breakDuration: data.breakDuration || 0
      });
    } else {
      setModalForm({
        mode: 'specific',
        selectedDays: [],
        dayGroup: '',
        selectedDates: [data.date],
        isBlocked: data.isBlocked,
        startTime: data.startTime?.substring(0, 5) || '09:00',
        endTime: data.endTime?.substring(0, 5) || '17:00',
        slotDuration: data.slotDuration || 30,
        employeeCount: data.employeeCount || 1,
        breakDuration: data.breakDuration || 0
      });
    }
    setShowAddModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (modalForm.mode === 'recurring') {
        if (editingItem?.type === 'recurring') {
          // Update existing recurring
          await api(`/api/vendors/${user.vendorId}/availabilities/${editingItem.data.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              vendor_availability: {
                day_of_week: modalForm.selectedDays[0],
                start_time: modalForm.startTime,
                end_time: modalForm.endTime,
                slot_duration: parseInt(modalForm.slotDuration),
                employee_count: parseInt(modalForm.employeeCount),
                break_duration: parseInt(modalForm.breakDuration)
              }
            })
          });
          setSuccessMessage('Schedule updated!');
        } else {
          // Create new recurring for each selected day
          await Promise.all(modalForm.selectedDays.map(dayOfWeek =>
            api(`/api/vendors/${user.vendorId}/availabilities`, {
              method: 'POST',
              body: JSON.stringify({
                vendor_availability: {
                  day_of_week: dayOfWeek,
                  start_time: modalForm.startTime,
                  end_time: modalForm.endTime,
                  slot_duration: parseInt(modalForm.slotDuration),
                  employee_count: parseInt(modalForm.employeeCount),
                  break_duration: parseInt(modalForm.breakDuration)
                }
              })
            })
          ));
          setSuccessMessage(`Added ${modalForm.selectedDays.length} recurring ${modalForm.selectedDays.length === 1 ? 'day' : 'days'}!`);
        }
        fetchAvailabilities();
      } else {
        // Specific dates
        if (editingItem?.type === 'specific') {
          // Update existing specific date
          await api(`/api/vendors/${user.vendorId}/date_availabilities/${editingItem.data.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              vendor_date_availability: {
                date: modalForm.selectedDates[0],
                is_blocked: modalForm.isBlocked,
                ...(!modalForm.isBlocked && {
                  start_time: modalForm.startTime,
                  end_time: modalForm.endTime,
                  slot_duration: parseInt(modalForm.slotDuration),
                  employee_count: parseInt(modalForm.employeeCount),
                  break_duration: parseInt(modalForm.breakDuration)
                })
              }
            })
          });
          setSuccessMessage('Date updated!');
        } else {
          // Create new specific dates
          await api(`/api/vendors/${user.vendorId}/date_availabilities`, {
            method: 'POST',
            body: JSON.stringify({
              dates: modalForm.selectedDates.map(d => new Date(d).toISOString().split('T')[0]),
              vendor_date_availability: {
                is_blocked: modalForm.isBlocked,
                ...(!modalForm.isBlocked && {
                  start_time: modalForm.startTime,
                  end_time: modalForm.endTime,
                  slot_duration: parseInt(modalForm.slotDuration),
                  employee_count: parseInt(modalForm.employeeCount),
                  break_duration: parseInt(modalForm.breakDuration)
                })
              }
            })
          });
          setSuccessMessage(`Added ${modalForm.selectedDates.length} ${modalForm.selectedDates.length === 1 ? 'date' : 'dates'}!`);
        }
        fetchDateAvailabilities();
      }

      setShowAddModal(false);
      setEditingItem(null);
      resetModalForm();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Delete this availability?')) return;

    try {
      if (type === 'recurring') {
        await api(`/api/vendors/${user.vendorId}/availabilities/${id}`, { method: 'DELETE' });
        fetchAvailabilities();
      } else {
        await api(`/api/vendors/${user.vendorId}/date_availabilities/${id}`, { method: 'DELETE' });
        fetchDateAvailabilities();
      }
      setSuccessMessage('Deleted!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete.');
    }
  };

  const handleCalendarDateClick = (date) => {
    const dateInfo = getDateInfo(date);
    if (dateInfo) {
      setSelectedCalendarDate({ date, info: dateInfo });
    } else {
      // No availability - open modal to add
      openAddModal(date);
    }
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
                  Availability
                </h1>
                <p className="text-white/80 text-sm">
                  Manage your schedule
                </p>
              </div>
            </div>
            <button
              onClick={() => openAddModal()}
              className="h-11 px-6 rounded-[var(--radius-xl)] bg-white text-[var(--violet-600)] font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Availability
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 -mt-6 relative z-10">
        {/* Legend */}
        <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-4 mb-6">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[var(--mint-500)]" />
              <span className="text-[var(--gray-600)]">Recurring</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[var(--violet-500)]" />
              <span className="text-[var(--gray-600)]">Specific Date</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[var(--coral-500)]" />
              <span className="text-[var(--gray-600)]">Blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-[var(--gray-300)]" />
              <span className="text-[var(--gray-600)]">Not Set</span>
            </div>
          </div>
        </div>

        {/* Main Grid: Calendar + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                className="w-10 h-10 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <span className="font-display text-xl text-[var(--gray-900)]">
                {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                className="w-10 h-10 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-[var(--gray-400)] py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="aspect-square" />;

                const isToday = day.toDateString() === new Date().toDateString();
                const isPast = day < new Date().setHours(0, 0, 0, 0);
                const dateInfo = getDateInfo(day);

                let bgColor = '';
                let dotColor = '';
                if (dateInfo?.isBlocked) {
                  bgColor = 'bg-[var(--coral-100)]';
                  dotColor = 'bg-[var(--coral-500)]';
                } else if (dateInfo?.type === 'specific') {
                  bgColor = 'bg-[var(--violet-100)]';
                  dotColor = 'bg-[var(--violet-500)]';
                } else if (dateInfo?.type === 'recurring') {
                  bgColor = 'bg-[var(--mint-100)]';
                  dotColor = 'bg-[var(--mint-500)]';
                }

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => !isPast && handleCalendarDateClick(day)}
                    disabled={isPast}
                    className={`aspect-square rounded-xl text-sm font-medium transition-all relative flex flex-col items-center justify-center gap-1 ${
                      isPast
                        ? 'text-[var(--gray-300)] cursor-not-allowed'
                        : dateInfo
                        ? `${bgColor} hover:ring-2 hover:ring-[var(--violet-400)] cursor-pointer`
                        : 'hover:bg-[var(--gray-100)] text-[var(--gray-700)] cursor-pointer'
                    } ${isToday ? 'ring-2 ring-[var(--violet-400)]' : ''}`}
                  >
                    <span>{day.getDate()}</span>
                    {dateInfo && !isPast && (
                      <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-[var(--gray-500)] text-center mt-4">
              Click any date to view or add availability
            </p>
          </div>

          {/* Sidebar: Weekly Pattern + Settings */}
          <div className="space-y-6">
            {/* Weekly Pattern Summary */}
            <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--gray-900)]">Weekly Pattern</h3>
                <button
                  onClick={() => {
                    resetModalForm();
                    setModalForm(prev => ({ ...prev, mode: 'recurring' }));
                    setShowAddModal(true);
                  }}
                  className="text-sm text-[var(--violet-600)] font-medium hover:underline"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {DAYS_OF_WEEK.map(day => {
                  const avail = availabilities.find(a => a.dayOfWeek === day.value);
                  return (
                    <div
                      key={day.value}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                        avail ? 'bg-[var(--mint-50)] cursor-pointer hover:bg-[var(--mint-100)]' : 'bg-[var(--gray-50)]'
                      }`}
                      onClick={() => avail && openEditModal('recurring', avail)}
                    >
                      <span className={`text-sm font-medium ${avail ? 'text-[var(--mint-700)]' : 'text-[var(--gray-400)]'}`}>
                        {day.short}
                      </span>
                      <span className={`text-sm ${avail ? 'text-[var(--mint-600)]' : 'text-[var(--gray-400)]'}`}>
                        {avail ? `${avail.startTime} - ${avail.endTime}` : 'Closed'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Booking Advance Notice */}
            <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-5">
              <h3 className="font-semibold text-[var(--gray-900)] mb-3">Advance Notice</h3>
              <select
                value={vendorSettings.bookingAdvanceMinutes}
                onChange={async (e) => {
                  const newValue = parseInt(e.target.value);
                  setVendorSettings({ ...vendorSettings, bookingAdvanceMinutes: newValue });
                  try {
                    await api(`/api/vendors/${user.vendorId}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ vendor: { booking_advance_minutes: newValue } })
                    });
                    setSuccessMessage('Updated!');
                    setTimeout(() => setSuccessMessage(null), 3000);
                  } catch (error) {
                    console.error('Error:', error);
                  }
                }}
                className="input text-sm"
              >
                <option value="0">No advance notice</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="1440">24 hours</option>
                <option value="2880">48 hours</option>
              </select>
              <p className="text-xs text-[var(--gray-500)] mt-2">
                Minimum time before an appointment customers can book
              </p>
            </div>

            {/* Upcoming Special Dates */}
            {dateAvailabilities.length > 0 && (
              <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[var(--gray-900)]">Special Dates</h3>
                  <span className="text-xs text-[var(--gray-500)]">{dateAvailabilities.length} dates</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dateAvailabilities.slice(0, 10).map(da => {
                    const date = new Date(da.date);
                    return (
                      <div
                        key={da.id}
                        onClick={() => openEditModal('specific', da)}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                          da.isBlocked
                            ? 'bg-[var(--coral-50)] hover:bg-[var(--coral-100)]'
                            : 'bg-[var(--violet-50)] hover:bg-[var(--violet-100)]'
                        }`}
                      >
                        <span className={`text-sm font-medium ${da.isBlocked ? 'text-[var(--coral-700)]' : 'text-[var(--violet-700)]'}`}>
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className={`text-sm ${da.isBlocked ? 'text-[var(--coral-600)]' : 'text-[var(--violet-600)]'}`}>
                          {da.isBlocked ? 'Blocked' : `${da.startTime} - ${da.endTime}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Detail Popover */}
      {selectedCalendarDate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCalendarDate(null)}>
          <div className="bg-white rounded-[var(--radius-2xl)] max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className={`p-5 rounded-t-[var(--radius-2xl)] ${
              selectedCalendarDate.info.isBlocked
                ? 'bg-gradient-to-br from-[var(--coral-500)] to-[var(--coral-600)]'
                : selectedCalendarDate.info.type === 'specific'
                ? 'bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)]'
                : 'bg-gradient-to-br from-[var(--mint-500)] to-[var(--mint-600)]'
            }`}>
              <h3 className="text-white font-semibold text-lg">
                {selectedCalendarDate.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <p className="text-white/80 text-sm">
                {selectedCalendarDate.info.type === 'recurring' ? 'Recurring Schedule' : 'Specific Date'}
                {selectedCalendarDate.info.isBlocked && ' - Blocked'}
              </p>
            </div>
            <div className="p-5">
              {selectedCalendarDate.info.isBlocked ? (
                <p className="text-[var(--gray-600)] text-sm mb-4">This date is blocked and unavailable for bookings.</p>
              ) : (
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-[var(--gray-500)]">Hours</span>
                    <span className="text-[var(--gray-900)] font-medium">
                      {selectedCalendarDate.info.data.startTime} - {selectedCalendarDate.info.data.endTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--gray-500)]">Slot Duration</span>
                    <span className="text-[var(--gray-900)] font-medium">{selectedCalendarDate.info.data.slotDuration} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--gray-500)]">Capacity</span>
                    <span className="text-[var(--gray-900)] font-medium">{selectedCalendarDate.info.data.employeeCount} concurrent</span>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    openEditModal(selectedCalendarDate.info.type, selectedCalendarDate.info.data);
                    setSelectedCalendarDate(null);
                  }}
                  className="flex-1 h-10 rounded-[var(--radius-lg)] bg-[var(--violet-600)] text-white text-sm font-medium hover:bg-[var(--violet-700)] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    handleDelete(selectedCalendarDate.info.type, selectedCalendarDate.info.data.id);
                    setSelectedCalendarDate(null);
                  }}
                  className="flex-1 h-10 rounded-[var(--radius-lg)] border border-[var(--coral-300)] text-[var(--coral-600)] text-sm font-medium hover:bg-[var(--coral-50)] transition-colors"
                >
                  Delete
                </button>
              </div>
              {selectedCalendarDate.info.type === 'recurring' && (
                <button
                  onClick={() => {
                    resetModalForm();
                    setModalForm(prev => ({
                      ...prev,
                      mode: 'specific',
                      selectedDates: [selectedCalendarDate.date.toISOString()],
                      startTime: selectedCalendarDate.info.data.startTime.substring(0, 5),
                      endTime: selectedCalendarDate.info.data.endTime.substring(0, 5),
                      slotDuration: selectedCalendarDate.info.data.slotDuration,
                      employeeCount: selectedCalendarDate.info.data.employeeCount
                    }));
                    setShowAddModal(true);
                    setSelectedCalendarDate(null);
                  }}
                  className="w-full mt-3 h-10 rounded-[var(--radius-lg)] border border-[var(--gray-200)] text-[var(--gray-600)] text-sm font-medium hover:bg-[var(--gray-50)] transition-colors"
                >
                  Override for this date only
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unified Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[var(--radius-2xl)] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-[var(--gray-100)] px-6 py-4 rounded-t-[var(--radius-2xl)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--gray-900)]">
                  {editingItem ? 'Edit Availability' : 'Add Availability'}
                </h2>
                <button
                  onClick={() => { setShowAddModal(false); setEditingItem(null); resetModalForm(); }}
                  className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-5">
              {/* Mode Toggle - only show when not editing */}
              {!editingItem && (
                <div className="flex gap-2 p-1 bg-[var(--gray-100)] rounded-[var(--radius-lg)]">
                  <button
                    type="button"
                    onClick={() => setModalForm(prev => ({ ...prev, mode: 'recurring', selectedDates: [] }))}
                    className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-all ${
                      modalForm.mode === 'recurring'
                        ? 'bg-white text-[var(--violet-700)] shadow-sm'
                        : 'text-[var(--gray-600)] hover:text-[var(--gray-900)]'
                    }`}
                  >
                    Recurring Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalForm(prev => ({ ...prev, mode: 'specific', selectedDays: [] }))}
                    className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-all ${
                      modalForm.mode === 'specific'
                        ? 'bg-white text-[var(--violet-700)] shadow-sm'
                        : 'text-[var(--gray-600)] hover:text-[var(--gray-900)]'
                    }`}
                  >
                    Specific Dates
                  </button>
                </div>
              )}

              {/* Recurring Days Selection */}
              {modalForm.mode === 'recurring' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-3">
                    {editingItem ? 'Day' : 'Select Days'}
                  </label>
                  {editingItem ? (
                    <div className="p-3 bg-[var(--gray-50)] rounded-[var(--radius-lg)] text-sm text-[var(--gray-700)]">
                      {DAYS_OF_WEEK.find(d => d.value === modalForm.selectedDays[0])?.label}
                    </div>
                  ) : (
                    <>
                      {/* Quick Presets */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {DAY_GROUPS.map(group => (
                          <button
                            key={group.value}
                            type="button"
                            onClick={() => setModalForm(prev => ({ ...prev, selectedDays: group.days, dayGroup: group.value }))}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              modalForm.dayGroup === group.value
                                ? 'bg-[var(--violet-600)] text-white'
                                : 'bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]'
                            }`}
                          >
                            {group.label}
                          </button>
                        ))}
                      </div>
                      {/* Day Grid */}
                      <div className="grid grid-cols-7 gap-2">
                        {DAYS_OF_WEEK.map(day => {
                          const isSelected = modalForm.selectedDays.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => {
                                const newDays = isSelected
                                  ? modalForm.selectedDays.filter(d => d !== day.value)
                                  : [...modalForm.selectedDays, day.value];
                                setModalForm(prev => ({ ...prev, selectedDays: newDays, dayGroup: '' }));
                              }}
                              className={`aspect-square rounded-lg text-xs font-medium transition-all ${
                                isSelected
                                  ? 'bg-[var(--violet-600)] text-white'
                                  : 'bg-white border border-[var(--gray-200)] text-[var(--gray-600)] hover:border-[var(--violet-300)]'
                              }`}
                            >
                              {day.letter}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Specific Dates Selection */}
              {modalForm.mode === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-3">
                    {editingItem ? 'Date' : 'Select Dates'}
                  </label>
                  {editingItem ? (
                    <div className="p-3 bg-[var(--gray-50)] rounded-[var(--radius-lg)] text-sm text-[var(--gray-700)]">
                      {new Date(modalForm.selectedDates[0]).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  ) : (
                    <div className="border border-[var(--gray-200)] rounded-[var(--radius-xl)] p-4">
                      {/* Mini Calendar for Date Selection */}
                      <div className="flex items-center justify-between mb-3">
                        <button type="button" onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))} className="p-1 hover:bg-[var(--gray-100)] rounded">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <span className="text-sm font-medium">{monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</span>
                        <button type="button" onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))} className="p-1 hover:bg-[var(--gray-100)] rounded">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                          <div key={i} className="text-center text-xs text-[var(--gray-400)] py-1">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, index) => {
                          if (!day) return <div key={`e-${index}`} className="w-8 h-8" />;
                          const isPast = day < new Date().setHours(0, 0, 0, 0);
                          const isSelected = modalForm.selectedDates.some(d => new Date(d).toDateString() === day.toDateString());
                          return (
                            <button
                              key={day.toISOString()}
                              type="button"
                              disabled={isPast}
                              onClick={() => {
                                const dateStr = day.toISOString();
                                const newDates = isSelected
                                  ? modalForm.selectedDates.filter(d => new Date(d).toDateString() !== day.toDateString())
                                  : [...modalForm.selectedDates, dateStr];
                                setModalForm(prev => ({ ...prev, selectedDates: newDates }));
                              }}
                              className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                                isPast ? 'text-[var(--gray-300)] cursor-not-allowed'
                                  : isSelected ? 'bg-[var(--violet-600)] text-white'
                                  : 'hover:bg-[var(--gray-100)] text-[var(--gray-700)]'
                              }`}
                            >
                              {day.getDate()}
                            </button>
                          );
                        })}
                      </div>
                      {modalForm.selectedDates.length > 0 && (
                        <div className="mt-3 p-2 bg-[var(--violet-50)] rounded-lg text-sm text-[var(--violet-700)]">
                          {modalForm.selectedDates.length} date{modalForm.selectedDates.length !== 1 && 's'} selected
                        </div>
                      )}
                    </div>
                  )}

                  {/* Block Toggle for Specific Dates */}
                  <div className="flex items-center gap-3 mt-4 p-3 bg-[var(--gray-50)] rounded-[var(--radius-lg)]">
                    <input
                      type="checkbox"
                      id="isBlocked"
                      checked={modalForm.isBlocked}
                      onChange={(e) => setModalForm(prev => ({ ...prev, isBlocked: e.target.checked }))}
                      className="w-5 h-5 rounded border-[var(--gray-300)] text-[var(--coral-600)] focus:ring-[var(--coral-500)]"
                    />
                    <label htmlFor="isBlocked" className="flex-1 cursor-pointer">
                      <div className="font-medium text-[var(--gray-900)] text-sm">Block these dates</div>
                      <div className="text-xs text-[var(--gray-500)]">No bookings allowed</div>
                    </label>
                  </div>
                </div>
              )}

              {/* Time Configuration - only show if not blocked */}
              {!modalForm.isBlocked && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Start Time</label>
                      <input
                        type="time"
                        value={modalForm.startTime}
                        onChange={(e) => setModalForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">End Time</label>
                      <input
                        type="time"
                        value={modalForm.endTime}
                        onChange={(e) => setModalForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="input"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Slot Duration</label>
                      <select
                        value={modalForm.slotDuration}
                        onChange={(e) => setModalForm(prev => ({ ...prev, slotDuration: e.target.value }))}
                        className="input"
                      >
                        <option value="15">15 min</option>
                        <option value="30">30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Employees</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={modalForm.employeeCount}
                        onChange={(e) => setModalForm(prev => ({ ...prev, employeeCount: e.target.value }))}
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Break Between</label>
                    <select
                      value={modalForm.breakDuration}
                      onChange={(e) => setModalForm(prev => ({ ...prev, breakDuration: e.target.value }))}
                      className="input"
                    >
                      <option value="0">No break</option>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                    </select>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[var(--gray-100)]">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingItem(null); resetModalForm(); }}
                  className="flex-1 h-11 rounded-[var(--radius-lg)] border border-[var(--gray-200)] text-[var(--gray-700)] font-medium hover:bg-[var(--gray-50)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (modalForm.mode === 'recurring' && modalForm.selectedDays.length === 0) || (modalForm.mode === 'specific' && modalForm.selectedDates.length === 0)}
                  className="flex-1 h-11 rounded-[var(--radius-lg)] bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
