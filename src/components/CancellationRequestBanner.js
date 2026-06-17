"use client";

import { useState } from "react";
import {
  respondMarketplaceCancellation,
  withdrawMarketplaceCancellation,
} from "../services/checkout";

const fmt$ = (cents) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Banner shown on a booked proposal while a cancellation request is in flight, or after
// one was declined. Either party can land here:
//   - the REQUESTER sees an "awaiting response" state with a Withdraw action
//   - the OTHER party sees the request details with Accept / Decline actions
//
// Props:
//   inquiry, booking — the proposal + its marketplaceBooking summary
//   role: "vendor" | "coordinator" — the current viewer
//   onChange(res) — called after a successful respond/withdraw so the page can refresh
export default function CancellationRequestBanner({ inquiry, booking, role, onChange }) {
  const [submitting, setSubmitting] = useState(null); // "accept" | "decline" | "withdraw"
  const [error, setError] = useState(null);

  if (!booking) return null;

  const state = booking.cancellationState;
  const req = booking.cancellationRequest;

  // Nothing in flight and not declined → render nothing.
  if (state !== "requested" && state !== "declined") return null;

  const ids = { inquiryId: inquiry.id, bookingId: booking.id };

  async function run(action, fn) {
    setError(null);
    setSubmitting(action);
    try {
      const res = await fn();
      onChange?.(res);
    } catch (err) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      setSubmitting(null);
    }
  }

  // ── Declined: subtle note, no actions ──
  if (state === "declined") {
    return (
      <div className="rounded-2xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3 flex items-start gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-sm text-[var(--gray-600)]">
          A cancellation request was declined. This booking is still active.
        </p>
      </div>
    );
  }

  // ── Requested ──
  const requesterRole = req?.requestedByRole;
  const isRequester = role === requesterRole;
  const otherParty = role === "vendor" ? "the event coordinator" : "the vendor";
  const proposed = req?.proposedRefundCents;

  if (isRequester) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Cancellation request sent.</p>
            <p className="mt-0.5">Waiting for {otherParty} to accept or decline.{proposed > 0 ? ` You proposed a ${fmt$(proposed)} refund.` : ""}</p>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <button
          onClick={() => run("withdraw", () => withdrawMarketplaceCancellation(ids))}
          disabled={!!submitting}
          className="mt-3 w-full sm:w-auto px-4 py-2 rounded-xl border border-amber-300 text-amber-800 text-sm font-semibold hover:bg-amber-100 transition-colors disabled:opacity-40"
        >
          {submitting === "withdraw" ? "Withdrawing…" : "Withdraw request"}
        </button>
      </div>
    );
  }

  // Responder view
  const actor = requesterRole === "vendor" ? "The vendor" : "The event coordinator";
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="text-sm text-amber-800">
          <p className="font-semibold">{actor} requested to cancel this booking.</p>
          {proposed > 0 && (
            <p className="mt-0.5">They&apos;ve proposed a refund of <strong>{fmt$(proposed)}</strong>.</p>
          )}
          {req?.reason && (
            <p className="mt-1 text-amber-700"><span className="font-medium">Reason:</span> {req.reason}</p>
          )}
          <p className="mt-1 text-amber-700">No refund is issued unless you accept.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <div className="flex gap-3 mt-3">
        <button
          onClick={() => run("decline", () => respondMarketplaceCancellation({ ...ids, decision: "decline" }))}
          disabled={!!submitting}
          className="flex-1 px-4 py-2 rounded-xl border border-[var(--gray-200)] bg-white text-sm font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors disabled:opacity-40"
        >
          {submitting === "decline" ? "Declining…" : "Decline"}
        </button>
        <button
          onClick={() => run("accept", () => respondMarketplaceCancellation({ ...ids, decision: "accept" }))}
          disabled={!!submitting}
          className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
        >
          {submitting === "accept" ? "Cancelling…" : (proposed > 0 ? "Accept & refund" : "Accept & cancel")}
        </button>
      </div>
    </div>
  );
}
