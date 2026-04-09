'use client';

import Link from 'next/link';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { getVendorProfile } from '../../services/vendors';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentForm from '../../components/PaymentForm';
import TipSelector from '../../components/TipSelector';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const MAX_CHARGE_CENTS = 5000000;
const MAX_CHARGE_LABEL = "$50,000.00";

export default function CheckoutPage() {
  const { vendorCarts, totalItems, allItems, clearVendorCart, updateQuantity, removeItem } = useCart();
  const { refreshUser } = useAuth();
  const [vendorDetails, setVendorDetails] = useState({});
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [error, setError] = useState(null);

  // Per-vendor payment intent state
  const [clientSecrets, setClientSecrets] = useState({});
  const [paymentIntentIds, setPaymentIntentIds] = useState({});
  const [initializingVendors, setInitializingVendors] = useState({});
  const [vendorTaxes, setVendorTaxes] = useState({});

  // Per-vendor user-input state
  const [vendorTips, setVendorTips] = useState({});
  const [vendorNotes, setVendorNotes] = useState({});
  const [vendorPickupDate, setVendorPickupDate] = useState({});
  const [vendorPickupTime, setVendorPickupTime] = useState({});

  // Track debounce timers for tip updates
  const tipUpdateTimers = useRef({});

  const router = useRouter();

  const grandTotal = allItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // ─── Fetch vendor details ────────────────────────────────────────────────
  useEffect(() => {
    const fetchVendorDetails = async () => {
      const vendorIds = Object.keys(vendorCarts);
      if (vendorIds.length === 0) { setLoadingVendors(false); return; }

      try {
        const details = {};
        await Promise.all(
          vendorIds.map(async (vendorId) => {
            const vendor = await getVendorProfile(vendorId);
            if (vendor) details[vendorId] = vendor;
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

  // ─── Create PaymentIntents on load (once vendors are known) ─────────────
  useEffect(() => {
    if (loadingVendors) return;

    const vendorIds = Object.keys(vendorCarts);
    vendorIds.forEach((vendorId) => {
      // Skip if already initialized or currently initializing
      if (clientSecrets[vendorId] || initializingVendors[vendorId]) return;
      const vendor = vendorDetails[vendorId];
      if (!vendor || vendor.stripeReadyForCheckout === false) return;

      initializePaymentIntent(vendorId, 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingVendors, vendorDetails]);

  // ─── Initialize a PaymentIntent for a vendor ────────────────────────────
  const initializePaymentIntent = useCallback(async (vendorId, tipCents) => {
    setInitializingVendors(prev => ({ ...prev, [vendorId]: true }));
    setError(null);

    try {
      const response = await api('/api/checkout/payment_intent', {
        method: 'POST',
        body: {
          vendorId,
          tipCents,
          notes: null,
        },
      });

      setClientSecrets(prev => ({ ...prev, [vendorId]: response.clientSecret }));
      setPaymentIntentIds(prev => ({ ...prev, [vendorId]: response.paymentIntentId }));
      setVendorTaxes(prev => ({ ...prev, [vendorId]: response.taxCents || 0 }));
    } catch (err) {
      setError(err.message || 'Failed to initialize payment');
    } finally {
      setInitializingVendors(prev => ({ ...prev, [vendorId]: false }));
    }
  }, []);

  // ─── Update tip on existing PaymentIntent (debounced) ───────────────────
  const updateTipOnIntent = useCallback(async (vendorId, tipCents) => {
    const paymentIntentId = paymentIntentIds[vendorId];
    if (!paymentIntentId) return;

    try {
      await api('/api/checkout/update_tip', {
        method: 'PATCH',
        body: { paymentIntentId, tipCents },
      });
    } catch (err) {
      console.error('Failed to update tip on payment intent:', err);
      // Non-fatal: the PaymentForm will use the correct total from our local state
    }
  }, [paymentIntentIds]);

  // ─── Tip change handler ──────────────────────────────────────────────────
  const handleTipChange = useCallback((vendorId, tipCents) => {
    setVendorTips(prev => ({ ...prev, [vendorId]: tipCents }));

    // Debounce the Stripe PaymentIntent update by 600 ms
    if (tipUpdateTimers.current[vendorId]) {
      clearTimeout(tipUpdateTimers.current[vendorId]);
    }
    tipUpdateTimers.current[vendorId] = setTimeout(() => {
      updateTipOnIntent(vendorId, tipCents);
    }, 600);
  }, [updateTipOnIntent]);

  // ─── Notes / pickup handlers ─────────────────────────────────────────────
  const handleNotesChange = (vendorId, notes) =>
    setVendorNotes(prev => ({ ...prev, [vendorId]: notes }));

  // ─── Payment success/error ───────────────────────────────────────────────
  const handlePaymentSuccess = async (vendorId, paymentIntent, accountData = {}) => {
    try {
      const requestBody = { paymentIntentId: paymentIntent.id };

      if (accountData.createAccount && accountData.password) {
        requestBody.createAccount = true;
        requestBody.password = accountData.password;
        requestBody.email = accountData.email;
      }

      const pickupDate = vendorPickupDate[vendorId];
      const pickupTime = vendorPickupTime[vendorId];
      if (pickupDate && pickupTime) {
        requestBody.pickupAt = `${pickupDate}T${pickupTime}`;
      }

      const response = await api('/api/checkout/confirm_payment', {
        method: 'POST',
        body: requestBody,
      });

      if (response.token && response.accountCreated) {
        localStorage.setItem('vehndr_token', response.token);
        await refreshUser();
      }

      clearVendorCart?.(vendorId);

      setClientSecrets(prev => { const u = { ...prev }; delete u[vendorId]; return u; });
      setPaymentIntentIds(prev => { const u = { ...prev }; delete u[vendorId]; return u; });
      setVendorTaxes(prev => { const u = { ...prev }; delete u[vendorId]; return u; });

      router.push(`/checkout/success?vendor_id=${vendorId}&order_id=${response.orderId}`);
    } catch (err) {
      setError(err.message || 'Failed to confirm payment');
    }
  };

  const handlePaymentError = (vendorId, err) => {
    setError(err.message || 'Payment failed');
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const calculateVendorSubtotal = (vendorId) =>
    (vendorCarts[vendorId] || []).reduce((sum, item) => sum + item.price * item.quantity, 0);

  const calculateVendorTotal = (vendorId) =>
    calculateVendorSubtotal(vendorId) +
    (vendorTaxes[vendorId] || 0) +
    (vendorTips[vendorId] || 0);

  const getVendorDisplayName = (vendor, vendorId) => {
    const name = vendor?.name?.trim();
    if (!name || name === vendorId || /^vendor[_\-]/i.test(name)) return 'Vendor';
    return name;
  };

  const getVendorImageUrl = (vendor) =>
    vendor?.heroImage || vendor?.profileImage ||
    vendor?.hero_image_url || vendor?.profile_image_url ||
    vendor?.image_url || null;

  const vendorIds = Object.keys(vendorCarts);
  const stripeKeyMissing = !stripePromise;

  // ─── Empty cart ──────────────────────────────────────────────────────────
  if (vendorIds.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)] mb-2">Your cart is empty</h1>
          <p className="text-[var(--gray-500)] mb-6">Add some items to your cart before checking out.</p>
          <Link href="/vendors" className="btn btn-gradient inline-flex">Browse Vendors</Link>
        </div>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-[var(--gray-900)]">Checkout</h1>
        <p className="text-[var(--gray-500)] text-sm mt-1">Review your order and complete payment</p>
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
              <p className="text-xs text-[var(--gray-500)]">Guest checkout available</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--gray-500)]">Total</p>
            <p className="text-xl font-bold text-[var(--gray-900)]">${(grandTotal / 100).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {(error || stripeKeyMissing) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error || 'Stripe publishable key is missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable checkout.'}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {loadingVendors ? (
          <div className="card p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--violet-600)] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-[var(--gray-500)]">Loading vendor information...</p>
          </div>
        ) : (
          vendorIds.map((vendorId) => {
            const items = vendorCarts[vendorId];
            const vendor = vendorDetails[vendorId];
            const subtotal = calculateVendorSubtotal(vendorId);
            const total = calculateVendorTotal(vendorId);
            const isOverLimit = total > MAX_CHARGE_CENTS;
            const canCheckout = vendor?.stripeReadyForCheckout !== false;
            const isInitializing = initializingVendors[vendorId];
            const hasSecret = !!clientSecrets[vendorId];
            const hasPhysicalItems = items.some(item => !item.isService);

            return (
              <div key={vendorId} className="card p-0 overflow-hidden">
                {/* Vendor Header */}
                <div className="flex items-center justify-between p-4 bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                  <div className="flex items-center gap-3">
                    {getVendorImageUrl(vendor) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getVendorImageUrl(vendor)}
                        alt={getVendorDisplayName(vendor, vendorId)}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                        {getVendorDisplayName(vendor, vendorId).charAt(0)}
                      </div>
                    )}
                    <div>
                      <h2 className="font-semibold text-[var(--gray-900)]">{getVendorDisplayName(vendor, vendorId)}</h2>
                      {vendor?.location && <p className="text-xs text-[var(--gray-500)]">{vendor.location}</p>}
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
                      <div className="flex-shrink-0">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-[var(--radius-lg)] object-cover bg-[var(--gray-100)]"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--violet-100)] to-[var(--magenta-100)] flex items-center justify-center">
                            <span className="text-2xl">{item.isService ? '✨' : '📦'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-[var(--gray-900)] line-clamp-2">{item.name}</h3>
                        {item.options && Object.keys(item.options).length > 0 && (
                          <p className="text-xs text-[var(--gray-500)] mt-1">
                            {Object.entries(item.options).map(([key, value]) => (
                              <span key={key} className="mr-2">{key}: <span className="font-medium">{value}</span></span>
                            ))}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {!item.options?.timeSlot && (
                            <div className="flex items-center gap-1 bg-[var(--gray-100)] rounded-full p-0.5">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="w-6 h-6 rounded-full hover:bg-[var(--gray-200)] flex items-center justify-center text-[var(--gray-600)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                              </button>
                              <span className="text-sm font-medium text-[var(--gray-900)] min-w-[24px] text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-6 h-6 rounded-full hover:bg-[var(--gray-200)] flex items-center justify-center text-[var(--gray-600)] transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                                </svg>
                              </button>
                            </div>
                          )}
                          {item.options?.timeSlot && (
                            <span className="text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2 py-0.5 rounded-full">Qty: {item.quantity}</span>
                          )}
                          <span className="text-xs text-[var(--gray-400)]">${(item.price / 100).toFixed(2)} each</span>
                          <button
                            onClick={() => removeItem(vendorId, item.id)}
                            className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[var(--error)] hover:text-red-700 hover:bg-red-50 transition-colors"
                            aria-label="Remove item"
                          >
                            <span aria-hidden="true">×</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-[var(--gray-900)]">${((item.price * item.quantity) / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tip Selector */}
                {canCheckout && (
                  <div className="p-4 border-t border-[var(--gray-100)]">
                    <TipSelector
                      subtotalCents={subtotal}
                      onTipChange={(tipCents) => handleTipChange(vendorId, tipCents)}
                      disabled={isInitializing}
                      maxTotalCents={MAX_CHARGE_CENTS}
                    />
                  </div>
                )}

                {/* Order Notes */}
                {canCheckout && (
                  <div className="p-4 border-t border-[var(--gray-100)]">
                    <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                      Order Notes <span className="text-[var(--gray-400)] font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={vendorNotes[vendorId] || ''}
                      onChange={(e) => handleNotesChange(vendorId, e.target.value)}
                      placeholder="Add any special instructions or notes for your order..."
                      rows={2}
                      maxLength={500}
                      className="w-full px-3 py-2 border border-[var(--gray-200)] rounded-[var(--radius-lg)] text-sm text-[var(--gray-900)] placeholder:text-[var(--gray-400)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-[var(--gray-400)] mt-1 text-right">{(vendorNotes[vendorId] || '').length}/500</p>
                  </div>
                )}

                {/* Pickup Date/Time */}
                {hasPhysicalItems && canCheckout && (
                  <div className="p-4 border-t border-[var(--gray-100)]">
                    <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                      Pickup date &amp; time <span className="text-[var(--gray-400)] font-normal">(optional)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-[var(--gray-500)]">Date</span>
                        <input
                          type="date"
                          value={vendorPickupDate[vendorId] || ''}
                          onChange={(e) => setVendorPickupDate(prev => ({ ...prev, [vendorId]: e.target.value }))}
                          className="mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--gray-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)]"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-[var(--gray-500)]">Time</span>
                        <input
                          type="time"
                          value={vendorPickupTime[vendorId] || ''}
                          onChange={(e) => setVendorPickupTime(prev => ({ ...prev, [vendorId]: e.target.value }))}
                          className="mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--gray-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)]"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[var(--gray-500)] mt-2">
                      Optional for pickup orders only. Leave blank if you don&apos;t need a pickup time.
                    </p>
                  </div>
                )}

                {/* Vendor Footer — Totals + Payment Form */}
                <div className="p-4 bg-[var(--gray-50)] border-t border-[var(--gray-100)]">
                  {/* Totals Breakdown */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--gray-600)]">Subtotal</span>
                      <span className="font-medium">${(subtotal / 100).toFixed(2)}</span>
                    </div>
                    {(vendorTips[vendorId] || 0) > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--gray-600)]">Tip</span>
                        <span className="font-medium text-[var(--violet-600)]">${((vendorTips[vendorId] || 0) / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {(vendorTaxes[vendorId] || 0) > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--gray-600)]">Tax</span>
                        <span className="font-medium">${((vendorTaxes[vendorId] || 0) / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--gray-200)]">
                      <span className="font-medium text-[var(--gray-700)]">Total</span>
                      <span className="text-xl font-bold text-[var(--gray-900)]">${(total / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  {canCheckout ? (
                    stripeKeyMissing ? (
                      <div className="text-center p-3 bg-[var(--amber-50)] border border-[var(--amber-200)] rounded-[var(--radius-lg)]">
                        <p className="text-sm text-[var(--amber-700)]">Stripe key is missing. Checkout is temporarily unavailable.</p>
                      </div>
                    ) : isInitializing ? (
                      /* Loading skeleton while PaymentIntent is being created */
                      <div className="space-y-3 animate-pulse">
                        <div className="h-10 bg-[var(--gray-200)] rounded-[var(--radius-lg)]" />
                        <div className="h-10 bg-[var(--gray-200)] rounded-[var(--radius-lg)]" />
                        <div className="h-12 bg-[var(--gray-200)] rounded-[var(--radius-lg)]" />
                      </div>
                    ) : hasSecret ? (
                      isOverLimit ? (
                        <p className="text-sm text-[var(--error)] text-center">Maximum charge is {MAX_CHARGE_LABEL}.</p>
                      ) : (
                        <Elements
                          stripe={stripePromise}
                          options={{
                            clientSecret: clientSecrets[vendorId],
                            appearance: {
                              theme: 'stripe',
                              variables: { colorPrimary: '#7C3AED', borderRadius: '8px' },
                            },
                            loader: 'auto',
                            paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
                          }}
                        >
                          <PaymentForm
                            vendorName={getVendorDisplayName(vendor, vendorId)}
                            totalCents={total}
                            tipCents={vendorTips[vendorId] || 0}
                            onSuccess={(paymentIntent, accountData) =>
                              handlePaymentSuccess(vendorId, paymentIntent, accountData)
                            }
                            onError={(err) => handlePaymentError(vendorId, err)}
                          />
                        </Elements>
                      )
                    ) : (
                      /* PaymentIntent failed to initialize — offer retry */
                      <button
                        onClick={() => initializePaymentIntent(vendorId, vendorTips[vendorId] || 0)}
                        className="w-full btn btn-gradient h-12 text-base"
                      >
                        Retry Payment Setup
                      </button>
                    )
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