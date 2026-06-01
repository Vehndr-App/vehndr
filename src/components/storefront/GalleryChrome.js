"use client";

import Link from "next/link";
import FavoriteButton from "../FavoriteButton";

export function ShareButton({ onShare, variant = "dark" }) {
  const btnClass =
    variant === "dark"
      ? "tap-scale w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
      : "tap-scale w-10 h-10 flex items-center justify-center rounded-full text-[var(--gray-900)] hover:bg-[var(--gray-100)] transition-colors";

  return (
    <button type="button" onClick={onShare} className={btnClass} aria-label="Share">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    </button>
  );
}

export function GalleryTopChrome({
  vendorId,
  onShare,
  variant = "dark",
  backHref = "/vendors",
  onBack,
}) {
  const isDark = variant === "dark";

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pointer-events-none">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className={`pointer-events-auto w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            isDark
              ? "bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
              : "hover:bg-[var(--gray-100)] text-[var(--gray-900)]"
          }`}
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      ) : (
        <Link
          href={backHref}
          className={`pointer-events-auto w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            isDark
              ? "bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
              : "hover:bg-[var(--gray-100)] text-[var(--gray-900)]"
          }`}
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      )}
      <div className="flex items-center gap-2 pointer-events-auto">
        <ShareButton onShare={onShare} variant={variant} />
        {vendorId && <FavoriteButton vendorId={vendorId} size="large" />}
      </div>
    </div>
  );
}
