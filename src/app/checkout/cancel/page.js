'use client';

import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="card p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-3xl font-bold text-[var(--gray-900)] mb-4">Checkout Cancelled</h1>
        <p className="text-lg text-[var(--gray-600)] mb-8">
          Your checkout was cancelled. No payment was processed.
        </p>

        <div className="bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-[var(--radius-xl)] p-6 mb-8">
          <h2 className="font-semibold text-[var(--gray-900)] mb-2">What happened?</h2>
          <p className="text-sm text-[var(--gray-600)]">
            You cancelled the checkout process before completing your payment. Your cart items are still saved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/cart')}
            className="btn btn-gradient"
          >
            Return to Cart
          </button>
          <button
            onClick={() => router.push('/store')}
            className="btn btn-secondary"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
