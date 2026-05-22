import Link from "next/link";
import { listVendors } from "../../services/vendors";
import SearchFilters from "../../components/SearchFilters";
import FavoriteButton from "../../components/FavoriteButton";
import { getVendorPlaceholderImage } from "../../utils/placeholderImages";
import {
  EVENT_TYPES,
  EVENT_TYPE_DISPLAY,
  HOMEPAGE_VENDOR_GROUPS,
  getVendorCategoryLabel,
  normalizeEventType,
  normalizeVendorCategories
} from "../../constants/categories";
import { getStorefrontPath } from "../../utils/storefrontLinks";

export default async function VendorsSelectPage({ searchParams }) {
  const params = await searchParams;
  const searchQuery = typeof params?.search === "string" ? params.search : "";
  const category = typeof params?.category === "string" ? params.category : null;
  const eventType = typeof params?.event_type === "string" ? normalizeEventType(params.event_type) : null;
  const minPrice = typeof params?.minPrice === "string" ? params.minPrice : null;
  const maxPrice = typeof params?.maxPrice === "string" ? params.maxPrice : null;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vendors/page.js:14',message:'Parsed vendor search params',data:{searchQuery,category,minPrice,maxPrice},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  // Fetch filtered vendors for display
  const vendors = await listVendors({ search: searchQuery, category, eventType, minPrice, maxPrice });
  const vendorIdSet = new Set(vendors.map((vendor) => vendor?.id ?? null));
  const uniqueVendorCount = vendorIdSet.size;
  const vendorsMissingId = vendors.filter((vendor) => !vendor?.id).length;
  const vendorsWithMissingCategories = vendors.filter((vendor) => vendor?.categories == null).length;
  const vendorsWithEmptyCategories = vendors.filter((vendor) => Array.isArray(vendor?.categories) && vendor.categories.length === 0).length;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vendors/page.js:20',message:'Fetched vendors for display',data:{vendorsCount:vendors.length,uniqueVendorCount,vendorsMissingId},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vendors/page.js:25',message:'Checked vendor category presence',data:{vendorsWithMissingCategories,vendorsWithEmptyCategories},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  // Fetch all vendors to get all categories for the filter
  const allVendors = await listVendors();
  const allCategories = Array.from(
    new Set(allVendors.flatMap((v) => normalizeVendorCategories(v.categories ?? [])))
  ).sort();

  // Group vendors by category
  const vendorsByCategory = vendors.reduce((acc, vendor) => {
    const categories = normalizeVendorCategories(vendor.categories ?? []);
    categories.forEach((cat) => {
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(vendor);
    });
    return acc;
  }, {});
  const displayedVendors = Object.values(vendorsByCategory).flat();
  const displayedVendorCount = new Set(
    displayedVendors.map((vendor) => vendor?.id).filter(Boolean)
  ).size;
  const categoryCounts = Object.fromEntries(
    Object.entries(vendorsByCategory).map(([cat, list]) => [cat, list.length])
  );
  const selectedCategoryCount = category ? displayedVendors.length : null;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vendors/page.js:40',message:'Built vendor category buckets',data:{category,categoryCounts,selectedCategoryCount},timestamp:Date.now(),sessionId:'debug-session',runId:'initial',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vendors/page.js:46',message:'Calculated displayed vendor count',data:{category,displayedVendorCount,displayedVendorSampleSize:displayedVendors.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion

  // If a category is selected, only show that category
  const sortedCategories = category
    ? Object.keys(vendorsByCategory).sort()
    : Object.keys(vendorsByCategory).sort();

  return (
    <div className="w-full">
      {/* Header with Search */}
      <div className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          <div className="mb-4">
            <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-[var(--gray-900)]">
              Find Vendors
            </h1>
            <p className="text-[var(--gray-500)] text-sm mt-1">
              Choose your event type first, then the vendors you need.
            </p>
          </div>

          <div className="mb-4 rounded-[var(--radius-2xl)] bg-white border border-[var(--gray-100)] p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--gray-900)]">1. What type of event are you planning?</h2>
                <p className="text-xs text-[var(--gray-500)]">This helps surface vendors open to that kind of booking.</p>
              </div>
              {eventType && (
                <Link href={category ? `/vendors?category=${encodeURIComponent(category)}` : "/vendors"} className="text-xs font-medium text-[var(--violet-600)]">
                  Clear
                </Link>
              )}
            </div>
            <div className="scroll-horizontal scrollbar-hide gap-2 -mx-4 px-4">
              {EVENT_TYPES.map((type) => (
                <Link
                  key={type.slug}
                  href={`/vendors?event_type=${encodeURIComponent(type.slug)}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    eventType === type.slug
                      ? "bg-[var(--violet-600)] text-white"
                      : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                  }`}
                >
                  {type.label}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Search and Filters */}
          <SearchFilters categories={allCategories} basePath="/vendors" eventType={eventType} />
        </div>
      </div>

      {/* Quick Actions - Category Icons */}
      <section className="bg-white border-b border-[var(--gray-100)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5">
          <div className="scroll-horizontal scrollbar-hide gap-4 -mx-4 px-4">
            {HOMEPAGE_VENDOR_GROUPS.map((group) => {
              return (
                <QuickActionCard
                  key={group.slug}
                  href={`/vendors?category=${encodeURIComponent(group.slug)}${eventType ? `&event_type=${encodeURIComponent(eventType)}` : ""}`}
                  icon={group.icon}
                  label={group.label}
                  color={group.color}
                  badge={group.slug === "food-drink" ? "Popular" : undefined}
                  isActive={category === group.slug}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Active Filters */}
      {(category || minPrice || maxPrice) && (
        <div className="bg-white border-b border-[var(--gray-100)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-[var(--gray-500)]">Filters:</span>
              {category && (
                <FilterBadge label={getVendorCategoryLabel(category)} href="/vendors" />
              )}
              {eventType && (
                <FilterBadge label={EVENT_TYPE_DISPLAY[eventType] || eventType} href={category ? `/vendors?category=${encodeURIComponent(category)}` : "/vendors"} />
              )}
              {(minPrice || maxPrice) && (
                <FilterBadge 
                  label={`$${minPrice || '0'} - $${maxPrice || '∞'}`} 
                  href={category ? `/vendors?category=${encodeURIComponent(category)}` : "/vendors"}
                />
              )}
              <Link 
                href="/vendors" 
                className="text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)] ml-2"
              >
                Clear all
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {/* Vendors by Category */}
        <div className="space-y-10">
          {sortedCategories.length > 0 ? (
            sortedCategories.map((cat) => (
              <CategorySection
                key={cat}
                category={cat}
                vendors={vendorsByCategory[cat]}
                isFiltered={category !== null}
              />
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

function FilterBadge({ label, href }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--violet-100)] text-[var(--violet-700)] text-sm font-medium hover:bg-[var(--violet-200)] transition-colors"
    >
      {label}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </Link>
  );
}

function QuickActionCard({ href, icon, label, color, badge, isActive }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 min-w-[72px] pt-2"
    >
      <div
        className={`relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform hover:scale-105 active:scale-95 ${isActive ? 'ring-2 ring-[var(--violet-500)] ring-offset-2' : ''}`}
        style={{ backgroundColor: color }}
      >
        {icon}
        {badge && (
          <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-[var(--coral-500)] text-white text-[9px] font-bold rounded-full shadow-sm">
            {badge}
          </span>
        )}
      </div>
      <span className={`text-xs font-medium text-center ${isActive ? 'text-[var(--violet-600)]' : 'text-[var(--gray-700)]'}`}>{label}</span>
    </Link>
  );
}

function CategorySection({ category, vendors, isFiltered }) {
  return (
    <section className="animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          {category}
        </h2>
        {!isFiltered && (
          <Link
            href={`/vendors?category=${encodeURIComponent(category)}`}
            className="flex items-center gap-1 text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)]"
          >
            View all
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {vendors.map((vendor, index) => (
          <VendorCard key={vendor.id} vendor={vendor} index={index} />
        ))}
      </div>
    </section>
  );
}

function VendorCard({ vendor, index }) {
  const hasImage = vendor.heroImage && vendor.heroImage.length > 0;
  const placeholderImage = getVendorPlaceholderImage(vendor.categories, vendor.id);
  
  return (
    <Link
      href={getStorefrontPath(vendor)}
      className="group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] rounded-[var(--radius-xl)] overflow-hidden mb-2 shadow-[var(--shadow-card)] group-hover:shadow-[var(--shadow-card-hover)] transition-all">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hasImage ? vendor.heroImage : placeholderImage}
          alt={vendor.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Favorite button */}
        <FavoriteButton vendorId={vendor.id} className="absolute top-3 left-3 z-10" />

        {/* Rating Badge */}
        {vendor.rating && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-[var(--gray-900)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--amber-500)" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            {vendor.rating}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <h3 className="font-semibold text-sm text-[var(--gray-900)] line-clamp-1 group-hover:text-[var(--violet-600)] transition-colors">
          {vendor.name}
        </h3>
        <p className="text-xs text-[var(--gray-500)] line-clamp-2 mt-0.5 min-h-[32px]">
          {vendor.description}
        </p>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-[var(--gray-400)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {vendor.location}
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-2">No vendors found</h3>
      <p className="text-[var(--gray-500)] mb-6 max-w-sm mx-auto">
        Try adjusting your filters or search to find what you&apos;re looking for.
      </p>
      <Link
        href="/vendors"
        className="btn btn-gradient inline-flex"
      >
        Clear Filters
      </Link>
    </div>
  );
}
