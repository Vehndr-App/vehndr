import Link from "next/link";
import { getEvent } from "../../../services/events";
import { listVendors } from "../../../services/vendors";
import { getStorefrontPath } from "../../../utils/storefrontLinks";
import { normalizeVendorCategories } from "../../../constants/categories";

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

  const getCategoryForVendor = (vendor) => {
    const categories = normalizeVendorCategories(vendor.categories ?? []);
    return categories[0] || null;
  };

  // Group vendors by their assigned category (each vendor in ONE section only)
  const vendorsByCategory = eventVendors.reduce((acc, vendor) => {
    const category = getCategoryForVendor(vendor);
    if (!category) return acc;
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

      {/* Venue Logistics */}
      <VenueLogistics event={event} />

      {/* Per-day schedule */}
      <DailyScheduleSection schedule={event.dailySchedule} />

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
      href={getStorefrontPath(vendor)}
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

const LOGISTIC_CONFIG = [
  { key: "indoorOutdoor",    label: "Setting",   icon: "🌤️", fmt: v => v === "indoor" ? "Indoor" : "Outdoor" },
  { key: "canopyAllowed",    label: "Canopy",    icon: "⛺", fmt: v => v === "yes" ? "Allowed" : "Not allowed" },
  { key: "accessToPower",    label: "Power",     icon: "⚡", fmt: v => v === "yes" ? "Available" : "No access" },
  { key: "accessToWater",    label: "Water",     icon: "💧", fmt: v => v === "yes" ? "Available" : "No access" },
  { key: "wifiAvailability", label: "WiFi",      icon: "📶", fmt: v => v === "yes" ? "Available" : "Unavailable" },
  { key: "parkingAvailable", label: "Parking",   icon: "🅿️", fmt: v => v === "yes" ? "On-site" : v === "paid" ? "Paid on-site" : "None" },
  { key: "securityPresence", label: "Security",  icon: "🔒", fmt: v => v === "yes" ? "On-site" : v === "na" ? "N/A" : "None" },
];

function formatLoadTime(stored) {
  if (!stored) return stored;
  const m = stored.match(/^(\d{4}-\d{2}-\d{2}) (.+)$/);
  if (!m) return stored;
  const d = new Date(m[1] + "T00:00:00");
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${m[2]}`;
}

function fmtTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h)) return t;
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function fmtDayLabel(dateStr) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch { return dateStr; }
}

function DailyScheduleSection({ schedule }) {
  if (!Array.isArray(schedule) || !schedule.length) return null;
  const hasAnyData = schedule.some(
    (d) => d.startTime || d.endTime || d.vendorLoadIn || d.vendorLoadOut
  );
  if (!hasAnyData) return null;

  return (
    <div className="rounded-[var(--radius-3xl)] bg-white shadow-[var(--shadow-lg)] p-6 sm:p-8 mb-10">
      <h2 className="font-display text-xl sm:text-2xl tracking-tight text-[var(--gray-900)] mb-6">Daily Schedule</h2>
      <div className="space-y-4">
        {schedule.map((day) => {
          const hasHours = day.startTime || day.endTime;
          const hasLoad  = day.vendorLoadIn || day.vendorLoadOut;
          if (!hasHours && !hasLoad) return null;
          return (
            <div key={day.date} className="rounded-xl border border-[var(--gray-100)] overflow-hidden">
              <div className="px-4 py-2.5 bg-[var(--gray-50)] border-b border-[var(--gray-100)]">
                <p className="text-xs font-bold text-[var(--violet-600)] uppercase tracking-wide">{fmtDayLabel(day.date)}</p>
              </div>
              {hasHours && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--gray-50)] last:border-0">
                  <span className="text-sm text-[var(--gray-500)]">Event hours</span>
                  <span className="text-sm font-semibold text-[var(--gray-800)]">
                    {[fmtTime(day.startTime), fmtTime(day.endTime)].filter(Boolean).join(" – ")}
                  </span>
                </div>
              )}
              {day.vendorLoadIn && (
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--gray-50)] last:border-0">
                  <span className="text-sm text-[var(--gray-500)]">Vendor load-in</span>
                  <span className="text-sm font-semibold text-[var(--gray-800)]">{fmtTime(day.vendorLoadIn) ?? day.vendorLoadIn}</span>
                </div>
              )}
              {day.vendorLoadOut && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-[var(--gray-500)]">Vendor load-out</span>
                  <span className="text-sm font-semibold text-[var(--gray-800)]">{fmtTime(day.vendorLoadOut) ?? day.vendorLoadOut}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SCHEDULE_KEYS = [
  { key: "eventHours",    label: "Event hours" },
  { key: "vendorLoadIn",  label: "Vendor load-in",  fmt: formatLoadTime },
  { key: "vendorLoadOut", label: "Vendor load-out", fmt: formatLoadTime },
  { key: "boothSize",     label: "Booth size", fmt: v => v.replace("x", " ft × ") + " ft" },
  { key: "venueAttendees",label: "Venue capacity", fmt: v => Number(v).toLocaleString() + " people" },
];

function VenueLogistics({ event }) {
  const filled = LOGISTIC_CONFIG.filter(c => event[c.key]);
  const schedule = SCHEDULE_KEYS.map(c => event[c.key] ? { label: c.label, value: c.fmt ? c.fmt(event[c.key]) : event[c.key] } : null).filter(Boolean);
  const hasReqs = event.requiresCoi || event.rsvpRequired || event.badgeRequired;

  if (!filled.length && !schedule.length && !hasReqs) return null;

  return (
    <div className="rounded-[var(--radius-3xl)] bg-white shadow-[var(--shadow-lg)] p-6 sm:p-8 mb-10">
      <h2 className="font-display text-xl sm:text-2xl tracking-tight text-[var(--gray-900)] mb-6">Venue &amp; Logistics</h2>

      {filled.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {filled.map(({ key, label, icon, fmt }) => {
            const rawValue = event[key];
            const pos = rawValue === "yes" || rawValue === "indoor" || rawValue === "outdoor";
            const neg = rawValue === "no";
            return (
              <div
                key={key}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl"
                style={{
                  background: pos ? "var(--mint-50)" : neg ? "var(--gray-50)" : "var(--amber-50)",
                  border: `1px solid ${pos ? "var(--mint-100)" : neg ? "var(--gray-200)" : "var(--amber-100)"}`,
                }}
              >
                <span className="text-base leading-none flex-shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[var(--gray-400)] leading-none">{label}</p>
                  <p
                    className="text-xs font-semibold leading-tight mt-0.5"
                    style={{ color: pos ? "var(--mint-700)" : neg ? "var(--gray-500)" : "var(--amber-700)" }}
                  >
                    {fmt(rawValue)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {schedule.length > 0 && (
        <div className="rounded-xl border border-[var(--gray-100)] overflow-hidden mb-6">
          {schedule.map(({ label, value }, i) => (
            <div
              key={label}
              className={`flex items-center justify-between px-4 py-2.5 ${i < schedule.length - 1 ? "border-b border-[var(--gray-50)]" : ""}`}
            >
              <span className="text-sm text-[var(--gray-500)]">{label}</span>
              <span className="text-sm font-semibold text-[var(--gray-800)] text-right max-w-[55%]">{value}</span>
            </div>
          ))}
        </div>
      )}

      {hasReqs && (
        <div className="flex flex-wrap gap-2">
          {event.requiresCoi && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--amber-700)] bg-[var(--amber-50)] border border-[var(--amber-100)] px-3 py-1.5 rounded-lg">
              COI Required
            </span>
          )}
          {event.rsvpRequired && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--violet-700)] bg-[var(--violet-50)] border border-[var(--violet-100)] px-3 py-1.5 rounded-lg">
              RSVP Required
            </span>
          )}
          {event.badgeRequired && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--violet-700)] bg-[var(--violet-50)] border border-[var(--violet-100)] px-3 py-1.5 rounded-lg">
              Badge Required
            </span>
          )}
        </div>
      )}
    </div>
  );
}
