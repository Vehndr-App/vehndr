"use client";

import Link from "next/link";
import {
  WIZARD_STEPS,
  ONBOARDING_SKIP_STORAGE_KEY
} from "../../constants/vendorOnboardingSteps";

export default function OnboardingWizardLayout({
  stepIndex,
  children,
  onBack,
  onStepBack,
  onStepForward,
  canStepForward = true,
  onSkip,
  showBack = true,
  backLabel = "Back",
  skipLabel = "Skip for now",
  hideSkip = false,
  footer
}) {
  const progress = ((stepIndex + 1) / WIZARD_STEPS.length) * 100;

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_SKIP_STORAGE_KEY, String(Date.now()));
    }
    onSkip?.();
  };

  return (
    <div className="min-h-screen bg-[var(--gray-50)] flex flex-col">
      <header className="safe-area-top sticky top-0 z-30 bg-white/96 backdrop-blur-xl border-b border-[var(--gray-100)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="h-10 px-3 rounded-full text-sm font-medium text-[var(--gray-600)] hover:text-[var(--violet-700)] hover:bg-[var(--violet-50)] transition-colors"
          >
            Exit
          </Link>
          <span className="text-xs font-semibold text-[var(--gray-500)] tabular-nums">
            {stepIndex + 1} / {WIZARD_STEPS.length}
          </span>
          {!hideSkip && onSkip ? (
            <button
              type="button"
              onClick={handleSkip}
              className="h-10 px-3 rounded-full text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)] hover:bg-[var(--violet-50)]"
            >
              {skipLabel}
            </button>
          ) : (
            <span className="w-16" aria-hidden="true" />
          )}
        </div>
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onStepBack}
              disabled={!onStepBack || stepIndex <= 0}
              className="h-9 w-9 rounded-full border border-[var(--gray-200)] bg-white text-[var(--gray-700)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Previous step"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div
              className="h-2 rounded-full bg-[var(--gray-100)] overflow-hidden flex-1"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              type="button"
              onClick={onStepForward}
              disabled={!onStepForward || !canStepForward}
              className="h-9 w-9 rounded-full border border-[var(--gray-200)] bg-white text-[var(--gray-700)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Next step"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex justify-center gap-1.5 mt-3">
            {WIZARD_STEPS.map((step, i) => (
              <span
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === stepIndex
                    ? "w-6 bg-[var(--violet-600)]"
                    : i < stepIndex
                      ? "w-1.5 bg-[var(--violet-300)]"
                      : "w-1.5 bg-[var(--gray-200)]"
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-5 pb-6">
        <div className="rounded-[var(--radius-2xl)] border border-[var(--gray-100)] bg-white shadow-[var(--shadow-card)] p-4 sm:p-5">
          {children}
        </div>
      </main>

      {footer && (
        <footer className="safe-area-bottom border-t border-[var(--gray-100)] bg-white/98 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="h-1 w-12 rounded-full bg-[var(--gray-200)] mx-auto mb-3" />
            <div className="flex flex-col gap-2.5 sm:flex-row">
              {showBack && stepIndex > 0 && onBack && (
                <button type="button" onClick={onBack} className="btn btn-secondary w-full !h-14 text-base font-semibold">
                  {backLabel}
                </button>
              )}
              {footer}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
