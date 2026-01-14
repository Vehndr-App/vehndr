'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { useCart } from '../../../contexts/CartContext';
import AddToCalendar from '../../../components/AddToCalendar';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearVendor } = useCart();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const vendorId = searchParams.get('vendor_id');
    const orderId = searchParams.get('order_id');

    // Clear the vendor's items from cart
    if (vendorId && clearVendor) {
      clearVendor(vendorId);
    }

    // Fetch order details if we have an order ID
    if (orderId) {
      fetchOrderDetails(orderId);
    } else {
      setLoading(false);
    }
  }, [searchParams, clearVendor]);

  const fetchOrderDetails = async (orderId) => {
    try {
      const orderData = await api(`/api/orders/${orderId}`);
      setOrder(orderData);
    } catch (err) {
      console.error('Failed to fetch order details:', err);
      // Don't show error to user - just continue without order details
    } finally {
      setLoading(false);
    }
  };

  // Check if any order items have bookings (service appointments)
  const itemsWithBookings = order?.orderItems?.filter(item => item.booking) || [];
  const hasBookings = itemsWithBookings.length > 0;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing your order...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">X</div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Error</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">
          <svg className="w-16 h-16 mx-auto text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
        <p className="text-lg text-gray-600 mb-8">
          Thank you for your order. Your payment has been processed successfully.
        </p>

        {/* Booking Details with Add to Calendar */}
        {hasBookings && (
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-violet-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Your Appointments
            </h2>
            <div className="space-y-4">
              {itemsWithBookings.map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-4 border border-violet-100">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <p className="flex items-center gap-2">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {formatBookingDate(item.booking.bookingDate)}
                        </p>
                        <p className="flex items-center gap-2">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                          </svg>
                          {item.booking.startTime} - {item.booking.endTime}
                        </p>
                        {order?.vendor?.name && (
                          <p className="flex items-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {order.vendor.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <AddToCalendar orderItem={item} vendor={order?.vendor} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-blue-900 mb-2">What&apos;s Next?</h2>
          <ul className="text-sm text-blue-800 space-y-2 text-left">
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>You&apos;ll receive an order confirmation email shortly</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>The vendor has been notified of your order</span>
            </li>
            {hasBookings && (
              <li className="flex items-start">
                <span className="mr-2">-</span>
                <span>Save your appointment to your calendar using the button above</span>
              </li>
            )}
            <li className="flex items-start">
              <span className="mr-2">-</span>
              <span>You can track your order status in your account</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/store')}
            className="px-6 py-3 bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white rounded-lg font-semibold hover:opacity-90 transition"
          >
            Continue Shopping
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Go to Home
          </button>
        </div>

        {order && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span className="font-mono text-xs">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-semibold">${(order.totalCents / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format booking date
function formatBookingDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
