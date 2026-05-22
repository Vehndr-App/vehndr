"use client";

import { useEffect, useRef } from "react";
import SmartImage from "../SmartImage";
import { useScrollSnapIndex } from "./useScrollSnapIndex";

export default function StorefrontGalleryCarousel({
  images,
  initialIndex = 0,
  heroObjectPosition,
  onClose,
}) {
  const scrollRef = useRef(null);
  const { index, scrollToIndex } = useScrollSnapIndex(scrollRef, images.length);

  useEffect(() => {
    if (!scrollRef.current || images.length === 0) return;
    const el = scrollRef.current;
    const clamped = Math.max(0, Math.min(initialIndex, images.length - 1));
    el.scrollLeft = clamped * el.offsetWidth;
  }, [initialIndex, images.length]);

  if (!images.length) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/80 to-transparent">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-white font-medium text-sm">
          {index + 1} / {images.length}
        </span>
        <div className="w-10" />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {images.map((url, i) => (
          <div key={i} className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center px-4 pb-8">
            <SmartImage
              src={url}
              alt={`Photo ${i + 1}`}
              className="max-w-full max-h-full object-contain"
              style={i === 0 && heroObjectPosition ? { objectPosition: heroObjectPosition } : undefined}
              fallbackClassName="bg-[var(--gray-800)]"
            />
          </div>
        ))}
      </div>

      {index > 0 && (
        <button
          type="button"
          onClick={() => scrollToIndex(index - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors hidden sm:flex"
          aria-label="Previous photo"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {index < images.length - 1 && (
        <button
          type="button"
          onClick={() => scrollToIndex(index + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors hidden sm:flex"
          aria-label="Next photo"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center gap-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 px-4 bg-gradient-to-t from-black/60 to-transparent">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/40"
              }`}
              aria-label={`Go to photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
