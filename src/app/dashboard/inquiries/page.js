"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthGate from "../../../components/AuthGate";
import { listVendorInquiries } from "../../../services/inquiries";
import { listNotifications, markNotificationRead } from "../../../services/notifications";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META = {
  submitted:      { label: "New Request",     color: "amber",  dot: "bg-[var(--amber-500)]"  },
  viewed:         { label: "Viewed",          color: "blue",   dot: "bg-[var(--info)]"        },
  discussed:      { label: "In Discussion",   color: "violet", dot: "bg-[var(--violet-500)]"  },
  actions_needed: { label: "Awaiting Reply",  color: "coral",  dot: "bg-[var(--coral-500)]"   },
  offer_updated:  { label: "Offer Revised",   color: "violet", dot: "bg-[var(--violet-500)]"  },
  scheduled:      { label: "Booked",          color: "mint",   dot: "bg-[var(--mint-500)]"    },
  completed:      { label: "Completed",       color: "mint",   dot: "bg-[var(--mint-500)]"    },
  expired:        { label: "Expired",         color: "gray",   dot: "bg-[var(--gray-300)]"    },
};

const BADGE_STYLES = {
  amber:  "bg-[var(--amber-50)]  text-[var(--amber-700)]  ring-1 ring-[var(--amber-200)]",
  blue:   "bg-[var(--info-50)]   text-[var(--info)]        ring-1 ring-[var(--info-100)]",
  violet: "bg-[var(--violet-50)] text-[var(--violet-700)] ring-1 ring-[var(--violet-200)]",
  coral:  "bg-[var(--coral-50)]  text-[var(--coral-600)]  ring-1 ring-[var(--coral-100)]",
  mint:   "bg-[var(--mint-50)]   text-[var(--mint-700)]   ring-1 ring-[var(--mint-100)]",
  gray:   "bg-[var(--gray-100)]  text-[var(--gray-500)]   ring-1 ring-[var(--gray-200)]",
};

const TABS = [
  { id: "all",     label: "All"      },
  { id: "new",     label: "New"      },
  { id: "pending", label: "Pending"  },
  { id: "booked",  label: "Booked"   },
  { id: "done",    label: "Done"     },
];

const NEW_STATUSES     = new Set(["submitted", "viewed"]);
const PENDING_STATUSES = new Set(["discussed", "actions_needed", "offer_updated"]);
const BOOKED_STATUSES  = new Set(["scheduled"]);
const DONE_STATUSES    = new Set(["completed", "expired"]);

function matchTab(inq, tab) {
  const s = inq.status;
  if (tab === "all")     return true;
  if (tab === "new")     return NEW_STATUSES.has(s);
  if (tab === "pending") return PENDING_STATUSES.has(s) || inq.activeOffer?.status === "pending";
  if (tab === "booked")  return BOOKED_STATUSES.has(s);
  if (tab === "done")    return DONE_STATUSES.has(s);
  return true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return "Yesterday";
  if (d < 7)  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(raw) {
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatPrice(cents) {
  if (!cents) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cents / 100);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid items-center gap-4 px-6 py-4" style={{ gridTemplateColumns: "40px 1fr auto auto auto" }}>
      <div className="w-10 h-10 rounded-xl bg-[var(--gray-100)] animate-pulse" />
      <div className="space-y-2">
        <div className="h-3.5 bg-[var(--gray-100)] rounded w-2/5 animate-pulse" />
        <div className="h-3 bg-[var(--gray-100)] rounded w-1/3 animate-pulse" />
      </div>
      <div className="h-5 bg-[var(--gray-100)] rounded-full w-24 animate-pulse" />
      <div className="h-3 bg-[var(--gray-100)] rounded w-16 animate-pulse" />
      <div className="h-8 bg-[var(--gray-100)] rounded-lg w-16 animate-pulse" />
    </div>
  );
}

// ─── Inquiry row ──────────────────────────────────────────────────────────────

