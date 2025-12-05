import Link from "next/link";
import { listVendors } from "../../services/vendors";
import SearchBar from "./SearchBar";

export default async function VendorsSelectPage({ searchParams }) {
  const params = await searchParams;
  const searchQuery = typeof params?.search === "string" ? params.search : "";
  const category = typeof params?.category === "string" ? params.category : null;

  const vendors = await listVendors({ search: searchQuery, category });

  const categories = Array.from(
    new Set(vendors.flatMap((v) => v.categories ?? []))
  ).sort();

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="font-display text-4xl tracking-wide mb-6">
        <span className="bg-gradient-to-r from-[#01DBE0] to-[#FD237A] bg-clip-text text-transparent">
          CHOOSE A VENDOR
        </span>
      </h1>
      <SearchBar initialSearch={searchQuery} category={category} />
      <CategoryFilter categories={categories} active={category} />
      <VendorGrid vendors={vendors} />
    </div>
  );
}

function CategoryFilter({ categories, active }) {
  return (
    <div className="mb-8 overflow-x-auto">
      <div className="flex items-center gap-3 whitespace-nowrap">
        <FilterChip label="All" href="/vendors" active={active == null} />
        {categories.map((c) => (
          <FilterChip key={c} label={c} href={`/vendors?category=${encodeURIComponent(c)}`} active={active?.toLowerCase() === c.toLowerCase()} />
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

function VendorGrid({ vendors }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {vendors.map((v) => (
        <Link
          key={v.id}
          href={`/store/${v.id}`}
          className="group relative rounded-2xl border-2 border-transparent bg-gradient-to-br from-[#DCA7F0]/10 via-white to-[#C9FF3F]/10 p-5 hover:border-[#01DBE0] transition-all hover:shadow-xl hover:shadow-[#01DBE0]/20 hover:-translate-y-1"
        >
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[#01DBE0]/20 to-[#FD237A]/20 flex items-center justify-center flex-shrink-0">
              <img src={v.heroImage} alt="" className="h-8 w-8 opacity-70" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg mb-1">{v.name}</div>
              <div className="text-sm text-gray-600 font-body">{v.description}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold text-[#FE9C05]">{v.location}</span>
                <span className="text-xs">•</span>
                <span className="text-xs font-semibold text-[#FD237A]">{v.rating}★</span>
              </div>
            </div>
          </div>
          <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-[#C9FF3F] animate-pulse" />
        </Link>
      ))}
    </div>
  );
}