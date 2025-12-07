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
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold mb-2">Event Not Found</h1>
          <Link href="/events" className="text-[#01DBE0] hover:text-[#FD237A] underline">
            Back to Events
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

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Event Header */}
      <div className="mb-8">
        <Link href="/events" className="text-sm text-[#01DBE0] hover:text-[#FD237A] font-semibold mb-4 inline-block">
          ← Back to Events
        </Link>
        
        <div className="rounded-3xl bg-gradient-to-br from-[#01DBE0]/10 via-[#FD237A]/5 to-[#FE9C05]/10 p-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="h-32 w-32 rounded-2xl bg-gradient-to-br from-[#01DBE0]/20 to-[#FD237A]/20 flex items-center justify-center flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.image} alt="" className="h-20 w-20 opacity-80" />
            </div>
            
            <div className="flex-1">
              <h1 className="font-display text-5xl tracking-wide mb-3">
                <span className="bg-gradient-to-r from-[#01DBE0] to-[#FD237A] bg-clip-text text-transparent">
                  {event.name}
                </span>
              </h1>
              <p className="text-lg font-body text-gray-600 mb-4">{event.description}</p>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full">
                  <span className="text-[#FD237A]">📍</span>
                  <span className="font-semibold">{event.location}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full">
                  <span className="text-[#01DBE0]">📅</span>
                  <span className="font-semibold">
                    {new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    {event.startDate !== event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full">
                  <span className="text-[#FE9C05]">👥</span>
                  <span className="font-semibold">{(event.attendees / 1000).toFixed(0)}K expected attendees</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#C9FF3F] to-[#FE9C05] text-gray-900 rounded-full">
                  <span className="font-bold">{event.category}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vendors Section */}
      <div>
        <h2 className="font-display text-3xl tracking-wide mb-8">
          <span className="text-[#FE9C05]">{eventVendors.length}</span> VENDORS AT THIS EVENT
        </h2>

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-3xl tracking-wide">
          <span className="bg-gradient-to-r from-[#01DBE0] to-[#FD237A] bg-clip-text text-transparent">
            {category.toUpperCase()}
          </span>
        </h2>
      </div>
      <div className="overflow-x-auto scrollbar-hide -mx-6 px-6">
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