function InquiryRow({ inquiry, index }) {
  const { customer, event, status, lastActivityAt, activeOffer, lastOffer, budgetCents } = inquiry;
  const meta         = STATUS_META[status] ?? { label: status, color: "gray", dot: "bg-[var(--gray-300)]" };
  const offerPending = activeOffer?.status === "pending";
  const offerAccepted = activeOffer?.status === "accepted";
  const offerDeclined = !activeOffer && lastOffer?.status === "declined";
  const isNew        = status === "submitted";
  const initial      = customer?.name?.charAt(0)?.toUpperCase() ?? "?";

  const badgeLabel = offerPending  ? `Offer sent`
                   : offerAccepted ? `Accepted`
                   : offerDeclined ? "Offer declined"
                   : meta.label;
  const badgeColor = offerPending  ? "violet"
                   : offerAccepted ? "mint"
                   : offerDeclined ? "coral"
                   : meta.color;

  return (
    <div
      className="group relative grid items-center gap-x-4 gap-y-1 px-6 py-4 border-b border-[var(--gray-50)] hover:bg-[var(--violet-50)] transition-colors duration-150 last:border-0"
      style={{ gridTemplateColumns: "40px 1fr auto auto auto", animationDelay: `${index * 30}ms` }}
    >
      {isNew && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-[var(--amber-500)]" />
      )}

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ background: "linear-gradient(135deg, var(--violet-500), var(--magenta-500))", boxShadow: "0 2px 8px rgba(139,92,246,0.2)" }}
      >
        {initial}
      </div>

      {/* Coordinator + event */}
      <div className="min-w-0">
        <p className={`text-sm truncate ${isNew ? "font-bold text-[var(--gray-900)]" : "font-semibold text-[var(--gray-800)]"}`}>
          {customer?.name ?? "Coordinator"}
        </p>
        {event ? (
          <p className="text-xs text-[var(--gray-400)] truncate mt-0.5">{event.name}</p>
        ) : (
          <p className="text-xs text-[var(--gray-300)] mt-0.5 italic">No event linked</p>
        )}
      </div>

      {/* Status badge */}
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${BADGE_STYLES[badgeColor]}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
        {badgeLabel}
      </span>

      {/* Date */}
      <span className="text-xs text-[var(--gray-400)] whitespace-nowrap tabular-nums hidden sm:block">
        {formatDate(lastActivityAt)}
      </span>

      {/* Action */}
      <div className="flex items-center gap-1.5">
        <Link
          href={`/dashboard/inquiries/${inquiry.id}`}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-[var(--gray-200)] text-xs font-semibold text-[var(--gray-700)] hover:bg-[var(--violet-600)] hover:text-white hover:border-[var(--violet-600)] transition-all duration-150 whitespace-nowrap"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          View
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
        {isNew && (
          <span className="w-2 h-2 rounded-full bg-[var(--amber-400)] flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }) {
  const copy = {
    all:     { h: "No inquiries yet",       s: "When coordinators reach out to book you, they'll appear here." },
    new:     { h: "No new requests",        s: "New inquiries from coordinators will show up here." },
    pending: { h: "No pending offers",      s: "Inquiries where you've sent or are negotiating offers appear here." },
    booked:  { h: "Nothing booked yet",     s: "Confirmed bookings will appear here." },
    done:    { h: "No completed inquiries", s: "Past and expired inquiries will appear here." },
  };
  const { h, s } = copy[tab] ?? copy.all;
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center" style={{ background: "var(--gradient-browse)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--gray-900)] mb-1.5">{h}</h3>
      <p className="text-[13px] text-[var(--gray-400)] leading-relaxed max-w-xs">{s}</p>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ inquiries }) {
  const [notifications, setNotifications] = useState([]);
  const [nLoading, setNLoading] = useState(true);

  useEffect(() => {
    listNotifications()
      .then((res) => setNotifications(Array.isArray(res) ? res : (res?.notifications ?? [])))
      .catch(() => {})
      .finally(() => setNLoading(false));
  }, []);

  // Recent messages: inquiries with recent activity, sorted
  const recentActivity = useMemo(() =>
    [...inquiries]
      .filter((i) => i.lastActivityAt)
      .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt))
      .slice(0, 5),
    [inquiries]
  );

  // Stats
  const stats = useMemo(() => ({
    total:   inquiries.length,
    newReqs: inquiries.filter((i) => NEW_STATUSES.has(i.status)).length,
    booked:  inquiries.filter((i) => BOOKED_STATUSES.has(i.status)).length,
    pending: inquiries.filter((i) => i.activeOffer?.status === "pending").length,
  }), [inquiries]);

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="bg-white rounded-2xl border border-[var(--gray-100)] p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest mb-3">Overview</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total",   value: stats.total,   color: "var(--gray-700)"   },
            { label: "New",     value: stats.newReqs, color: "var(--amber-600)"  },
            { label: "Pending", value: stats.pending, color: "var(--violet-600)" },
            { label: "Booked",  value: stats.booked,  color: "var(--mint-600)"   },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl px-3 py-2.5 bg-[var(--gray-50)]">
              <p className="text-[10px] text-[var(--gray-400)] font-medium uppercase tracking-wide">{label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-[var(--gray-100)] overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--gray-50)]">
          <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest">Notifications</p>
          {unread > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--coral-50)] text-[var(--coral-600)]">
              {unread} new
            </span>
          )}
        </div>
        {nLoading ? (
          <div className="px-5 py-4 space-y-3">
            {[1,2].map(i => <div key={i} className="h-3 bg-[var(--gray-100)] rounded animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <p className="px-5 py-4 text-xs text-[var(--gray-400)]">No notifications yet.</p>
        ) : (
          <div className="divide-y divide-[var(--gray-50)]">
            {notifications.slice(0, 5).map((n) => (
              <div
                key={n.id}
                className={`px-5 py-3 flex items-start gap-2.5 ${!n.readAt ? "bg-[var(--violet-50)]" : ""}`}
              >
                {!n.readAt && <span className="w-1.5 h-1.5 rounded-full bg-[var(--violet-500)] flex-shrink-0 mt-1.5" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${!n.readAt ? "font-semibold text-[var(--gray-800)]" : "text-[var(--gray-600)]"}`}>
                    {n.message ?? n.body ?? n.title ?? "New notification"}
                  </p>
                  <p className="text-[10px] text-[var(--gray-400)] mt-0.5">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent messages */}
      <div className="bg-white rounded-2xl border border-[var(--gray-100)] overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="text-[10px] font-bold text-[var(--gray-400)] uppercase tracking-widest px-5 pt-4 pb-3 border-b border-[var(--gray-50)]">
          Recent Activity
        </p>
        {recentActivity.length === 0 ? (
          <p className="px-5 py-4 text-xs text-[var(--gray-400)]">No recent activity.</p>
        ) : (
          <div className="divide-y divide-[var(--gray-50)]">
            {recentActivity.map((inq) => {
              const initial = inq.customer?.name?.charAt(0)?.toUpperCase() ?? "?";
              const meta    = STATUS_META[inq.status] ?? { dot: "bg-[var(--gray-300)]" };
              return (
                <Link
                  key={inq.id}
                  href={`/dashboard/inquiries/${inq.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--gray-50)] transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, var(--violet-500), var(--magenta-500))" }}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--gray-800)] truncate">{inq.customer?.name ?? "Coordinator"}</p>
                    <p className="text-[10px] text-[var(--gray-400)] truncate">{inq.event?.name ?? "No event"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    <span className="text-[10px] text-[var(--gray-400)]">{timeAgo(inq.lastActivityAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorInquiriesPage() {
  return <AuthGate><VendorInquiriesInner /></AuthGate>;
}

function VendorInquiriesInner() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    listVendorInquiries()
      .then((data) => setInquiries(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load inquiries."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => inquiries.filter((i) => matchTab(i, activeTab)), [inquiries, activeTab]);

  const tabCounts = useMemo(() => {
    const counts = {};
    TABS.forEach(({ id }) => {
      counts[id] = id === "all" ? inquiries.length : inquiries.filter((i) => matchTab(i, id)).length;
    });
    return counts;
  }, [inquiries]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-[var(--gray-900)]">Inquiries</h1>
          {!loading && inquiries.length > 0 && (
            <p className="text-sm text-[var(--gray-400)] mt-0.5">{inquiries.length} inquiry{inquiries.length !== 1 ? "s" : ""} total</p>
          )}
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Dashboard
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* Main card */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>

          {/* Tabs */}
          <div className="flex border-b border-[var(--gray-100)] px-4 overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label }) => {
              const count  = tabCounts[id] ?? 0;
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`relative flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                    active ? "text-[var(--violet-600)]" : "text-[var(--gray-400)] hover:text-[var(--gray-700)]"
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-[var(--violet-100)] text-[var(--violet-700)]" : "bg-[var(--gray-100)] text-[var(--gray-400)]"}`}>
                      {count}
                    </span>
                  )}
                  {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--violet-600)] rounded-t-full" />}
                </button>
              );
            })}
          </div>

          {/* Column headers */}
          {!loading && filtered.length > 0 && (
            <div
              className="hidden sm:grid items-center gap-x-4 px-6 py-2.5 bg-[var(--gray-50)] border-b border-[var(--gray-100)]"
              style={{ gridTemplateColumns: "40px 1fr auto auto auto" }}
            >
              <div />
              <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider">Coordinator / Event</p>
              <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider">Status</p>
              <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider">Last Activity</p>
              <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider">Actions</p>
            </div>
          )}

          {/* Rows */}
          {loading ? (
            <div><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-sm text-[var(--error)]">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div>
              {filtered.map((inq, i) => (
                <InquiryRow key={inq.id} inquiry={inq} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block">
          <Sidebar inquiries={inquiries} />
        </div>

      </div>
    </div>
  );
}
