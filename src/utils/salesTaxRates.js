/** Texas combined rate used today for TX vendors (8.25%). */
export const TEXAS_SALES_TAX_RATE = 0.0825;

export const DEFAULT_AZ_CITY = "phoenix";

/** US states + DC for vendor home jurisdiction (rates come from Stripe Tax at checkout). */
export const US_STATE_OPTIONS = [
  { value: "al", label: "Alabama" },
  { value: "ak", label: "Alaska" },
  { value: "az", label: "Arizona" },
  { value: "ar", label: "Arkansas" },
  { value: "ca", label: "California" },
  { value: "co", label: "Colorado" },
  { value: "ct", label: "Connecticut" },
  { value: "de", label: "Delaware" },
  { value: "dc", label: "District of Columbia" },
  { value: "fl", label: "Florida" },
  { value: "ga", label: "Georgia" },
  { value: "hi", label: "Hawaii" },
  { value: "id", label: "Idaho" },
  { value: "il", label: "Illinois" },
  { value: "in", label: "Indiana" },
  { value: "ia", label: "Iowa" },
  { value: "ks", label: "Kansas" },
  { value: "ky", label: "Kentucky" },
  { value: "la", label: "Louisiana" },
  { value: "me", label: "Maine" },
  { value: "md", label: "Maryland" },
  { value: "ma", label: "Massachusetts" },
  { value: "mi", label: "Michigan" },
  { value: "mn", label: "Minnesota" },
  { value: "ms", label: "Mississippi" },
  { value: "mo", label: "Missouri" },
  { value: "mt", label: "Montana" },
  { value: "ne", label: "Nebraska" },
  { value: "nv", label: "Nevada" },
  { value: "nh", label: "New Hampshire" },
  { value: "nj", label: "New Jersey" },
  { value: "nm", label: "New Mexico" },
  { value: "ny", label: "New York" },
  { value: "nc", label: "North Carolina" },
  { value: "nd", label: "North Dakota" },
  { value: "oh", label: "Ohio" },
  { value: "ok", label: "Oklahoma" },
  { value: "or", label: "Oregon" },
  { value: "pa", label: "Pennsylvania" },
  { value: "ri", label: "Rhode Island" },
  { value: "sc", label: "South Carolina" },
  { value: "sd", label: "South Dakota" },
  { value: "tn", label: "Tennessee" },
  { value: "tx", label: "Texas" },
  { value: "ut", label: "Utah" },
  { value: "vt", label: "Vermont" },
  { value: "va", label: "Virginia" },
  { value: "wa", label: "Washington" },
  { value: "wv", label: "West Virginia" },
  { value: "wi", label: "Wisconsin" },
  { value: "wy", label: "Wyoming" },
];

// Arizona retail TPT combined rates (Aug 1, 2025, AZ Tax Research Foundation).
export const ARIZONA_CITY_RATES = {
  phoenix: 0.091,
  scottsdale: 0.08,
  mesa: 0.083,
  tempe: 0.081,
  chandler: 0.078,
  tucson: 0.087,
  peoria: 0.081,
  queen_creek: 0.0855,
  surprise: 0.091,
  gilbert: 0.0855,
  glendale: 0.091,
  flagstaff: 0.0928,
};

export const ARIZONA_CITY_OPTIONS = [
  { value: "phoenix", label: "Phoenix (9.1%)" },
  { value: "scottsdale", label: "Scottsdale (8%)" },
  { value: "mesa", label: "Mesa (8.3%)" },
  { value: "tempe", label: "Tempe (8.1%)" },
  { value: "chandler", label: "Chandler (7.8%)" },
  { value: "tucson", label: "Tucson (8.7%)" },
  { value: "peoria", label: "Peoria (8.1%)" },
  { value: "queen_creek", label: "Queen Creek (8.55%)" },
  { value: "surprise", label: "Surprise (9.1%)" },
  { value: "gilbert", label: "Gilbert (8.55%)" },
  { value: "glendale", label: "Glendale (9.1%)" },
  { value: "flagstaff", label: "Flagstaff (9.28%)" },
];

export function normalizeAzCity(city) {
  return String(city || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function salesTaxRateForVendor(vendor) {
  if (vendor?.salesTaxRate != null && Number.isFinite(Number(vendor.salesTaxRate))) {
    return Number(vendor.salesTaxRate);
  }

  const state = (vendor?.salesTaxState || "tx").toLowerCase();
  if (state === "az") {
    const city = normalizeAzCity(vendor?.salesTaxCity || DEFAULT_AZ_CITY);
    return ARIZONA_CITY_RATES[city] ?? ARIZONA_CITY_RATES[DEFAULT_AZ_CITY];
  }

  return TEXAS_SALES_TAX_RATE;
}

export function formatTaxPercent(rate) {
  const pct = Math.round(rate * 10000) / 100;
  const text = pct % 1 === 0 ? String(pct) : String(pct).replace(/0+$/, "").replace(/\.$/, "");
  return `${text}%`;
}

export function formatSalesTaxLabel(vendor, { taxSource, taxCents, taxableBaseCents } = {}) {
  if (vendor?.collectTax === false) return "Tax";

  let rate = salesTaxRateForVendor(vendor);
  if (taxCents > 0 && taxableBaseCents > 0) {
    rate = taxCents / taxableBaseCents;
  }
  const pct = formatTaxPercent(rate);

  if (taxSource === "stripe") return `Sales tax (${pct})`;
  return `Tax (${pct} est.)`;
}

export function vendorTaxOptions(vendor) {
  const collectTax = vendor?.collectTax !== false;
  const taxRate = salesTaxRateForVendor(vendor);
  return { collectTax, taxRate };
}

export function taxVendorFromInquiry(inquiry) {
  return {
    ...(inquiry?.vendor || {}),
    collectTax: inquiry?.vendor?.collectTax ?? inquiry?.collectTax,
    salesTaxState: inquiry?.vendor?.salesTaxState ?? inquiry?.salesTaxState,
    salesTaxCity: inquiry?.vendor?.salesTaxCity ?? inquiry?.salesTaxCity,
    salesTaxRate: inquiry?.vendor?.salesTaxRate ?? inquiry?.salesTaxRate,
  };
}
