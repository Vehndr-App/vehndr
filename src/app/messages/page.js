"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { listInquiries } from "../../services/inquiries";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const date     = new Date(dateStr);
  const now      = new Date();
  const diffMs   = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays  = Math.floor(diffMs / 86400000);

  if (diffMins < 1)   return "Just now";
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)   return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPrice(cents) {
  if (!cents) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cents / 100);
}

function formatShortDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_META = {
  submitted:      { label: "Proposal Sent",  color: "amber"  },
  viewed:         { label: "Viewed",         color: "blue"   },
  discussed:      { label: "In Discussion",  color: "violet" },
  actions_needed: { label: "Offer Received", color: "coral"  },
  offer_updated:  { label: "Offer Revised",  color: "coral"  },
  scheduled:      { label: "Booked",         color: "mint"   },
  completed:      { label: "Completed",      color: "mint"   },
  expired:        { label: "Expired",        color: "gray"   },
};

const COLOR_STYLES = {
  amber:  "bg-[var(--amber-50)]   text-[var(--amber-700)]",
  blue:   "bg-[var(--info-50)]    text-[var(--info)]",
  violet: "bg-[var(--violet-100)] text-[var(--violet-700)]",
  coral:  "bg-[var(--coral-50)]   text-[var(--coral-600)]",
  mint:   "bg-[var(--mint-50)]    text-[var(--mint-700)]",
  gray:   "bg-[var(--gray-100)]   text-[var(--gray-500)]",
};

const COLOR_DOT = {
  amber:  "bg-[var(--amber-500)]",
  blue:   "bg-[var(--info)]",
  violet: "bg-[var(--violet-500)]",
  coral:  "bg-[var(--coral-500)]",
  mint:   "bg-[var(--mint-500)]",
  gray:   "bg-[var(--gray-300)]",
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "all",    label: "All"    },
  { id: "active", label: "Active" },
  { id: "offers", label: "Offers" },
  { id: "booked", label: "Booked" },
  { id: "done",   label: "Done"   },
];

// Only inquiries where the vendor has engaged belong in the messages list.
// submitted/viewed = still waiting on vendor; those stay in the sidebar only.
const MESSAGEABLE_STATUSES  = new Set(["discussed", "actions_needed", "offer_updated", "scheduled", "completed", "expired"]);
const ACTIVE_STATUSES        = new Set(["discussed", "actions_needed", "offer_updated"]);
const BOOKED_STATUSES        = new Set(["scheduled"]);
const DONE_STATUSES          = new Set(["completed", "expired"]);

