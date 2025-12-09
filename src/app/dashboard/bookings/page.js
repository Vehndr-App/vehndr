"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import AuthGate from "../../../components/AuthGate";

// Mock bookings data - in production this would come from the API
const MOCK_BOOKINGS = [
  {
    id: "1",
    customerName: "Sarah Johnson",
    customerEmail: "sarah@example.com",
    serviceName: "Chair Massage Session",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0], // Tomorrow
    timeSlot: "10:00 AM",
    duration: 30,
    price: 5000,
    status: "confirmed",
    options: { pressure: "Medium", focus: "Full Upper Body" }
  },
  {
    id: "2",
    customerName: "Mike Chen",
    customerEmail: "mike@example.com",
    serviceName: "Private Yoga Session",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().split('T')[0], // Day after tomorrow
    timeSlot: "9:00 AM",
    duration: 60,
    price: 7500,
    status: "confirmed",
    options: { level: "Intermediate", style: "Vinyasa" }
  },
  {
    id: "3",
    customerName: "Emily Rodriguez",
    customerEmail: "emily@example.com",
    serviceName: "Guided Meditation",
    date: new Date().toISOString().split('T')[0], // Today
    timeSlot: "2:00 PM",
    duration: 45,
    price: 3500,
    status: "confirmed",
    options: { type: "Mindfulness" }
  }
];

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
  const [bookings, setBookings] = useState(MOCK_BOOKINGS);
  const [view, setView] = useState("calendar"); // calendar, list

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
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--mint-100)] text-[var(--mint-700)]">
                        {booking.status}
                      </span>
                    </div>
                    
                    <p className="font-medium text-[var(--gray-800)] mb-1">{booking.serviceName}</p>
                    
                    <div className="flex items-center gap-2 text-sm text-[var(--gray-500)]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {booking.customerName}
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
                      <button className="text-xs font-medium text-[var(--gray-500)] hover:text-[var(--gray-700)]">
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
    </div>
  );
}

