"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useAuth } from "../contexts/AuthContext";
import { getCookieConsent } from "../utils/cookieConsent";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!ph || !pathname) return;
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    ph.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

function PostHogIdentify() {
  const { user, loading } = useAuth();
  const ph = usePostHog();

  useEffect(() => {
    if (!ph || loading || !user?.id) return;
    ph.identify(String(user.id), {
      email: user.email || undefined,
      role: user.role || undefined,
      name: user.name || user.fullName || undefined,
    });
  }, [user, loading, ph]);

  return null;
}

function stopPostHog() {
  try {
    if (posthog.__loaded) {
      posthog.opt_out_capturing();
      posthog.reset();
    }
  } catch {
    // Ignore
  }
}

export default function PostHogProvider({ children }) {
  const [analyticsReady, setAnalyticsReady] = useState(false);

  useEffect(() => {
    function applyConsent(next = getCookieConsent()) {
      if (!POSTHOG_KEY || next !== "accepted") {
        setAnalyticsReady(false);
        stopPostHog();
        return;
      }

      if (!posthog.__loaded) {
        posthog.init(POSTHOG_KEY, {
          api_host: "/ingest",
          ui_host: "https://us.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: false,
          capture_pageleave: true,
          persistence: "localStorage+cookie",
        });
      } else {
        try {
          posthog.opt_in_capturing();
        } catch {
          // Ignore
        }
      }
      setAnalyticsReady(true);
    }

    applyConsent();

    function onConsent(event) {
      applyConsent(event?.detail || getCookieConsent());
    }

    window.addEventListener("vehndr:cookie-consent", onConsent);
    return () => window.removeEventListener("vehndr:cookie-consent", onConsent);
  }, []);

  return (
    <>
      {analyticsReady ? (
        <PHProvider client={posthog}>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <PostHogIdentify />
        </PHProvider>
      ) : null}
      {children}
    </>
  );
}
