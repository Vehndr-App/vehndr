"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import GuidanceModal from "./GuidanceModal";

const CHECKLISTS = {
  vendor: [
    {
      id: "vendor_profile",
      title: "Complete your store profile",
      description: "Add your brand story, contact info, and event preferences.",
      href: "/dashboard/profile",
      cta: "Update profile",
      icon: "📝",
      iconClass: "bg-[var(--violet-50)] text-[var(--violet-600)]",
      guidanceTitle: "Store Profile Tips",
      guidanceBullets: [
        "Add a compelling business name and description",
        "Upload a cover photo showing your work in action (not a logo!)",
        "Include your location so organizers can find you",
        "Select relevant categories for better visibility",
      ],
    },
    {
      id: "vendor_storefront",
      title: "Add items for attendees",
      description: "Build your attendee-facing storefront and POS with products or services for in-person checkout or preorders.",
      href: "/dashboard/storefront",
      cta: "Edit storefront",
      icon: "🎨",
      iconClass: "bg-[var(--info-50)] text-[var(--info-600)]",
      guidanceTitle: "Storefront & POS",
      guidanceBullets: [
        "Add products and services attendees can buy",
        "Set prices and add quality photos",
        "Use for in-person sales, preorders, or both",
        "Manage your full catalog in one place",
      ],
    },
    {
      id: "vendor_offerings",
      title: "Create organizer offerings",
      description: "Define how event organizers can book you as a vendor, including how you sell on-site and how you get paid.",
      href: "/dashboard/offerings",
      cta: "Add offerings",
      icon: "🛍️",
      iconClass: "bg-[var(--coral-50)] text-[var(--coral-600)]",
      guidanceTitle: "Event Offerings",
      guidanceBullets: [
        "This is how organizers book you for events",
        "Choose: flat booth, hourly, trade, free + sales, or package",
        "Think of it like a buyout or bar tab arrangement",
        "Each option is explained on the offerings page",
      ],
    },
    {
      id: "vendor_availability",
      title: "Set availability",
      description: "Mark the dates you are open for bookings.",
      href: "/dashboard/availability",
      cta: "Set dates",
      icon: "📅",
      iconClass: "bg-[var(--mint-50)] text-[var(--mint-600)]",
      guidanceTitle: "Set Your Availability",
      guidanceBullets: [
        "Mark which days and hours you're available",
        "Set recurring weekly schedules",
        "Add or block specific dates",
        "Organizers only see you when you're available",
      ],
    },
    {
      id: "vendor_payments",
      title: "Connect payments",
      description: "Finish Stripe onboarding to accept card payments.",
      href: "/dashboard/payments",
      cta: "Connect Stripe",
      icon: "💳",
      iconClass: "bg-[var(--amber-50)] text-[var(--amber-600)]",
      guidanceTitle: "Connect Payments",
      guidanceBullets: [
        "Complete Stripe onboarding (takes ~5 minutes)",
        "Accept cards, Apple Pay, and Tap to Pay",
        "Get payouts directly to your bank account",
        "Required to accept orders and get paid",
      ],
    },
  ],
  coordinator: [
    {
      id: "coordinator_profile",
      title: "Complete organizer profile",
      description: "Add your contact info and event planning preferences.",
      href: "/profile",
      cta: "Update profile",
      icon: "📝",
      iconClass: "bg-[var(--violet-50)] text-[var(--violet-600)]",
      guidanceTitle: "Organizer Profile",
      guidanceBullets: [
        "Add your name and contact info",
        "Write a brief bio about yourself",
        "Helps vendors know who they're working with",
      ],
    },
    {
      id: "coordinator_event",
      title: "Create your first event",
      description: "Set dates, location, and vendor categories.",
      href: "/coordinator-dashboard/create",
      cta: "Create event",
      icon: "🎉",
      iconClass: "bg-[var(--magenta-50)] text-[var(--magenta-600)]",
      guidanceTitle: "Create an Event",
      guidanceBullets: [
        "Set your event date, time, and location",
        "Add a theme and description",
        "Upload a cover photo to make it stand out",
        "Then invite vendors and manage bookings",
      ],
    },
    {
      id: "coordinator_budget",
      title: "Define vendor needs",
      description: "Set budgets, booth requirements, and timelines.",
      href: "/coordinator-dashboard/create",
      cta: "Set requirements",
      icon: "🧩",
      iconClass: "bg-[var(--mint-50)] text-[var(--mint-600)]",
      guidanceTitle: "Vendor Requirements",
      guidanceBullets: [
        "Define budget ranges for vendors",
        "Specify booth space requirements",
        "Set timing and scheduling needs",
        "Helps match you with the right vendors",
      ],
    },
    {
      id: "coordinator_invites",
      title: "Invite vendors",
      description: "Reach out to vendors and review incoming requests.",
      href: "/coordinator-dashboard",
      cta: "Review vendors",
      icon: "📣",
      iconClass: "bg-[var(--coral-50)] text-[var(--coral-600)]",
      guidanceTitle: "Invite Vendors",
      guidanceBullets: [
        "Browse recommended vendors for your event",
        "Send booking requests to vendors you like",
        "Review and manage incoming proposals",
        "Approve or decline based on offerings",
      ],
    },
    {
      id: "coordinator_publish",
      title: "Publish your event",
      description: "Make your event visible and ready for bookings.",
      href: "/coordinator-dashboard",
      cta: "Publish event",
      icon: "🚀",
      iconClass: "bg-[var(--amber-50)] text-[var(--amber-600)]",
      guidanceTitle: "Publish Your Event",
      guidanceBullets: [
        "Review your event details one more time",
        "Confirm your vendors are set",
        "Publish so attendees can find your event",
        "Start accepting RSVPs and bookings",
      ],
    },
    {
      id: "coordinator_payments",
      title: "Connect payments",
      description: "Link your Stripe account to receive vendor participation fees.",
      href: "/coordinator-dashboard/payments",
      cta: "Connect Stripe",
      icon: "💳",
      iconClass: "bg-[var(--mint-50)] text-[var(--mint-600)]",
      guidanceTitle: "Connect Payments",
      guidanceBullets: [
        "Complete Stripe onboarding (takes ~5 minutes)",
        "Vendor participation fees go directly to your bank",
        "Required to receive payments from vendors",
        "Stripe handles all secure payment processing",
      ],
    },
  ],
};

