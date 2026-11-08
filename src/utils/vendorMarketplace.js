import { US_STATE_OPTIONS } from "./salesTaxRates";

export const MARKETPLACE_LIVE_REGIONS_LABEL = "Texas & Arizona";

/** Best-effort US state code from a location string (e.g. "Los Angeles County, California"). */
export function parseUsStateCodeFromLocation(raw) {
  if (!raw || typeof raw !== "string") return null;
  const text = raw.trim();
  const abbrMatch = text.match(/,\s*([A-Za-z]{2})(?:\s|,|$)/);
  if (abbrMatch) {
    const code = abbrMatch[1].toLowerCase();
    if (US_STATE_OPTIONS.some((o) => o.value === code)) return code;
  }
  const lower = text.toLowerCase();
  for (const opt of US_STATE_OPTIONS) {
    if (lower.includes(opt.label.toLowerCase())) return opt.value;
  }
  return null;
}

export function stateLabelForCode(stateCode) {
  return US_STATE_OPTIONS.find((o) => o.value === (stateCode || "").toLowerCase())?.label ?? null;
}

export const MARKETPLACE_COMING_SOON_BLURB =
  `Bookings and messaging are coming soon outside ${MARKETPLACE_LIVE_REGIONS_LABEL}.`;

export function isVendorMarketplaceBookable(vendor) {
  if (vendor?.marketplaceBookable === true) return true;
  if (vendor?.marketplaceBookable === false) return false;
  const state = (vendor?.salesTaxState || "tx").toLowerCase();
  return state === "tx" || state === "az";
}
