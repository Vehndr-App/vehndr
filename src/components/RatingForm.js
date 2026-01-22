"use client";

import { useState } from "react";
import { api } from "../services/api";
import StarRating from "./StarRating";

export default function RatingForm({
  orderId,
  vendorName,
  onSuccess,
  onCancel,
  guestEmail,
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (stars === 0) {
      setError("Please select a rating");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body = {
        rating: {
          stars,
          comment: comment.trim() || null,
        },
      };

      // Add guest email if provided (for guest orders)
      if (guestEmail) {
        body.guest_email = guestEmail;
      }

      await api(`/api/ratings?order_id=${orderId}`, {
        method: "POST",
        body,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Failed to submit rating:", err);
      setError(err.details?.errors?.join(", ") || err.message || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-1">
          Rate Your Experience
        </h3>
        <p className="text-sm text-[var(--gray-600)]">
          How was your experience with {vendorName}?
        </p>
      </div>

      <div className="flex justify-center py-2">
        <StarRating value={stars} onChange={setStars} size="lg" />
      </div>

      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-[var(--gray-700)] mb-1.5"
        >
          Comment (optional)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          rows={3}
          className="input w-full resize-none"
          maxLength={500}
        />
        <p className="text-xs text-[var(--gray-400)] mt-1">
          {comment.length}/500 characters
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="btn btn-outline flex-1"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || stars === 0}
          className="btn btn-primary flex-1 disabled:opacity-50"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
              Submitting...
            </span>
          ) : (
            "Submit Rating"
          )}
        </button>
      </div>
    </form>
  );
}
