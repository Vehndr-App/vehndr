"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listEvents, getEvent } from "../../services/events";
import EventFilters from "../../components/EventFilters";
import { listVendors } from "../../services/vendors";
import { getStorefrontPath } from "../../utils/storefrontLinks";

const EVENT_VIBES = [
  { id: "all", label: "All Events", emoji: "✨" },
  { id: "festival", label: "Festival", emoji: "🎪" },
  { id: "party", label: "Party", emoji: "🎉" },
  { id: "chill", label: "Chill", emoji: "🧘" },
  { id: "market", label: "Market", emoji: "🛍️" },
  { id: "food", label: "Food & Drink", emoji: "🍕" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "wellness", label: "Wellness", emoji: "💆" },
  { id: "educational", label: "Educational", emoji: "📚" },
  { id: "networking", label: "Networking", emoji: "🤝" },
  { id: "sports", label: "Sports", emoji: "⚽" },
  { id: "art", label: "Art & Culture", emoji: "🎨" },
];

export default function EventsPageClient() {
  const searchParams = useSearchParams();
  const eventId = searchParams?.get("eventId") ?? null;
  const category = searchParams?.get("category") ?? null;
  const startDate = searchParams?.get("startDate") ?? null;
  const endDate = searchParams?.get("endDate") ?? null;
  const vibe = searchParams?.get("vibe") ?? null;

  if (eventId) {
    return (
      <EventDetailView
        eventId={eventId}
      />
    );
  }

  return (
    <EventsListView
      category={category}
      startDate={startDate}
      endDate={endDate}
      vibe={vibe}
    />
  );
}

