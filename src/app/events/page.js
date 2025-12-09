import Link from "next/link";
import { listEvents } from "../../services/events";
import EventFilters from "../../components/EventFilters";

export default async function EventsPage({ searchParams }) {
  const params = await searchParams;
  const category = typeof params?.category === "string" ? params.category : null;
  const startDate = typeof params?.startDate === "string" ? params.startDate : null;
  const endDate = typeof params?.endDate === "string" ? params.endDate : null;
  const vibe = typeof params?.vibe === "string" ? params.vibe : null;

  const events = await listEvents();

  // Filter events based on params
  let filteredEvents = events;
  
  if (category) {
    filteredEvents = filteredEvents.filter(e => 
      e.category?.toLowerCase() === category.toLowerCase()
    );
  }
  
  if (startDate) {
    const start = new Date(startDate);
    filteredEvents = filteredEvents.filter(e => 
      new Date(e.startDate) >= start
    );
  }
  
  if (endDate) {
    const end = new Date(endDate);
    filteredEvents = filteredEvents.filter(e => 
      new Date(e.startDate) <= end
    );
  }

  // Get unique categories for filter
  const allCategories = [...new Set(events.map(e => e.category).filter(Boolean))];

  // Group events by month for better organization
  const eventsByMonth = filteredEvents.reduce((acc, event) => {
    const month = new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(event);
    return acc;
  }, {});

  // Event vibes/categories for quick filters
  const eventVibes = [
    { id: 'all', label: 'All Events', emoji: '✨' },
    { id: 'festival', label: 'Festival', emoji: '🎪' },
    { id: 'party', label: 'Party', emoji: '🎉' },
    { id: 'chill', label: 'Chill', emoji: '🧘' },
    { id: 'market', label: 'Market', emoji: '🛍️' },
    { id: 'food', label: 'Food & Drink', emoji: '🍕' },
    { id: 'music', label: 'Music', emoji: '🎵' },
    { id: 'wellness', label: 'Wellness', emoji: '💆' },
    { id: 'educational', label: 'Educational', emoji: '📚' },
    { id: 'networking', label: 'Networking', emoji: '🤝' },
    { id: 'sports', label: 'Sports', emoji: '⚽' },
    { id: 'art', label: 'Art & Culture', emoji: '🎨' },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--violet-600)] via-[var(--magenta-500)] to-[var(--coral-500)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdi0yMGgtNjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
        
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint-400)] animate-pulse" />
            {events.length} events available
          </div>
          
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight text-white mb-3">
            Discover <span className="text-[var(--amber-300)]">Events</span>
          </h1>
          <p className="text-white/80 text-sm sm:text-base max-w-2xl">
            Find your festival, market, or gathering and discover all the amazing vendors that will be there.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border-b border-[var(--gray-100)] sticky top-14 z-40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <EventFilters categories={allCategories} vibes={eventVibes} />
        </div>
      </div>

      {/* Vibe Quick Filters */}
      <div className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <div className="scroll-horizontal scrollbar-hide gap-2 -mx-4 px-4">
            {eventVibes.map((vibeItem) => (
              <Link
                key={vibeItem.id}
                href={vibeItem.id === 'all' ? '/events' : `/events?vibe=${vibeItem.id}`}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  (!vibe && vibeItem.id === 'all') || vibe === vibeItem.id
                    ? 'bg-[var(--violet-600)] text-white shadow-md'
                    : 'bg-white text-[var(--gray-700)] border border-[var(--gray-200)] hover:border-[var(--violet-300)] hover:bg-[var(--violet-50)]'
                }`}
              >
                <span className="text-base">{vibeItem.emoji}</span>
                {vibeItem.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {(category || startDate || endDate || vibe) && (
        <div className="bg-white border-b border-[var(--gray-100)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-[var(--gray-500)]">Filters:</span>
              {category && (
                <FilterBadge label={category} href="/events" />
              )}
              {vibe && (
                <FilterBadge label={eventVibes.find(v => v.id === vibe)?.label || vibe} href="/events" />
              )}
              {startDate && (
                <FilterBadge label={`From ${startDate}`} href="/events" />
              )}
              <Link 
                href="/events" 
                className="text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)] ml-2"
              >
                Clear all
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Events Grid */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {Object.keys(eventsByMonth).length > 0 ? (
          <div className="space-y-12">
            {Object.entries(eventsByMonth).map(([month, monthEvents]) => (
              <div key={month}>
                {/* Month Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--gray-900)]">{month}</h2>
                    <p className="text-sm text-[var(--gray-500)]">{monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Events Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {monthEvents.map((event, index) => (
                    <EventCard key={event.id} event={event} index={index} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
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

function EventCard({ event, index }) {
  const hasImage = event.image && event.image.length > 0;
  
  // Generate a gradient based on event category
  const getCategoryGradient = (category) => {
    const gradients = {
      'Market': 'from-[var(--violet-500)] to-[var(--magenta-500)]',
      'Expo': 'from-[#6366F1] to-[var(--violet-500)]',
      'Wellness': 'from-[var(--mint-500)] to-[#14B8A6]',
      'Food': 'from-[var(--coral-500)] to-[var(--amber-500)]',
      'Festival': 'from-[var(--magenta-500)] to-[var(--coral-500)]',
      'Party': 'from-[#EC4899] to-[#F97316]',
      'Music': 'from-[#8B5CF6] to-[#EC4899]',
      'Educational': 'from-[#3B82F6] to-[#6366F1]',
    };
    return gradients[category] || 'from-[var(--violet-500)] to-[var(--magenta-500)]';
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      'Market': '🛍️',
      'Expo': '🎪',
      'Wellness': '💆',
      'Food': '🍕',
      'Festival': '🎉',
      'Party': '🥳',
      'Music': '🎵',
      'Educational': '📚',
    };
    return emojis[category] || '✨';
  };

  return (
    <Link
      href={`/events/${event.id}`}
      className="group cursor-pointer"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Event Card */}
      <div className="relative rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-1 bg-white">
        {/* Image Container */}
        <div className="relative h-[200px] overflow-hidden">
          {hasImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={event.image}
              alt={event.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(event.category)} flex items-center justify-center`}>
              <span className="text-6xl opacity-50">{getCategoryEmoji(event.category)}</span>
            </div>
          )}

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${getCategoryGradient(event.category)} rounded-full text-xs font-semibold text-white shadow-lg`}>
              <span>{getCategoryEmoji(event.category)}</span>
              {event.category}
            </span>
            <span className="bg-white/95 backdrop-blur-sm text-[var(--gray-900)] px-2.5 py-1 rounded-full text-xs font-semibold shadow-md">
              {event.vendorIds?.length || 0} Vendors
            </span>
          </div>

          {/* Bottom Info on Image */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-semibold text-lg text-white mb-1 line-clamp-2 group-hover:text-[var(--amber-300)] transition-colors">
              {event.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-white/90">
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                </svg>
                {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {event.location?.split(',')[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="p-4">
          <p className="text-sm text-[var(--gray-500)] line-clamp-2 mb-3">{event.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-[var(--gray-400)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span className="font-medium">{(event.attendees / 1000).toFixed(0)}K expected</span>
            </div>
            <span className="text-xs font-semibold text-[var(--violet-600)] group-hover:text-[var(--violet-700)]">
              View Details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
        <span className="text-5xl">🎪</span>
      </div>
      <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">No events found</h2>
      <p className="text-[var(--gray-500)] mb-8 max-w-sm mx-auto">
        Try adjusting your filters or check back later for new events.
      </p>
      <Link
        href="/events"
        className="btn btn-gradient inline-flex items-center gap-2"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        Clear Filters
      </Link>
    </div>
  );
}
