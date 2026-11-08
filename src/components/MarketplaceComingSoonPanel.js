import { MARKETPLACE_COMING_SOON_BLURB, MARKETPLACE_LIVE_REGIONS_LABEL } from "../utils/vendorMarketplace";

export default function MarketplaceComingSoonPanel({ onClose, title = "Bookings coming soon" }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 p-6">
      <div className="rounded-2xl border border-[var(--violet-100)] bg-[var(--violet-50)] p-5">
        <p className="text-sm font-semibold text-[var(--violet-900)]">{title}</p>
        <p className="text-xs text-[var(--violet-700)] mt-2 leading-relaxed">{MARKETPLACE_COMING_SOON_BLURB}</p>
        <p className="text-xs text-[var(--gray-500)] mt-3">
          Marketplace is live in {MARKETPLACE_LIVE_REGIONS_LABEL} for now. You can still browse this storefront.
        </p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-auto w-full py-3 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-700)]"
        >
          Close
        </button>
      )}
    </div>
  );
}
