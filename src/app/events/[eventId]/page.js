import Link from "next/link";
import { getEvent } from "../../../services/events";
import { listVendors } from "../../../services/vendors";

export default async function EventDetailPage({ params }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  const allVendors = await listVendors();
  
  if (!event) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[var(--gray-900)] mb-2">Event Not Found</h1>
          <p className="text-[var(--gray-500)] mb-4">The event you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/events" className="btn btn-outline inline-flex">
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  // Get vendor details for this event
  const eventVendors = allVendors.filter(v => event.vendorIds.includes(v.id));

  // Helper function to map vendor to single category
  const getCategoryForVendor = (vendor) => {
    const categories = vendor.categories ?? ["Uncategorized"];

    // Check if vendor has food/beverage category (priority category)
    const hasFoodCategory = categories.some(cat =>
      cat.toLowerCase().includes('food') || cat.toLowerCase().includes('beverage')
    );

    if (hasFoodCategory) {
      return "Food and Drink";
    }

    return "Artisan & Craft";
  };

  // Group vendors by their assigned category (each vendor in ONE section only)
  const vendorsByCategory = eventVendors.reduce((acc, vendor) => {
    const category = getCategoryForVendor(vendor);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(vendor);
    return acc;
  }, {});

  // Only use categories that have vendors
  const categories = Object.keys(vendorsByCategory).sort();

  const hasImage = event.image && event.image.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* Back Button */}
      <Link 
        href="/events" 
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--gray-500)] hover:text-[var(--violet-600)] transition-colors mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Events
      </Link>
      
      {/* Event Header Card */}
      <div className="rounded-[var(--radius-3xl)] overflow-hidden shadow-[var(--shadow-lg)] mb-10 bg-white">
        {/* Hero Image */}
        <div className="relative h-[240px] sm:h-[320px]">
          {hasImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={event.image} 
              alt={event.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Category Badge */}
          <div className="absolute top-4 left-4">
            <span className="inline-block px-4 py-2 bg-gradient-primary rounded-full text-sm font-semibold text-white shadow-[var(--shadow-button)]">
              {event.category}
            </span>
          </div>
          
          {/* Event Name Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white tracking-tight mb-2">
              {event.name}
            </h1>
            <p className="text-white/80 text-base sm:text-lg max-w-2xl">{event.description}</p>
          </div>
        </div>
        
        {/* Event Details */}
        <div className="p-6 sm:p-8 border-t border-[var(--gray-100)]">
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--gray-50)] rounded-full text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--coral-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="font-medium text-[var(--gray-700)]">{event.location}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--gray-50)] rounded-full text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span className="font-medium text-[var(--gray-700)]">
                {new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                {event.startDate !== event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--gray-50)] rounded-full text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span className="font-medium text-[var(--gray-700)]">{(event.attendees / 1000).toFixed(0)}K expected attendees</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--mint-500)]/10 rounded-full text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mint-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span className="font-semibold text-[var(--mint-600)]">{eventVendors.length} Vendors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vendors Section */}
      <div>
        <div className="mb-8">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-[var(--gray-900)]">
            Vendors at this Event
          </h2>
          <p className="text-[var(--gray-500)] mt-1">Browse and shop from all participating vendors</p>
        </div>

        {/* Vendors by Category */}
        <div className="space-y-12">
          {categories.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              vendors={vendorsByCategory[cat]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CategorySection({ category, vendors }) {
  return (
    <section className="animate-slide-up">
      <div className="section-header">
        <h3 className="text-h3 text-[var(--gray-900)]">{category}</h3>
        <span className="text-sm text-[var(--gray-400)]">{vendors.length} vendors</span>
      </div>
      <div className="scroll-horizontal scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6">
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
      className="group relative w-[260px] sm:w-[280px] rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-1 block bg-white"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Hero Image */}
      <div className="relative h-[180px] overflow-hidden">
        {hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={vendor.heroImage}
            alt={vendor.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-primary flex items-center justify-center">
            <span className="text-white/90 text-5xl font-display">
              {vendor.name?.charAt(0) || 'V'}
            </span>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Status Indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-[var(--gray-700)]">
          <span className="w-2 h-2 rounded-full bg-[var(--mint-500)]"></span>
          Open
        </div>
        
        {/* Rating Badge */}
        {vendor.rating && (
          <div className="absolute top-3 left-3 badge-rating flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            {vendor.rating}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-base text-[var(--gray-900)] group-hover:text-[var(--violet-600)] transition-colors line-clamp-1">
          {vendor.name}
        </h3>
        <p className="text-sm text-[var(--gray-500)] mt-1 line-clamp-2 min-h-[40px]">
          {vendor.description}
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-[var(--gray-400)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>{vendor.location}</span>
        </div>
      </div>
    </Link>
  );
}
