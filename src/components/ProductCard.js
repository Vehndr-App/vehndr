"use client";

import Link from "next/link";

export default function ProductCard({ product }) {
  const isService = product.isService === true;
  
  return (
    <Link 
      href={`/store/${product.vendorId}/products/${product.id}`}
      className="group relative rounded-2xl overflow-hidden border-2 border-transparent bg-white hover:border-[#01DBE0] transition-all hover:shadow-xl hover:shadow-[#01DBE0]/20 hover:-translate-y-1 block"
    >
      {isService && (
        <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-[#FE9C05] to-[#FD237A] text-white px-3 py-1 rounded-full text-xs font-semibold">
          Service
        </div>
      )}
      <div className="aspect-video w-full bg-gradient-to-br from-[#DCA7F0]/20 to-[#C9FF3F]/20 flex items-center justify-center overflow-hidden">
        {product.images && product.images.length > 0 ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
        ) : (
          <div className="text-gray-400 text-sm">No image</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-gray-900">{product.name}</div>
            <div className="text-xs text-gray-600 font-body mt-1">{product.description}</div>
          </div>
          <div className="font-display text-2xl text-[#FE9C05]">
            ${(product.price / 100).toFixed(2)}
            {isService && <span className="text-xs font-body block text-gray-600">{product.duration} min</span>}
          </div>
        </div>
        <div className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#01DBE0] to-[#FD237A] px-4 py-2 text-sm font-semibold text-white w-full group-hover:shadow-lg group-hover:shadow-[#FD237A]/30 transition-all">
          View
        </div>
      </div>
    </Link>
  );
}