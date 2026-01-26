import Link from "next/link";
import { listVendors } from "../services/vendors";
import { api } from "../services/api";
import FavoriteButton from "../components/FavoriteButton";
import HeroMedia from "../components/HeroMedia";
import HomeToggle from "../components/HomeToggle";
import UserTypePopup from "../components/UserTypePopup";
import { getVendorPlaceholderImage } from "../utils/placeholderImages";
import { VENDOR_CATEGORIES, CATEGORY_DISPLAY } from "../constants/categories";

// Fetch events function
async function listEvents(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.set("search", params.search);
    if (params.type) queryParams.set("type", params.type);
    if (params.date) queryParams.set("date", params.date);
    
    const url = `/api/events${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response = await api(url);
    return Array.isArray(response) ? response : response?.events || [];
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return [];
  }
}

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const mode = typeof params?.mode === "string" ? params.mode : "vendors";
  const search = typeof params?.search === "string" ? params.search : null;
  const category = typeof params?.category === "string" ? params.category : null;
  const minPrice = typeof params?.minPrice === "string" ? params.minPrice : null;
  const maxPrice = typeof params?.maxPrice === "string" ? params.maxPrice : null;
  const eventType = typeof params?.type === "string" ? params.type : null;
  const eventDate = typeof params?.date === "string" ? params.date : null;

  // Fetch data based on mode
  let vendors = [];
  let events = [];
  let allCategories = [];

  if (mode === "events") {
    events = await listEvents({ search, type: eventType, date: eventDate });
  } else {
    // Fetch filtered vendors for display
    vendors = await listVendors({ search, category, minPrice, maxPrice });
    // Fetch all vendors to get all categories for the filter
    const allVendors = await listVendors();
    allCategories = Array.from(
      new Set(allVendors.flatMap((v) => v.categories ?? []))
    ).sort();
  }

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
      <UserTypePopup />

      {/* Hero Section with Video/Graphic Support */}
      <section className="relative">
        {/* Background - Video, Image, or Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--violet-600)] via-[var(--magenta-500)] to-[var(--coral-500)] overflow-hidden">
          {/* 
            To add a video, place your video file at /public/hero-video.mp4 
            Supported formats: .mp4, .webm
            Recommended: 1920x1080, < 10MB, 15-30 seconds loop
          */}
          <HeroMedia 
            videoSrc="/hero-video.mp4"
            imageSrc="/hero-image.jpg"
          />
          
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdi0yMGgtNjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
        </div>
        
        {/* Content */}
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
          {/* Airbnb-style Toggle */}
          <HomeToggle categories={allCategories} initialMode={mode} />
        </div>
      </section>

      {/* Quick Actions - Category Icons */}
      {mode === "vendors" && (
        <section className="bg-white border-b border-[var(--gray-100)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5">
            <div className="scroll-horizontal scrollbar-hide gap-4 -mx-4 px-4">
              <QuickActionCard
                href="/?mode=events"
                icon="🗓️"
                label="Events"
              color="var(--violet-100)"
              />
              {VENDOR_CATEGORIES.filter(category => allCategories.includes(category)).map((category) => {
                const display = CATEGORY_DISPLAY[category];
                return (
                  <QuickActionCard
                    key={category}
                    href={`/vendors?category=${encodeURIComponent(category)}`}
                    icon={display.icon}
                    label={display.label}
                    color={display.color}
                    badge={category === "Food & Beverage" ? "Popular" : undefined}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Event Quick Actions */}
      {mode === "events" && (
        <section className="bg-white border-b border-[var(--gray-100)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5">
            <div className="scroll-horizontal scrollbar-hide gap-4 -mx-4 px-4">
              <QuickActionCard 
                href="/?mode=vendors" 
                icon="🏪" 
                label="Vendors"
                color="var(--violet-50)"
              />
              <QuickActionCard 
                href="/?mode=events&type=party" 
                icon="🎉" 
                label="Parties"
                color="var(--magenta-100)"
                badge="Hot"
              />
              <QuickActionCard 
                href="/?mode=events&type=wedding" 
                icon="💒" 
                label="Weddings"
                color="var(--coral-100)"
              />
              <QuickActionCard 
                href="/?mode=events&type=concert" 
                icon="🎸" 
                label="Concerts"
                color="var(--amber-100)"
              />
              <QuickActionCard 
                href="/?mode=events&type=festival" 
                icon="🎪" 
                label="Festivals"
                color="var(--info-50)"
              />
              <QuickActionCard 
                href="/?mode=events&type=corporate" 
                icon="💼" 
                label="Corporate"
                color="var(--violet-50)"
              />
              <QuickActionCard 
                href="/?mode=events&type=wellness" 
                icon="🧘" 
                label="Wellness"
                color="var(--mint-100)"
              />
            </div>
          </div>
        </section>
      )}

      {/* Active Filters Display - Vendors */}
      {mode === "vendors" && (search || category || minPrice || maxPrice) && (
        <section className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-[var(--gray-500)]">Active filters:</span>
              {search && (
                <FilterBadge label={`"${search}"`} href="/" />
              )}
              {category && (
                <FilterBadge label={CATEGORY_DISPLAY[category]?.label || category} href={search ? `/?search=${encodeURIComponent(search)}` : "/"} />
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

      {/* Active Filters Display - Events */}
      {mode === "events" && (search || eventType || eventDate) && (
        <section className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-[var(--gray-500)]">Active filters:</span>
              {search && (
                <FilterBadge label={`"${search}"`} href="/?mode=events" />
              )}
              {eventType && (
                <FilterBadge label={eventType} href="/?mode=events" />
              )}
              {eventDate && (
                <FilterBadge label={eventDate} href="/?mode=events" />
              )}
              <Link 
                href="/?mode=events" 
                className="text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)] ml-2"
              >
                Clear all
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Main Content - Vendors */}
      {mode === "vendors" && (
        <div className="py-6">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-6">
            {/* Results Count */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--gray-900)]">
                  {search 
                    ? `Results for "${search}"` 
                    : category 
                      ? `${category} Vendors` 
                      : "All Vendors"}
                </h2>
                <p className="text-sm text-[var(--gray-500)]">
                  {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} {search ? 'found' : 'available'}
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
                <EmptyState type="vendors" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Events */}
      {mode === "events" && (
        <div className="py-6">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-6">
            {/* Results Count */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--gray-900)]">
                  {search 
                    ? `Events matching "${search}"` 
                    : eventType 
                      ? `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Events` 
                      : "Upcoming Events"}
                </h2>
                <p className="text-sm text-[var(--gray-500)]">
                  {events.length} event{events.length !== 1 ? 's' : ''} {search ? 'found' : 'near you'}
                </p>
              </div>
              <Link
                href="/events"
                className="text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)]"
              >
                View all →
              </Link>
            </div>
          </div>

          {/* Events Grid */}
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {events.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))}
              </div>
            ) : (
              <EmptyState type="events" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickActionCard({ href, icon, label, color, badge }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 min-w-[72px] pt-2"
    >
      <div 
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: color }}
      >
        {icon}
        {badge && (
          <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-[var(--coral-500)] text-white text-[9px] font-bold rounded-full shadow-sm">
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
  const placeholderImage = getVendorPlaceholderImage(vendor.categories, vendor.id);
  
  return (
    <Link
      href={`/store/${vendor.id}`}
      className="group flex-shrink-0 w-[200px] sm:w-[220px]"
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
        
        {/* Favorite button - Airbnb style */}
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

function EventCard({ event, index }) {
  const eventDate = event.start_time ? new Date(event.start_time) : null;
  
  return (
    <Link
      href={`/events/${event.id}`}
      className="group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all overflow-hidden">
        {/* Event Image */}
        <div className="relative aspect-[16/9]">
          {event.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={event.image_url}
              alt={event.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)] flex items-center justify-center">
              <span className="text-5xl">🎉</span>
            </div>
          )}
          
          {/* Date Badge */}
          {eventDate && (
            <div className="absolute top-3 left-3 bg-white rounded-[var(--radius-lg)] p-2 shadow-lg text-center min-w-[50px]">
              <div className="text-xs font-bold text-[var(--coral-500)] uppercase">
                {eventDate.toLocaleDateString('en-US', { month: 'short' })}
              </div>
              <div className="text-lg font-bold text-[var(--gray-900)]">
                {eventDate.getDate()}
              </div>
            </div>
          )}

          {/* Status Badge */}
          {event.status && (
            <div className="absolute top-3 right-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                event.status === 'upcoming' 
                  ? 'bg-[var(--mint-500)] text-white'
                  : event.status === 'active'
                  ? 'bg-[var(--violet-500)] text-white'
                  : 'bg-[var(--gray-400)] text-white'
              }`}>
                {event.status === 'upcoming' ? 'Upcoming' : event.status === 'active' ? 'Live' : 'Past'}
              </span>
            </div>
          )}
        </div>

        {/* Event Info */}
        <div className="p-4">
          <h3 className="font-semibold text-[var(--gray-900)] line-clamp-1 group-hover:text-[var(--violet-600)] transition-colors mb-1">
            {event.name}
          </h3>
          
          {eventDate && (
            <p className="text-sm text-[var(--gray-500)] mb-2">
              {eventDate.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          )}

          {event.location && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--gray-400)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}

          {/* Attendees */}
          {event.attendee_count > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--gray-100)]">
              <div className="flex -space-x-2">
                {[...Array(Math.min(3, event.attendee_count))].map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--violet-400)] to-[var(--magenta-400)] border-2 border-white" />
                ))}
              </div>
              <span className="text-xs text-[var(--gray-500)]">
                {event.attendee_count}+ going
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ type = "vendors" }) {
  const isEvents = type === "events";
  
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
        {isEvents ? (
          <span className="text-4xl">🗓️</span>
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-2">
        {isEvents ? "No events found" : "No vendors found"}
      </h3>
      <p className="text-[var(--gray-500)] mb-6 max-w-sm mx-auto">
        {isEvents 
          ? "Try adjusting your filters or check back later for new events."
          : "Try adjusting your filters or browse all vendors to discover something new."}
      </p>
      <Link
        href={isEvents ? "/?mode=events" : "/"}
        className="btn btn-gradient inline-flex"
      >
        Clear Filters
      </Link>
    </div>
  );
}
