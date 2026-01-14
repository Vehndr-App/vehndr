'use client';

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function PaymentForm({ vendorName, totalCents, tipCents = 0, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!email || !name) {
      setErrorMessage('Please enter your email and name');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
          receipt_email: email,
          payment_method_data: {
            billing_details: {
              email: email,
              name: name,
            }
          }
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message);
        setIsProcessing(false);
        if (onError) onError(error);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        if (onSuccess) onSuccess(paymentIntent);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred');
      setIsProcessing(false);
      if (onError) onError(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email and Name Fields */}
      <div className="space-y-3">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your full name"
            className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
          />
        </div>
      </div>

      {/* Payment Element */}
      <PaymentElement
        options={{
          wallets: {
            applePay: 'auto',
            googlePay: 'auto'
          }
        }}
      />

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-[var(--radius-lg)] text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {errorMessage}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
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
          <>
            Pay ${vendorName} ${(totalCents / 100).toFixed(2)}
            {tipCents > 0 && (
              <span className="text-sm opacity-80 ml-1">
                (incl. ${(tipCents / 100).toFixed(2)} tip)
              </span>
            )}
          </>
        )}
      </button>
    </form>
  );
}
