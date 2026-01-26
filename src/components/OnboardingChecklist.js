"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";

const CHECKLISTS = {
  vendor: [
    {
      id: "vendor_profile",
      title: "Complete your store profile",
      description: "Add your brand story, contact info, and event preferences.",
      href: "/dashboard/profile",
      cta: "Update profile",
    },
    {
      id: "vendor_offerings",
      title: "Add offerings",
      description: "List your products or services with pricing and photos.",
      href: "/dashboard/offerings",
      cta: "Add offerings",
    },
    {
      id: "vendor_availability",
      title: "Set availability",
      description: "Mark the dates you are open for bookings.",
      href: "/dashboard/availability",
      cta: "Set dates",
    },
    {
      id: "vendor_payments",
      title: "Connect payments",
      description: "Finish Stripe onboarding to accept card payments.",
      href: "/dashboard/payments",
      cta: "Connect Stripe",
    },
    {
      id: "vendor_storefront",
      title: "Polish your storefront",
      description: "Add hero imagery and featured items to improve bookings.",
      href: "/dashboard/storefront",
      cta: "Edit storefront",
    },
  ],
  coordinator: [
    {
      id: "coordinator_profile",
      title: "Complete organizer profile",
      description: "Add your contact info and event planning preferences.",
      href: "/profile",
      cta: "Update profile",
    },
    {
      id: "coordinator_event",
      title: "Create your first event",
      description: "Set dates, location, and vendor categories.",
      href: "/coordinator-dashboard/create",
      cta: "Create event",
    },
    {
      id: "coordinator_budget",
      title: "Define vendor needs",
      description: "Set budgets, booth requirements, and timelines.",
      href: "/coordinator-dashboard/create",
      cta: "Set requirements",
    },
    {
      id: "coordinator_invites",
      title: "Invite vendors",
      description: "Reach out to vendors and review incoming requests.",
      href: "/coordinator-dashboard",
      cta: "Review vendors",
    },
    {
      id: "coordinator_publish",
      title: "Publish your event",
      description: "Make your event visible and ready for bookings.",
      href: "/coordinator-dashboard",
      cta: "Publish event",
    },
  ],
};

const getStorageKey = (role) => `vehndr_onboarding_${role}`;
const getDismissKey = (role) => `vehndr_onboarding_dismissed_${role}`;

export default function OnboardingChecklist({ role }) {
  const { user } = useAuth();
  const resolvedRole = role || user?.role;
  const checklist = CHECKLISTS[resolvedRole] || [];

  const [completedMap, setCompletedMap] = useState({});
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!resolvedRole || typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(getStorageKey(resolvedRole)) || "{}");
      const dismissed = localStorage.getItem(getDismissKey(resolvedRole)) === "true";
      setCompletedMap(stored);
      setIsDismissed(dismissed);
    } catch {
      setCompletedMap({});
      setIsDismissed(false);
    }
  }, [resolvedRole]);

  const completion = useMemo(() => {
    if (!checklist.length) return { done: 0, total: 0, percent: 0 };
    const done = checklist.filter((item) => completedMap[item.id]).length;
    return {
      done,
      total: checklist.length,
      percent: Math.round((done / checklist.length) * 100),
    };
  }, [checklist, completedMap]);

  const toggleItem = (id) => {
    const updated = { ...completedMap, [id]: !completedMap[id] };
    setCompletedMap(updated);
    if (resolvedRole) {
      localStorage.setItem(getStorageKey(resolvedRole), JSON.stringify(updated));
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (resolvedRole) {
      localStorage.setItem(getDismissKey(resolvedRole), "true");
    }
  };

  if (!resolvedRole || !checklist.length || isDismissed) {
    return null;
  }

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--violet-600)]">
            {resolvedRole === "vendor" ? "Vendor walkthrough" : "Organizer walkthrough"}
          </p>
          <h2 className="text-h3 text-[var(--gray-900)] mt-1">
            Get booking-ready
          </h2>
          <p className="text-sm text-[var(--gray-500)] mt-1">
            Complete these steps to improve visibility and trust.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-[var(--gray-500)] hover:text-[var(--gray-700)]"
        >
          Dismiss
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--gray-500)] mb-3">
        <span>{completion.done} of {completion.total} completed</span>
        <span>{completion.percent}% ready</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--gray-100)] overflow-hidden mb-5">
        <div
          className="h-full bg-[var(--violet-600)] transition-all"
          style={{ width: `${completion.percent}%` }}
        />
      </div>

      <div className="space-y-3">
        {checklist.map((item) => {
          const isComplete = Boolean(completedMap[item.id]);
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-[var(--radius-lg)] border transition-colors ${
                isComplete
                  ? "bg-[var(--mint-50)] border-[var(--mint-200)]"
                  : "bg-white border-[var(--gray-100)] hover:bg-[var(--gray-50)]"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                  isComplete
                    ? "bg-[var(--mint-500)] border-[var(--mint-500)]"
                    : "border-[var(--gray-300)]"
                }`}
                aria-label={isComplete ? "Mark incomplete" : "Mark complete"}
              >
                {isComplete && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--gray-900)]">
                  {item.title}
                </p>
                <p className="text-xs text-[var(--gray-500)] mt-1">
                  {item.description}
                </p>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)] mt-2"
                >
                  {item.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
