"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { listInquiries, deleteInquiry } from "../../services/inquiries";
import { marketplaceChargeTotalCents } from "../../utils/marketplacePricing";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META = {
  submitted:      { label: "Sent",      color: "amber",  dot: "bg-[var(--amber-500)]"  },
  viewed:         { label: "Viewed",    color: "blue",   dot: "bg-[var(--info)]"        },
  discussed:      { label: "Active",    color: "violet", dot: "bg-[var(--violet-500)]"  },
  actions_needed: { label: "Offer",     color: "coral",  dot: "bg-[var(--coral-500)]"   },
  offer_updated:  { label: "Revised",   color: "coral",  dot: "bg-[var(--coral-500)]"   },
  scheduled:      { label: "Booked",    color: "mint",   dot: "bg-[var(--mint-500)]"    },
  completed:      { label: "Completed", color: "mint",   dot: "bg-[var(--mint-500)]"    },
  expired:        { label: "Expired",   color: "gray",   dot: "bg-[var(--gray-300)]"    },
};

const BADGE_STYLES = {
  amber:  "bg-[var(--amber-50)]  text-[var(--amber-700)]",
  blue:   "bg-[var(--info-50)]   text-[var(--info)]",
  violet: "bg-[var(--violet-50)] text-[var(--violet-700)]",
  coral:  "bg-[var(--coral-50)]  text-[var(--coral-600)]",
  mint:   "bg-[var(--mint-50)]   text-[var(--mint-700)]",
  gray:   "bg-[var(--gray-100)]  text-[var(--gray-500)]",
};

const ACCENT_BAR = {
  amber:  "bg-[var(--amber-400)]",
  blue:   "bg-[var(--info)]",
  violet: "bg-[var(--violet-500)]",
  coral:  "bg-[var(--coral-500)]",
  mint:   "bg-[var(--mint-500)]",
  gray:   "bg-[var(--gray-200)]",
};

const TABS = [
  { id: "all",    label: "All"    },
  { id: "sent",   label: "Sent"   },
  { id: "booked", label: "Booked" },
];

const SENT_STATUSES   = new Set(["submitted", "viewed"]);
const BOOKED_STATUSES = new Set(["scheduled"]);

const PAGE_SIZE = 6;

