import Link from "next/link";
import { listEvents } from "../../services/events";

export default async function EventsPage() {
  const events = await listEvents();

  // Group events by month for better organization
  const eventsByMonth = events.reduce((acc, event) => {
    const month = new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(event);
    return acc;
  }, {});

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--violet-50)] text-[var(--violet-600)] text-sm font-medium mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Browse Events
        </div>
        
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-[var(--gray-900)] mb-3">
          Upcoming <span className="text-gradient-primary">Events</span>
        </h1>
        <p className="text-base sm:text-lg text-[var(--gray-500)] max-w-2xl">
          Find your festival and discover all the vendors that will be there
        </p>
      </div>

      {/* Horizontal Scrolling Sections */}
      <div className="space-y-12 pb-12">
        {Object.entries(eventsByMonth).map(([month, monthEvents]) => (
          <div key={month}>
            {/* Month Header */}
            <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-5">
              <h2 className="text-h3 text-[var(--gray-700)]">{month}</h2>
            </div>

            {/* Horizontal Scrolling Container */}
            <div className="scroll-horizontal scrollbar-hide px-4 sm:px-6 gap-5">
              {monthEvents.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
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
    };
    return gradients[category] || 'from-[var(--violet-500)] to-[var(--magenta-500)]';
  };

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex-shrink-0 w-[320px] sm:w-[360px] cursor-pointer"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Event Card */}
      <div className="relative rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-1 bg-white">
        {/* Image Container */}
        <div className="relative h-[220px] overflow-hidden">
          {hasImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={event.image}
              alt={event.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(event.category)} flex items-center justify-center`}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
          )}

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          {/* Vendor Count Badge */}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-[var(--gray-900)] px-3 py-1.5 rounded-full text-xs font-semibold shadow-[var(--shadow-sm)]">
            {event.vendorIds?.length || 0} Vendors
          </div>

          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className={`inline-block px-3 py-1.5 bg-gradient-to-r ${getCategoryGradient(event.category)} rounded-full text-xs font-semibold text-white shadow-[var(--shadow-sm)]`}>
              {event.category}
            </span>
          </div>

          {/* Bottom Info on Image */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-semibold text-lg text-white mb-2 line-clamp-2 group-hover:text-[var(--amber-300)] transition-colors">
              {event.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span className="font-medium">
                {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {event.startDate !== event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer Info */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="text-[var(--gray-700)] font-medium">{event.location}</span>
          </div>
          <p className="text-sm text-[var(--gray-500)] line-clamp-2">{event.description}</p>
          <div className="flex items-center gap-1 text-xs text-[var(--gray-400)] pt-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span className="font-medium">{(event.attendees / 1000).toFixed(0)}K expected attendees</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
