"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import { listInquiries, deleteInquiry } from "../../../services/inquiries";

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

// ─── Fee helpers ──────────────────────────────────────────────────────────────

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

  const tip   = inquiry.tipCents ?? 0;
  const color = hasOffer ? "coral" : isBooked ? "mint" : meta.color;
  const price = (hasOffer || isBooked) && offer?.totalPriceCents
    ? formatPrice(feeGrossTotal(offer.totalPriceCents, tip))
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
        {/* Status accent bar */}
        <div className={`h-[3px] w-full ${ACCENT_BAR[color]}`} />

        <div className="p-5">
          {/* Main row */}
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

          {/* Footer row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--gray-50)]">
            <span className="text-[11px] text-[var(--gray-400)] tabular-nums">
              {formatDate(inquiry.createdAt)}
            </span>
            <div className="flex items-center gap-2">
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

      {/* Delete — desktop hover only, absolutely positioned so it doesn't affect layout */}
      {!isPaid && (
        <button
          onClick={(e) => { e.preventDefault(); onDelete(inquiry); }}
          className="absolute top-5 right-5 z-10 opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-white border border-[var(--gray-200)] flex items-center justify-center text-[var(--gray-400)] hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
          title="Delete proposal"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      )}
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
    <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center" style={{ background: "var(--gradient-browse)" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
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
  const [deleteTarget, setDeleteTarget] = useState(null);
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

  const filtered = useMemo(
    () => inquiries.filter((i) => matchTab(i, activeTab)),
    [inquiries, activeTab]
  );

  const tabCounts = useMemo(() => {
    const counts = {};
    TABS.forEach(({ id }) => {
      counts[id] = id === "all" ? inquiries.length : inquiries.filter((i) => matchTab(i, id)).length;
    });
    return counts;
  }, [inquiries]);

  return (
    <div>

      {/* ── Sticky header ── */}
      <div className="sticky top-14 z-20 bg-white border-b border-[var(--gray-100)]">
        <div className="max-w-3xl mx-auto px-4">

          {/* Title row */}
          <div className="flex items-center justify-between pt-3 pb-2 sm:pt-5 sm:pb-3">
            <div>
              <h1 className="text-xl font-display font-bold text-[var(--gray-900)] leading-none">
                My Proposals
              </h1>
              {/* Always rendered so sticky header height never changes after load */}
              <p className={`text-xs text-[var(--gray-400)] mt-1 ${!loading && inquiries.length > 0 ? "visible" : "invisible"}`}>
                {inquiries.length || 0} proposal{(inquiries.length || 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/vendors"
              className="flex items-center justify-center h-9 w-9 sm:w-auto sm:gap-1.5 sm:px-4 rounded-xl bg-gradient-to-r from-[var(--violet-600)] to-[var(--magenta-600)] text-white text-sm font-semibold hover:shadow-[var(--shadow-button)] transition-all flex-shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span className="hidden sm:inline">New Proposal</span>
            </Link>
          </div>

          {/* Filter tabs */}
          <div className="flex overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label }) => {
              const count  = tabCounts[id] ?? 0;
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                    active ? "text-[var(--violet-600)]" : "text-[var(--gray-400)] hover:text-[var(--gray-700)]"
                  }`}
                >
                  {label}
                  {/* Always rendered so tab button widths never change after load */}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    count > 0 && !loading
                      ? active
                        ? "bg-[var(--violet-100)] text-[var(--violet-700)]"
                        : "bg-[var(--gray-100)] text-[var(--gray-400)]"
                      : "invisible"
                  }`}>
                    {count || 0}
                  </span>
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-[var(--violet-600)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Card list ── */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3 pb-24">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : error ? (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          filtered.map((inq) => (
            <ProposalCard key={inq.id} inquiry={inq} onDelete={setDeleteTarget} />
          ))
        )}
      </div>

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-[var(--gray-900)] text-center mb-1">Delete this proposal?</h2>
            <p className="text-sm text-[var(--gray-500)] text-center mb-5">
              This will permanently remove your proposal to{" "}
              <strong>{deleteTarget.vendor?.name}</strong>. This cannot be undone.
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
