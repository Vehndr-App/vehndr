/**
 * Markets Vehndr currently serves. Used by home search "Where" dropdown.
 * Keep this list small and honest — expand when new cities go live.
 */
export const SERVICE_AREA_NOTE = "Currently serving Texas & Arizona only";

export const SERVICE_AREA_OPTIONS = [
  { value: "", label: "All areas", kind: "all" },
  { value: "texas", label: "Anywhere in Texas", kind: "state", state: "tx", match: ["texas", "tx"] },
  { value: "austin", label: "Austin", kind: "city", state: "tx", match: ["austin"] },
  { value: "dallas", label: "Dallas", kind: "city", state: "tx", match: ["dallas"] },
  { value: "houston", label: "Houston", kind: "city", state: "tx", match: ["houston"] },
  { value: "san-antonio", label: "San Antonio", kind: "city", state: "tx", match: ["san antonio", "sanantonio"] },
  { value: "fort-worth", label: "Fort Worth", kind: "city", state: "tx", match: ["fort worth", "fortworth"] },
  { value: "arizona", label: "Anywhere in Arizona", kind: "state", state: "az", match: ["arizona", "az"] },
  { value: "phoenix", label: "Phoenix", kind: "city", state: "az", match: ["phoenix"] },
  { value: "scottsdale", label: "Scottsdale", kind: "city", state: "az", match: ["scottsdale"] },
  { value: "mesa", label: "Mesa", kind: "city", state: "az", match: ["mesa"] },
  { value: "tempe", label: "Tempe", kind: "city", state: "az", match: ["tempe"] },
  { value: "tucson", label: "Tucson", kind: "city", state: "az", match: ["tucson"] },
  { value: "chandler", label: "Chandler", kind: "city", state: "az", match: ["chandler"] },
];

export function getServiceAreaOption(value) {
  return SERVICE_AREA_OPTIONS.find((opt) => opt.value === (value || "")) || SERVICE_AREA_OPTIONS[0];
}

/** True if a vendor's free-text location matches a service-area option. */
export function vendorMatchesServiceArea(vendor, areaValue) {
  if (!areaValue) return true;
  const option = getServiceAreaOption(areaValue);
  if (!option || option.kind === "all") return true;

  const haystack = [
    vendor?.location,
    vendor?.salesTaxState,
    vendor?.sales_tax_state,
    vendor?.salesTaxCity,
    vendor?.sales_tax_city,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  if (!haystack.trim()) return false;

  // State-wide: also accept state codes / names and that state's cities
  if (option.kind === "state") {
    const stateCities = SERVICE_AREA_OPTIONS.filter(
      (o) => o.state === option.state && o.kind === "city"
    ).flatMap((o) => o.match);
    const needles = [...(option.match || []), ...stateCities];
    return needles.some((n) => haystack.includes(n));
  }

  return (option.match || []).some((n) => haystack.includes(n));
}
