"use client";

import SmartImage from "../SmartImage";
import FavoriteButton from "../FavoriteButton";

export default function StorefrontPhotoTour({
  images,
  vendorId,
  vendorName,
  onShare,
  onClose,
  onImageClick,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <header className="flex-shrink-0 border-b border-[var(--gray-100)] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between px-4 py-3 min-h-[52px]">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--gray-100)] transition-colors -ml-1"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-[var(--gray-900)]">Photo tour</h1>
          <div className="flex items-center gap-1 -mr-1">
            <button
              type="button"
              onClick={onShare}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--gray-100)] transition-colors"
              aria-label="Share"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
            {vendorId && <FavoriteButton vendorId={vendorId} size="large" />}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <h2 className="text-xl font-bold text-[var(--gray-900)] mt-6 mb-4">Gallery</h2>
        {vendorName && (
          <p className="text-sm text-[var(--gray-500)] -mt-2 mb-4">{vendorName}</p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {images.map((url, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onImageClick(index)}
              className="aspect-[4/3] rounded-2xl overflow-hidden bg-[var(--gray-100)] hover:opacity-95 transition-opacity"
            >
              <SmartImage
                src={url}
                alt={`${vendorName || "Vendor"} photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
