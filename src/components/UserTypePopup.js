"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UserTypePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const storageKey = "vehndr_user_type_selected";

  const readSelection = () => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  const persistSelection = (value) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // Ignore storage write failures (private mode, blocked storage).
    }
  };

  useEffect(() => {
    // Check if user has already made a selection in this browser
    const hasSelected = readSelection();
    if (!hasSelected) {
      setIsOpen(true);
    }
  }, []);

  const handleSelection = (userType) => {
    persistSelection(userType);

    if (userType === "vendor" || userType === "coordinator") {
      router.push("/login");
    } else {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 overlay backdrop-blur-[2px]" />

      {/* Modal */}
      <div className="relative bg-[var(--surface)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-xl)] max-w-lg w-full mx-4 p-7 animate-scale-in border border-[var(--gray-100)]">
        <button
          type="button"
          onClick={() => {
            persistSelection("dismissed");
            setIsOpen(false);
            router.push("/");
          }}
          className="absolute right-4 top-4 w-9 h-9 rounded-full flex items-center justify-center text-[var(--gray-500)] hover:text-[var(--gray-700)] hover:bg-[var(--gray-100)] transition-colors"
          aria-label="Close"
        >
          <span className="text-xl leading-none">×</span>
        </button>
        <div className="text-center mb-6">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--gray-400)] mb-2">
            Get Started
          </div>
          <h2 className="text-h2 text-[var(--gray-900)] mb-2">
            Welcome to Vehndr
          </h2>
          <p className="text-[var(--gray-500)]">
            Choose the experience that fits you best.
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--violet-400)] to-[var(--magenta-400)] p-[2px] transition-shadow hover:shadow-[0_0_24px_-6px_var(--violet-400)]">
            <button
              onClick={() => handleSelection("vendor")}
              className="relative w-full flex items-center justify-between gap-4 p-4 rounded-[var(--radius-xl)] bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[var(--radius-full)] bg-[var(--violet-50)] text-[var(--violet-700)] flex items-center justify-center text-xl border border-[var(--violet-100)]">
                  🏪
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[var(--gray-900)]">Vendor</div>
                  <div className="text-sm text-[var(--gray-500)]">
                    Sell products, services, and get booked
                  </div>
                </div>
              </div>
              <span className="text-[var(--violet-400)] group-hover:text-[var(--violet-600)]">→</span>
            </button>
          </div>

          <div className="rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--magenta-400)] to-[var(--coral-400)] p-[2px] transition-shadow hover:shadow-[0_0_24px_-6px_var(--magenta-400)]">
            <button
              onClick={() => handleSelection("coordinator")}
              className="relative w-full flex items-center justify-between gap-4 p-4 rounded-[var(--radius-xl)] bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[var(--radius-full)] bg-[var(--magenta-50)] text-[var(--magenta-700)] flex items-center justify-center text-xl border border-[var(--magenta-100)]">
                  📋
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[var(--gray-900)]">Event Organizer</div>
                  <div className="text-sm text-[var(--gray-500)]">
                    Plan events, invite vendors, and manage bookings
                  </div>
                </div>
              </div>
              <span className="text-[var(--magenta-400)] group-hover:text-[var(--magenta-600)]">→</span>
            </button>
          </div>

          <div className="rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--coral-400)] to-[var(--amber-400)] p-[2px] transition-shadow hover:shadow-[0_0_24px_-6px_var(--coral-400)]">
            <button
              onClick={() => handleSelection("customer")}
              className="relative w-full flex items-center justify-between gap-4 p-4 rounded-[var(--radius-xl)] bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[var(--radius-full)] bg-[var(--coral-50)] text-[var(--coral-700)] flex items-center justify-center text-xl border border-[var(--coral-100)]">
                  🛍️
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[var(--gray-900)]">Customer</div>
                  <div className="text-sm text-[var(--gray-500)]">
                    Browse vendors and shop experiences
                  </div>
                </div>
              </div>
              <span className="text-[var(--coral-400)] group-hover:text-[var(--coral-600)]">→</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            persistSelection("dismissed");
            setIsOpen(false);
            router.push("/");
          }}
          className="btn btn-secondary w-full mt-6"
        >
          Just browsing
        </button>
      </div>
    </div>
  );
}
