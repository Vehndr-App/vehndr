'use client';

import { useState, useCallback } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '../services/api';

export default function PaymentForm({
  vendorName,
  totalCents,
  tipCents = 0,
  onSuccess,
  onError,
  disabled = false,
  beforeConfirm
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  // Account creation state
  const [emailExists, setEmailExists] = useState(null); // null = not checked, true/false = result
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState(null);

  const checkEmailExists = useCallback(async (emailToCheck) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      setEmailExists(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const response = await api('/api/auth/check_email', {
        method: 'POST',
        body: { email: emailToCheck }
      });
      setEmailExists(response.exists);
      // Reset account creation state if email exists
      if (response.exists) {
        setCreateAccount(false);
        setPassword('');
        setPasswordConfirm('');
      }
    } catch (err) {
      console.error('Error checking email:', err);
      setEmailExists(null);
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  const handleEmailBlur = () => {
    checkEmailExists(email);
  };

  const validatePassword = () => {
    if (!createAccount) return true;

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    if (password !== passwordConfirm) {
      setPasswordError('Passwords do not match');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements || !paymentElementReady) {
      setErrorMessage('Payment form is still loading. Please wait a moment and try again.');
      return;
    }

    if (disabled) {
      setErrorMessage('Updating total, please wait a moment and try again.');
      return;
    }

    if (!email || !name) {
      setErrorMessage('Please enter your email and name');
      return;
    }

    if (createAccount && !validatePassword()) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (beforeConfirm) {
        await beforeConfirm();
      }

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
        // Payment succeeded - pass account creation data to parent
        if (onSuccess) {
          onSuccess(paymentIntent, {
            createAccount,
            password: createAccount ? password : null,
            email: createAccount ? email : null
          });
        }
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
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailExists(null); // Reset on change
            }}
            onBlur={handleEmailBlur}
            required
            placeholder="you@example.com"
            className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
          />
          {checkingEmail && (
            <p className="text-xs text-[var(--gray-500)] mt-1">Checking email...</p>
          )}
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

      {/* Account Creation Option - Only show if email doesn't exist */}
      {emailExists === false && (
        <div className="p-3 bg-[var(--violet-50)] border border-[var(--violet-200)] rounded-[var(--radius-lg)]">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createAccount}
              onChange={(e) => {
                setCreateAccount(e.target.checked);
                if (!e.target.checked) {
                  setPassword('');
                  setPasswordConfirm('');
                  setPasswordError(null);
                }
              }}
              className="mt-0.5 w-4 h-4 text-[var(--violet-600)] border-[var(--gray-300)] rounded focus:ring-[var(--violet-500)]"
            />
            <div>
              <span className="text-sm font-medium text-[var(--gray-900)]">
                Create an account to track your orders
              </span>
              <p className="text-xs text-[var(--gray-500)] mt-0.5">
                Get order updates and easily view your purchase history
              </p>
            </div>
          </label>

          {/* Password Fields */}
          {createAccount && (
            <div className="mt-3 space-y-3 pt-3 border-t border-[var(--violet-200)]">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="passwordConfirm" className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="passwordConfirm"
                  value={passwordConfirm}
                  onChange={(e) => {
                    setPasswordConfirm(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Re-enter your password"
                  className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment Element */}
      <PaymentElement
        onReady={() => setPaymentElementReady(true)}
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
        disabled={!stripe || !paymentElementReady || isProcessing || disabled}
        className="w-full btn btn-gradient h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!paymentElementReady ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
            </svg>
            Loading payment form...
          </span>
        ) : isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
            </svg>
            Processing...
          </span>
        ) : disabled ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
            </svg>
            Updating total...
          </span>
        ) : (
          <>
            Pay ${(totalCents / 100).toFixed(2)}
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
