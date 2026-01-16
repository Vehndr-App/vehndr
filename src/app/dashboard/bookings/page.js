"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import AuthGate from "../../../components/AuthGate";
import { api } from "../../../services/api";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function VendorBookingsPage() {
  return (
    <AuthGate allowedRoles={["vendor"]}>
      <VendorBookingsInner />
    </AuthGate>
  );
}

function VendorBookingsInner() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("calendar"); // calendar, list
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch vendor bookings
  useEffect(() => {
    const fetchBookings = async () => {
      if (!user?.vendorId) return;

      try {
        setLoading(true);
        const response = await api(`/api/vendors/${user.vendorId}/bookings`);
        const bookingsData = response.bookings || response;

        // Transform API bookings to match component format
        const transformedBookings = bookingsData.map(booking => ({
          id: booking.id,
          customerName: booking.customerName || 'N/A',
          customerEmail: booking.customerEmail || '',
          customerPhone: booking.customerPhone || '',
          serviceName: booking.product?.name || 'Service',
          serviceDescription: booking.product?.description || '',
          date: booking.bookingDate,
          timeSlot: booking.startTime,
          endTime: booking.endTime,
          duration: booking.product?.duration || 0,
          price: booking.product?.price || 0,
          status: booking.status,
          employeeName: booking.employee?.name,
          createdAt: booking.createdAt,
          options: {}
        }));

        setBookings(transformedBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  // Get bookings for selected date
  const selectedDateBookings = bookings.filter(
    b => b.date === selectedDate.toISOString().split('T')[0]
  ).sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

  // Get dates with bookings for the current month
  const bookingDates = new Set(bookings.map(b => b.date));

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

  const calendarDays = generateCalendarDays();

  // Stats
  const todayBookings = bookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length;
  const weekBookings = bookings.filter(b => {
    const bookingDate = new Date(b.date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return bookingDate >= today && bookingDate <= weekFromNow;
  }).length;

  // Update booking status
  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      setUpdatingStatus(true);
      await api(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: { status: newStatus }
      });

      // Update local state
      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, status: newStatus } : b
      ));

      // Update selected booking if it's the one being modified
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-[var(--mint-100)] text-[var(--mint-700)]';
      case 'pending':
        return 'bg-[var(--amber-100)] text-[var(--amber-700)]';
      case 'completed':
        return 'bg-[var(--violet-100)] text-[var(--violet-700)]';
      case 'cancelled':
        return 'bg-[var(--gray-100)] text-[var(--gray-500)]';
      default:
        return 'bg-[var(--gray-100)] text-[var(--gray-600)]';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[var(--violet-600)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--gray-500)]">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gray-50)] pb-24">
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
                  Booking Calendar
                </h1>
                <p className="text-white/80 text-sm">
                  Manage your service appointments
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-[var(--radius-xl)] p-4 text-center">
              <div className="text-2xl font-bold text-white">{todayBookings}</div>
              <div className="text-xs text-white/70 font-medium">Today</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-[var(--radius-xl)] p-4 text-center">
              <div className="text-2xl font-bold text-white">{weekBookings}</div>
              <div className="text-xs text-white/70 font-medium">This Week</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 -mt-6 relative z-10">
        {/* View Toggle */}
        <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-2 mb-6 inline-flex">
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-2 rounded-[var(--radius-xl)] text-sm font-medium transition-all ${
              view === "calendar"
                ? "bg-[var(--violet-600)] text-white"
                : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
            }`}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded-[var(--radius-xl)] text-sm font-medium transition-all ${
              view === "list"
                ? "bg-[var(--violet-600)] text-white"
                : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
            }`}
          >
            📋 List
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                className="w-10 h-10 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <h2 className="text-xl font-semibold text-[var(--gray-900)]">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button 
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
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

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
                
                const dateStr = day.toISOString().split('T')[0];
                const hasBookings = bookingDates.has(dateStr);
                const isToday = day.toDateString() === new Date().toDateString();
                const isSelected = day.toDateString() === selectedDate.toDateString();
                const dayBookings = bookings.filter(b => b.date === dateStr);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square rounded-[var(--radius-xl)] flex flex-col items-center justify-center transition-all relative ${
                      isSelected
                        ? "bg-[var(--violet-600)] text-white shadow-lg"
                        : isToday
                        ? "bg-[var(--violet-100)] text-[var(--violet-700)]"
                        : "hover:bg-[var(--gray-100)] text-[var(--gray-700)]"
                    }`}
                  >
                    <span className="text-sm font-medium">{day.getDate()}</span>
                    {hasBookings && (
                      <div className={`absolute bottom-1.5 flex gap-0.5 ${isSelected ? "text-white/80" : ""}`}>
                        {dayBookings.slice(0, 3).map((_, i) => (
                          <span 
                            key={i} 
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? "bg-white/80" : "bg-[var(--coral-500)]"
                            }`}
                          />
                        ))}
                        {dayBookings.length > 3 && (
                          <span className={`text-[8px] font-bold ${isSelected ? "" : "text-[var(--coral-500)]"}`}>
                            +{dayBookings.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Bookings */}
          <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="p-4 border-b border-[var(--gray-100)] bg-[var(--gray-50)]">
              <h3 className="font-semibold text-[var(--gray-900)]">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <p className="text-sm text-[var(--gray-500)]">
                {selectedDateBookings.length} booking{selectedDateBookings.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {selectedDateBookings.length > 0 ? (
                selectedDateBookings.map((booking) => (
                  <div 
                    key={booking.id}
                    className="p-4 rounded-[var(--radius-xl)] border border-[var(--gray-200)] hover:border-[var(--violet-300)] hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-[var(--gray-900)]">{booking.timeSlot}</p>
                        <p className="text-sm text-[var(--gray-500)]">{booking.duration} min</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                    
                    <p className="font-medium text-[var(--gray-800)] mb-1">{booking.serviceName}</p>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-[var(--gray-500)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        {booking.customerName}
                      </div>
                      {booking.employeeName && (
                        <div className="flex items-center gap-2 text-sm text-[var(--gray-500)]">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="8.5" cy="7" r="4"/>
                            <polyline points="17 11 19 13 23 9"/>
                          </svg>
                          Staff: {booking.employeeName}
                        </div>
                      )}
                    </div>

                    {booking.options && Object.keys(booking.options).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(booking.options).map(([key, value]) => (
                          <span key={key} className="px-2 py-0.5 bg-[var(--gray-100)] text-[var(--gray-600)] text-xs rounded-full">
                            {value}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-[var(--gray-100)] flex items-center justify-between">
                      <span className="font-semibold text-[var(--violet-600)]">
                        ${(booking.price / 100).toFixed(2)}
                      </span>
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="text-xs font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)]"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
                    <span className="text-xl">📅</span>
                  </div>
                  <p className="text-sm text-[var(--gray-500)]">No bookings for this date</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[var(--radius-2xl)] shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--gray-100)]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--gray-900)]">
                    {selectedBooking.serviceName}
                  </h2>
                  <p className="text-sm text-[var(--gray-500)] mt-1">
                    Booking #{selectedBooking.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--gray-600)]">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>

              {/* Date & Time */}
              <div className="bg-[var(--gray-50)] rounded-[var(--radius-xl)] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--gray-900)]">
                      {new Date(selectedBooking.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-[var(--gray-500)]">
                      {selectedBooking.timeSlot} - {selectedBooking.endTime} ({selectedBooking.duration} min)
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-medium text-[var(--gray-600)] mb-3">Customer Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span className="text-[var(--gray-900)]">{selectedBooking.customerName}</span>
                  </div>
                  {selectedBooking.customerEmail && (
                    <div className="flex items-center gap-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <a href={`mailto:${selectedBooking.customerEmail}`} className="text-[var(--violet-600)] hover:underline">
                        {selectedBooking.customerEmail}
                      </a>
                    </div>
                  )}
                  {selectedBooking.customerPhone && (
                    <div className="flex items-center gap-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      <a href={`tel:${selectedBooking.customerPhone}`} className="text-[var(--violet-600)] hover:underline">
                        {selectedBooking.customerPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Staff Assignment */}
              {selectedBooking.employeeName && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--gray-600)] mb-3">Assigned Staff</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--mint-100)] flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <polyline points="17 11 19 13 23 9"/>
                      </svg>
                    </div>
                    <span className="text-[var(--gray-900)]">{selectedBooking.employeeName}</span>
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--gray-100)]">
                <span className="text-sm font-medium text-[var(--gray-600)]">Total</span>
                <span className="text-xl font-bold text-[var(--violet-600)]">
                  ${(selectedBooking.price / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Modal Footer - Actions */}
            <div className="p-6 border-t border-[var(--gray-100)] bg-[var(--gray-50)]">
              <div className="flex flex-wrap gap-2">
                {selectedBooking.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, 'confirmed')}
                      disabled={updatingStatus}
                      className="flex-1 px-4 py-2 bg-[var(--mint-500)] text-white rounded-[var(--radius-lg)] font-medium hover:bg-[var(--mint-600)] transition-colors disabled:opacity-50"
                    >
                      {updatingStatus ? 'Updating...' : 'Confirm Booking'}
                    </button>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, 'cancelled')}
                      disabled={updatingStatus}
                      className="px-4 py-2 border border-[var(--gray-300)] text-[var(--gray-700)] rounded-[var(--radius-lg)] font-medium hover:bg-[var(--gray-100)] transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {selectedBooking.status === 'confirmed' && (
                  <>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, 'completed')}
                      disabled={updatingStatus}
                      className="flex-1 px-4 py-2 bg-[var(--violet-600)] text-white rounded-[var(--radius-lg)] font-medium hover:bg-[var(--violet-700)] transition-colors disabled:opacity-50"
                    >
                      {updatingStatus ? 'Updating...' : 'Mark as Completed'}
                    </button>
                    <button
                      onClick={() => updateBookingStatus(selectedBooking.id, 'cancelled')}
                      disabled={updatingStatus}
                      className="px-4 py-2 border border-[var(--gray-300)] text-[var(--gray-700)] rounded-[var(--radius-lg)] font-medium hover:bg-[var(--gray-100)] transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {(selectedBooking.status === 'completed' || selectedBooking.status === 'cancelled') && (
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="flex-1 px-4 py-2 bg-[var(--gray-200)] text-[var(--gray-700)] rounded-[var(--radius-lg)] font-medium hover:bg-[var(--gray-300)] transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

