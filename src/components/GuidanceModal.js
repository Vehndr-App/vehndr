"use client";

import { useEffect, useRef } from "react";

/**
 * Reusable guidance modal for onboarding tips.
 * Props: isOpen, onClose, title, description (string or array of bullets), imageSrc (optional),
 * primaryAction ({ label, onClick }), secondaryAction (optional)
 */
export default function GuidanceModal({
  isOpen,
  onClose,
  title,
  description,
  bullets,
  imageSrc,
  primaryAction,
  secondaryAction
}) {
  const modalRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement;
    const focusable = modalRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70"
      aria-modal="true"
      role="dialog"
      aria-labelledby="guidance-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-[var(--radius-2xl)] bg-white overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          {imageSrc && (
            <div className="flex justify-center -mt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt=""
                className="w-24 h-24 object-contain rounded-[var(--radius-lg)]"
              />
            </div>
          )}
          <h2 id="guidance-modal-title" className="text-h3 text-[var(--foreground)] text-center">
            {title}
          </h2>
          {bullets && bullets.length > 0 ? (
            <ul className="text-[var(--gray-600)] text-[14px] leading-relaxed space-y-2 text-left">
              {bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--violet-400)] flex-shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : description && (
            <p className="text-[var(--gray-600)] text-[14px] leading-relaxed text-center">
              {description}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 space-y-3">
          {primaryAction && (
            <button
              type="button"
              onClick={() => {
                primaryAction.onClick?.();
                onClose?.();
              }}
              className="btn btn-primary w-full justify-center min-h-[44px]"
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={() => {
                secondaryAction.onClick?.();
                onClose?.();
              }}
              className="btn btn-ghost w-full justify-center min-h-[44px] text-[var(--gray-600)]"
            >
              {secondaryAction.label}
            </button>
          )}
          {!primaryAction?.onClick && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary w-full justify-center min-h-[44px]"
            >
              Got it
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[var(--gray-100)] flex items-center justify-center text-[var(--gray-600)] hover:bg-[var(--gray-200)] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
