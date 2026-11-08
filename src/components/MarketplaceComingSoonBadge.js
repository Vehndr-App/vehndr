export default function MarketplaceComingSoonBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[var(--gray-100)] text-[var(--gray-600)] ${className}`}
    >
      Coming soon
    </span>
  );
}
