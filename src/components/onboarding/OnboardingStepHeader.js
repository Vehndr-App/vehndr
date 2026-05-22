"use client";

export default function OnboardingStepHeader({ title, subtitle, children, overline = "Vendor onboarding" }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--violet-600)] mb-2">
        {overline}
      </p>
      <h1 className="text-[26px] leading-[1.2] font-semibold text-[var(--gray-900)] mb-2">{title}</h1>
      {subtitle && (
        <p className="text-[15px] text-[var(--gray-600)] leading-relaxed">{subtitle}</p>
      )}
      {children}
    </div>
  );
}
