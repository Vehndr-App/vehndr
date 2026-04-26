"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AuthGate from "../../../components/AuthGate";
import { listVendorInquiries } from "../../../services/inquiries";

const STATUS_LABELS = {
  submitted: "New",
  viewed: "Viewed",
  discussed: "Chatting",
  actions_needed: "Awaiting Response",
  offer_updated: "Offer Revised",
  scheduled: "Booked",
  completed: "Completed",
  expired: "Expired",
};

const STATUS_COLORS = {
  submitted: "bg-[var(--amber-50)] text-[var(--amber-700)]",
  viewed: "bg-[var(--info-50)] text-[var(--info)]",
  discussed: "bg-[var(--violet-100)] text-[var(--violet-700)]",
  actions_needed: "bg-[var(--coral-50)] text-[var(--coral-600)]",
  offer_updated: "bg-[var(--violet-100)] text-[var(--violet-700)]",
  scheduled: "bg-[var(--mint-50)] text-[var(--mint-600)]",
  completed: "bg-[var(--mint-100)] text-[var(--mint-700)]",
  expired: "bg-[var(--gray-100)] text-[var(--gray-500)]",
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPrice(cents) {
  if (!cents) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function InquiryRow({ inquiry }) {
  const { customer, event, status, lastActivityAt, activeOffer, lastOffer, budgetCents } = inquiry;
  const customerInitial = customer?.name?.charAt(0)?.toUpperCase() ?? "?";
  const needsOffer = status === "submitted" || status === "viewed" || status === "discussed";
  const offerAccepted = activeOffer?.status === "accepted";
  const offerDeclined = !activeOffer && lastOffer?.status === "declined";

  return (
    <Link
      href={`/dashboard/inquiries/${inquiry.id}`}
      className={`flex items-center gap-3 px-4 py-4 bg-white hover:bg-[var(--gray-50)] active:bg-[var(--gray-100)] transition-colors ${offerDeclined ? "border-l-4 border-red-400" : ""}`}
    >
      {/* Customer avatar */}
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
        {customerInitial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="font-semibold text-[var(--gray-900)] text-sm truncate">
            {customer?.name ?? "Customer"}
          </p>
          <span className="text-[11px] text-[var(--gray-400)] flex-shrink-0">
            {formatRelativeTime(lastActivityAt)}
          </span>
        </div>

        {event && (
          <p className="text-xs text-[var(--gray-500)] truncate mb-1">
            {event.name}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {offerDeclined ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
              Offer Declined · Send new offer
            </span>
          ) : (
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? STATUS_COLORS.submitted}`}>
              {STATUS_LABELS[status] ?? status}
            </span>
          )}

          {needsOffer && budgetCents > 0 && (
            <span className="text-[10px] text-[var(--gray-400)]">
              Budget: {formatPrice(budgetCents)}
            </span>
          )}

          {activeOffer && !offerAccepted && (
            <span className="text-[10px] font-medium text-[var(--violet-600)]">
              Offer sent · {formatPrice(activeOffer.totalPriceCents)}
            </span>
          )}

          {offerAccepted && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--mint-50)] text-[var(--mint-600)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--mint-500)] animate-pulse" />
              Accepted · awaiting payment
            </span>
          )}
        </div>
      </div>

      {/* New badge for unactioned inquiries */}
      {status === "submitted" && (
        <div className="w-2 h-2 rounded-full bg-[var(--violet-500)] flex-shrink-0" />
      )}

      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--gray-300)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-shrink-0"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-4 bg-white">
      <div className="w-11 h-11 rounded-full bg-[var(--gray-100)] animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-[var(--gray-100)] rounded animate-pulse w-2/5" />
        <div className="h-3 bg-[var(--gray-100)] rounded animate-pulse w-1/3" />
      </div>
    </div>
  );
}

export default function VendorInquiriesPage() {
  return (
    <AuthGate>
      <VendorInquiriesInner />
    </AuthGate>
  );
}

function VendorInquiriesInner() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listVendorInquiries()
      .then(setInquiries)
      .catch(() => setError("Failed to load inquiries."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--gray-50)] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-100)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
          <Link
            href="/dashboard"
            className="text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)] flex items-center gap-1 mb-3"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dashboard
          </Link>
          <h1 className="text-xl font-bold text-[var(--gray-900)]">Inquiries</h1>
          <p className="text-sm text-[var(--gray-500)] mt-1">
            Customers interested in booking you.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="bg-white mt-2 divide-y divide-[var(--gray-100)]">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4">
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="mx-4 mt-4 text-center bg-white border border-[var(--gray-100)] rounded-[var(--radius-xl)] p-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--violet-100)] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--gray-900)] mb-1">No inquiries yet</h2>
            <p className="text-sm text-[var(--gray-500)]">
              When customers reach out, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white mt-2 divide-y divide-[var(--gray-100)]">
            {inquiries.map((inquiry) => (
              <InquiryRow key={inquiry.id} inquiry={inquiry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
