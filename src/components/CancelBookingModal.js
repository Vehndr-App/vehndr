"use client";

import { useState } from "react";
import { cancelMarketplaceBooking } from "../services/checkout";
import { cancelInquiry } from "../services/inquiries";

// Shared cancel + refund confirmation modal for proposals / marketplace bookings.
// Either party (coordinator or vendor) can cancel.
//   role: "coordinator" | "vendor" — who is doing the cancelling
//   onCancelled(res) — called after a successful cancel (res.booking / res.inquiry, res.warning)
// When a booking exists it routes through the refund-aware booking cancel; an unpaid
// proposal with no booking is cancelled via the lightweight inquiry endpoint.
export default function CancelBookingModal({ inquiry, booking, role, onClose, onCancelled }) {
  const [reason, setReason] = useState("");
  const [refundDollars, setRefundDollars] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const hasBooking = !!booking;
  const noun = hasBooking ? "booking" : "proposal";
  const proposalType = inquiry?.activeOffer?.proposalType ?? inquiry?.lastOffer?.proposalType ?? "cash";
  const isPaid = booking?.paymentStatus === "deposit_paid" || booking?.paymentStatus === "fully_paid";
  const hasRefund = isPaid && proposalType !== "both";

  const refundTarget =
    proposalType === "cash" ? "the event coordinator"
    : proposalType === "product" ? "the vendor"
    : null;

  // The payer forfeits a non-refundable deposit when they cancel their own booking.
  const isPayer =
    (proposalType === "cash" && role === "coordinator") ||
    (proposalType === "product" && role === "vendor");

  async function handleConfirm() {
    setError(null);
    let amountCents;
    if (hasRefund && refundDollars.trim() !== "") {
      const parsed = Number.parseFloat(refundDollars);
      if (Number.isNaN(parsed) || parsed < 0) {
        setError("Enter a valid refund amount.");
        return;
      }
      amountCents = Math.round(parsed * 100);
    }

    setSubmitting(true);
    try {
      const res = hasBooking
        ? await cancelMarketplaceBooking({
            inquiryId: inquiry.id,
            bookingId: booking.id,
            amountCents,
            reason: reason.trim() || undefined,
          })
        : await cancelInquiry(inquiry.id, { reason: reason.trim() || undefined });
      onCancelled?.(res);
    } catch (err) {
      setError(err?.message ?? `Failed to cancel the ${noun}.`);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <h2 className="text-base font-bold text-[var(--gray-900)] text-center mb-1">Cancel this {noun}?</h2>
        <p className="text-sm text-[var(--gray-500)] text-center mb-4">
          {hasRefund
            ? <>This cancels the booking and refunds <strong>{refundTarget}</strong>.</>
            : <>This cancels the {noun} and notifies the other party. No payment was collected, so there is nothing to refund.</>}
        </p>

        {hasRefund && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[var(--gray-700)] mb-1">
              Refund amount <span className="font-normal text-[var(--gray-400)]">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundDollars}
                onChange={(e) => setRefundDollars(e.target.value)}
                placeholder="Full eligible amount"
                className="w-full h-10 pl-7 pr-3 rounded-xl border border-[var(--gray-200)] text-sm outline-none focus:border-[var(--violet-500)]"
              />
            </div>
            <p className="text-[11px] text-[var(--gray-400)] mt-1 leading-snug">
              Leave blank to refund the full eligible amount.
              {isPayer && " A non-refundable deposit, if any, will be withheld."}
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-[var(--gray-700)] mb-1">
            Reason <span className="font-normal text-[var(--gray-400)]">(optional)</span>
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Let the other party know why…"
            className="w-full rounded-xl border border-[var(--gray-200)] px-3 py-2 text-sm outline-none focus:border-[var(--violet-500)] resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600 text-center mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors disabled:opacity-40"
          >
            Keep {noun}
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            {submitting ? "Cancelling…" : `Cancel ${noun}`}
          </button>
        </div>
      </div>
    </div>
  );
}