function EventDetailView({ eventId }) {
  const [event, setEvent] = useState(null);
  const [allVendors, setAllVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const [ev, vendors] = await Promise.all([
          getEvent(eventId),
          listVendors(),
        ]);
        setEvent(ev ?? null);
        setAllVendors(vendors ?? []);
      } catch (e) {
        setEvent(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="text-[var(--gray-500)]">Loading event…</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
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

  const vendorIds = event.vendorIds ?? [];
  const eventVendors = allVendors.filter((v) => vendorIds.includes(v.id));

  function getCategoryForVendor(vendor) {
    const categories = vendor.categories ?? ["Uncategorized"];
    const hasFoodCategory = categories.some(
      (cat) => cat.toLowerCase().includes("food") || cat.toLowerCase().includes("beverage")
    );
    return hasFoodCategory ? "Food and Drink" : "Artisan & Craft";
  }

  const vendorsByCategory = eventVendors.reduce((acc, vendor) => {
    const cat = getCategoryForVendor(vendor);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(vendor);
    return acc;
  }, {});
  const categories = Object.keys(vendorsByCategory).sort();
  const hasImage = event.image && event.image.length > 0;
  const startDateVal = event.startDate || event.start_time;
  const endDateVal = event.endDate || event.end_date;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--gray-500)] hover:text-[var(--violet-600)] transition-colors mb-6"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Events
      </Link>

      <div className="rounded-[var(--radius-3xl)] overflow-hidden shadow-[var(--shadow-lg)] mb-10 bg-white">
        <div className="relative h-[240px] sm:h-[320px]">
          {hasImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute top-4 left-4">
            <span className="inline-block px-4 py-2 bg-gradient-primary rounded-full text-sm font-semibold text-white shadow-[var(--shadow-button)]">
              {event.category}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-white tracking-tight mb-2">{event.name}</h1>
            <p className="text-white/80 text-base sm:text-lg max-w-2xl">{event.description}</p>
          </div>
        </div>
        <div className="p-6 sm:p-8 border-t border-[var(--gray-100)]">
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--gray-50)] rounded-full text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--coral-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="font-medium text-[var(--gray-700)]">{event.location}</span>
            </div>
            {(startDateVal || endDateVal) && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--gray-50)] rounded-full text-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="font-medium text-[var(--gray-700)]">
                  {new Date(startDateVal).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                  {endDateVal && startDateVal !== endDateVal && ` - ${new Date(endDateVal).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
                </span>
              </div>
            )}
            {event.attendees != null && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--gray-50)] rounded-full text-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="font-medium text-[var(--gray-700)]">{(event.attendees / 1000).toFixed(0)}K expected attendees</span>
              </div>
            )}
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--mint-500)]/10 rounded-full text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mint-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="font-semibold text-[var(--mint-600)]">{eventVendors.length} Vendors</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-8">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-[var(--gray-900)]">Vendors at this Event</h2>
          <p className="text-[var(--gray-500)] mt-1">Browse and shop from all participating vendors</p>
        </div>
        <div className="space-y-12">
          {categories.map((cat) => (
            <CategorySection key={cat} category={cat} vendors={vendorsByCategory[cat]} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EventsListView({ category, startDate, endDate, vibe }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listEvents();
    setEvents(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  let filteredEvents = events;
  if (category) {
    filteredEvents = filteredEvents.filter((e) => e.category?.toLowerCase() === category.toLowerCase());
  }
  if (startDate) {
    const start = new Date(startDate);
    filteredEvents = filteredEvents.filter((e) => new Date(e.startDate || e.start_time) >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    filteredEvents = filteredEvents.filter((e) => new Date(e.startDate || e.start_time) <= end);
  }

  const allCategories = [...new Set(events.map((e) => e.category).filter(Boolean))];
  const eventsByMonth = filteredEvents.reduce((acc, event) => {
    const date = event.startDate || event.start_time;
    if (!date) return acc;
    const month = new Date(date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!acc[month]) acc[month] = [];
    acc[month].push(event);
    return acc;
  }, {});

  return (
    <div className="w-full">
      <div className="bg-gradient-to-br from-[var(--violet-600)] via-[var(--magenta-500)] to-[var(--coral-500)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdi0yMGgtNjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint-400)] animate-pulse" />
            {loading ? "Loading…" : `${events.length} events available`}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight text-white mb-3">
            Discover <span className="text-[var(--amber-300)]">Events</span>
          </h1>
          <p className="text-white/80 text-sm sm:text-base max-w-2xl">
            Find your festival, market, or gathering and discover all the amazing vendors that will be there.
          </p>
        </div>
      </div>

      <div className="bg-white border-b border-[var(--gray-100)] sticky top-14 z-40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <EventFilters categories={allCategories} vibes={EVENT_VIBES} />
        </div>
      </div>

      <div className="bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <div className="scroll-horizontal scrollbar-hide gap-2 -mx-4 px-4">
            {EVENT_VIBES.map((vibeItem) => (
              <Link
                key={vibeItem.id}
                href={vibeItem.id === "all" ? "/events" : `/events?vibe=${vibeItem.id}`}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  (!vibe && vibeItem.id === "all") || vibe === vibeItem.id
                    ? "bg-[var(--violet-600)] text-white shadow-md"
                    : "bg-white text-[var(--gray-700)] border border-[var(--gray-200)] hover:border-[var(--violet-300)] hover:bg-[var(--violet-50)]"
                }`}
              >
                <span className="text-base">{vibeItem.emoji}</span>
                {vibeItem.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {(category || startDate || endDate || vibe) && (
        <div className="bg-white border-b border-[var(--gray-100)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-[var(--gray-500)]">Filters:</span>
              {category && <FilterBadge label={category} href="/events" />}
              {vibe && <FilterBadge label={EVENT_VIBES.find((v) => v.id === vibe)?.label || vibe} href="/events" />}
              {startDate && <FilterBadge label={`From ${startDate}`} href="/events" />}
              <Link href="/events" className="text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)] ml-2">
                Clear all
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {loading ? (
          <div className="text-center py-12 text-[var(--gray-500)]">Loading events…</div>
        ) : Object.keys(eventsByMonth).length > 0 ? (
          <div className="space-y-12">
            {Object.entries(eventsByMonth).map(([month, monthEvents]) => (
              <div key={month}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--gray-900)]">{month}</h2>
                    <p className="text-sm text-[var(--gray-500)]">{monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
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
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </Link>
  );
}

function EventCard({ event, index }) {
  const getCategoryGradient = (category) => {
    const gradients = {
      Market: "from-[var(--violet-500)] to-[var(--magenta-500)]",
      Expo: "from-[var(--violet-600)] to-[var(--violet-400)]",
      Wellness: "from-[var(--mint-500)] to-[var(--mint-600)]",
      Food: "from-[var(--coral-500)] to-[var(--amber-500)]",
      Festival: "from-[var(--magenta-500)] to-[var(--coral-500)]",
      Party: "from-[var(--magenta-500)] to-[var(--amber-500)]",
      Music: "from-[var(--violet-600)] to-[var(--magenta-500)]",
      Educational: "from-[var(--info)] to-[var(--violet-500)]",
    };
    return gradients[category] || "from-[var(--violet-500)] to-[var(--magenta-500)]";
  };
  const getCategoryEmoji = (category) => {
    const emojis = {
      Market: "🛍️",
      Expo: "🎪",
      Wellness: "💆",
      Food: "🍕",
      Festival: "🎉",
      Party: "🥳",
      Music: "🎵",
      Educational: "📚",
    };
    return emojis[category] || "✨";
  };

  const hasImage = event.image && event.image.length > 0;
  const startDateVal = event.startDate || event.start_time;

  return (
    <Link href={`/events?eventId=${event.id}`} className="group cursor-pointer">
      <div className="relative rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-1 bg-white">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${getCategoryGradient(event.category)} rounded-full text-xs font-semibold text-white shadow-lg`}>
              <span>{getCategoryEmoji(event.category)}</span>
              {event.category}
            </span>
            <span className="bg-white/95 backdrop-blur-sm text-[var(--gray-900)] px-2.5 py-1 rounded-full text-xs font-semibold shadow-md">
              {event.vendorIds?.length || 0} Vendors
            </span>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-semibold text-lg text-white mb-1 line-clamp-2 group-hover:text-[var(--amber-300)] transition-colors">{event.name}</h3>
            <div className="flex items-center gap-3 text-xs text-white/90">
              {startDateVal && (
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                  </svg>
                  {new Date(startDateVal).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {event.location.split(",")[0]}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-[var(--gray-500)] line-clamp-2 mb-3">{event.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-[var(--gray-400)]">
              {event.attendees != null && (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="font-medium">{(event.attendees / 1000).toFixed(0)}K expected</span>
                </>
              )}
            </div>
            <span className="text-xs font-semibold text-[var(--violet-600)] group-hover:text-[var(--violet-700)]">View Details →</span>
          </div>
        </div>
      </div>
    </Link>
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
      href={getStorefrontPath(vendor)}
      className="group relative w-[260px] sm:w-[280px] rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-1 block bg-white"
    >
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
            <span className="text-white/90 text-5xl font-display">{vendor.name?.charAt(0) || "V"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-[var(--gray-700)]">
          <span className="w-2 h-2 rounded-full bg-[var(--mint-500)]" />
          Open
        </div>
        {vendor.rating && (
          <div className="absolute top-3 left-3 badge-rating flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {vendor.rating}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-base text-[var(--gray-900)] group-hover:text-[var(--violet-600)] transition-colors line-clamp-1">{vendor.name}</h3>
        <p className="text-sm text-[var(--gray-500)] mt-1 line-clamp-2 min-h-[40px]">{vendor.description}</p>
        <div className="flex items-center gap-2 mt-3 text-xs text-[var(--gray-400)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{vendor.location}</span>
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
      <Link href="/events" className="btn btn-gradient inline-flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        Clear Filters
      </Link>
    </div>
  );
}
