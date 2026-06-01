"use client";

import Link from "next/link";
import { STEP_LABELS } from "../../constants/vendorOnboardingSteps";

export default function OnboardingResumeCard({ onboarding, className = "" }) {
  if (!onboarding || onboarding.isComplete) return null;

  const nextLabel = STEP_LABELS[onboarding.currentStep] || "Continue setup";

  return (
    <div
      className={`card bg-white p-5 border border-[var(--violet-100)] shadow-[var(--shadow-card)] ${className}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-h4 text-[var(--gray-900)]">Finish your setup</h3>
          <p className="text-sm text-[var(--gray-500)] mt-1">
            {onboarding.percentComplete}% complete — next: {nextLabel}
          </p>
        </div>
        <span className="text-lg font-bold text-[var(--violet-600)] tabular-nums shrink-0">
          {onboarding.percentComplete}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--gray-100)] overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-gradient-primary transition-all"
          style={{ width: `${onboarding.percentComplete}%` }}
        />
      </div>
      <Link href="/dashboard/setup" className="btn btn-primary w-full">
        Resume setup
      </Link>
    </div>
  );
}
