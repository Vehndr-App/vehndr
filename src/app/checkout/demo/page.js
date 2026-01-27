'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '../../../contexts/CartContext';
import { api } from '../../../services/api';

function DemoCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { vendorCarts, clearVendor } = useCart();
  
  const sessionId = searchParams.get('session_id');
  const vendorId = searchParams.get('vendor_id');
  const totalParam = searchParams.get('total');
  
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });
  const [email, setEmail] = useState('');

  const total = totalParam ? parseInt(totalParam) : 0;
  const items = vendorId ? vendorCarts[vendorId] || [] : [];

  // Fetch vendor details
  useEffect(() => {
    if (vendorId) {
      api(`/api/vendors/${vendorId}`)
        .then(setVendor)
        .catch(console.error);
    }
  }, [vendorId]);

  const handlePayment = async () => {
    if (!selectedMethod) return;
    
    setProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clear cart for this vendor
    if (vendorId) {
      clearVendor(vendorId);
    }
    
    setSuccess(true);
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center p-4">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--mint-100)] flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)] mb-2">Payment Successful!</h1>
          <p className="text-[var(--gray-500)] mb-6">
            Thank you for your order from {vendor?.name || 'the vendor'}.
          </p>
          <div className="bg-[var(--gray-50)] rounded-[var(--radius-lg)] p-4 mb-6">
            <p className="text-sm text-[var(--gray-500)]">Order Total</p>
            <p className="text-3xl font-bold text-[var(--gray-900)]">${(total / 100).toFixed(2)}</p>
          </div>
          <p className="text-xs text-[var(--gray-400)] mb-6">
            Demo Mode - No actual payment was processed
          </p>
          <Link href="/" className="btn btn-gradient w-full">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gray-100)]">
      {/* Header */}
      <header className="bg-white border-b border-[var(--gray-200)] sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[var(--gray-600)] hover:text-[var(--gray-900)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span className="text-xs text-[var(--gray-500)]">Secure Checkout</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 pb-32">
        {/* Vendor & Amount */}
        <div className="card p-6 mb-4 text-center">
          {vendor?.heroImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={vendor.heroImage} alt={vendor.name} className="w-16 h-16 rounded-full mx-auto mb-3 object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold">
              {vendor?.name?.charAt(0) || 'V'}
            </div>
          )}
          <h2 className="font-semibold text-[var(--gray-900)]">{vendor?.name || 'Vendor'}</h2>
          <p className="text-3xl font-bold text-[var(--gray-900)] mt-2">${(total / 100).toFixed(2)}</p>
          <p className="text-xs text-[var(--gray-400)] mt-1">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Demo Mode Banner */}
        <div className="bg-[var(--amber-50)] border border-[var(--amber-200)] rounded-[var(--radius-lg)] p-3 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--amber-100)] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber-600)" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <p className="text-xs text-[var(--amber-700)]">
            <strong>Demo Mode:</strong> This is a simulated checkout. No real payment will be processed.
          </p>
        </div>

        {/* Payment Methods */}
        <div className="card p-4 mb-4">
          <h3 className="font-semibold text-[var(--gray-900)] mb-4">Select Payment Method</h3>
          
          {/* Apple Pay */}
          <button
            onClick={() => setSelectedMethod('apple_pay')}
            className={`w-full flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border-2 mb-3 transition-all ${
              selectedMethod === 'apple_pay' 
                ? 'border-[var(--gray-900)] bg-[var(--gray-50)]' 
                : 'border-[var(--gray-200)] hover:border-[var(--gray-300)]'
            }`}
          >
            <div className="w-12 h-8 bg-black rounded-md flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[var(--gray-900)]">Apple Pay</p>
              <p className="text-xs text-[var(--gray-500)]">Pay with Face ID or Touch ID</p>
            </div>
            {selectedMethod === 'apple_pay' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--violet-600)" stroke="none">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="8 12 11 15 16 9" fill="none" stroke="white" strokeWidth="2"/>
              </svg>
            )}
          </button>

          {/* Google Pay */}
          <button
            onClick={() => setSelectedMethod('google_pay')}
            className={`w-full flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border-2 mb-3 transition-all ${
              selectedMethod === 'google_pay' 
                ? 'border-[var(--gray-900)] bg-[var(--gray-50)]' 
                : 'border-[var(--gray-200)] hover:border-[var(--gray-300)]'
            }`}
          >
            <div className="w-12 h-8 bg-white border border-[var(--gray-200)] rounded-md flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[var(--gray-900)]">Google Pay</p>
              <p className="text-xs text-[var(--gray-500)]">Fast and secure checkout</p>
            </div>
            {selectedMethod === 'google_pay' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--violet-600)" stroke="none">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="8 12 11 15 16 9" fill="none" stroke="white" strokeWidth="2"/>
              </svg>
            )}
          </button>

          {/* Credit/Debit Card */}
          <button
            onClick={() => setSelectedMethod('card')}
            className={`w-full flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border-2 transition-all ${
              selectedMethod === 'card' 
                ? 'border-[var(--violet-500)] bg-[var(--violet-50)]' 
                : 'border-[var(--gray-200)] hover:border-[var(--gray-300)]'
            }`}
          >
            <div className="w-12 h-8 bg-[var(--gray-100)] rounded-md flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gray-600)" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-[var(--gray-900)]">Credit or Debit Card</p>
              <p className="text-xs text-[var(--gray-500)]">Visa, Mastercard, Amex</p>
            </div>
            {selectedMethod === 'card' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--violet-600)" stroke="none">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="8 12 11 15 16 9" fill="none" stroke="white" strokeWidth="2"/>
              </svg>
            )}
          </button>
        </div>

        {/* Card Details Form - Show when card is selected */}
        {selectedMethod === 'card' && (
          <div className="card p-4 mb-4 animate-slide-up">
            <h3 className="font-semibold text-[var(--gray-900)] mb-4">Card Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Card Number</label>
                <input
                  type="text"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails({ ...cardDetails, number: formatCardNumber(e.target.value) })}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="input w-full font-mono"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Expiry</label>
                  <input
                    type="text"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails({ ...cardDetails, expiry: formatExpiry(e.target.value) })}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="input w-full font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">CVC</label>
                  <input
                    type="text"
                    value={cardDetails.cvc}
                    onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="123"
                    maxLength={4}
                    className="input w-full font-mono"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Name on Card</label>
                <input
                  type="text"
                  value={cardDetails.name}
                  onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                  placeholder="John Doe"
                  className="input w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="card p-4 mb-4">
          <h3 className="font-semibold text-[var(--gray-900)] mb-3">Order Summary</h3>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-[var(--gray-600)]">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium text-[var(--gray-900)]">
                  ${((item.price * item.quantity) / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--gray-100)] mt-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--gray-900)]">Total</span>
              <span className="font-bold text-lg text-[var(--gray-900)]">${(total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--gray-200)] p-4 safe-area-bottom">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handlePayment}
            disabled={!selectedMethod || processing}
            className="w-full btn btn-gradient h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                </svg>
                Processing...
              </span>
            ) : selectedMethod === 'apple_pay' ? (
              <span className="flex items-center justify-center gap-2">
                Pay with Apple Pay
              </span>
            ) : selectedMethod === 'google_pay' ? (
              <span className="flex items-center justify-center gap-2">
                Pay with Google Pay
              </span>
            ) : selectedMethod === 'card' ? (
              `Pay $${(total / 100).toFixed(2)}`
            ) : (
              'Select Payment Method'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DemoCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--violet-600)] border-t-transparent rounded-full"></div>
      </div>
    }>
      <DemoCheckoutContent />
    </Suspense>
  );
}

