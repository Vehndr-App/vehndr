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
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="font-display text-4xl tracking-wide mb-3">
          <span className="bg-gradient-to-r from-[#01DBE0] via-[#FD237A] to-[#FE9C05] bg-clip-text text-transparent">
            UPCOMING EVENTS
          </span>
        </h1>
        <p className="text-lg font-body text-gray-600">
          Find your festival and discover all the vendors that will be there
        </p>
      </div>

      {/* Horizontal Scrolling Sections */}
      <div className="space-y-12 pb-8">
        {Object.entries(eventsByMonth).map(([month, monthEvents]) => (
          <div key={month}>
            {/* Month Header */}
            <div className="mx-auto max-w-7xl px-6 mb-4">
              <h2 className="font-display text-2xl text-[#FE9C05]">{month}</h2>
            </div>

            {/* Horizontal Scrolling Container */}
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="inline-flex gap-6 px-6 min-w-full">
                {monthEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group flex-shrink-0 w-[340px] cursor-pointer"
                  >
                    {/* Event Card */}
                    <div className="relative">
                      {/* Image Container */}
                      <div className="relative h-[280px] rounded-xl overflow-hidden mb-3">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#01DBE0]/20 via-[#FD237A]/20 to-[#FE9C05]/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={event.image}
                            alt={event.name}
                            className="w-full h-full object-cover opacity-80"
                          />
                        </div>

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                        {/* Vendor Count Badge */}
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                          {event.vendorIds.length} Vendors
                        </div>

                        {/* Category Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="inline-block px-3 py-1.5 bg-gradient-to-r from-[#01DBE0] to-[#FD237A] rounded-full text-xs font-bold text-white shadow-lg">
                            {event.category}
                          </span>
                        </div>

                        {/* Bottom Info on Image */}
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="font-semibold text-xl text-white mb-2 line-clamp-2 group-hover:text-[#C9FF3F] transition-colors">
                            {event.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-white/90">
                            <span className="inline-flex items-center gap-1">
                              <span>📅</span>
                              <span className="font-semibold">
                                {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {event.startDate !== event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-900 font-semibold">{event.location}</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span>👥</span>
                          <span className="font-semibold">{(event.attendees / 1000).toFixed(0)}K attendees</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
