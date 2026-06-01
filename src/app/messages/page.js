"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { listInquiries } from "../../services/inquiries";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const date      = new Date(dateStr);
  const now       = new Date();
  const diffMs    = now - date;
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays  = Math.floor(diffMs / 86400000);
  if (diffMins < 1)   return "Now";
  if (diffMins < 60)  return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "Yest";
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

function getExpiryHours(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return 0;
  return Math.floor(diff / 3600000);
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_META = {
  submitted:      { label: "Sent",           color: "amber",  dot: "#F59E0B" },
  viewed:         { label: "Viewed",         color: "blue",   dot: "#3B82F6" },
  discussed:      { label: "Chatting",       color: "violet", dot: "#8B5CF6" },
  actions_needed: { label: "Offer Received", color: "coral",  dot: "#FF6B6B" },
  offer_updated:  { label: "Offer Revised",  color: "coral",  dot: "#FF6B6B" },
  scheduled:      { label: "Booked",         color: "mint",   dot: "#10B981" },
  completed:      { label: "Done",           color: "mint",   dot: "#10B981" },
  expired:        { label: "Expired",        color: "gray",   dot: "#A8A29E" },
};

const PILL_BG = {
  amber:  "bg-[var(--amber-50)]   text-[var(--amber-700)]",
  blue:   "bg-[var(--info-50)]    text-[var(--info)]",
  violet: "bg-[var(--violet-100)] text-[var(--violet-700)]",
  coral:  "bg-[var(--coral-50)]   text-[var(--coral-600)]",
  mint:   "bg-[var(--mint-50)]    text-[var(--mint-700)]",
  gray:   "bg-[var(--gray-100)]   text-[var(--gray-500)]",
};

const MESSAGEABLE_STATUSES = new Set(["discussed", "actions_needed", "offer_updated", "scheduled", "completed", "expired"]);

// ─── Urgent Offers Banner (mobile-first, always visible) ──────────────────────

function UrgentOffersBanner({ inquiries }) {
  const urgentOffers = inquiries.filter((i) => i.activeOffer?.status === "pending");
  if (urgentOffers.length === 0) return null;

  // Show the single most urgent one on mobile, all in sidebar on desktop
  const topOffer = urgentOffers[0];
  const offer    = topOffer.activeOffer;
  const hours    = getExpiryHours(offer?.expiresAt);
  const initial  = topOffer.vendor?.name?.charAt(0)?.toUpperCase() ?? "V";
  const isCritical = hours !== null && hours < 48;

  return (
    <div className="mx-4 sm:mx-6 mt-4 mb-2 animate-spring-up">
      <Link
        href={`/messages/${topOffer.id}/offer`}
        className="tap-scale block rounded-2xl overflow-hidden"
        style={{
          background: isCritical
            ? "linear-gradient(135deg, #FFF5F5 0%, #FFF0EB 100%)"
            : "linear-gradient(135deg, #F5F3FF 0%, #FAE8FF 100%)",
          border: isCritical ? "1px solid rgba(239,68,68,0.18)" : "1px solid rgba(124,58,237,0.15)",
          boxShadow: isCritical
            ? "0 4px 20px rgba(239,68,68,0.10), 0 1px 4px rgba(0,0,0,0.04)"
            : "0 4px 20px rgba(124,58,237,0.10), 0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isCritical ? "linear-gradient(135deg,#FF6B6B,#EE5A5A)" : "var(--gradient-vendor)" }}>
            {topOffer.vendor?.heroImage ? (
              <img src={topOffer.vendor.heroImage} alt="" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="text-white font-bold text-sm">{initial}</span>
            )}
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[var(--gray-900)] leading-tight">
              {urgentOffers.length > 1
                ? `${urgentOffers.length} offers waiting for your response`
                : `Offer from ${topOffer.vendor?.name ?? "Vendor"}`}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isCritical && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral-500)] animate-pulse flex-shrink-0" />
              )}
              <p className="text-[12px] text-[var(--gray-500)] truncate">
                {offer && formatPrice(offer.totalPriceCents)}
                {isCritical && hours !== null && (
                  <span className="text-[var(--coral-600)] font-semibold"> · Expires in {hours}h</span>
                )}
              </p>
            </div>
          </div>

          {/* CTA */}
          <span
            className="flex-shrink-0 px-3.5 py-2 rounded-xl text-[12px] font-bold text-white"
            style={{ background: isCritical ? "linear-gradient(135deg,#FF6B6B,#EE5A5A)" : "var(--gradient-vendor)" }}
          >
            Review →
          </span>
        </div>
      </Link>
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ inquiry }) {
  const { status, activeOffer } = inquiry;

  if (activeOffer?.status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--mint-50)] text-[var(--mint-700)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint-500)]" />
        Booked · {formatPrice(activeOffer.totalPriceCents)}
      </span>
    );
  }

  if (activeOffer?.status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--coral-50)] text-[var(--coral-600)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral-500)] animate-pulse" />
        Offer · {formatPrice(activeOffer.totalPriceCents)}
      </span>
    );
  }

  const meta = STATUS_META[status] ?? { label: status, color: "gray", dot: "#A8A29E" };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${PILL_BG[meta.color]}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
      {meta.label}
    </span>
  );
}

