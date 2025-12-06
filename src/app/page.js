import Link from "next/link";
import { listVendors } from "../services/vendors";
import PriceFilter from "./vendors/PriceFilter";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const category = typeof params?.category === "string" ? params.category : null;
  const minPrice = typeof params?.minPrice === "string" ? params.minPrice : null;
  const maxPrice = typeof params?.maxPrice === "string" ? params.maxPrice : null;

  // Fetch filtered vendors for display
  const vendors = await listVendors({ category, minPrice, maxPrice });

  // Fetch all vendors to get all categories for the filter
  const allVendors = await listVendors();
  const allCategories = Array.from(
    new Set(allVendors.flatMap((v) => v.categories ?? []))
  ).sort();

  // Group vendors by category
  const vendorsByCategory = vendors.reduce((acc, vendor) => {
    const categories = vendor.categories ?? ["Uncategorized"];
    categories.forEach((cat) => {
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(vendor);
    });
    return acc;
  }, {});

  // If a category is selected, only show that category
  const sortedCategories = category
    ? [category]
    : Object.keys(vendorsByCategory).sort();

  return (
    <div className="mx-auto max-w-6xl p-8 w-full">
      <div className="text-center mb-12">
        <div className="text-sm uppercase tracking-[0.2em] text-[#FE9C05] font-semibold mb-2">
          Welcome to
        </div>
        <h1 className="font-display text-6xl sm:text-7xl tracking-wide mb-4">
          <span className="bg-gradient-to-r from-[#01DBE0] via-[#FD237A] to-[#FE9C05] bg-clip-text text-transparent">
            VEHNDR
          </span>
        </h1>
        <p className="mt-4 text-lg font-body text-gray-600 max-w-2xl mx-auto">
          Marketplace for vendors at festivals and events. Find your event, discover vendors, and order everything you need.
        </p>
        <div className="mt-8 flex gap-4 justify-center flex-wrap">
          <Link
            href="/events"
            className="inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white font-semibold text-lg hover:shadow-lg hover:shadow-[#FD237A]/30 transition-all hover:-translate-y-1"
          >
            Find Your Event
          </Link>
          <Link
            href="/vendors"
            className="inline-flex items-center px-8 py-4 rounded-full border-2 border-[#01DBE0] text-[#01DBE0] font-semibold text-lg hover:bg-[#01DBE0] hover:text-white transition-all"
          >
            Browse All Vendors
          </Link>
        </div>
      </div>

      {/* Category and Price Filters */}
      <CategoryFilter categories={allCategories} active={category} />
      <PriceFilter minPrice={minPrice} maxPrice={maxPrice} />

      {/* Vendors by Category */}
      <div className="mt-8 space-y-12">
        {sortedCategories.map((category) => (
          <CategorySection
            key={category}
            category={category}
            vendors={vendorsByCategory[category]}
          />
        ))}
      </div>
    </div>
  );
}

function CategorySection({ category, vendors }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-3xl tracking-wide">
          <span className="bg-gradient-to-r from-[#01DBE0] to-[#FD237A] bg-clip-text text-transparent">
            {category.toUpperCase()}
          </span>
        </h2>
        <Link
          href={`/vendors?category=${encodeURIComponent(category)}`}
          className="text-sm font-semibold text-[#FE9C05] hover:text-[#FD237A] transition-colors"
        >
          View all →
        </Link>
      </div>
      <div className="overflow-x-auto scrollbar-hide -mx-8 px-8">
        <div className="flex gap-4 pb-4">
          {vendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VendorCard({ vendor }) {
  return (
    <Link
      href={`/store/${vendor.id}`}
      className="group relative flex-shrink-0 w-[280px] h-[320px] rounded-2xl overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Hero Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={vendor.heroImage}
        alt={vendor.name}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Status Indicator */}
      <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-[#C9FF3F] shadow-lg shadow-[#C9FF3F]/50 animate-pulse" />

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
        <h3 className="font-semibold text-xl mb-2 group-hover:text-[#C9FF3F] transition-colors">
          {vendor.name}
        </h3>
        <p className="text-sm text-gray-200 mb-3 line-clamp-2">
          {vendor.description}
        </p>
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#FE9C05]">{vendor.location}</span>
          <span className="font-semibold text-[#C9FF3F]">{vendor.rating}★</span>
        </div>
      </div>
    </Link>
  );
}

function CategoryFilter({ categories, active }) {
  return (
    <div className="mb-8 overflow-x-auto">
      <div className="flex items-center gap-3 whitespace-nowrap">
        <FilterChip label="All" href="/" active={active == null} />
        {categories.map((c) => (
          <FilterChip key={c} label={c} href={`/?category=${encodeURIComponent(c)}`} active={active?.toLowerCase() === c.toLowerCase()} />
        ))}
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