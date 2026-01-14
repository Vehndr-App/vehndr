"use client";

import Link from "next/link";
import { useCart } from "../../contexts/CartContext";
import { useEffect, useState } from "react";
import { getVendorProfile } from "../../services/vendors";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { vendorCarts, removeItem, clearVendor, getVendorTotal, totalItems, allItems, updateQuantity } = useCart();
  const [vendorInfo, setVendorInfo] = useState({});
  const router = useRouter();

  const vendorIds = Object.keys(vendorCarts);
  const hasItems = vendorIds.length > 0;

  // Calculate grand total
  const grandTotal = allItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  useEffect(() => {
    (async () => {
      const info = {};
      for (const vendorId of vendorIds) {
        const vendor = await getVendorProfile(vendorId);
        if (vendor) info[vendorId] = vendor;
      }
      setVendorInfo(info);
    })();
  }, [vendorIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-[var(--gray-900)]">
          Your Cart
        </h1>
        {hasItems && (
          <p className="text-sm text-[var(--gray-500)] mt-1">
            {totalItems} item{totalItems !== 1 ? 's' : ''} from {vendorIds.length} vendor{vendorIds.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {!hasItems ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-2">Your cart is empty</h3>
          <p className="text-[var(--gray-500)] mb-6 max-w-sm mx-auto">
            Looks like you haven&apos;t added anything to your cart yet.
          </p>
          <Link
            href="/vendors"
            className="btn btn-gradient inline-flex"
          >
            Browse Vendors
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {vendorIds.map((vendorId) => {
            const items = vendorCarts[vendorId];
            const vendor = vendorInfo[vendorId];
            const vendorTotal = getVendorTotal(vendorId);

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
                      <h2 className="font-semibold text-[var(--gray-900)]">{vendor?.name || 'Vendor'}</h2>
                      <Link 
                        href={`/store/${vendorId}`} 
                        className="text-xs text-[var(--violet-600)] hover:text-[var(--violet-700)] font-medium"
                      >
                        Continue shopping →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-[var(--gray-100)]">
                  {items.map((item) => (
                    <div
                      key={`${item.id}-${JSON.stringify(item.options)}`}
                      className="flex gap-4 p-4"
                    >
                      {/* Product Image */}
                      <Link 
                        href={`/store/${vendorId}/products/${item.productId || item.id}`}
                        className="flex-shrink-0"
                      >
                        {item.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-20 h-20 rounded-[var(--radius-lg)] object-cover bg-[var(--gray-100)]"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--violet-100)] to-[var(--magenta-100)] flex items-center justify-center">
                            <span className="text-2xl">
                              {item.isService ? '✨' : '📦'}
                            </span>
                          </div>
                        )}
                      </Link>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/store/${vendorId}/products/${item.productId || item.id}`}
                          className="font-semibold text-sm text-[var(--gray-900)] hover:text-[var(--violet-600)] transition-colors line-clamp-2"
                        >
                          {item.name}
                        </Link>
                        
                        {/* Options */}
                        {item.options && Object.keys(item.options).length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.options.timeSlot && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--violet-600)] bg-[var(--violet-50)] px-2 py-0.5 rounded-full">
                                📅 {item.options.timeSlot}
                                {item.options.duration && ` • ${item.options.duration} min`}
                              </span>
                            )}
                            {Object.entries(item.options)
                              .filter(([k]) => k !== "timeSlot" && k !== "duration")
                              .length > 0 && (
                              <p className="text-xs text-[var(--gray-500)]">
                                {Object.entries(item.options)
                                  .filter(([k]) => k !== "timeSlot" && k !== "duration")
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(" • ")}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Quantity & Price */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            {!item.options?.timeSlot ? (
                              <div className="flex items-center gap-1 bg-[var(--gray-100)] rounded-full p-0.5">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="w-6 h-6 rounded-full hover:bg-[var(--gray-200)] flex items-center justify-center text-[var(--gray-600)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  aria-label="Decrease quantity"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                  </svg>
                                </button>
                                <span className="text-sm font-medium text-[var(--gray-900)] min-w-[24px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-6 h-6 rounded-full hover:bg-[var(--gray-200)] flex items-center justify-center text-[var(--gray-600)] transition-colors"
                                  aria-label="Increase quantity"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"/>
                                    <line x1="5" y1="12" x2="19" y2="12"/>
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-[var(--gray-500)] bg-[var(--gray-100)] px-2 py-0.5 rounded-full">
                                Qty: {item.quantity}
                              </span>
                            )}
                            <button
                              onClick={() => removeItem(vendorId, item.id)}
                              className="text-xs text-[var(--error)] hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                          <span className="font-semibold text-[var(--gray-900)]">
                            ${((item.price * item.quantity) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vendor Footer */}
                <div className="p-4 bg-[var(--gray-50)] border-t border-[var(--gray-100)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-[var(--gray-600)]">Subtotal</span>
                    <span className="font-semibold text-[var(--gray-900)]">
                      ${(vendorTotal / 100).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      className="flex-1 btn btn-gradient"
                      onClick={() => router.push('/checkout')}
                    >
                      Checkout
                    </button>
                    <button
                      className="px-4 py-2 rounded-[var(--radius-lg)] border border-[var(--gray-200)] text-sm font-medium text-[var(--gray-600)] hover:bg-[var(--gray-50)] transition-colors"
                      onClick={() => clearVendor(vendorId)}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Grand Total */}
          {vendorIds.length > 1 && (
            <div className="card p-4 bg-gradient-to-r from-[var(--violet-50)] to-[var(--magenta-50)]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-[var(--gray-600)]">Grand Total</span>
                  <p className="text-xs text-[var(--gray-500)]">
                    {totalItems} items from {vendorIds.length} vendors
                  </p>
                </div>
                <span className="text-2xl font-bold text-[var(--gray-900)]">
                  ${(grandTotal / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