const getStorageKey = (role) => `vehndr_onboarding_${role}`;
const getDismissKey = (role) => `vehndr_onboarding_dismissed_${role}`;

export default function OnboardingChecklist({ role }) {
  const { user } = useAuth();
  const router = useRouter();
  const resolvedRole = role || user?.role;
  const checklist = useMemo(() => CHECKLISTS[resolvedRole] || [], [resolvedRole]);

  const [completedMap, setCompletedMap] = useState({});
  const [isDismissed, setIsDismissed] = useState(false);
  const [guidanceItemId, setGuidanceItemId] = useState(null);

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
    <div className="card p-5 mb-6">
      {/* Header with visual */}
      <div className="flex items-center gap-4 mb-4">
        {/* Checklist icon */}
        <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)] flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-h4 text-[var(--foreground)]">
            Get Booking Ready!
          </h2>
          <p className="text-sm text-[var(--gray-500)] mt-0.5">
            {resolvedRole === "vendor" 
              ? "Complete these steps to start getting booked and paid for events!"
              : "Set up your event to start inviting vendors!"
            }
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-8 h-8 rounded-full bg-[var(--gray-100)] flex items-center justify-center text-[var(--gray-500)] hover:bg-[var(--gray-200)] hover:text-[var(--gray-700)] transition-colors flex-shrink-0"
          aria-label="Dismiss checklist"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2 rounded-full bg-[var(--gray-100)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--violet-500)] to-[var(--magenta-500)] transition-all duration-300"
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-[var(--violet-600)] whitespace-nowrap">
          {completion.done}/{completion.total}
        </span>
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
              <span
                className={`mt-0.5 h-8 w-8 rounded-full text-base flex items-center justify-center ${
                  item.iconClass || "bg-[var(--gray-50)] text-[var(--gray-600)]"
                }`}
                aria-hidden="true"
              >
                {item.icon || "✨"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--gray-900)]">
                    {item.title}
                  </p>
                  {item.guidanceTitle && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setGuidanceItemId(item.id);
                      }}
                      className="w-6 h-6 rounded-full bg-[var(--gray-100)] flex items-center justify-center text-[var(--gray-500)] hover:bg-[var(--violet-100)] hover:text-[var(--violet-600)] transition-colors flex-shrink-0"
                      aria-label={`Learn more about ${item.title}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                </div>
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

      {guidanceItemId && (() => {
        const item = checklist.find((i) => i.id === guidanceItemId);
        if (!item?.guidanceTitle) return null;
        return (
          <GuidanceModal
            isOpen={!!guidanceItemId}
            onClose={() => setGuidanceItemId(null)}
            title={item.guidanceTitle}
            bullets={item.guidanceBullets}
            primaryAction={{
              label: item.cta,
              onClick: () => router.push(item.href)
            }}
            secondaryAction={{
              label: "Close",
              onClick: () => setGuidanceItemId(null)
            }}
          />
        );
      })()}
    </div>
  );
}
