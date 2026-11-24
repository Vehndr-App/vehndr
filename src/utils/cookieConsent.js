export const COOKIE_CONSENT_KEY = "vehndr_cookie_consent";

export function getCookieConsent() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (value === "accepted" || value === "declined") return value;
  } catch {
    // Ignore private-mode / blocked storage
  }
  return null;
}

export function setCookieConsent(value) {
  if (typeof window === "undefined") return;
  if (value !== "accepted" && value !== "declined") return;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
  } catch {
    // Ignore
  }
  try {
    window.dispatchEvent(new CustomEvent("vehndr:cookie-consent", { detail: value }));
  } catch {
    // Ignore
  }
}
