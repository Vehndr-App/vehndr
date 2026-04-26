"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { listInquiries } from "../../services/inquiries";
import { getMyEvents } from "../../services/events";

const STATUS_META = {
  submitted:      { label: "Proposal Sent",   color: "amber"  },
  viewed:         { label: "Viewed",          color: "blue"   },
  discussed:      { label: "In Discussion",   color: "violet" },
  actions_needed: { label: "Offer Received",  color: "coral"  },
  offer_updated:  { label: "Offer Revised",   color: "coral"  },
  scheduled:      { label: "Booked",          color: "mint"   },
  completed:      { label: "Completed",       color: "mint"   },
  expired:        { label: "Expired",         color: "gray"   },
};

const COLOR_DOT = {
  amber:  "bg-[var(--amber-500)]",
  blue:   "bg-[var(--info)]",
  violet: "bg-[var(--violet-500)]",
  coral:  "bg-[var(--coral-500)]",
  mint:   "bg-[var(--mint-500)]",
  gray:   "bg-[var(--gray-300)]",
};

function formatDate(raw) {
  if (!raw) return null;
  return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatCard({ label, value, sub, gradient, icon }) {
  return (
    <div className="bg-white rounded-2xl p-5 flex items-start gap-4" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white`} style={{ background: gradient }}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--gray-900)] leading-none mb-1">{value}</p>
        <p className="text-sm font-medium text-[var(--gray-600)]">{label}</p>
        {sub && <p className="text-xs text-[var(--gray-400)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RecentProposalRow({ inquiry }) {
  const meta = STATUS_META[inquiry.status] ?? { label: inquiry.status, color: "gray" };
  const offer = inquiry.activeOffer;
  const hasOffer = offer?.status === "pending";
  const initial = inquiry.vendor?.name?.charAt(0)?.toUpperCase() ?? "V";

  return (
    <Link
      href={`/buyer-dashboard/proposals/${inquiry.id}`}
      className="group flex items-center gap-4 px-5 py-4 hover:bg-[var(--violet-50)] transition-colors duration-150"
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ background: "var(--gradient-vendor)", boxShadow: "0 2px 8px rgba(139,92,246,0.2)" }}
      >
        {initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--gray-900)] truncate">{inquiry.vendor?.name}</p>
        {inquiry.event && (
          <p className="text-xs text-[var(--gray-400)] truncate mt-0.5">{inquiry.event.name}</p>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full ${COLOR_DOT[hasOffer ? "coral" : meta.color]}`} />
        <span className="text-xs font-medium text-[var(--gray-500)]">
          {hasOffer ? `Offer · $${(offer.totalPriceCents / 100).toLocaleString()}` : meta.label}
        </span>
      </div>

      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--gray-300)] group-hover:text-[var(--violet-400)] flex-shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

export default function BuyerDashboardHome() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    Promise.all([listInquiries(), getMyEvents()])
      .then(([inqs, evts]) => {
        setInquiries(Array.isArray(inqs) ? inqs : []);
        setEvents(Array.isArray(evts) ? evts : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const active = inquiries.filter((i) => ["submitted","viewed","discussed","actions_needed","offer_updated"].includes(i.status)).length;
  const booked = inquiries.filter((i) => i.status === "scheduled").length;
  const withOffers = inquiries.filter((i) => i.activeOffer?.status === "pending").length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-sm text-[var(--gray-400)] font-medium mb-1">{greeting()}</p>
        <h1 className="text-2xl font-display font-bold text-[var(--gray-900)]">
          {user?.name ? user.name.split(" ")[0] : "Welcome"} 👋
        </h1>
        <p className="text-sm text-[var(--gray-500)] mt-1">Here's an overview of your event planning activity.</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Total Proposals"
          value={loading ? "—" : inquiries.length}
          gradient="var(--gradient-vendor)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
          }
        />
        <StatCard
          label="Active"
          value={loading ? "—" : active}
          gradient="linear-gradient(135deg,#F59E0B,#FB923C)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        />
        <StatCard
          label="Offers Pending"
          value={loading ? "—" : withOffers}
          gradient="linear-gradient(135deg,#FF6B6B,#EE5A5A)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7m0 0a2 2 0 10-4 0m4 0a2 2 0 114 0"/>
            </svg>
          }
        />
        <StatCard
          label="Booked"
          value={loading ? "—" : booked}
          gradient="linear-gradient(135deg,#10B981,#059669)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          }
        />
      </div>

      {/* ── Two-column content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent proposals */}
        <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gray-100)]">
            <h2 className="font-semibold text-[var(--gray-900)] text-[15px]">Recent Proposals</h2>
            <Link href="/buyer-dashboard/proposals" className="text-xs font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)]">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="divide-y divide-[var(--gray-50)]">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-xl bg-[var(--gray-100)] animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-[var(--gray-100)] rounded w-1/3 animate-pulse" />
                    <div className="h-3 bg-[var(--gray-100)] rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : inquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center" style={{ background: "var(--gradient-browse)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
                </svg>
              </div>
              <p className="text-sm font-semibold text-[var(--gray-700)] mb-1">No proposals yet</p>
              <p className="text-xs text-[var(--gray-400)] mb-4">Browse vendors and submit your first proposal.</p>
              <Link href="/vendors" className="text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)]">Browse vendors →</Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--gray-50)]">
              {inquiries.slice(0, 5).map((inq) => (
                <RecentProposalRow key={inq.id} inquiry={inq} />
              ))}
            </div>
          )}
        </div>

        {/* Right panel: Quick actions + Events */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <h2 className="font-semibold text-[var(--gray-900)] text-[15px] mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/vendors" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--violet-50)] transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs" style={{ background: "var(--gradient-vendor)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <span className="text-sm font-medium text-[var(--gray-700)] group-hover:text-[var(--violet-700)]">Browse Vendors</span>
              </Link>
              <Link href="/buyer-dashboard/events" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--violet-50)] transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0EA5E9,#14B8A6)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <span className="text-sm font-medium text-[var(--gray-700)] group-hover:text-[var(--violet-700)]">My Events</span>
              </Link>
              <Link href="/buyer-dashboard/proposals" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--violet-50)] transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F59E0B,#FB923C)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                </div>
                <span className="text-sm font-medium text-[var(--gray-700)] group-hover:text-[var(--violet-700)]">All Proposals</span>
              </Link>
            </div>
          </div>

          {/* My events */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gray-100)]">
              <h2 className="font-semibold text-[var(--gray-900)] text-[15px]">My Events</h2>
              <Link href="/buyer-dashboard/events" className="text-xs font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)]">View all →</Link>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[1,2].map(i => <div key={i} className="h-10 bg-[var(--gray-100)] rounded-xl animate-pulse" />)}
              </div>
            ) : events.length === 0 ? (
              <div className="px-5 py-6 text-center">
                <p className="text-xs text-[var(--gray-400)]">No events yet. Create one when submitting a proposal.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--gray-50)]">
                {events.slice(0, 3).map((evt) => (
                  <div key={evt.id} className="px-5 py-3.5">
                    <p className="text-sm font-medium text-[var(--gray-800)] truncate">{evt.name}</p>
                    {evt.startDate && (
                      <p className="text-xs text-[var(--gray-400)] mt-0.5">{formatDate(evt.startDate)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
