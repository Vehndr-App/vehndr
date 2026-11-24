/**
 * Vendors default to rating 0.0 in the API before anyone reviews them.
 * Treat that as "unreviewed" so we don't show a fake low score.
 */
export function vendorHasReviews(vendor) {
  const count = Number(vendor?.ratingsCount ?? vendor?.ratings_count ?? 0);
  if (Number.isFinite(count) && count > 0) return true;
  const rating = Number(vendor?.rating);
  return Number.isFinite(rating) && rating > 0;
}

export function formatVendorRating(vendor) {
  if (!vendorHasReviews(vendor)) return null;
  const rating = Number(vendor?.rating);
  if (!Number.isFinite(rating)) return null;
  return rating % 1 === 0 ? rating.toFixed(1) : String(rating);
}
