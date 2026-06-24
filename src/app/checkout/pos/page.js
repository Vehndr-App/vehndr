'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../../../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentForm from '../../../components/PaymentForm';
import TipSelector from '../../../components/TipSelector';
import { WALLET_FIRST_PAYMENT_METHOD_ORDER } from '../../../utils/stripePaymentOptions';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const MAX_CHARGE_CENTS = 5000000;

function POSCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  const [tipCents, setTipCents] = useState(0);
  const [updatingTip, setUpdatingTip] = useState(false);
  const [currentClientSecret, setCurrentClientSecret] = useState(null);
  const latestTipCentsRef = useRef(0);
  const fetchElementsUpdatesRef = useRef(null);

  const paymentIntentId = searchParams.get('pi');
  const initialClientSecret = searchParams.get('cs');

  useEffect(() => {
    const fetchCheckoutDetails = async () => {
      if (!paymentIntentId) {
        setError('Invalid checkout link');
        setLoading(false);
        return;
      }

      try {
        const data = await api(`/api/checkout/pos_link/${paymentIntentId}`);
        setCheckoutData(data);
        const initialTip = data.tipCents || 0;
        latestTipCentsRef.current = initialTip;
        setTipCents(initialTip);
        setCurrentClientSecret(data.clientSecret || initialClientSecret);
      } catch (err) {
        setError(err.message || 'Failed to load checkout');
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutDetails();
  }, [paymentIntentId, initialClientSecret]);

  const syncTipToPaymentIntent = useCallback(async (nextTipCents) => {
    const response = await api(`/api/checkout/pos_link/${paymentIntentId}/tip`, {
      method: 'PATCH',
      body: { tip_cents: nextTipCents }
    });

    if (!response.success) {
      throw new Error('Failed to update tip');
    }

    setCheckoutData(prev => ({
      ...prev,
      taxCents: response.taxCents ?? prev?.taxCents ?? 0,
      tipCents: response.tipCents,
      totalCents: response.totalCents
    }));

    // Refresh the Stripe Elements cache so Apple Pay reads the updated amount.
    // Apple Pay opens its native sheet without going through the form's onSubmit,
    // so beforeConfirm never runs for wallet payments — the fetch must happen here.
    if (fetchElementsUpdatesRef.current) {
      await fetchElementsUpdatesRef.current();
    }

    return response;
  }, [paymentIntentId]);

  const handleTipChange = useCallback(async (newTipCents) => {
    latestTipCentsRef.current = newTipCents;
    setTipCents(newTipCents);
    setUpdatingTip(true);

    try {
      const response = await syncTipToPaymentIntent(newTipCents);
      latestTipCentsRef.current = response.tipCents;
      setTipCents(response.tipCents);
    } catch (err) {
      console.error('Failed to update tip:', err);
      // Revert tip on error
      const previousTip = checkoutData?.tipCents || 0;
      latestTipCentsRef.current = previousTip;
      setTipCents(previousTip);
    } finally {
      setUpdatingTip(false);
    }
  }, [syncTipToPaymentIntent, checkoutData?.tipCents]);

  const ensureTipSyncedBeforePayment = useCallback(async () => {
    setUpdatingTip(true);
    try {
      const response = await syncTipToPaymentIntent(latestTipCentsRef.current);
      latestTipCentsRef.current = response.tipCents;
      setTipCents(response.tipCents);
    } catch (err) {
      setError(err.message || 'Failed to update tip');
      throw err;
    } finally {
      setUpdatingTip(false);
    }
  }, [syncTipToPaymentIntent]);

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      // Confirm the order on the backend
      const response = await api(`/api/checkout/pos_link/${paymentIntentId}/confirm`, {
        method: 'POST'
      });

      if (response.success) {
        router.push(`/checkout/pos/success?order_id=${response.orderId}&vendor=${checkoutData?.vendorName || ''}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to confirm payment');
    }
  };

  const handlePaymentError = (err) => {
    setError(err.message || 'Payment failed');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-3 border-[var(--violet-600)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[var(--gray-600)]">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--gray-900)] mb-2">Checkout Error</h1>
          <p className="text-[var(--gray-600)] mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-secondary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!checkoutData || !currentClientSecret) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[var(--gray-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--gray-900)] mb-2">Invalid Link</h1>
          <p className="text-[var(--gray-600)]">This checkout link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const stripeKeyMissing = !stripePromise;

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--gray-200)] px-4 py-4 safe-area-top">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {checkoutData.vendorImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={checkoutData.vendorImage}
              alt={checkoutData.vendorName}
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold text-lg">
              {checkoutData.vendorName?.charAt(0) || 'V'}
            </div>
          )}
          <div>
            <p className="text-xs text-[var(--gray-500)] font-medium">Checkout with</p>
            <h1 className="text-lg font-bold text-[var(--gray-900)]">{checkoutData.vendorName}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Order Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--gray-200)] overflow-hidden mb-6">
          <div className="p-4 border-b border-[var(--gray-100)]">
            <h2 className="font-semibold text-[var(--gray-900)]">Order Summary</h2>
          </div>

          {/* Line Items */}
          <div className="divide-y divide-[var(--gray-100)]">
            {checkoutData.lineItems?.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    item.is_custom
                      ? 'bg-[var(--violet-100)]'
                      : 'bg-[var(--gray-100)]'
                  }`}>
                    {item.is_custom ? (
                      <svg className="w-5 h-5 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-[var(--gray-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--gray-900)]">{item.product_name}</p>
                    <p className="text-sm text-[var(--gray-500)]">
                      ${(item.price_cents / 100).toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-[var(--gray-900)]">
                  ${(item.subtotal_cents / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="p-4 bg-[var(--gray-50)] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-600)]">Subtotal</span>
              <span className="font-medium">${(checkoutData.subtotalCents / 100).toFixed(2)}</span>
            </div>
            {(checkoutData.taxCents || 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--gray-600)]">Tax</span>
                <span className="font-medium">${((checkoutData.taxCents || 0) / 100).toFixed(2)}</span>
              </div>
            )}
            {tipCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--gray-600)]">Tip</span>
                <span className="font-medium text-[var(--violet-600)]">
                  ${(tipCents / 100).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-[var(--gray-200)]">
              <span className="font-semibold text-[var(--gray-700)]">Total</span>
              <span className="text-2xl font-bold text-[var(--gray-900)]">
                ${(checkoutData.totalCents / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Tip Selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--gray-200)] p-4 mb-6">
          <TipSelector
            subtotalCents={checkoutData.subtotalCents}
            onTipChange={handleTipChange}
            disabled={updatingTip}
            maxTotalCents={MAX_CHARGE_CENTS}
          />
        </div>

        {/* Payment Form */}
        {stripeKeyMissing ? (
          <div className="bg-[var(--amber-50)] border border-[var(--amber-200)] rounded-2xl p-4 text-center">
            <p className="text-[var(--amber-700)]">
              Payment processing is temporarily unavailable.
            </p>
          </div>
        ) : currentClientSecret ? (
          <div className="bg-white rounded-2xl shadow-sm border border-[var(--gray-200)] p-4">
            <h2 className="font-semibold text-[var(--gray-900)] mb-4">Payment Details</h2>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: currentClientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#7C3AED',
                    borderRadius: '8px',
                  }
                },
                loader: 'auto',
                paymentMethodOrder: WALLET_FIRST_PAYMENT_METHOD_ORDER
              }}
            >
              <PaymentForm
                vendorName={checkoutData.vendorName}
                totalCents={checkoutData.totalCents}
                tipCents={tipCents}
                disabled={updatingTip}
                beforeConfirm={ensureTipSyncedBeforePayment}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onFetchUpdates={(fn) => { fetchElementsUpdatesRef.current = fn; }}
              />
            </Elements>
          </div>
        ) : null}

        {/* Secure Checkout Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[var(--gray-500)]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeWidth="2"/>
            <path strokeWidth="2" d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="text-xs">Secure checkout powered by Stripe</span>
        </div>
      </main>
    </div>
  );
}

export default function POSCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-3 border-[var(--violet-600)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[var(--gray-600)]">Loading checkout...</p>
        </div>
      </div>
    }>
      <POSCheckoutContent />
    </Suspense>
  );
}
