import Link from "next/link";
import { listVendors } from "../services/vendors";
import SearchFilters from "../components/SearchFilters";
import FavoriteButton from "../components/FavoriteButton";

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
    <div className="w-full">
      {/* Hero Section with Video/Graphic Support */}
      <section className="relative overflow-hidden">
        {/* Background - Video or Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--violet-600)] via-[var(--magenta-500)] to-[var(--coral-500)]">
          {/* Video placeholder - uncomment and add video source when ready */}
          {/* 
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          */}
          
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdi0yMGgtNjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
        </div>
        
        {/* Content */}
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint-500)] animate-pulse"></span>
              Live at 50+ events
            </div>
            
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white tracking-tight mb-3">
              Find your perfect event vendors
            </h1>
            
            <p className="text-white/80 text-sm sm:text-base max-w-lg mx-auto">
              The marketplace connecting event coordinators with vendors, and attendees with amazing products.
            </p>
          </div>
          
          {/* Search Filters - Airbnb Style */}
          <div className="max-w-3xl mx-auto">
            <SearchFilters categories={allCategories} />
          </div>
        </div>
      </section>

      {/* Quick Actions - Category Icons */}
      <section className="bg-white border-b border-[var(--gray-100)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5">
          <div className="scroll-horizontal scrollbar-hide gap-4 -mx-4 px-4">
            <QuickActionCard 
              href="/events" 
              icon="🎪" 
              label="Events"
              color="#EDE9FE"
            />
            <QuickActionCard 
              href="/vendors?category=Food%20%26%20Beverage" 
              icon="🍕" 
              label="Food & Drink"
              color="#FEE2E2"
              badge="Popular"
            />
            <QuickActionCard 
              href="/vendors?category=Health%20%26%20Wellness" 
              icon="💆" 
              label="Wellness"
              color="#D1FAE5"
            />
            <QuickActionCard 
              href="/vendors?category=Clothing%20%26%20Accessories" 
              icon="👗" 
              label="Fashion"
              color="#FCE7F3"
            />
            <QuickActionCard 
              href="/vendors?category=Entertainment" 
              icon="🎸" 
              label="Entertainment"
              color="#FEF3C7"
            />
            <QuickActionCard 
              href="/vendors?category=Photography" 
              icon="📸" 
              label="Photography"
              color="#E0E7FF"
            />
            <QuickActionCard 
              href="/vendors?category=Rentals" 
              icon="🎪" 
              label="Rentals"
              color="#CFFAFE"
            />
            <QuickActionCard 
              href="/vendors?category=DJ%2FMusic" 
              icon="🎧" 
              label="DJ/Music"
              color="#F3E8FF"
            />
          </div>
        </div>
      </section>

      {/* Active Filters Display */}
      {(category || minPrice || maxPrice) && (
        <section className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-[var(--gray-500)]">Active filters:</span>
              {category && (
                <FilterBadge label={category} href="/" />
              )}
              {(minPrice || maxPrice) && (
                <FilterBadge 
                  label={`$${minPrice || '0'} - $${maxPrice || '∞'}`} 
                  href={category ? `/?category=${encodeURIComponent(category)}` : "/"}
                />
              )}
              <Link 
                href="/" 
                className="text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)] ml-2"
              >
                Clear all
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-6">
          {/* Results Count */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--gray-900)]">
                {category ? `${category} Vendors` : "All Vendors"}
              </h2>
              <p className="text-sm text-[var(--gray-500)]">
                {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} available
              </p>
            </div>
            <Link
              href="/vendors"
              className="text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)]"
            >
              View all →
            </Link>
          </div>
        </div>

        {/* Vendors by Category */}
        <div className="space-y-10">
          {sortedCategories.length > 0 ? (
            sortedCategories.map((cat) => (
              <CategorySection
                key={cat}
                category={cat}
                vendors={vendorsByCategory[cat]}
              />
            ))
          ) : (
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <EmptyState />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ href, icon, label, color, badge }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 min-w-[72px]"
    >
      <div 
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: color }}
      >
        {icon}
        {badge && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-[var(--coral-500)] text-white text-[9px] font-bold rounded-full">
            {badge}
          </span>
        )}
      </div>
      <span className="text-xs font-medium text-[var(--gray-700)] text-center">{label}</span>
    </Link>
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

function CategorySection({ category, vendors }) {
  return (
    <section className="animate-slide-up mx-auto max-w-6xl px-4 sm:px-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--gray-900)]">
          {category}
        </h3>
        <Link
          href={`/vendors?category=${encodeURIComponent(category)}`}
          className="flex items-center gap-1 text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)]"
        >
          {vendors.length} vendors
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {vendors.map((vendor, index) => (
          <VendorCard key={vendor.id} vendor={vendor} index={index} />
        ))}
      </div>
    </section>
  );
}

function VendorCard({ vendor, index }) {
  const hasImage = vendor.heroImage && vendor.heroImage.length > 0;
  
  return (
    <Link
      href={`/store/${vendor.id}`}
      className="group flex-shrink-0 w-[200px] sm:w-[220px]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] rounded-[var(--radius-xl)] overflow-hidden mb-2 shadow-[var(--shadow-card)] group-hover:shadow-[var(--shadow-card-hover)] transition-all">
        {hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={vendor.heroImage}
            alt={vendor.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-primary flex items-center justify-center">
            <span className="text-white/90 text-4xl font-display">
              {vendor.name?.charAt(0) || 'V'}
            </span>
          </div>
        )}
        
        {/* Favorite button - Airbnb style */}
        <FavoriteButton vendorId={vendor.id} className="absolute top-2 right-2" />

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
        <h4 className="font-semibold text-sm text-[var(--gray-900)] line-clamp-1 group-hover:text-[var(--violet-600)] transition-colors">
          {vendor.name}
        </h4>
        <p className="text-xs text-[var(--gray-500)] line-clamp-1 mt-0.5">
          {vendor.description}
        </p>
        <div className="flex items-center gap-1 mt-1 text-xs text-[var(--gray-400)]">
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
        Try adjusting your filters or browse all vendors to discover something new.
      </p>
      <Link
        href="/"
        className="btn btn-gradient inline-flex"
      >
        Clear Filters
      </Link>
    </div>
  );
}
