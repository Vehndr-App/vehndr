"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "../../services/api";
import RescheduleModal from "../../components/RescheduleModal";
import { getStorefrontPath } from "../../utils/storefrontLinks";

// Keep saveBooking for backward compatibility (no-op now)
export function saveBooking(booking) {
  // Bookings are now created on checkout, not stored locally
  console.log("Booking will be saved on checkout:", booking);
}

export default function AppointmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("bookings"); // bookings, orders
  const [filter, setFilter] = useState("upcoming"); // upcoming, past, all
  const [rescheduleBooking, setRescheduleBooking] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch both bookings and orders in parallel
        const [bookingsResponse, ordersResponse] = await Promise.all([
          api('/bookings/my_bookings').catch(() => []),
          api('/api/orders').catch(() => [])
        ]);

        // Transform API bookings to match component format
        const transformedBookings = (bookingsResponse || []).map(booking => ({
          id: booking.id,
          serviceName: booking.product?.name || 'Service',
          vendorName: booking.vendor?.name || 'Vendor',
          vendorId: booking.vendorId,
          date: booking.bookingDate,
          timeSlot: booking.startTime,
          duration: booking.product?.duration || 0,
          price: booking.product?.price || 0,
          status: booking.status,
          options: {}
        }));

        setBookings(transformedBookings);
        setOrders(ordersResponse || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setBookings([]);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const now = new Date();
  
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.date);
    if (filter === "upcoming") return bookingDate >= now;
    if (filter === "past") return bookingDate < now;
    return true;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const upcomingCount = bookings.filter(b => new Date(b.date) >= now).length;
  const pastCount = bookings.filter(b => new Date(b.date) < now).length;

  const handleRescheduleSuccess = async () => {
    // Refetch bookings after successful reschedule
    try {
      const response = await api('/bookings/my_bookings');
      const transformedBookings = response.map(booking => ({
        id: booking.id,
        serviceName: booking.product?.name || 'Service',
        vendorName: booking.vendor?.name || 'Vendor',
        vendorId: booking.vendorId,
        date: booking.bookingDate,
        timeSlot: booking.startTime,
        duration: booking.product?.duration || 0,
        price: booking.product?.price || 0,
        status: booking.status,
        options: {}
      }));
      setBookings(transformedBookings);
    } catch (error) {
      console.error('Error refetching bookings:', error);
    }
  };

  // Filter orders by date
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (filter === "upcoming") return orderDate >= thirtyDaysAgo; // Recent orders
    if (filter === "past") return orderDate < thirtyDaysAgo;
    return true;
  });

  const recentOrdersCount = orders.filter(o => {
    const orderDate = new Date(o.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return orderDate >= thirtyDaysAgo;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[var(--violet-600)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--gray-500)]">Loading your bookings and orders...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">Sign in to view your activity</h2>
          <p className="text-[var(--gray-500)] mb-6">You need to be signed in to see your bookings and orders.</p>
          <Link href="/login" className="btn btn-gradient inline-flex">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gray-50)] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--violet-600)] via-[var(--magenta-500)] to-[var(--coral-500)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdi0yMGgtNjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl">
              {section === "bookings" ? "📅" : "📦"}
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl text-white tracking-tight">
                Bookings & Orders
              </h1>
              <p className="text-white/80 text-sm">
                {upcomingCount} upcoming booking{upcomingCount !== 1 ? 's' : ''} · {orders.length} order{orders.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 -mt-6 relative z-10">
        {/* Section Tabs */}
        <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-2 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSection("bookings")}
              className={`flex-1 py-3 px-4 rounded-[var(--radius-xl)] text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                section === "bookings"
                  ? "bg-[var(--violet-600)] text-white shadow-md"
                  : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Bookings ({bookings.length})
            </button>
            <button
              onClick={() => setSection("orders")}
              className={`flex-1 py-3 px-4 rounded-[var(--radius-xl)] text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                section === "orders"
                  ? "bg-[var(--violet-600)] text-white shadow-md"
                  : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Orders ({orders.length})
            </button>
          </div>
        </div>

        {section === "bookings" ? (
          <>
            {/* Filter Tabs for Bookings */}
            <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-2 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter("upcoming")}
                  className={`flex-1 py-2.5 px-4 rounded-[var(--radius-xl)] text-sm font-medium transition-all ${
                    filter === "upcoming"
                      ? "bg-[var(--violet-600)] text-white shadow-md"
                      : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
                  }`}
                >
                  Upcoming ({upcomingCount})
                </button>
                <button
                  onClick={() => setFilter("past")}
                  className={`flex-1 py-2.5 px-4 rounded-[var(--radius-xl)] text-sm font-medium transition-all ${
                    filter === "past"
                      ? "bg-[var(--violet-600)] text-white shadow-md"
                      : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
                  }`}
                >
                  Past ({pastCount})
                </button>
                <button
                  onClick={() => setFilter("all")}
                  className={`flex-1 py-2.5 px-4 rounded-[var(--radius-xl)] text-sm font-medium transition-all ${
                    filter === "all"
                      ? "bg-[var(--violet-600)] text-white shadow-md"
                      : "text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
                  }`}
                >
                  All ({bookings.length})
                </button>
              </div>
            </div>

            {/* Bookings List */}
            {filteredBookings.length > 0 ? (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} onReschedule={setRescheduleBooking} />
                ))}
              </div>
            ) : (
              <EmptyState filter={filter} type="bookings" />
            )}
          </>
        ) : (
          <>
            {/* Orders List */}
            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <EmptyState type="orders" />
            )}
          </>
        )}
      </div>

      {/* Reschedule Modal */}
      <RescheduleModal
        booking={rescheduleBooking}
        isOpen={!!rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
        onSuccess={handleRescheduleSuccess}
      />
    </div>
  );
}

