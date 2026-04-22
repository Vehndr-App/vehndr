'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  initializeTerminal,
  discoverAndConnect,
  createTerminalPaymentIntent,
  collectPayment,
  confirmPayment,
  cancelPayment,
  disconnectReader,
} from '../services/terminal';
import { api } from '../services/api';

// phase: 'connecting' | 'ready' | 'collecting' | 'confirming' | 'success' | 'error'

export default function TapToPayModal({ cart, totalCents, vendorId, onSuccess, onCancel }) {
  const [phase, setPhase] = useState('connecting');
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);

  const setup = useCallback(async () => {
    setPhase('connecting');
    setError(null);
    try {
      await initializeTerminal();
      await discoverAndConnect();
      const { client_secret, payment_intent_id } = await createTerminalPaymentIntent({
        amountCents: totalCents,
        vendorId,
        cart,
      });
      setClientSecret(client_secret);
      setPaymentIntentId(payment_intent_id);
      setPhase('ready');
    } catch (err) {
      setError(err.message || 'Failed to set up Tap to Pay');
      setPhase('error');
    }
  }, [totalCents, vendorId, cart]);

  useEffect(() => {
    setup();
    return () => {
      cancelPayment();
      disconnectReader();
    };
  }, [setup]);

  const handleCollect = useCallback(async () => {
    if (!clientSecret) return;
    setPhase('collecting');
    setError(null);
    try {
      await collectPayment(clientSecret);
      setPhase('confirming');
      await confirmPayment();

      await api('/api/terminal/confirm', {
        method: 'POST',
        body: { payment_intent_id: paymentIntentId, vendor_id: vendorId },
      });

      setPhase('success');
      setTimeout(() => onSuccess(totalCents), 1500);
    } catch (err) {
      setError(err.message || 'Payment failed');
      setPhase('error');
    }
  }, [clientSecret, paymentIntentId, vendorId, totalCents, onSuccess]);

  const handleCancel = useCallback(async () => {
    await cancelPayment();
    await disconnectReader();
    onCancel();
  }, [onCancel]);

  const formattedTotal = `$${(totalCents / 100).toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl p-6 pb-safe">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Tap to Pay</h2>
          {(phase === 'connecting' || phase === 'ready' || phase === 'error') && (
            <button
              onClick={handleCancel}
              className="w-9 h-9 rounded-full bg-[var(--gray-100)] flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Amount */}
        <div className="text-center mb-8">
          <p className="text-5xl font-bold text-[var(--foreground)] tracking-tight">{formattedTotal}</p>
        </div>

        {/* Phase-specific content */}
        {phase === 'connecting' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-20 h-20 rounded-2xl bg-[var(--violet-50)] flex items-center justify-center">
              <div className="animate-spin w-10 h-10 border-3 border-[var(--violet-600)] border-t-transparent rounded-full" />
            </div>
            <p className="text-[var(--gray-600)] font-medium">Setting up reader…</p>
          </div>
        )}

        {phase === 'ready' && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-[var(--violet-50)] flex items-center justify-center">
              <NfcIcon className="w-14 h-14 text-[var(--violet-600)]" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-[var(--foreground)] mb-1">Ready to accept payment</p>
              <p className="text-sm text-[var(--gray-500)]">Tap the button below, then present your customer's card or device</p>
            </div>
            <button
              onClick={handleCollect}
              className="w-full h-14 rounded-2xl bg-[var(--gray-900)] text-white font-bold text-lg"
            >
              Collect Payment
            </button>
            <button onClick={handleCancel} className="text-sm text-[var(--gray-500)]">Cancel</button>
          </div>
        )}

        {(phase === 'collecting' || phase === 'confirming') && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-24 h-24 rounded-2xl bg-[var(--violet-50)] flex items-center justify-center relative">
              <NfcIcon className="w-14 h-14 text-[var(--violet-600)]" />
              <span className="absolute inset-0 rounded-2xl animate-ping bg-[var(--violet-200)] opacity-40" />
            </div>
            <p className="font-semibold text-[var(--foreground)]">
              {phase === 'collecting' ? 'Hold card or device near phone' : 'Processing…'}
            </p>
            <p className="text-sm text-[var(--gray-500)]">
              {phase === 'collecting' ? 'Keep still until payment completes' : 'Confirming your payment'}
            </p>
          </div>
        )}

        {phase === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-20 h-20 rounded-full bg-[var(--success)] flex items-center justify-center animate-scale-in">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-[var(--foreground)] text-lg">Payment complete!</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--error)]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M12 3C6.477 3 2 7.477 2 12s4.477 9 10 9 10-4.477 10-9S17.523 3 12 3z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-[var(--foreground)] mb-1">Payment failed</p>
              <p className="text-sm text-[var(--gray-500)]">{error}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={setup}
                className="flex-1 h-12 rounded-2xl bg-[var(--gray-900)] text-white font-semibold"
              >
                Try again
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 h-12 rounded-2xl bg-[var(--gray-100)] text-[var(--gray-700)] font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NfcIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 16.5C8.5 16.5 7 15 7 12s1.5-4.5 1.5-4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 14.5C10.5 14.5 9.5 13.5 9.5 12s1-2.5 1-2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" fill="currentColor" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 14.5C15.5 14.5 16.5 13.5 16.5 12s-1-2.5-1-2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 16.5C17.5 16.5 19 15 19 12s-1.5-4.5-1.5-4.5" />
    </svg>
  );
}
