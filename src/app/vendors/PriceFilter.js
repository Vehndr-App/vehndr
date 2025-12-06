"use client";

import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";

export default function PriceFilter({ minPrice, maxPrice }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const priceRanges = [
    { label: "All Prices", minPrice: null, maxPrice: null },
    { label: "$0-$50", minPrice: "0", maxPrice: "50" },
    { label: "$50-$100", minPrice: "50", maxPrice: "100" },
    { label: "$100-$200", minPrice: "100", maxPrice: "200" },
    { label: "$200+", minPrice: "200", maxPrice: null },
  ];

  return (
    <div className="mb-8 overflow-x-auto">
      <div className="flex items-center gap-3 whitespace-nowrap">
        <span className="text-sm font-semibold text-gray-600 mr-2">Price:</span>
        {priceRanges.map((range) => {
          const isActive =
            (range.minPrice === null && minPrice === null && range.maxPrice === null && maxPrice === null) ||
            (range.minPrice === minPrice && range.maxPrice === maxPrice);

          const params = new URLSearchParams(searchParams.toString());
          if (range.minPrice) params.set('minPrice', range.minPrice);
          else params.delete('minPrice');
          if (range.maxPrice) params.set('maxPrice', range.maxPrice);
          else params.delete('maxPrice');

          const href = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;

          return (
            <FilterChip
              key={range.label}
              label={range.label}
              href={href}
              active={isActive}
            />
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({ label, href, active }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold transition-all ${
        active
          ? "bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white shadow-lg shadow-[#FD237A]/30"
          : "border-2 border-[#01DBE0]/30 hover:border-[#01DBE0] hover:bg-[#01DBE0]/10"
      }`}
    >
      {label}
    </Link>
  );
}