function BookingCard({ booking, onReschedule }) {
  const bookingDate = new Date(booking.date);
  const isPast = bookingDate < new Date();
  
  const statusStyles = {
    confirmed: "bg-[var(--mint-100)] text-[var(--mint-700)]",
    pending: "bg-[var(--amber-100)] text-[var(--amber-700)]",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-[var(--gray-100)] text-[var(--gray-600)]"
  };

  const status = isPast ? "completed" : booking.status;

  return (
    <div className={`bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] overflow-hidden ${isPast ? "opacity-75" : ""}`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Date Badge */}
          <div className="flex-shrink-0 w-16 h-16 rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)] flex flex-col items-center justify-center text-white">
            <span className="text-xs font-medium uppercase">
              {bookingDate.toLocaleDateString('en-US', { month: 'short' })}
            </span>
            <span className="text-2xl font-bold leading-none">
              {bookingDate.getDate()}
            </span>
          </div>

          {/* Booking Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[var(--gray-900)] truncate">
                {booking.serviceName}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
                {status}
              </span>
            </div>
            
            <p className="text-sm text-[var(--gray-500)] mb-2">
              {booking.vendorName}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-[var(--gray-600)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {booking.timeSlot} • {booking.duration} min
              </span>
              <span className="font-semibold text-[var(--violet-600)]">
                ${(booking.price / 100).toFixed(2)}
              </span>
            </div>

            {/* Options */}
            {booking.options && Object.keys(booking.options).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {Object.entries(booking.options).map(([key, value]) => {
                  if (key === 'timeSlot' || key === 'duration' || key === 'date') return null;
                  return (
                    <span key={key} className="px-2 py-1 bg-[var(--gray-100)] text-[var(--gray-600)] text-xs rounded-full">
                      {value}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isPast && (
        <div className="px-5 py-3 bg-[var(--gray-50)] border-t border-[var(--gray-100)] flex gap-3">
          <Link
            href={getStorefrontPath({ vendorSlug: booking.vendorSlug, vendorId: booking.vendorId })}
            className="flex-1 h-9 rounded-[var(--radius-lg)] border border-[var(--gray-200)] text-[var(--gray-600)] text-sm font-medium flex items-center justify-center hover:bg-white transition-colors"
          >
            View Vendor
          </Link>
          <button
            onClick={() => onReschedule(booking)}
            className="flex-1 h-9 rounded-[var(--radius-lg)] border border-[var(--coral-200)] text-[var(--coral-600)] text-sm font-medium flex items-center justify-center hover:bg-[var(--coral-50)] transition-colors"
          >
            Reschedule
          </button>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }) {
  const orderDate = new Date(order.created_at);

  const statusStyles = {
    confirmed: "bg-[var(--mint-100)] text-[var(--mint-700)]",
    pending: "bg-[var(--amber-100)] text-[var(--amber-700)]",
    completed: "bg-[var(--gray-100)] text-[var(--gray-600)]",
    cancelled: "bg-red-100 text-red-700",
    refunded: "bg-red-100 text-red-700"
  };

  const paymentStatusStyles = {
    succeeded: "bg-[var(--mint-100)] text-[var(--mint-700)]",
    pending: "bg-[var(--amber-100)] text-[var(--amber-700)]",
    failed: "bg-red-100 text-red-700"
  };

  return (
    <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Date Badge */}
          <div className="flex-shrink-0 w-16 h-16 rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--coral-500)] to-[var(--magenta-500)] flex flex-col items-center justify-center text-white">
            <span className="text-xs font-medium uppercase">
              {orderDate.toLocaleDateString('en-US', { month: 'short' })}
            </span>
            <span className="text-2xl font-bold leading-none">
              {orderDate.getDate()}
            </span>
          </div>

          {/* Order Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[var(--gray-900)] truncate">
                {order.vendor?.name || 'Vendor'}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[order.status] || statusStyles.pending}`}>
                {order.status}
              </span>
              {order.refund_status === 'refunded' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  Refunded
                </span>
              )}
            </div>

            <p className="text-sm text-[var(--gray-500)] mb-2">
              Order #{order.id} · {orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>

            {/* Order Items */}
            <div className="space-y-1 mb-2">
              {order.line_items?.slice(0, 3).map((item, index) => (
                <div key={item.id || index} className="text-sm text-[var(--gray-600)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-[var(--gray-100)] flex items-center justify-center text-xs">
                    {item.quantity}
                  </span>
                  <span className="truncate">{item.product?.name || 'Item'}</span>
                </div>
              ))}
              {order.line_items?.length > 3 && (
                <p className="text-xs text-[var(--gray-400)]">
                  +{order.line_items.length - 3} more item{order.line_items.length - 3 !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-[var(--violet-600)]">
                ${(order.total_cents / 100).toFixed(2)}
              </span>
              {order.tip_cents > 0 && (
                <span className="text-[var(--gray-500)]">
                  (incl. ${(order.tip_cents / 100).toFixed(2)} tip)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 bg-[var(--gray-50)] border-t border-[var(--gray-100)] flex gap-3">
        <Link
          href={getStorefrontPath(order.vendor || { id: order.vendor?.id })}
          className="flex-1 h-9 rounded-[var(--radius-lg)] border border-[var(--gray-200)] text-[var(--gray-600)] text-sm font-medium flex items-center justify-center hover:bg-white transition-colors"
        >
          View Vendor
        </Link>
        <Link
          href={`/checkout/success?order_id=${order.id}`}
          className="flex-1 h-9 rounded-[var(--radius-lg)] border border-[var(--violet-200)] text-[var(--violet-600)] text-sm font-medium flex items-center justify-center hover:bg-[var(--violet-50)] transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ filter, type = "bookings" }) {
  if (type === "orders") {
    return (
      <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
          <span className="text-4xl">📦</span>
        </div>
        <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-2">
          No orders yet
        </h2>
        <p className="text-[var(--gray-500)] mb-6 max-w-sm mx-auto">
          Your order history will appear here after you make a purchase.
        </p>
        <Link href="/vendors" className="btn btn-gradient inline-flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          Browse Vendors
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-8 text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
        <span className="text-4xl">📅</span>
      </div>
      <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-2">
        {filter === "upcoming" ? "No upcoming appointments" : filter === "past" ? "No past appointments" : "No appointments yet"}
      </h2>
      <p className="text-[var(--gray-500)] mb-6 max-w-sm mx-auto">
        {filter === "upcoming"
          ? "Book a service to see your upcoming appointments here."
          : "Your appointment history will appear here."}
      </p>
      <Link href="/vendors" className="btn btn-gradient inline-flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        Browse Services
      </Link>
    </div>
  );
}

