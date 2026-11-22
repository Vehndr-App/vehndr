"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useAuth } from "../contexts/AuthContext";

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

export default function PostHogProvider({ children }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (posthog.__loaded) return;
    posthog.init(POSTHOG_KEY, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      // Fall back if reverse proxy is unavailable
      // (PostHog still works via direct host when /ingest fails to rewrite)
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
    });
  }, []);

  if (!POSTHOG_KEY) {
    return children;
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}
