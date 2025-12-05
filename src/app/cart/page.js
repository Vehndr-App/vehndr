"use client";

import Link from "next/link";
import { useCart } from "../../contexts/CartContext";
import { useEffect, useState } from "react";
import { getVendorProfile } from "../../services/vendors";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { vendorCarts, removeItem, clearVendor, getVendorTotal } = useCart();
  const [vendorInfo, setVendorInfo] = useState({});
  const router = useRouter();

  const vendorIds = Object.keys(vendorCarts);
  const hasItems = vendorIds.length > 0;

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
    <div className="mx-auto max-w-3xl p-6 w-full">
      <h1 className="text-2xl font-semibold mb-4">Your Cart</h1>

      {!hasItems ? (
        <div className="text-sm text-black/60">
          Cart is empty. <Link href="/vendors" className="underline">Browse vendors</Link>.
        </div>
      ) : (
        <div className="space-y-6">
          {vendorIds.map((vendorId) => {
            const items = vendorCarts[vendorId];
            const vendor = vendorInfo[vendorId];
            const vendorTotal = getVendorTotal(vendorId);

            return (
              <div key={vendorId} className="border border-black/[.08] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold">{vendor?.name || vendorId}</div>
                    <Link href={`/store/${vendorId}`} className="text-xs text-black/60 underline">
                      Continue shopping
                    </Link>
                  </div>
                </div>

                <div className="space-y-2">
                  {items.map((i) => (
                    <div
                      key={`${i.id}-${JSON.stringify(i.options)}`}
                      className="flex items-center justify-between rounded-md border border-black/[.06] p-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{i.name}</span>
                        {i.options?.timeSlot && (
                          <span className="text-xs text-[#01DBE0] font-semibold">
                            📅 {i.options.timeSlot} ({i.options.duration} min)
                          </span>
                        )}
                        {i.options && Object.keys(i.options).length > 0 ? (
                          <span className="text-xs text-black/50">
                            {Object.entries(i.options)
                              .filter(([k]) => k !== "timeSlot" && k !== "duration")
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")}
                          </span>
                        ) : null}
                        {!i.options?.timeSlot && (
                          <span className="text-xs text-black/60">
                            Qty {i.quantity}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">${((i.price * i.quantity) / 100).toFixed(2)}</span>
                        <button
                          onClick={() => removeItem(vendorId, i.id)}
                          className="text-xs underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-black/[.06] pt-2 mt-3">
                  <span className="text-sm">Vendor subtotal</span>
                  <span className="font-mono font-semibold">${(vendorTotal / 100).toFixed(2)}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition"
                    onClick={() => router.push('/checkout')}
                  >
                    Proceed to Checkout
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-md border border-black/[.08] px-3 py-1.5 text-sm"
                    onClick={() => clearVendor(vendorId)}
                  >
                    Clear
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}