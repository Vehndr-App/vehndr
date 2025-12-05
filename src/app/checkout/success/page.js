'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { useCart } from '../../../contexts/CartContext';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearVendor } = useCart();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const vendorId = searchParams.get('vendor_id');

    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    // Clear the vendor's items from cart
    if (vendorId) {
      clearVendor(vendorId);
    }

    // Optional: Fetch order details from backend
    const fetchOrderDetails = async () => {
      try {
        // You could add an endpoint to fetch order details by session ID
        // const orderData = await api(`/api/checkout/session/${sessionId}`);
        // setOrder(orderData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch order details', err);
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [searchParams, clearVendor]);

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
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Error</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
        <p className="text-lg text-gray-600 mb-8">
          Thank you for your order. Your payment has been processed successfully.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-blue-900 mb-2">What&apos;s Next?</h2>
          <ul className="text-sm text-blue-800 space-y-2 text-left">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>You&apos;ll receive an order confirmation email shortly</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>The vendor has been notified of your order</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
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
                <span className="font-mono">{order.id}</span>
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