function matchesTab(inquiry, tab) {
  const s = inquiry.status;
  if (tab === "all")    return true;
  if (tab === "active") return ACTIVE_STATUSES.has(s) && !inquiry.activeOffer;
  if (tab === "offers") return !!inquiry.activeOffer;
  if (tab === "booked") return BOOKED_STATUSES.has(s);
  if (tab === "done")   return DONE_STATUSES.has(s);
  return true;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ inquiry }) {
  const { status, activeOffer } = inquiry;
  const hasActiveOffer   = activeOffer?.status === "pending";
  const hasAcceptedOffer = activeOffer?.status === "accepted";

  if (hasAcceptedOffer) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--mint-50)] text-[var(--mint-700)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint-500)] inline-block" />
        Accepted · {formatPrice(activeOffer.totalPriceCents)}
      </span>
    );
  }

  if (hasActiveOffer) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--coral-50)] text-[var(--coral-600)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral-500)] inline-block animate-pulse" />
        Offer · {formatPrice(activeOffer.totalPriceCents)}
      </span>
    );
  }

  const meta  = STATUS_META[status] ?? { label: status, color: "gray" };
  const style = COLOR_STYLES[meta.color];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full inline-block ${COLOR_DOT[meta.color]}`} />
      {meta.label}
    </span>
  );
}

function ProposalRow({ inquiry, index }) {
  const { vendor, event, lastActivityAt, submittedAt } = inquiry;
  const hasNewActivity = inquiry.activeOffer?.status === "pending" || inquiry.status === "actions_needed";
  const initial = vendor?.name?.charAt(0)?.toUpperCase() ?? "V";

  return (
    <Link
      href={`/messages/${inquiry.id}`}
      className="group relative flex items-center gap-4 px-5 py-4 hover:bg-[var(--violet-50)] transition-colors duration-150"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Active accent bar */}
      {hasNewActivity && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-10 rounded-r-full bg-[var(--violet-500)]" />
      )}

      {/* Avatar */}
      {vendor?.heroImage ? (
        <img
          src={vendor.heroImage}
          alt={vendor.name}
          className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-[1.5px] ring-black/5"
        />
      ) : (
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: "var(--gradient-vendor)", boxShadow: "0 2px 8px rgba(139,92,246,0.2)" }}
        >
          {initial}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className={`text-[14px] truncate ${hasNewActivity ? "font-semibold text-[var(--gray-900)]" : "font-medium text-[var(--gray-800)]"}`}>
            {vendor?.name ?? "Vendor"}
          </p>
          <span className="text-[11px] text-[var(--gray-400)] flex-shrink-0 tabular-nums">
            {formatRelativeTime(lastActivityAt)}
          </span>
        </div>
        {event && (
          <p className="text-[12px] text-[var(--gray-400)] truncate mb-1.5 leading-tight">
            {event.name}
            {submittedAt && (
              <span className="ml-1.5 text-[var(--gray-300)]">· Sent {formatShortDate(submittedAt)}</span>
            )}
          </p>
        )}
        <StatusPill inquiry={inquiry} />
      </div>

      {/* Arrow */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        className="text-[var(--gray-300)] group-hover:text-[var(--violet-400)] transition-colors flex-shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="w-11 h-11 rounded-xl bg-[var(--gray-100)] animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-3.5 bg-[var(--gray-100)] rounded-full w-1/3 animate-pulse" />
          <div className="h-3 bg-[var(--gray-100)] rounded-full w-10 animate-pulse" />
        </div>
        <div className="h-3 bg-[var(--gray-100)] rounded-full w-2/5 animate-pulse" />
        <div className="h-5 bg-[var(--gray-100)] rounded-full w-28 animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState({ tab }) {
  const copy = {
    all:    { headline: "No messages yet",          sub: "Messages from vendors will appear here once they reply to your proposals." },
    active: { headline: "No active conversations",  sub: "Ongoing discussions with vendors will show up here." },
    offers: { headline: "No pending offers",        sub: "Offers from vendors will appear here once received." },
    booked: { headline: "Nothing booked yet",       sub: "Confirmed bookings will appear here." },
    done:   { headline: "No completed messages",    sub: "Finished conversations will appear here." },
  };
  const { headline, sub } = copy[tab] ?? copy.all;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center" style={{ background: "var(--gradient-browse)" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--gray-900)] mb-1.5">{headline}</h3>
      <p className="text-[13px] text-[var(--gray-400)] leading-relaxed max-w-xs">{sub}</p>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function getExpiryLabel(expiresAt) {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt) - new Date();
  if (diffMs <= 0) return { label: "Expired", urgent: true };
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays  = Math.floor(diffMs / 86400000);
  if (diffHours < 24) return { label: `Expires in ${diffHours}h`, urgent: true };
  if (diffDays <= 2)  return { label: `Expires in ${diffDays}d`,  urgent: true };
  if (diffDays <= 7)  return { label: `${diffDays} days left`,    urgent: false };
  return null;
}

function ProposalSidebar({ inquiries, loading }) {
  const pendingOfferInquiries = inquiries.filter((i) => i.activeOffer?.status === "pending");
  const bookedInquiries       = inquiries.filter((i) => i.status === "scheduled");
  const activeInquiries       = inquiries.filter(
    (i) => ["submitted", "viewed", "discussed"].includes(i.status) && !i.activeOffer
  );

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-[var(--gray-100)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center py-20">
        <div className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center" style={{ background: "var(--gradient-browse)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h3 className="text-[15px] font-semibold text-[var(--gray-900)] mb-2">Find your vendors</h3>
        <p className="text-[13px] text-[var(--gray-400)] leading-relaxed mb-6">
          Send proposals to vendors and manage all your conversations here.
        </p>
        <Link
          href="/vendors"
          className="btn btn-gradient text-sm"
          style={{ height: "40px", padding: "0 20px", fontSize: "13px" }}
        >
          Browse vendors
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Pending offers needing action */}
      {pendingOfferInquiries.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral-500)] animate-pulse" />
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--gray-500)]">
              Needs Your Response
            </h2>
          </div>
          <div className="space-y-2">
            {pendingOfferInquiries.map((inquiry) => {
              const offer    = inquiry.activeOffer;
              const expiry   = getExpiryLabel(offer.expiresAt);
              const initial  = inquiry.vendor?.name?.charAt(0)?.toUpperCase() ?? "V";
              return (
                <Link
                  key={inquiry.id}
                  href={`/messages/${inquiry.id}/offer`}
                  className="block bg-white rounded-2xl border border-[var(--coral-100)] overflow-hidden hover:shadow-md transition-all group"
                  style={{ boxShadow: "0 1px 4px rgba(239,68,68,0.08)" }}
                >
                  {expiry?.urgent && (
                    <div className="px-4 py-1.5 bg-[var(--coral-50)] border-b border-[var(--coral-100)] flex items-center gap-1.5">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--coral-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span className="text-[10px] font-semibold text-[var(--coral-700)]">{expiry.label}</span>
                    </div>
                  )}
                  <div className="p-4 flex items-start gap-3">
                    {inquiry.vendor?.heroImage ? (
                      <img src={inquiry.vendor.heroImage} alt={inquiry.vendor.name}
                        className="w-9 h-9 rounded-xl object-cover flex-shrink-0 ring-1 ring-black/5" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ background: "var(--gradient-vendor)" }}>
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--gray-900)] truncate">{inquiry.vendor?.name ?? "Vendor"}</p>
                      {inquiry.event && (
                        <p className="text-xs text-[var(--gray-400)] truncate mt-0.5">{inquiry.event.name}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-[var(--gray-900)]">{formatPrice(offer.totalPriceCents)}</p>
                      {!expiry?.urgent && (
                        <p className="text-[10px] text-[var(--gray-400)] mt-0.5">Pending offer</p>
                      )}
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <span className="block w-full py-2 text-center text-xs font-semibold text-white rounded-xl transition-all group-hover:opacity-90"
                      style={{ background: "var(--gradient-vendor)" }}>
                      Review Offer →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Active proposals (no offer yet) */}
      {activeInquiries.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--gray-400)] mb-3">
            Awaiting Vendor Response
          </h2>
          <div className="space-y-1.5">
            {activeInquiries.map((inquiry) => {
              const initial = inquiry.vendor?.name?.charAt(0)?.toUpperCase() ?? "V";
              const meta    = STATUS_META[inquiry.status] ?? STATUS_META.submitted;
              return (
                <Link
                  key={inquiry.id}
                  href={`/messages/${inquiry.id}`}
                  className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[var(--gray-100)] hover:border-[var(--violet-200)] hover:bg-[var(--violet-50)] transition-all group"
                >
                  {inquiry.vendor?.heroImage ? (
                    <img src={inquiry.vendor.heroImage} alt={inquiry.vendor.name}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: "var(--gradient-vendor)" }}>
                      {initial}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--gray-800)] truncate">{inquiry.vendor?.name ?? "Vendor"}</p>
                    <p className="text-[11px] text-[var(--gray-400)] mt-0.5">{meta.label}</p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="text-[var(--gray-300)] group-hover:text-[var(--violet-400)] flex-shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Booked */}
      {bookedInquiries.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--gray-400)] mb-3">
            Confirmed Bookings
          </h2>
          <div className="space-y-1.5">
            {bookedInquiries.map((inquiry) => {
              const initial = inquiry.vendor?.name?.charAt(0)?.toUpperCase() ?? "V";
              return (
                <Link
                  key={inquiry.id}
                  href={`/messages/${inquiry.id}`}
                  className="flex items-center gap-3 px-4 py-3 bg-[var(--mint-50)] rounded-xl border border-[var(--mint-100)] hover:border-[var(--mint-200)] transition-all group"
                >
                  {inquiry.vendor?.heroImage ? (
                    <img src={inquiry.vendor.heroImage} alt={inquiry.vendor.name}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,var(--mint-500),var(--mint-600))" }}>
                      {initial}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--mint-800)] truncate">{inquiry.vendor?.name ?? "Vendor"}</p>
                    <p className="text-[11px] text-[var(--mint-600)] mt-0.5">Booked</p>
                  </div>
                  {inquiry.activeOffer && (
                    <p className="text-sm font-semibold text-[var(--mint-700)] flex-shrink-0">
                      {formatPrice(inquiry.activeOffer.totalPriceCents)}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* All clear */}
      {pendingOfferInquiries.length === 0 && activeInquiries.length === 0 && bookedInquiries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center bg-[var(--mint-50)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--gray-700)]">All caught up</p>
          <p className="text-xs text-[var(--gray-400)] mt-1">No pending actions right now.</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    listInquiries()
      .then((data) => setInquiries(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load proposals."))
      .finally(() => setLoading(false));
  }, [user, router]);

  // Only show threads where the vendor has replied; submitted/viewed stay in the sidebar
  const messageableInquiries = useMemo(
    () => inquiries.filter((i) => MESSAGEABLE_STATUSES.has(i.status)),
    [inquiries]
  );

  const filtered = useMemo(
    () => messageableInquiries.filter((i) => matchesTab(i, activeTab)),
    [messageableInquiries, activeTab]
  );

  const tabCounts = useMemo(() => {
    const counts = {};
    TABS.forEach(({ id }) => {
      counts[id] = id === "all"
        ? messageableInquiries.length
        : messageableInquiries.filter((i) => matchesTab(i, id)).length;
    });
    return counts;
  }, [messageableInquiries]);

  const pendingOffers = inquiries.filter((i) => i.activeOffer?.status === "pending").length;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--violet-500)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:flex" style={{ background: "var(--background)" }}>

      {/* ── Left: conversation list ── */}
      <div className="lg:w-[460px] xl:w-[520px] lg:flex-shrink-0 lg:border-r lg:border-[var(--gray-100)]">

        {/* Sticky header */}
        <div className="bg-white border-b border-[var(--gray-100)] sticky top-14 z-40">
          <div className="px-4 sm:px-6 pt-6 pb-0">

            {/* Title row */}
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-xs font-medium text-[var(--gray-400)] mb-0.5 uppercase tracking-widest">Inbox</p>
                <h1 className="text-xl font-display font-bold text-[var(--gray-900)]">Messages</h1>
              </div>
              <div className="flex items-center gap-3">
                {pendingOffers > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--coral-50)] text-[var(--coral-600)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral-500)] animate-pulse inline-block" />
                    {pendingOffers} offer{pendingOffers !== 1 ? "s" : ""} waiting
                  </span>
                )}
                {!loading && messageableInquiries.length > 0 && (
                  <span className="text-xs text-[var(--gray-400)] tabular-nums">
                    {messageableInquiries.length} total
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 -mx-1 overflow-x-auto scrollbar-none">
              {TABS.map(({ id, label }) => {
                const isActive = activeTab === id;
                const count    = tabCounts[id];
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ${
                      isActive
                        ? "text-[var(--violet-600)]"
                        : "text-[var(--gray-400)] hover:text-[var(--gray-700)]"
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className={`text-[11px] font-semibold tabular-nums ${
                        isActive ? "text-[var(--violet-500)]" : "text-[var(--gray-300)]"
                      }`}>
                        {count}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-[var(--violet-600)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="px-4 sm:px-6 py-5">
          {loading ? (
            <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[var(--gray-50)]" style={{ boxShadow: "var(--shadow-card)" }}>
              {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-sm text-[var(--error)]">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[var(--gray-50)]" style={{ boxShadow: "var(--shadow-card)" }}>
              {filtered.map((inquiry, i) => (
                <ProposalRow key={inquiry.id} inquiry={inquiry} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: sidebar (desktop only) ── */}
      <div className="hidden lg:block flex-1 min-w-0">
        <div className="sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
          <ProposalSidebar inquiries={inquiries} loading={loading} />
        </div>
      </div>

    </div>
  );
}
