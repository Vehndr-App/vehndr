"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getVendorProfile, getVendorProducts } from "../../../services/vendors";
import ProductCard from "../../../components/ProductCard";
import Link from "next/link";

export default function StorefrontPage() {
  const { vendorId } = useParams();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("recommended");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    (async () => {
      const v = await getVendorProfile(vendorId);
      const p = await getVendorProducts(vendorId);
      setVendor(v);
      setProducts(p);
    })();
  }, [vendorId]);

  const filteredProducts = useMemo(() => {
    if (activeTab === "products") return products.filter(p => !p.isService);
    if (activeTab === "services") return products.filter(p => p.isService);
    return products;
  }, [products, activeTab]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sort) {
      case "price_asc":
        return list.sort((a, b) => a.price - b.price);
      case "price_desc":
        return list.sort((a, b) => b.price - a.price);
      case "name_asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  }, [filteredProducts, sort]);

  const hasImage = vendor?.heroImage && vendor.heroImage.length > 0;
  const productCount = products.filter(p => !p.isService).length;
  const serviceCount = products.filter(p => p.isService).length;

  if (!vendor) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-[var(--gray-200)] rounded-[var(--radius-2xl)]" />
          <div className="h-8 bg-[var(--gray-200)] rounded w-1/3" />
          <div className="h-4 bg-[var(--gray-200)] rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="relative h-48 sm:h-56 overflow-hidden">
        {hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={vendor.heroImage}
            alt={vendor.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Vendor Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display text-white tracking-tight">
                  {vendor.name}
                </h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-white/80">
                  {vendor.rating && (
                    <span className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--amber-500)" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      {vendor.rating}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {vendor.location}
                  </span>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                <span className="w-2 h-2 rounded-full bg-[var(--mint-500)]"></span>
                Open Now
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Description */}
        <p className="text-[var(--gray-600)] text-sm mt-4 mb-6">
          {vendor.description}
        </p>

        {/* Tap to Pay Section - GoPuff/Uber Eats style */}
        <div className="mb-6 p-4 rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--violet-50)] to-[var(--magenta-50)] border border-[var(--violet-100)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--gray-900)]">Tap to Pay Available</h3>
                <p className="text-xs text-[var(--gray-500)]">Pay instantly at this vendor&apos;s booth</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-white text-xs font-medium text-[var(--gray-700)]">
                Apple Pay
              </span>
              <span className="px-2 py-1 rounded bg-white text-xs font-medium text-[var(--gray-700)]">
                Google Pay
              </span>
            </div>
          </div>
        </div>

        {/* Tabs - Products vs Services */}
        <div className="flex gap-1 p-1 bg-[var(--gray-100)] rounded-[var(--radius-lg)] mb-4 w-fit">
          <TabButton 
            active={activeTab === "all"} 
            onClick={() => setActiveTab("all")}
          >
            All ({products.length})
          </TabButton>
          {productCount > 0 && (
            <TabButton 
              active={activeTab === "products"} 
              onClick={() => setActiveTab("products")}
            >
              Products ({productCount})
            </TabButton>
          )}
          {serviceCount > 0 && (
            <TabButton 
              active={activeTab === "services"} 
              onClick={() => setActiveTab("services")}
            >
              Services ({serviceCount})
            </TabButton>
          )}
        </div>

        {/* Sort chips */}
        <div className="mb-6 scroll-horizontal scrollbar-hide -mx-4 px-4 gap-2">
          <SortChip label="Recommended" active={sort === "recommended"} onClick={() => setSort("recommended")} />
          <SortChip label="Price: Low to High" active={sort === "price_asc"} onClick={() => setSort("price_asc")} />
          <SortChip label="Price: High to Low" active={sort === "price_desc"} onClick={() => setSort("price_desc")} />
          <SortChip label="A–Z" active={sort === "name_asc"} onClick={() => setSort("name_asc")} />
        </div>

        {/* Products Grid */}
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-1">No items yet</h3>
            <p className="text-[var(--gray-500)]">This vendor hasn&apos;t added any {activeTab === "all" ? "items" : activeTab} yet.</p>
          </div>
        )}

        {/* Vendor Contact/Info Footer */}
        <div className="mt-8 mb-4 p-4 rounded-[var(--radius-xl)] bg-[var(--gray-50)] border border-[var(--gray-100)]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                {vendor.name?.charAt(0) || 'V'}
              </div>
              <div>
                <h4 className="font-semibold text-[var(--gray-900)]">{vendor.name}</h4>
                <p className="text-xs text-[var(--gray-500)]">Verified Vendor</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline h-9 px-4 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                Message
              </button>
              <button className="btn bg-gradient-primary text-white h-9 px-4 text-sm rounded-full">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-all ${
        active
          ? "bg-white text-[var(--gray-900)] shadow-sm"
          : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SortChip({ label, active, onClick }) {
  return (
    <button
      className={`chip flex-shrink-0 ${active ? 'chip-active' : 'chip-outlined'}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
