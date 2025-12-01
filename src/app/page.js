import Link from "next/link";
import { listVendors } from "../services/vendors";
import { getUpcomingEvents } from "../services/events";

export default async function Home() {
  const vendors = await listVendors();
  const upcomingEvents = await getUpcomingEvents(3);
  return (
    <div className="mx-auto max-w-6xl p-8 w-full">
      <div className="text-center mb-12">
        <div className="text-sm uppercase tracking-[0.2em] text-[#FE9C05] font-semibold mb-2">
          Welcome to
        </div>
        <h1 className="font-display text-6xl sm:text-7xl tracking-wide mb-4">
          <span className="bg-gradient-to-r from-[#01DBE0] via-[#FD237A] to-[#FE9C05] bg-clip-text text-transparent">
            VEHNDR
          </span>
        </h1>
        <p className="mt-4 text-lg font-body text-gray-600 max-w-2xl mx-auto">
          Marketplace for vendors at festivals and events. Find your event, discover vendors, and order everything you need.
        </p>
        <div className="mt-8 flex gap-4 justify-center flex-wrap">
          <Link
            href="/events"
            className="inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white font-semibold text-lg hover:shadow-lg hover:shadow-[#FD237A]/30 transition-all hover:-translate-y-1"
          >
            Find Your Event
          </Link>
          <Link
            href="/vendors"
            className="inline-flex items-center px-8 py-4 rounded-full border-2 border-[#01DBE0] text-[#01DBE0] font-semibold text-lg hover:bg-[#01DBE0] hover:text-white transition-all"
          >
            Browse All Vendors
          </Link>
        </div>
      </div>

      {/* Upcoming Events Section */}
      <div className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-3xl tracking-wide">
            <span className="text-[#01DBE0]">UPCOMING</span> EVENTS
          </h2>
          <Link href="/events" className="text-sm font-semibold text-[#FE9C05] hover:text-[#FD237A] transition-colors">
            View all events →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {upcomingEvents.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group relative rounded-2xl border-2 border-transparent bg-gradient-to-br from-[#C9FF3F]/10 to-[#01DBE0]/10 p-5 hover:border-[#01DBE0] transition-all hover:shadow-xl hover:shadow-[#01DBE0]/20 hover:-translate-y-1"
            >
              <div className="absolute top-3 right-3 bg-[#FE9C05] text-white px-2 py-1 rounded-full text-xs font-bold">
                {event.vendorIds.length} vendors
              </div>
              <div className="font-semibold text-lg mb-1 group-hover:text-[#01DBE0] transition-colors">
                {event.name}
              </div>
              <div className="text-xs text-gray-600 font-body mb-2">{event.location}</div>
              <div className="text-xs font-semibold text-[#FD237A]">
                {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Vendors Section */}
      <div>
        <div className="mb-6">
          <h2 className="font-display text-3xl tracking-wide">
            <span className="text-[#FD237A]">FEATURED</span> VENDORS
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {vendors.map((v) => (
            <Link
              key={v.id}
              href={`/store/${v.id}`}
              className="group relative rounded-2xl border-2 border-transparent bg-gradient-to-br from-[#01DBE0]/10 to-[#FD237A]/10 p-6 hover:border-[#01DBE0] transition-all hover:shadow-xl hover:shadow-[#01DBE0]/20 hover:-translate-y-1"
            >
              <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-[#C9FF3F] animate-pulse" />
              <div className="font-semibold text-lg mb-1">{v.name}</div>
              <div className="text-sm text-gray-600 font-body">{v.description}</div>
              <div className="mt-3 text-xs font-semibold text-[#FE9C05]">{v.location} • {v.rating}★</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}