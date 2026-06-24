export const MIN_OFFER_EXPIRY_HOURS = 12;

const MIN_OFFER_EXPIRY_MS = MIN_OFFER_EXPIRY_HOURS * 60 * 60 * 1000;

export const OFFER_EXPIRY_ERROR = `Offer expiry must be at least ${MIN_OFFER_EXPIRY_HOURS} hours from now.`;

export function toDatetimeLocalValue(value) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function minimumOfferExpiryDate(now = new Date()) {
  const exactMinimum = now.getTime() + MIN_OFFER_EXPIRY_MS;
  const minimum = new Date(exactMinimum);
  minimum.setSeconds(0, 0);

  if (minimum.getTime() < exactMinimum) {
    minimum.setMinutes(minimum.getMinutes() + 1);
  }

  return minimum;
}

export function minimumOfferExpiryValue(now = new Date()) {
  return toDatetimeLocalValue(minimumOfferExpiryDate(now));
}

export function offerExpiryTooSoon(value, now = new Date()) {
  if (!value) return false;

  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime())) return true;

  return expiresAt.getTime() < now.getTime() + MIN_OFFER_EXPIRY_MS;
}

export function offerExpiryToIso(value) {
  if (!value) return null;

  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime())) return null;

  return expiresAt.toISOString();
}
