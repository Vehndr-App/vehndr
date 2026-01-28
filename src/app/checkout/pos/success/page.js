'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const vendorName = searchParams.get('vendor');

  return (
    <div className="min-h-screen bg-[var(--success)] flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="text-center text-white max-w-md">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-6 animate-scale-in">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold mb-2">Payment Complete!</h1>
        <p className="text-lg opacity-90 mb-8">
          Thank you for your purchase
          {vendorName && ` from ${decodeURIComponent(vendorName)}`}.
        </p>

        {orderId && (
          <div className="bg-white/10 rounded-2xl p-4 mb-8">
            <p className="text-sm opacity-80">Order Number</p>
            <p className="text-2xl font-bold">#{orderId}</p>
          </div>
        )}

        {/* Info */}
        <div className="space-y-3 text-sm opacity-80">
          <p>
            <svg className="w-5 h-5 inline-block mr-2 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            A receipt has been sent to your email
          </p>
          <p>You can close this page now.</p>
        </div>
      </div>
    </div>
  );
}

export default function POSSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--success)] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-10 h-10 border-3 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
