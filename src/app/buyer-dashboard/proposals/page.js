"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import { listInquiries, deleteInquiry } from "../../../services/inquiries";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META = {
  submitted:      { label: "Proposal Sent",  color: "amber",  dot: "bg-[var(--amber-500)]"  },
  viewed:         { label: "Viewed",         color: "blue",   dot: "bg-[var(--info)]"        },
  discussed:      { label: "In Discussion",  color: "violet", dot: "bg-[var(--violet-500)]"  },
  actions_needed: { label: "Offer Received", color: "coral",  dot: "bg-[var(--coral-500)]"   },
  offer_updated:  { label: "Offer Revised",  color: "coral",  dot: "bg-[var(--coral-500)]"   },
  scheduled:      { label: "Booked",         color: "mint",   dot: "bg-[var(--mint-500)]"    },
  completed:      { label: "Completed",      color: "mint",   dot: "bg-[var(--mint-500)]"    },
  expired:        { label: "Expired",        color: "gray",   dot: "bg-[var(--gray-300)]"    },
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
  { id: "all",    label: "All" },
  { id: "active", label: "Active" },
  { id: "offers", label: "Offers" },
  { id: "booked", label: "Booked" },
  { id: "done",   label: "Done" },
];

const ACTIVE_STATUSES = new Set(["submitted", "viewed", "discussed"]);
const OFFER_STATUSES  = new Set(["actions_needed", "offer_updated"]);
const BOOKED_STATUSES = new Set(["scheduled"]);
const DONE_STATUSES   = new Set(["completed", "expired"]);

function matchTab(inq, tab) {
  const s = inq.status;
  if (tab === "all")    return true;
  if (tab === "active") return ACTIVE_STATUSES.has(s);
  if (tab === "offers") return OFFER_STATUSES.has(s) || inq.activeOffer?.status === "pending";
  if (tab === "booked") return BOOKED_STATUSES.has(s);
  if (tab === "done")   return DONE_STATUSES.has(s);
  return true;
}

// ─── Fee helpers (mirrors MarketplacePricing) ─────────────────────────────────

const FEE_TAX_RATE     = 0.0825;
const FEE_COORD_RATE   = 0.10;
const FEE_STRIPE_RATE  = 0.029;
const FEE_STRIPE_FIXED = 30;

function feePreStripe(base, tip = 0)  { return base + Math.round(base * FEE_TAX_RATE) + Math.round(base * FEE_COORD_RATE) + tip; }
function feeGrossTotal(base, tip = 0) { return Math.ceil((feePreStripe(base, tip) + FEE_STRIPE_FIXED) / (1 - FEE_STRIPE_RATE)); }

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-6 py-4">
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

// ─── Proposal row ─────────────────────────────────────────────────────────────

