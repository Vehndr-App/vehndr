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
    <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
      <span className="text-sm font-medium text-[var(--gray-500)] flex-shrink-0">Price:</span>
      <div className="flex items-center gap-2">
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
            <Link
              key={range.label}
              href={href}
              className={`chip ${isActive ? 'chip-active' : 'chip-filled'}`}
            >
              {range.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
