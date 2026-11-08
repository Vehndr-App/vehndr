import { US_STATE_OPTIONS } from "./salesTaxRates";

const STATE_LABEL_TO_CODE = Object.fromEntries(
  US_STATE_OPTIONS.map((o) => [o.label.toLowerCase(), o.value])
);

export function parseEventTaxLocation({ streetAddress, location } = {}) {
  const street = (streetAddress || "").trim();
  let city = "";
  let state = "tx";
  let postalCode = "";

  const raw = (location || "").trim();
  if (!raw) {
    return { streetAddress: street, eventCity: city, eventState: state, eventPostalCode: postalCode };
  }

  const zipMatch = raw.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zipMatch) postalCode = zipMatch[1];
  const withoutZip = zipMatch ? raw.replace(zipMatch[0], "").trim() : raw;
  const parts = withoutZip.split(",").map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const stateToken = parts[parts.length - 1];
    const up = stateToken.toUpperCase();
    if (up.length === 2 && US_STATE_OPTIONS.some((o) => o.value === up.toLowerCase())) {
      state = up.toLowerCase();
      city = parts[parts.length - 2];
    } else if (STATE_LABEL_TO_CODE[stateToken.toLowerCase()]) {
      state = STATE_LABEL_TO_CODE[stateToken.toLowerCase()];
      city = parts.length >= 2 ? parts[parts.length - 2] : "";
    }
  }

  return { streetAddress: street, eventCity: city, eventState: state, eventPostalCode: postalCode };
}

export function formatEventTaxLocation({ eventCity, eventState, eventPostalCode }) {
  const city = (eventCity || "").trim();
  const st = (eventState || "tx").toUpperCase();
  const zip = (eventPostalCode || "").trim();
  return `${city}, ${st} ${zip}`.trim();
}

export function validateEventTaxAddress({ streetAddress, eventCity, eventState, eventPostalCode }) {
  if (!streetAddress?.trim()) return "Please enter the street address.";
  if (!eventCity?.trim()) return "Please enter the city.";
  if (!eventState) return "Please select the state.";
  if (!/^\d{5}(-\d{4})?$/.test((eventPostalCode || "").trim())) {
    return "Please enter a valid 5-digit ZIP code.";
  }
  return null;
}