// ─── Conversation Row ─────────────────────────────────────────────────────────

function ConversationRow({ inquiry, index }) {
  const { vendor, event, lastActivityAt, submittedAt } = inquiry;
  const hasAction = inquiry.activeOffer?.status === "pending" || inquiry.status === "actions_needed";
  const initial   = vendor?.name?.charAt(0)?.toUpperCase() ?? "V";

  return (
    <Link
      href={`/messages/${inquiry.id}`}
      className="tap-scale-sm group relative flex items-center gap-3.5 px-4 sm:px-5 py-4 transition-colors duration-100 active:bg-[var(--violet-50)] hover:bg-[var(--gray-50)]"
      style={{ animationDelay: `${Math.min(index * 35, 200)}ms`, opacity: 0, animation: `row-in 220ms cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(index * 35, 200)}ms forwards` }}
    >
      {/* Unread accent */}
      {hasAction && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-12 rounded-r-full bg-[var(--coral-500)]" />
      )}

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {vendor?.heroImage ? (
          <img
            src={vendor.heroImage}
            alt={vendor.name}
            className="w-12 h-12 rounded-2xl object-cover ring-[1.5px] ring-black/6"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-[15px]"
            style={{ background: "var(--gradient-vendor)", boxShadow: "0 2px 8px rgba(139,92,246,0.22)" }}
          >
            {initial}
          </div>
        )}
        {hasAction && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[var(--coral-500)] rounded-full border-2 border-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <p className={`flex-1 min-w-0 text-[14.5px] truncate leading-snug ${hasAction ? "font-bold text-[var(--gray-900)]" : "font-semibold text-[var(--gray-800)]"}`}>
            {vendor?.name ?? "Vendor"}
          </p>
          <span className="text-[11px] text-[var(--gray-400)] flex-shrink-0 tabular-nums font-medium">
            {formatRelativeTime(lastActivityAt)}
          </span>
        </div>
        {event && (
          <p className="text-[12px] text-[var(--gray-400)] truncate mb-1.5 leading-tight">
            {event.name}
            {submittedAt && (
              <span className="text-[var(--gray-300)] ml-1">· {formatShortDate(submittedAt)}</span>
            )}
          </p>
        )}
        <StatusPill inquiry={inquiry} />
      </div>

      {/* Chevron */}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        className="flex-shrink-0 text-[var(--gray-300)] group-hover:text-[var(--violet-400)] group-hover:translate-x-0.5 transition-all">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3.5 px-4 sm:px-5 py-4">
      <div className="w-12 h-12 rounded-2xl skeleton-shimmer flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="flex justify-between">
          <div className="h-3.5 skeleton-shimmer rounded-full w-2/5" />
          <div className="h-3 skeleton-shimmer rounded-full w-8" />
        </div>
        <div className="h-3 skeleton-shimmer rounded-full w-3/5" />
        <div className="h-5 skeleton-shimmer rounded-full w-28" />
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab }) {
  const copy = {
    all:    { icon: "💬", headline: "No messages yet",          sub: "Messages from vendors will appear here once they reply to your proposals." },
    active: { icon: "💬", headline: "No active conversations",  sub: "Ongoing discussions with vendors will show up here." },
    offers: { icon: "📦", headline: "No pending offers",        sub: "Offers from vendors will appear here once received." },
    booked: { icon: "🎉", headline: "Nothing booked yet",       sub: "Confirmed bookings will appear here." },
    done:   { icon: "✓",  headline: "No completed messages",    sub: "Finished conversations will appear here." },
  };
  const { icon, headline, sub } = copy[tab] ?? copy.all;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-slide-up-soft">
      <div className="w-16 h-16 rounded-3xl mb-5 flex items-center justify-center text-2xl"
        style={{ background: "var(--gradient-browse)", boxShadow: "0 4px 16px rgba(124,58,237,0.12)" }}>
        {icon === "✓" ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </div>
      <h3 className="text-[15px] font-bold text-[var(--gray-900)] mb-2">{headline}</h3>
      <p className="text-[13px] text-[var(--gray-400)] leading-relaxed max-w-[260px]">{sub}</p>
      {tab === "all" && (
        <Link href="/vendors" className="mt-6 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white"
          style={{ background: "var(--gradient-vendor)", boxShadow: "var(--shadow-button)" }}>
          Browse Vendors
        </Link>
      )}
    </div>
  );
}

