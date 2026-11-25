/** product = shop item, service = shop (duration/slots), package = book-for-event */

export const LISTING_TYPES = ["product", "service", "package"];

export function getListingType(item) {
  const raw = (item?.listingType || item?.listing_type || "").toString().toLowerCase();
  if (LISTING_TYPES.includes(raw)) return raw;
  // Legacy API: only isService existed — those are shop services, not packages
  if (item?.isService === true || item?.is_service === true) return "service";
  return "product";
}

export function isPackageListing(item) {
  return getListingType(item) === "package";
}

export function isServiceListing(item) {
  return getListingType(item) === "service";
}

export function isShopListing(item) {
  return getListingType(item) !== "package";
}
