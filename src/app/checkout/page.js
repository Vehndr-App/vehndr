'use client';

import Link from 'next/link';
import { useCart } from '../../contexts/CartContext';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { vendorCarts, totalItems, allItems } = useCart();
  const [loading, setLoading] = useState(false);
  const [activeVendor, setActiveVendor] = useState(null);
  const [error, setError] = useState(null);
  const [vendorDetails, setVendorDetails] = useState({});
  const [loadingVendors, setLoadingVendors] = useState(true);
  const router = useRouter();

  // Calculate grand total
  const grandTotal = allItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

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
    setActiveVendor(vendorId);
    setError(null);

    try {
      const items = vendorCarts[vendorId];

      // Create checkout session (with demo_mode for development)
      const response = await api('/api/checkout/sessions', {
        method: 'POST',
        body: {
          vendorId: vendorId,
          demo_mode: true, // Enable demo mode for development
          items: items.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            selectedOptions: item.options
          }))
        }
      });

      // Redirect to checkout (Stripe or demo)
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err.message || 'Failed to create checkout session');
      setLoading(false);
      setActiveVendor(null);
    }
  };

  const calculateVendorTotal = (vendorId) => {
    const items = vendorCarts[vendorId] || [];
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const vendorIds = Object.keys(vendorCarts);

  if (vendorIds.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)] mb-2">Your cart is empty</h1>
          <p className="text-[var(--gray-500)] mb-6">Add some items to your cart before checking out.</p>
          <Link
            href="/vendors"
            className="btn btn-gradient inline-flex"
          >
            Browse Vendors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-[var(--gray-900)]">
          Checkout
        </h1>
        <p className="text-[var(--gray-500)] text-sm mt-1">
          Review your order and complete payment
        </p>
      </div>

      {/* Order Summary Banner */}
      <div className="card p-4 mb-6 bg-gradient-to-r from-[var(--violet-50)] to-[var(--magenta-50)] border-[var(--violet-200)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--gray-900)]">
                {totalItems} item{totalItems !== 1 ? 's' : ''} from {vendorIds.length} vendor{vendorIds.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-[var(--gray-500)]">
                Guest checkout available
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--gray-500)]">Total</p>
            <p className="text-xl font-bold text-[var(--gray-900)]">
              ${(grandTotal / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {loadingVendors ? (
          <div className="card p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--violet-600)] border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-[var(--gray-500)]">Loading vendor information...</p>
          </div>
        ) : (
          vendorIds.map((vendorId) => {
            const items = vendorCarts[vendorId];
            const vendor = vendorDetails[vendorId];
            const total = calculateVendorTotal(vendorId);
            const canCheckout = vendor?.stripeReadyForCheckout !== false;
            const isProcessing = loading && activeVendor === vendorId;

            return (
              <div key={vendorId} className="card p-0 overflow-hidden">
                {/* Vendor Header */}
                <div className="flex items-center justify-between p-4 bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                  <div className="flex items-center gap-3">
                    {vendor?.heroImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={vendor.heroImage} 
                        alt={vendor.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                        {vendor?.name?.charAt(0) || 'V'}
                      </div>
                    )}
                    <div>
                      <h2 className="font-semibold text-[var(--gray-900)]">
                        {vendor?.name || `Vendor ${vendorId}`}
                      </h2>
                      {vendor?.location && (
                        <p className="text-xs text-[var(--gray-500)]">{vendor.location}</p>
                      )}
                    </div>
                  </div>
                  {!canCheckout && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--amber-100)] text-[var(--amber-700)]">
                      Setup Incomplete
                    </span>
                  )}
                </div>

                {/* Items List */}
                <div className="divide-y divide-[var(--gray-100)]">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-4 p-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {item.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-[var(--radius-lg)] object-cover bg-[var(--gray-100)]"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--violet-100)] to-[var(--magenta-100)] flex items-center justify-center">
                            <span className="text-2xl">
                              {item.isService ? '✨' : '📦'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-[var(--gray-900)] line-clamp-2">
                          {item.name}
                        </h3>
                        
                        {/* Options */}
                        {item.options && Object.keys(item.options).length > 0 && (
                          <p className="text-xs text-[var(--gray-500)] mt-1">
                            {Object.entries(item.options).map(([key, value]) => (
                              <span key={key} className="mr-2">
                                {key}: <span className="font-medium">{value}</span>
                              </span>
                            ))}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2 py-0.5 rounded-full">
                            Qty: {item.quantity}
                          </span>
                          <span className="text-xs text-[var(--gray-400)]">
                            ${(item.price / 100).toFixed(2)} each
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-[var(--gray-900)]">
                          ${((item.price * item.quantity) / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vendor Footer */}
                <div className="p-4 bg-[var(--gray-50)] border-t border-[var(--gray-100)]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium text-[var(--gray-700)]">Subtotal</span>
                    <span className="text-xl font-bold text-[var(--gray-900)]">
                      ${(total / 100).toFixed(2)}
                    </span>
                  </div>

                  {canCheckout ? (
                    <button
                      onClick={() => handleCheckout(vendorId)}
                      disabled={loading}
                      className="w-full btn btn-gradient h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        `Pay ${vendor?.name || 'Vendor'} $${(total / 100).toFixed(2)}`
                      )}
                    </button>
                  ) : (
                    <div className="text-center p-3 bg-[var(--amber-50)] border border-[var(--amber-200)] rounded-[var(--radius-lg)]">
                      <p className="text-sm text-[var(--amber-700)]">
                        This vendor hasn&apos;t completed their payment setup yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Back to Cart */}
      <div className="mt-6 text-center">
        <button
          onClick={() => router.push('/cart')}
          className="text-[var(--gray-500)] hover:text-[var(--gray-700)] font-medium text-sm inline-flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Cart
        </button>
      </div>

      {/* Secure Checkout Badge */}
      <div className="mt-6 card p-4 bg-[var(--mint-50)] border-[var(--mint-200)]">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--mint-500)] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--mint-700)] text-sm">Secure Checkout</h3>
            <p className="text-xs text-[var(--mint-600)] mt-0.5">
              Your payment is processed securely by Stripe. We never store your card details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
