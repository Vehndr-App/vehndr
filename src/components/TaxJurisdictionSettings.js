"use client";

import { ARIZONA_CITY_OPTIONS, US_STATE_OPTIONS } from "../utils/salesTaxRates";
import {
  isVendorMarketplaceBookable,
  MARKETPLACE_LIVE_REGIONS_LABEL,
  stateLabelForCode,
} from "../utils/vendorMarketplace";

export default function TaxJurisdictionSettings({
  salesTaxState = "tx",
  salesTaxCity = "phoenix",
  onSalesTaxStateChange,
  onSalesTaxCityChange,
  disabled = false,
}) {
  const isArizona = salesTaxState === "az";
  const bookable = isVendorMarketplaceBookable({ salesTaxState });
  const stateLabel = stateLabelForCode(salesTaxState) ?? "your state";

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
          Business home state
        </label>
        <select
          value={salesTaxState}
          disabled={disabled}
          onChange={(e) => onSalesTaxStateChange?.(e.target.value)}
          className="input w-full"
        >
          {US_STATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-[var(--gray-500)] mt-1">
          {bookable
            ? "Where your business is based. At checkout, tax uses the event address when available."
            : "Where your business is based. This must match your location above."}
        </p>
        {!bookable && (
          <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 leading-relaxed">
            <strong>{stateLabel}</strong> isn&apos;t open for bookings or messages yet (live in{" "}
            {MARKETPLACE_LIVE_REGIONS_LABEL}). You&apos;ll still show in search as &quot;Coming soon.&quot; We&apos;ll
            notify you when Vehndr is available in {stateLabel}.
          </div>
        )}
      </div>

      {isArizona && (
        <div>
          <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
            Arizona city (estimate fallback)
          </label>
          <select
            value={salesTaxCity || "phoenix"}
            disabled={disabled}
            onChange={(e) => onSalesTaxCityChange?.(e.target.value)}
            className="input w-full"
          >
            {ARIZONA_CITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--gray-500)] mt-1">
            Used only if Stripe Tax cannot run (e.g. missing event address).
          </p>
        </div>
      )}
    </div>
  );
}