function ProposalRow({ inquiry, index, onDelete }) {
  const meta      = STATUS_META[inquiry.status] ?? { label: inquiry.status, color: "gray", dot: "bg-[var(--gray-300)]" };
  const offer     = inquiry.activeOffer;
  const hasOffer  = offer?.status === "pending";
  const isBooked  = offer?.status === "accepted" || inquiry.status === "scheduled";
  const initial   = inquiry.vendor?.name?.charAt(0)?.toUpperCase() ?? "V";
  const needsAction = inquiry.status === "actions_needed";
  const isPaid    = offer?.paymentStatus === "deposit_paid" || offer?.paymentStatus === "fully_paid";

  const tip = inquiry.tipCents ?? 0;
  const badgeLabel  = hasOffer
    ? `Offer · ${formatPrice(feeGrossTotal(offer.totalPriceCents ?? 0, tip))}`
    : isBooked
    ? `Booked · ${formatPrice(feeGrossTotal(offer?.totalPriceCents ?? 0, tip))}`
    : meta.label;
  const badgeColor  = hasOffer ? "coral" : isBooked ? "mint" : meta.color;

  return (
    <div
      className={`group relative grid items-center gap-x-4 gap-y-1 px-6 py-4 border-b border-[var(--gray-50)] hover:bg-[var(--violet-50)] transition-colors duration-150 last:border-0 ${
        needsAction ? "bg-[var(--coral-50)]/30" : ""
      }`}
      style={{
        gridTemplateColumns: "40px 1fr auto auto auto",
        animationDelay: `${index * 30}ms`,
      }}
    >
      {/* Attention accent */}
      {needsAction && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-[var(--coral-500)]" />
      )}

      {/* Vendor avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ background: "var(--gradient-vendor)", boxShadow: "0 2px 8px rgba(139,92,246,0.2)" }}
      >
        {initial}
      </div>

      {/* Vendor + event */}
      <div className="min-w-0">
        <p className={`text-sm truncate ${needsAction ? "font-bold text-[var(--gray-900)]" : "font-semibold text-[var(--gray-800)]"}`}>
          {inquiry.vendor?.name ?? "Vendor"}
        </p>
        {inquiry.event ? (
          <p className="text-xs text-[var(--gray-400)] truncate mt-0.5">{inquiry.event.name}</p>
        ) : (
          <p className="text-xs text-[var(--gray-300)] mt-0.5 italic">No event linked</p>
        )}
      </div>

      {/* Status badge */}
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${BADGE_STYLES[badgeColor]}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_META[inquiry.status]?.dot ?? "bg-[var(--gray-300)]"}`} />
        {badgeLabel}
      </span>

      {/* Date */}
      <span className="text-xs text-[var(--gray-400)] whitespace-nowrap tabular-nums hidden sm:block">
        {formatDate(inquiry.createdAt)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <Link
          href={`/buyer-dashboard/proposals/${inquiry.id}`}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-[var(--gray-200)] text-xs font-semibold text-[var(--gray-700)] hover:bg-[var(--violet-600)] hover:text-white hover:border-[var(--violet-600)] transition-all duration-150 whitespace-nowrap"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          View
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
        {!isPaid && (
          <button
            onClick={() => onDelete(inquiry)}
            className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--gray-200)] bg-white text-[var(--gray-400)] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all duration-150"
            title="Delete proposal"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }) {
  const copy = {
    all:    { h: "No proposals yet",       s: "When you submit proposals to vendors, they'll appear here." },
    active: { h: "No active proposals",    s: "Proposals you're working on will show up here." },
    offers: { h: "No offers received",     s: "When a vendor sends you an offer, it'll appear here." },
    booked: { h: "Nothing booked yet",     s: "Confirmed bookings will appear here." },
    done:   { h: "No completed proposals", s: "Past proposals and bookings will appear here." },
  };
  const { h, s } = copy[tab] ?? copy.all;
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center" style={{ background: "var(--gradient-browse)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--gray-900)] mb-1.5">{h}</h3>
      <p className="text-[13px] text-[var(--gray-400)] leading-relaxed max-w-xs mb-6">{s}</p>
      {tab === "all" && (
        <Link href="/vendors" className="btn btn-gradient text-sm" style={{ height: "40px", padding: "0 20px", fontSize: "13px" }}>
          Browse vendors
        </Link>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProposalsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null); // inquiry to delete
  const [deleting, setDeleting]   = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    listInquiries()
      .then((data) => setInquiries(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load proposals."))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteInquiry(deleteTarget.id);
      setInquiries((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message ?? "Failed to delete proposal.");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => inquiries.filter((i) => matchTab(i, activeTab)), [inquiries, activeTab]);

  const tabCounts = useMemo(() => {
    const counts = {};
    TABS.forEach(({ id }) => {
      counts[id] = id === "all" ? inquiries.length : inquiries.filter((i) => matchTab(i, id)).length;
    });
    return counts;
  }, [inquiries]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-[var(--gray-900)]">My Proposals</h1>
          {!loading && inquiries.length > 0 && (
            <p className="text-sm text-[var(--gray-400)] mt-0.5">{inquiries.length} proposal{inquiries.length !== 1 ? "s" : ""} total</p>
          )}
        </div>
        <Link
          href="/vendors"
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-sm font-semibold hover:shadow-[var(--shadow-button)] transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Proposal
        </Link>
      </div>

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

        {/* Column headers (desktop) */}
        {!loading && filtered.length > 0 && (
          <div
            className="hidden sm:grid items-center gap-x-4 px-6 py-2.5 bg-[var(--gray-50)] border-b border-[var(--gray-100)]"
            style={{ gridTemplateColumns: "40px 1fr auto auto auto" }}
          >
            <div />
            <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider">Vendor / Event</p>
            <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider">Status</p>
            <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider">Submitted</p>
            <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider">Actions</p>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div>
            <SkeletonRow /><SkeletonRow /><SkeletonRow />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div>
            {filtered.map((inq, i) => (
              <ProposalRow key={inq.id} inquiry={inq} index={i} onDelete={setDeleteTarget} />
            ))}
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
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
              This will permanently remove your proposal to <strong>{deleteTarget.vendor?.name}</strong>. This cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 text-center mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
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
