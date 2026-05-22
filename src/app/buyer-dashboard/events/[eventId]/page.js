"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../contexts/AuthContext";
import { getEvent } from "../../../../services/events";
import { listInquiries } from "../../../../services/inquiries";

function fmt(raw) {
  if (!raw) return null;
  return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatLoadTime(stored) {
  if (!stored) return stored;
  const m = stored.match(/^(\d{4}-\d{2}-\d{2}) (.+)$/);
  if (!m) return stored;
  const d = new Date(m[1] + "T00:00:00");
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${m[2]}`;
}

// ── Icon atoms ────────────────────────────────────────────────────────────────
const Icon = {
  back:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  cal:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  pin:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  people:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  clock:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  truck:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  home:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  bolt:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  drop:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>,
  wifi:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
  parking: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 010 6H9"/></svg>,
  shield:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  tent:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 21L12 3l8.5 18"/><path d="M3.5 21h17M12 3v18"/></svg>,
  doc:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  link:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  search:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  arrow:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
};

// ── Reusable row inside an info card ─────────────────────────────────────────
function InfoRow({ icon, label, value, fullWidth }) {
  if (!value && value !== false) return null;
  return (
    <div className={`flex items-center justify-between py-3 border-b border-[var(--gray-50)] last:border-0 ${fullWidth ? "col-span-2" : ""}`}>
      <div className="flex items-center gap-2.5 text-[var(--violet-400)]">
        {icon}
        <span className="text-[13px] text-[var(--gray-500)]">{label}</span>
      </div>
      <span className="text-[13px] font-semibold text-[var(--gray-800)] text-right max-w-[55%]">{value}</span>
    </div>
  );
}

function BoolRow({ icon, label, value, positiveLabel = "Yes", negativeLabel = "No" }) {
  if (value === null || value === undefined) return null;
  const isTrue = !!value;
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--gray-50)] last:border-0">
      <div className="flex items-center gap-2.5 text-[var(--violet-400)]">
        {icon}
        <span className="text-[13px] text-[var(--gray-500)]">{label}</span>
      </div>
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
        isTrue ? "bg-[var(--mint-50)] text-[var(--mint-700)]" : "bg-[var(--gray-100)] text-[var(--gray-500)]"
      }`}>
        {isTrue ? positiveLabel : negativeLabel}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-7">
      <p className="text-[11px] font-bold text-[var(--violet-500)] uppercase tracking-widest mb-3 px-1">{title}</p>
      <div className="bg-white rounded-2xl px-5" style={{ boxShadow: "var(--shadow-card)" }}>
        {children}
      </div>
    </div>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_META = {
  submitted:      { label: "Sent",          dot: "bg-[var(--violet-400)]",  bg: "bg-[var(--violet-50)]  text-[var(--violet-700)]" },
  viewed:         { label: "Viewed",        dot: "bg-[var(--violet-500)]",  bg: "bg-[var(--violet-100)] text-[var(--violet-700)]" },
  discussed:      { label: "In Discussion", dot: "bg-[var(--amber-400)]",   bg: "bg-[var(--amber-50)]   text-[var(--amber-700)]" },
  actions_needed: { label: "Action Needed", dot: "bg-[var(--coral-500)]",   bg: "bg-[var(--coral-50)]   text-[var(--coral-700)]" },
  offer_updated:  { label: "Offer In",      dot: "bg-[var(--coral-400)]",   bg: "bg-[var(--coral-50)]   text-[var(--coral-600)]" },
  scheduled:      { label: "Booked",        dot: "bg-[var(--mint-500)]",    bg: "bg-[var(--mint-50)]    text-[var(--mint-700)]" },
  completed:      { label: "Completed",     dot: "bg-[var(--gray-400)]",    bg: "bg-[var(--gray-100)]   text-[var(--gray-600)]" },
  expired:        { label: "Expired",       dot: "bg-[var(--gray-300)]",    bg: "bg-[var(--gray-100)]   text-[var(--gray-500)]" },
};

function VendorRow({ inquiry }) {
  const initial = inquiry.vendor?.name?.charAt(0)?.toUpperCase() ?? "V";
  const meta = STATUS_META[inquiry.status] ?? { label: inquiry.status, dot: "bg-[var(--gray-300)]", bg: "bg-[var(--gray-100)] text-[var(--gray-500)]" };
  return (
    <Link
      href={`/buyer-dashboard/proposals/${inquiry.id}`}
      className="flex items-center gap-3.5 py-3.5 border-b border-[var(--gray-50)] last:border-0 active:opacity-70 transition-opacity"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0"
        style={{ background: "var(--gradient-vendor)" }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[var(--gray-900)] truncate leading-tight">{inquiry.vendor?.name ?? "Vendor"}</p>
        {inquiry.vendor?.location && (
          <p className="text-[11px] text-[var(--gray-400)] mt-0.5 truncate">{inquiry.vendor.location}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <span className="text-[var(--gray-300)]">{Icon.arrow}</span>
      </div>
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div>
      <div className="h-56 bg-[var(--gray-200)] animate-pulse" />
      <div className="px-4 pt-6 space-y-5">
        <div className="h-5 w-2/3 bg-[var(--gray-100)] rounded animate-pulse" />
        <div className="bg-white rounded-2xl p-5 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          {[1,2,3].map(i => <div key={i} className="h-4 bg-[var(--gray-100)] rounded animate-pulse" />)}
        </div>
        <div className="bg-white rounded-2xl p-5 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          {[1,2,3].map(i => <div key={i} className="h-4 bg-[var(--gray-100)] rounded animate-pulse" />)}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EventDetailPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    Promise.all([
      getEvent(eventId),
      listInquiries().catch(() => []),
    ]).then(([evt, inquiries]) => {
      setEvent(evt);
      const forEvent = (inquiries ?? []).filter(
        (inq) => String(inq.event_id ?? inq.event?.id) === String(eventId)
      );
      setVendors(forEvent);
    }).finally(() => setLoading(false));
  }, [user, authLoading, router, eventId]);

  if (loading || authLoading) return <Skeleton />;

  if (!event) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-[var(--gray-500)]">Event not found.</p>
        <Link href="/buyer-dashboard/events" className="text-sm text-[var(--violet-600)] mt-3 inline-block">
          Back to Events
        </Link>
      </div>
    );
  }

  const startDate = fmt(event.startDate);
  const endDate   = event.endDate && event.endDate !== event.startDate ? fmt(event.endDate) : null;
  const isUpcoming = event.startDate && new Date(event.startDate) > new Date();
  const dateStr   = startDate ? (endDate ? `${startDate} – ${endDate}` : startDate) : null;
  const location  = event.streetAddress || event.location;

  const hasVenueInfo = event.indoorOutdoor || event.boothSize || event.canopyAllowed ||
    event.accessToPower || event.accessToWater || event.wifiAvailability ||
    event.parkingAvailable || event.securityPresence || event.requiresCoi != null;

  const hasSchedule = event.eventHours || event.vendorLoadIn || event.vendorLoadOut;

  return (
    <div className="pb-32">
      {/* ── Full-bleed hero ── */}
      <div
        className="relative h-56 flex flex-col justify-end"
        style={{
          background: isUpcoming
            ? "linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)"
            : "linear-gradient(135deg, #374151, #111827)",
        }}
      >
        {/* Gradient fade to bottom */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.28) 100%)" }} />

        {/* Back button */}
        <Link
          href="/buyer-dashboard/events"
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-colors"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          {Icon.back}
        </Link>

        {/* Edit + Find Vendors buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Link
            href={`/vendors?event_id=${event.id}`}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[var(--violet-700)] text-[12px] font-bold transition-colors shadow-sm"
            style={{ background: "rgba(255,255,255,0.92)" }}
          >
            {Icon.search}
            {vendors.length > 0 ? "Find Vendors" : "Find Vendors"}
          </Link>
          <Link
            href={`/events/${eventId}/edit`}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[var(--gray-700)] text-[12px] font-bold transition-colors shadow-sm"
            style={{ background: "rgba(255,255,255,0.92)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </Link>
        </div>

        {/* Hero content */}
        <div className="relative px-5 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: "rgba(255,255,255,0.2)" }}>
              {isUpcoming ? "Upcoming" : event.status ?? "Past"}
            </span>
            {event.eventType && (
              <span className="text-[11px] text-white/60 font-medium">{event.eventType}</span>
            )}
          </div>
          <h1 className="text-[24px] font-display font-bold text-white leading-tight">{event.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {dateStr && (
              <span className="flex items-center gap-1.5 text-[12px] text-white/75">
                <span className="opacity-70">{Icon.cal}</span>{dateStr}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1.5 text-[12px] text-white/70">
                <span className="opacity-70">{Icon.pin}</span>{location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── White body — slides up over hero ── */}
      <div className="bg-[var(--gray-50)] -mt-3 rounded-t-[28px] relative z-10 px-4 pt-6">

        {/* Description */}
        {event.description && (
          <div className="mb-7">
            <p className="text-[11px] font-bold text-[var(--violet-500)] uppercase tracking-widest mb-2 px-1">About</p>
            <p className={`text-[14px] text-[var(--gray-600)] leading-relaxed ${descExpanded ? "" : "line-clamp-3"}`}>
              {event.description}
            </p>
            {event.description.length > 200 && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-[13px] font-semibold text-[var(--violet-600)] mt-1.5"
              >
                {descExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {/* Key details */}
        <Section title="Event Details">
          {event.attendees > 0 && <InfoRow icon={Icon.people} label="Expected guests" value={event.attendees.toLocaleString()} />}
          {event.venueAttendees > 0 && <InfoRow icon={Icon.home} label="Venue capacity" value={event.venueAttendees.toLocaleString()} />}
          {event.ageGroup && <InfoRow icon={Icon.people} label="Age group" value={event.ageGroup} />}
          {event.category && <InfoRow icon={Icon.doc} label="Category" value={event.category} />}
          {event.rsvpRequired != null && <BoolRow icon={Icon.doc} label="RSVP required" value={event.rsvpRequired} />}
          {event.badgeRequired != null && <BoolRow icon={Icon.doc} label="Badge required" value={event.badgeRequired} />}
          {event.eventUrl && (
            <div className="py-3 last:border-0 border-b border-[var(--gray-50)]">
              <a
                href={event.eventUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)]"
              >
                {Icon.link}
                View event page
              </a>
            </div>
          )}
        </Section>

        {/* Schedule */}
        {hasSchedule && (
          <Section title="Schedule">
            {event.eventHours   && <InfoRow icon={Icon.clock}  label="Event hours"       value={event.eventHours} />}
            {event.vendorLoadIn  && <InfoRow icon={Icon.truck}  label="Vendor load-in"    value={formatLoadTime(event.vendorLoadIn)} />}
            {event.vendorLoadOut && <InfoRow icon={Icon.truck}  label="Vendor load-out"   value={formatLoadTime(event.vendorLoadOut)} />}
          </Section>
        )}

        {/* Venue & logistics */}
        {hasVenueInfo && (
          <Section title="Venue & Logistics">
            {event.indoorOutdoor   && <InfoRow icon={Icon.home}    label="Setting"         value={event.indoorOutdoor} />}
            {event.boothSize       && <InfoRow icon={Icon.tent}    label="Booth size"      value={event.boothSize} />}
            {event.canopyAllowed   && <InfoRow icon={Icon.tent}    label="Canopy"          value={event.canopyAllowed} />}
            {event.accessToPower   && <InfoRow icon={Icon.bolt}    label="Power access"    value={event.accessToPower} />}
            {event.accessToWater   && <InfoRow icon={Icon.drop}    label="Water access"    value={event.accessToWater} />}
            {event.wifiAvailability && <InfoRow icon={Icon.wifi}   label="WiFi"            value={event.wifiAvailability} />}
            {event.parkingAvailable && <InfoRow icon={Icon.parking} label="Parking"        value={event.parkingAvailable} />}
            {event.securityPresence && <InfoRow icon={Icon.shield}  label="Security"       value={event.securityPresence} />}
            {event.requiresCoi != null && <BoolRow icon={Icon.doc} label="COI required"   value={event.requiresCoi} positiveLabel="Required" negativeLabel="Not required" />}
          </Section>
        )}

        {/* Perks */}
        {event.perks?.length > 0 && (
          <div className="mb-7">
            <p className="text-[11px] font-bold text-[var(--violet-500)] uppercase tracking-widest mb-3 px-1">Perks</p>
            <div className="flex flex-wrap gap-2">
              {event.perks.map((perk, i) => (
                <span key={i} className="text-[13px] font-medium px-3.5 py-1.5 rounded-full bg-[var(--violet-50)] text-[var(--violet-700)]">
                  {perk}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Vendors */}
        <div className="mb-7">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[11px] font-bold text-[var(--gray-400)] uppercase tracking-widest">
              Vendors
              {vendors.length > 0 && <span className="ml-1.5 text-[var(--gray-300)]">({vendors.length})</span>}
            </p>
            {vendors.length > 0 && (
              <Link
                href={`/vendors?event_id=${event.id}`}
                className="text-[12px] font-semibold text-[var(--violet-600)] flex items-center gap-0.5"
              >
                Find more {Icon.arrow}
              </Link>
            )}
          </div>

          {vendors.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--gradient-browse)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <p className="text-[14px] font-semibold text-[var(--gray-700)] mb-1">No vendors yet</p>
              <p className="text-[12px] text-[var(--gray-400)] leading-relaxed">
                Browse vendors and send a request — this event will be pre-selected.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl px-5" style={{ boxShadow: "var(--shadow-card)" }}>
              {vendors.map((inq) => <VendorRow key={inq.id} inquiry={inq} />)}
            </div>
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
