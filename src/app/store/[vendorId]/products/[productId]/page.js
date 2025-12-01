"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVendorProfile, getVendorProducts } from "../../../../../services/vendors";
import { useCart } from "../../../../../contexts/CartContext";
import Link from "next/link";

export default function ProductPage() {
  const { vendorId, productId } = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  
  const [vendor, setVendor] = useState(null);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState({});
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const v = await getVendorProfile(vendorId);
      const products = await getVendorProducts(vendorId);
      const p = products.find((prod) => prod.id === productId);
      setVendor(v);
      setProduct(p);
    })();
  }, [vendorId, productId]);

  if (!product || !vendor) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="text-sm text-gray-600 font-body">Loading...</div>
      </div>
    );
  }

  const isService = product.isService === true;
  const hasOptions = (product.options?.length ?? 0) > 0;
  const optionDefs = product.options ?? [];
  const isValid = (!hasOptions || optionDefs.every((o) => selected[o.id])) && 
                  (!isService || selectedTimeSlot);

  const handleAddToCart = () => {
    const cartOptions = { ...selected };
    if (isService && selectedTimeSlot) {
      cartOptions.timeSlot = selectedTimeSlot;
      cartOptions.duration = product.duration;
    }
    addItem(product, quantity, cartOptions);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Breadcrumb */}
      <div className="text-sm font-body text-gray-600 mb-6">
        <Link href="/vendors" className="hover:text-[#01DBE0] transition-colors">Vendors</Link>
        {" / "}
        <Link href={`/store/${vendorId}`} className="hover:text-[#01DBE0] transition-colors">{vendor.name}</Link>
        {" / "}
        <span className="text-gray-900 font-semibold">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-3">
          {/* Main Image */}
          <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-[#DCA7F0]/20 via-[#C9FF3F]/10 to-[#01DBE0]/20 flex items-center justify-center overflow-hidden">
            {isService && (
              <div className="absolute top-4 right-4 z-10 bg-[#FE9C05] text-white px-3 py-1 rounded-full text-sm font-semibold">
                Service
              </div>
            )}
            {product.images && product.images.length > 0 ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={product.images[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-lg">No image available</div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((imageUrl, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageIndex === index
                      ? 'border-[#01DBE0] shadow-lg'
                      : 'border-gray-200 hover:border-[#01DBE0]/50'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-4xl tracking-wide mb-3">{product.name}</h1>
            <div className="font-display text-5xl text-[#FE9C05] mb-4">
              ${(product.price / 100).toFixed(2)}
              {isService && <span className="text-lg font-body text-gray-600 ml-2">/ {product.duration} min</span>}
            </div>
            <p className="text-lg font-body text-gray-600">{product.description}</p>
          </div>

          {/* Vendor Info */}
          <div className="border-y-2 border-[#01DBE0]/20 py-4">
            <div className="text-xs uppercase tracking-wider text-[#FE9C05] font-semibold mb-1">
              {isService ? "Service Provider" : "Sold by"}
            </div>
            <Link href={`/vendors/${vendorId}`} className="font-semibold text-lg hover:text-[#01DBE0] transition-colors">
              {vendor.name}
            </Link>
            <div className="text-sm text-gray-600 mt-1 font-body">
              <span className="text-[#FD237A] font-semibold">{vendor.location}</span> • 
              <span className="text-[#FE9C05] font-semibold ml-1">{vendor.rating}★</span>
            </div>
          </div>

          {/* Time Slot Selection for Services */}
          {isService && product.availableTimeSlots && (
            <div className="space-y-3">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-700">
                Select Time Slot
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {product.availableTimeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedTimeSlot(slot)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedTimeSlot === slot
                        ? "bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white shadow-lg shadow-[#FD237A]/30"
                        : "border-2 border-[#01DBE0]/30 hover:border-[#01DBE0] hover:bg-[#01DBE0]/10"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {!selectedTimeSlot && (
                <div className="text-xs text-[#FD237A] font-semibold">Please select a time slot</div>
              )}
            </div>
          )}

          {/* Options */}
          {hasOptions && (
            <div className="space-y-4">
              {optionDefs.map((opt) => (
                <div key={opt.id} className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-gray-700">
                    {opt.name}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((v) => (
                      <button
                        key={v}
                        onClick={() => setSelected((prev) => ({ ...prev, [opt.id]: v }))}
                        className={`px-5 py-2 rounded-full font-medium transition-all ${
                          selected[opt.id] === v
                            ? "bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white shadow-lg shadow-[#FD237A]/30"
                            : "border-2 border-[#01DBE0]/30 hover:border-[#01DBE0] hover:bg-[#01DBE0]/10"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  {!selected[opt.id] && (
                    <div className="text-xs text-[#FD237A] font-semibold">Please select {opt.name.toLowerCase()}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quantity - Only for products, not services */}
          {!isService && (
            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-gray-700">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 rounded-full border-2 border-[#01DBE0]/30 hover:border-[#01DBE0] hover:bg-[#01DBE0]/10 font-display text-xl transition-all"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  className="w-20 text-center rounded-xl border-2 border-[#01DBE0]/30 px-3 py-2 font-display text-xl focus:border-[#01DBE0] focus:outline-none"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 rounded-full border-2 border-[#01DBE0]/30 hover:border-[#01DBE0] hover:bg-[#01DBE0]/10 font-display text-xl transition-all"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              className={`w-full inline-flex items-center justify-center rounded-full px-6 py-4 text-lg font-semibold transition-all ${
                addedToCart
                  ? "bg-gradient-to-r from-[#C9FF3F] to-[#22c55e] text-gray-900"
                  : "bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white hover:shadow-xl hover:shadow-[#FD237A]/30 hover:-translate-y-1"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={!isValid}
              onClick={handleAddToCart}
            >
              {addedToCart 
                ? (isService ? "✓ Booking Added!" : "✓ Added to Cart!") 
                : (isService ? "Book Service" : "Add to Cart")}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/cart")}
                className="flex-1 inline-flex items-center justify-center rounded-full border-2 border-[#FE9C05] text-[#FE9C05] px-4 py-2 font-semibold hover:bg-[#FE9C05] hover:text-white transition-all"
              >
                View Cart
              </button>
              <button
                onClick={() => router.push(`/store/${vendorId}`)}
                className="flex-1 inline-flex items-center justify-center rounded-full border-2 border-[#01DBE0] text-[#01DBE0] px-4 py-2 font-semibold hover:bg-[#01DBE0] hover:text-white transition-all"
              >
                {isService ? "More Services" : "Continue Shopping"}
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="border-t-2 border-[#01DBE0]/20 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-wider text-gray-600 font-semibold">
                {isService ? "Service Total" : `Total (${quantity} ${quantity === 1 ? "item" : "items"})`}
              </span>
              <span className="font-display text-3xl bg-gradient-to-r from-[#FE9C05] to-[#FD237A] bg-clip-text text-transparent">
                ${((product.price * (isService ? 1 : quantity)) / 100).toFixed(2)}
              </span>
            </div>
            {isService && selectedTimeSlot && (
              <div className="text-sm text-gray-600 mt-2">
                <span className="font-semibold">Appointment:</span> {selectedTimeSlot} ({product.duration} minutes)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}