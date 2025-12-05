'use client';

import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Checkout Cancelled</h1>
        <p className="text-lg text-gray-600 mb-8">
          Your checkout was cancelled. No payment was processed.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-2">What happened?</h2>
          <p className="text-sm text-gray-600">
            You cancelled the checkout process before completing your payment. Your cart items are still saved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/cart')}
            className="px-6 py-3 bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white rounded-lg font-semibold hover:opacity-90 transition"
          >
            Return to Cart
          </button>
          <button
            onClick={() => router.push('/store')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