// ─── Sidebar (desktop only) ───────────────────────────────────────────────────

function getExpiryLabel(expiresAt) {
  if (!expiresAt) return null;
  const diffMs   = new Date(expiresAt) - new Date();
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
          <div key={i} className="h-28 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center py-20">
        <div className="w-16 h-16 rounded-3xl mb-5 flex items-center justify-center"
          style={{ background: "var(--gradient-browse)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h3 className="text-[15px] font-bold text-[var(--gray-900)] mb-2">Find your vendors</h3>
        <p className="text-[13px] text-[var(--gray-400)] leading-relaxed mb-6 max-w-[200px]">
          Send proposals to vendors and manage all your conversations here.
        </p>
        <Link href="/vendors" className="btn btn-gradient text-sm" style={{ height: 40, padding: "0 20px", fontSize: 13 }}>
          Browse vendors
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-7">
      {/* Pending offers needing action */}
      {pendingOfferInquiries.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--coral-500)] animate-pulse" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--gray-500)]">
              Needs Your Response
            </h2>
          </div>
          <div className="space-y-2.5">
            {pendingOfferInquiries.map((inquiry) => {
              const offer   = inquiry.activeOffer;
              const expiry  = getExpiryLabel(offer.expiresAt);
              const initial = inquiry.vendor?.name?.charAt(0)?.toUpperCase() ?? "V";
              return (
                <Link
                  key={inquiry.id}
                  href={`/messages/${inquiry.id}/offer`}
                  className="block bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all group card-premium tap-scale"
                >
                  {expiry?.urgent && (
                    <div className="px-4 py-1.5 bg-[var(--coral-50)] border-b border-[var(--coral-100)] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral-500)] animate-pulse" />
                      <span className="text-[10px] font-bold text-[var(--coral-700)]">{expiry.label}</span>
                    </div>
                  )}
                  <div className="p-4 flex items-start gap-3">
                    {inquiry.vendor?.heroImage ? (
                      <img src={inquiry.vendor.heroImage} alt={inquiry.vendor.name}
                        className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ background: "var(--gradient-vendor)" }}>
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--gray-900)] truncate">{inquiry.vendor?.name ?? "Vendor"}</p>
                      {inquiry.event && (
                        <p className="text-xs text-[var(--gray-400)] truncate mt-0.5">{inquiry.event.name}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-bold text-[var(--gray-900)]">{formatPrice(offer.totalPriceCents)}</p>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <span className="block w-full py-2 text-center text-xs font-bold text-white rounded-xl group-hover:opacity-90"
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

      {/* Active proposals */}
      {activeInquiries.length > 0 && (
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--gray-400)] mb-3">
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
                  className="tap-scale-sm flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[var(--gray-100)] hover:border-[var(--violet-200)] hover:bg-[var(--violet-50)] transition-all group"
                >
                  {inquiry.vendor?.heroImage ? (
                    <img src={inquiry.vendor.heroImage} alt={inquiry.vendor.name}
                      className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: "var(--gradient-vendor)" }}>
                      {initial}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--gray-800)] truncate">{inquiry.vendor?.name ?? "Vendor"}</p>
                    <p className="text-[11px] text-[var(--gray-400)] mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                      {meta.label}
                    </p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="text-[var(--gray-300)] group-hover:text-[var(--violet-400)] flex-shrink-0 transition-colors">
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
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--gray-400)] mb-3">
            Confirmed Bookings
          </h2>
          <div className="space-y-1.5">
            {bookedInquiries.map((inquiry) => {
              const initial = inquiry.vendor?.name?.charAt(0)?.toUpperCase() ?? "V";
              return (
                <Link
                  key={inquiry.id}
                  href={`/messages/${inquiry.id}`}
                  className="tap-scale-sm flex items-center gap-3 px-4 py-3 bg-[var(--mint-50)] rounded-xl border border-[var(--mint-100)] hover:border-[var(--mint-200)] transition-all group"
                >
                  {inquiry.vendor?.heroImage ? (
                    <img src={inquiry.vendor.heroImage} alt={inquiry.vendor.name}
                      className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,var(--mint-500),var(--mint-600))" }}>
                      {initial}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--mint-800)] truncate">{inquiry.vendor?.name ?? "Vendor"}</p>
                    <p className="text-[11px] text-[var(--mint-600)] mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint-500)]" />
                      Booked
                    </p>
                  </div>
                  {inquiry.activeOffer && (
                    <p className="text-sm font-bold text-[var(--mint-700)] flex-shrink-0">
                      {formatPrice(inquiry.activeOffer.totalPriceCents)}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {pendingOfferInquiries.length === 0 && activeInquiries.length === 0 && bookedInquiries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center bg-[var(--mint-50)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-sm font-bold text-[var(--gray-700)]">All caught up</p>
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
  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    listInquiries()
      .then((data) => setInquiries(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load proposals."))
      .finally(() => setLoading(false));
  }, [user, router]);

  const messageableInquiries = useMemo(
    () => inquiries.filter((i) => i.messageCount > 0),
    [inquiries]
  );

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
        <div className="bg-white/90 backdrop-blur-xl border-b border-[var(--gray-100)] sticky top-14 z-40">
          <div className="px-4 sm:px-6 pt-5 pb-0">

            {/* Title row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-[22px] font-display font-bold text-[var(--gray-900)] tracking-tight">Messages</h1>
                {!loading && messageableInquiries.length > 0 && (
                  <p className="text-[12px] text-[var(--gray-400)] mt-0.5 tabular-nums">
                    {messageableInquiries.length} conversation{messageableInquiries.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              {pendingOffers > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-[var(--coral-50)] text-[var(--coral-600)] border border-[var(--coral-100)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral-500)] animate-pulse" />
                  {pendingOffers} offer{pendingOffers !== 1 ? "s" : ""}
                </span>
              )}
            </div>

          </div>
        </div>

        {/* Urgent offers banner — mobile only */}
        {!loading && <div className="lg:hidden"><UrgentOffersBanner inquiries={inquiries} /></div>}

        {/* List */}
        <div className={pendingOffers > 0 ? "pt-1 pb-5" : "py-3 sm:px-6 sm:pt-5"}>
          {loading ? (
            <div className="bg-white sm:rounded-2xl overflow-hidden divide-y divide-[var(--gray-50)]" style={{ boxShadow: "var(--shadow-card)" }}>
              {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-16 px-4">
              <p className="text-sm text-[var(--error)] mb-3">{error}</p>
              <button onClick={() => window.location.reload()} className="text-sm font-semibold text-[var(--violet-600)]">
                Retry
              </button>
            </div>
          ) : messageableInquiries.length === 0 ? (
            <EmptyState tab="all" />
          ) : (
            <div className={`bg-white divide-y divide-[var(--gray-50)] overflow-hidden ${pendingOffers > 0 ? "mx-4 sm:mx-6 rounded-2xl mt-2" : "sm:rounded-2xl"}`}
              style={{ boxShadow: "var(--shadow-card)" }}>
              {messageableInquiries.map((inquiry, i) => (
                <ConversationRow key={inquiry.id} inquiry={inquiry} index={i} />
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
