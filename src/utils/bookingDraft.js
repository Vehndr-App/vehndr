const BOOKING_DRAFT_KEY = "vehndr_booking_draft";

export function saveBookingDraft(draft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore quota / private mode failures
  }
}

export function loadBookingDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(BOOKING_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearBookingDraft() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(BOOKING_DRAFT_KEY);
  } catch {
    // Ignore
  }
}

export function hasAuthToken() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage?.getItem("vehndr_token"));
}
