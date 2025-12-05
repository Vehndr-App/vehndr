'use client';

import { useCart } from '../../contexts/CartContext';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { vendorCarts } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vendorDetails, setVendorDetails] = useState({});
  const [loadingVendors, setLoadingVendors] = useState(true);
  const router = useRouter();

  // Fetch vendor details for all vendors in cart
  useEffect(() => {
    const fetchVendorDetails = async () => {
      const vendorIds = Object.keys(vendorCarts);
      if (vendorIds.length === 0) {
        setLoadingVendors(false);
        return;
      }

      try {
        const details = {};
        await Promise.all(
          vendorIds.map(async (vendorId) => {
            const vendor = await api(`/api/vendors/${vendorId}`);
            details[vendorId] = vendor;
          })
        );
        setVendorDetails(details);
      } catch (err) {
        console.error('Failed to fetch vendor details', err);
      } finally {
        setLoadingVendors(false);
      }
    };

    fetchVendorDetails();
  }, [vendorCarts]);

  const handleCheckout = async (vendorId) => {
    setLoading(true);
    setError(null);

    try {
      const items = vendorCarts[vendorId];

      // Create checkout session
      const response = await api('/api/checkout/sessions', {
        method: 'POST',
        body: {
          vendorId: vendorId,
          items: items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            selectedOptions: item.options
          }))
        }
      });

      // Redirect to Stripe checkout
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err.message || 'Failed to create checkout session');
      setLoading(false);
    }
  };

  const calculateVendorTotal = (vendorId) => {
    const items = vendorCarts[vendorId] || [];
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const vendorIds = Object.keys(vendorCarts);

  if (vendorIds.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">Add some items to your cart before checking out.</p>
          <button
            onClick={() => router.push('/store')}
            className="px-6 py-3 bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white rounded-lg font-semibold hover:opacity-90 transition"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
      <p className="text-gray-600 mb-8">Review your order and complete payment</p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {loadingVendors ? (
          <div className="text-center py-12 text-gray-500">Loading vendor information...</div>
        ) : (
          vendorIds.map((vendorId) => {
            const items = vendorCarts[vendorId];
            const vendor = vendorDetails[vendorId];
            const total = calculateVendorTotal(vendorId);
            const canCheckout = vendor?.stripeReadyForCheckout !== false;

            return (
              <div key={vendorId} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Vendor Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {vendor?.name || `Vendor ${vendorId}`}
                    </h2>
                    {!canCheckout && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        Payment Setup Incomplete
                      </span>
                    )}
                  </div>
                  {vendor?.location && (
                    <p className="text-sm text-gray-600 mt-1">{vendor.location}</p>
                  )}
                </div>

                {/* Items List */}
                <div className="px-6 py-4">
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          {item.options && Object.keys(item.options).length > 0 && (
                            <div className="mt-1 text-sm text-gray-600">
                              {Object.entries(item.options).map(([key, value]) => (
                                <span key={key} className="mr-3">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-sm text-gray-500 mt-1">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium text-gray-900">
                            ${((item.price * item.quantity) / 100).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">
                            ${(item.price / 100).toFixed(2)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-gray-900">
                        ${(total / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <div className="mt-6">
                    {canCheckout ? (
                      <button
                        onClick={() => handleCheckout(vendorId)}
                        disabled={loading}
                        className="w-full px-6 py-4 bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white rounded-lg font-semibold text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {loading ? 'Processing...' : `Checkout with ${vendor?.name || 'Vendor'}`}
                      </button>
                    ) : (
                      <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          This vendor hasn&apos;t completed their payment setup yet. They cannot accept payments at this time.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => router.push('/cart')}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          ← Back to Cart
        </button>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Secure Checkout</h3>
        <p className="text-sm text-blue-800">
          Your payment information is processed securely by Stripe. We never store your credit card details.
        </p>
      </div>
    </div>
  );
}
