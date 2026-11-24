import { formatVendorRating, vendorHasReviews } from "../utils/vendorRating";

export default function VendorRatingBadge({
  vendor,
  className = "absolute bottom-2 left-2",
}) {
  const hasReviews = vendorHasReviews(vendor);
  const ratingLabel = formatVendorRating(vendor);

  return (
    <div
      className={`${className} flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-[var(--gray-900)]`}
    >
      {hasReviews && ratingLabel ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--amber-500)" stroke="none" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {ratingLabel}
        </>
      ) : (
        <span>New</span>
      )}
    </div>
  );
}
