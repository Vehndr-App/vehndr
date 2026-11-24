"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCookieConsent, setCookieConsent } from "../utils/cookieConsent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
  }, []);

  function choose(value) {
    setCookieConsent(value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4 pointer-events-none"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie and analytics notice"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-[var(--gray-200)] bg-white/95 backdrop-blur-md shadow-[var(--shadow-xl)] px-4 py-4 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--gray-900)]">Cookies & analytics</p>
            <p className="text-xs sm:text-sm text-[var(--gray-600)] leading-relaxed mt-1">
              We use cookies and analytics (including PostHog) to understand how Vehndr is used and improve the site.
              See our{" "}
              <Link href="/privacy" className="underline font-medium text-[var(--violet-700)] hover:text-[var(--violet-800)]">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => choose("declined")}
              className="h-10 px-3.5 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => choose("accepted")}
              className="h-10 px-4 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--gradient-vendor)" }}
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
