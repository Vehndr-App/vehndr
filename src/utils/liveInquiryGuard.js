const STORAGE_KEY = "vehndr_allow_live_inquiry_sends";

/**
 * Local Next preview rewrites /api to the production Heroku API by default,
 * so createInquiry can email real vendors even though the URL says localhost.
 */
export function isLocalPreviewTalkingToLiveApi() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return false;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  // Empty or localhost API base → Next rewrites hit production (see next.config.mjs)
  return !apiUrl || /localhost|127\.0\.0\.1/.test(apiUrl);
}

export function areLiveInquirySendsAllowed() {
  if (!isLocalPreviewTalkingToLiveApi()) return true;
  if (process.env.NEXT_PUBLIC_ALLOW_LIVE_INQUIRY_SENDS === "true") return true;
  try {
    return window.sessionStorage?.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function confirmAllowLiveInquirySends() {
  if (typeof window === "undefined") return false;
  const ok = window.confirm(
    "Your preview is connected to the LIVE Vehndr site.\n\n" +
      "If you send a request, real vendors can get a real email.\n\n" +
      "Allow live sends for this browser tab only?"
  );
  if (ok) {
    try {
      window.sessionStorage?.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }
  return ok;
}

export function revokeLiveInquirySends() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export class LiveInquiryBlockedError extends Error {
  constructor() {
    super(
      "Sending is blocked in preview so real vendors are not emailed. Use the yellow bar to allow live sends for this tab, or test Send only on vehndr.com when you mean it."
    );
    this.code = "LIVE_INQUIRY_BLOCKED";
    this.name = "LiveInquiryBlockedError";
  }
}