function matchTab(inq, tab) {
  const s = inq.status;
  if (tab === "all")    return true;
  if (tab === "sent")   return SENT_STATUSES.has(s);
  if (tab === "booked") return BOOKED_STATUSES.has(s);
  return true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(raw) {
  if (!raw) return "—";
  return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatPrice(cents) {
  if (!cents) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cents / 100);
}

function displayTipCents(inquiry) {
  const booking = inquiry?.marketplaceBooking;
  if (!booking) return inquiry?.tipCents ?? 0;
  return booking.paymentStatus === "fully_paid" ? (booking.tipCents ?? 0) : (inquiry?.tipCents ?? 0);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="h-[3px] bg-[var(--gray-100)]" />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[var(--gray-100)] animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-[var(--gray-100)] rounded w-3/5 animate-pulse" />
            <div className="h-3 bg-[var(--gray-100)] rounded w-2/5 animate-pulse" />
          </div>
          <div className="h-6 w-14 bg-[var(--gray-100)] rounded-full animate-pulse flex-shrink-0" />
        </div>
        <div className="flex justify-between mt-3 pt-2.5 border-t border-[var(--gray-50)]">
          <div className="h-3 w-20 bg-[var(--gray-100)] rounded animate-pulse" />
          <div className="h-3 w-16 bg-[var(--gray-100)] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Proposal Card ────────────────────────────────────────────────────────────

function ProposalCard({ inquiry, onDelete }) {
  const meta        = STATUS_META[inquiry.status] ?? { label: inquiry.status, color: "gray", dot: "bg-[var(--gray-300)]" };
  const offer       = inquiry.activeOffer;
  const hasOffer    = offer?.status === "pending";
  const isBooked    = offer?.status === "accepted" || inquiry.status === "scheduled";
  const initial     = inquiry.vendor?.name?.charAt(0)?.toUpperCase() ?? "V";
  const needsAction = inquiry.status === "actions_needed";
  const isPaid      = offer?.paymentStatus === "deposit_paid" || offer?.paymentStatus === "fully_paid";

  const tip   = displayTipCents(inquiry);
  const color = hasOffer ? "coral" : isBooked ? "mint" : meta.color;
  const price = (hasOffer || isBooked) && offer?.totalPriceCents
    ? formatPrice(
        offer.proposalType === "cash"
          ? marketplaceChargeTotalCents(offer.totalPriceCents, tip)
          : offer.totalPriceCents + tip
      )
    : null;

  return (
    <div className="relative group">
      <Link
        href={`/buyer-dashboard/proposals/${inquiry.id}`}
        className="block bg-white rounded-2xl overflow-hidden active:scale-[0.985] transition-transform duration-100"
        style={{
          boxShadow: needsAction
            ? "0 0 0 1.5px var(--coral-200), var(--shadow-card)"
            : "var(--shadow-card)",
        }}
      >
        <div className={`h-[3px] w-full ${ACCENT_BAR[color]}`} />
        <div className="p-4">
          {/* Top row: avatar + name + badge */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: "var(--gradient-vendor)" }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-[var(--gray-900)] leading-tight truncate">
                {inquiry.vendor?.name ?? "Vendor"}
              </p>
              <p className="text-xs text-[var(--gray-400)] mt-0.5 truncate">
                {inquiry.event?.name ?? "No event linked"}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${BADGE_STYLES[color]}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
              {meta.label}
            </span>
          </div>

          {/* Bottom row: date left, price/action right — stacks if needed */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mt-3 pt-2.5 border-t border-[var(--gray-50)]">
            <span className="text-[11px] text-[var(--gray-400)] tabular-nums">{formatDate(inquiry.createdAt)}</span>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {needsAction && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--coral-600)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral-500)] animate-pulse inline-block" />
                  Action needed
                </span>
              )}
              {price && (
                <span className={`text-[13px] font-bold ${needsAction ? "text-[var(--coral-600)]" : "text-[var(--gray-800)]"}`}>
                  {price}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {!isPaid && (
        <button
          onClick={(e) => { e.preventDefault(); onDelete(inquiry); }}
          className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-white border border-[var(--gray-200)] flex items-center justify-center text-[var(--gray-400)] hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
          title="Delete"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }) {
  const copy = {
    all:    { h: "No proposals yet",    s: "When you submit proposals to vendors, they'll appear here." },
    sent:   { h: "No sent proposals",   s: "Proposals waiting for a vendor response will show up here." },
    booked: { h: "Nothing booked yet",  s: "Confirmed bookings will appear here." },
  };
  const { h, s } = copy[tab] ?? copy.all;
  return (
    <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-12 px-6 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center" style={{ background: "var(--gradient-browse)" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--gray-900)] mb-1">{h}</h3>
      <p className="text-[13px] text-[var(--gray-400)] leading-relaxed max-w-xs mb-5">{s}</p>
      {tab === "all" && (
        <Link href="/vendors" className="btn btn-gradient text-sm" style={{ height: "40px", padding: "0 20px", fontSize: "13px" }}>
          Browse vendors
        </Link>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BuyerDashboardHome() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [inquiries, setInquiries]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("all");
  const [page, setPage]             = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const cardListRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    listInquiries()
      .then((data) => setInquiries(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const filtered = useMemo(
    () => inquiries.filter((i) => matchTab(i, activeTab)),
    [inquiries, activeTab]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tabCounts = useMemo(() => {
    const c = {};
    TABS.forEach(({ id }) => {
      c[id] = id === "all" ? inquiries.length : inquiries.filter((i) => matchTab(i, id)).length;
    });
    return c;
  }, [inquiries]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    setPage(1);
  }

  function changePage(next) {
    setPage(next);
    cardListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteInquiry(deleteTarget.id);
      setInquiries((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message ?? "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-24">

      {/* ── Sticky header ── */}
      <div className="sticky top-14 z-30 bg-[var(--gray-50)]">
        {/* Title */}
        <div className="px-4 pt-4 pb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] text-[var(--gray-400)] font-medium leading-none mb-0.5">{greeting()}</p>
            <h1 className="text-[19px] font-display font-bold text-[var(--gray-900)] leading-tight">
              {user?.name ? user.name.split(" ")[0] : "My"}&rsquo;s Proposals
            </h1>
          </div>
          <Link
            href="/vendors"
            className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--gray-900)] text-white text-[13px] font-semibold"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
          >
            New Proposal
          </Link>
        </div>

        {/* Filter chips */}
        <div className="relative">
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {TABS.map(({ id, label }) => {
              const count  = tabCounts[id] ?? 0;
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px] font-semibold transition-all duration-150 ${
                    active
                      ? "bg-[var(--gray-900)] text-white"
                      : "bg-white text-[var(--gray-500)] border border-[var(--gray-200)]"
                  }`}
                  style={active ? { boxShadow: "0 1px 4px rgba(0,0,0,0.15)" } : {}}
                >
                  {label}
                  <span className={`text-[10px] font-bold tabular-nums leading-none ${
                    count > 0 && !loading
                      ? active ? "opacity-60" : "text-[var(--gray-400)]"
                      : "invisible"
                  }`}>
                    {count || 0}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Right fade hint */}
          <div className="absolute right-0 top-0 bottom-3 w-8 pointer-events-none"
            style={{ background: "linear-gradient(to left, var(--gray-50), transparent)" }} />
        </div>

        <div className="h-px bg-[var(--gray-200)]" />
      </div>

      {/* ── Card list ── */}
      <div ref={cardListRef} className="px-4 pt-4 space-y-3">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : paginated.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          paginated.map((inq) => (
            <ProposalCard key={inq.id} inquiry={inq} onDelete={setDeleteTarget} />
          ))
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="px-4 mt-5 flex items-center justify-between gap-3">
          <button
            onClick={() => changePage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 h-11 px-5 rounded-xl border border-[var(--gray-200)] bg-white text-sm font-semibold text-[var(--gray-600)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Prev
          </button>

          <span className="text-sm font-semibold text-[var(--gray-500)] tabular-nums">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => changePage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5 h-11 px-5 rounded-xl border border-[var(--gray-200)] bg-white text-sm font-semibold text-[var(--gray-600)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-[var(--gray-900)] text-center mb-1">Delete this proposal?</h2>
            <p className="text-sm text-[var(--gray-500)] text-center mb-5">
              This will permanently remove your proposal to <strong>{deleteTarget.vendor?.name}</strong>.
            </p>
            {deleteError && <p className="text-sm text-red-600 text-center mb-4">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-700)] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-40"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
