"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UserTypePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user has already made a selection this session
    const hasSelected = sessionStorage.getItem("vehndr_user_type_selected");
    if (!hasSelected) {
      setIsOpen(true);
    }
  }, []);

  const handleSelection = (userType) => {
    sessionStorage.setItem("vehndr_user_type_selected", userType);

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
      <div className="absolute inset-0 overlay" />

      {/* Modal */}
      <div className="relative bg-[var(--surface)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-xl)] max-w-md w-full mx-4 p-6 animate-scale-in border border-[var(--gray-100)]">
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            router.push("/");
          }}
          className="absolute right-4 top-4 w-9 h-9 rounded-full flex items-center justify-center text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors"
          aria-label="Close"
        >
          <span className="text-xl leading-none">×</span>
        </button>
        <h2 className="text-h2 text-[var(--gray-900)] text-center mb-2">
          Welcome to Vehndr
        </h2>
        <p className="text-[var(--gray-500)] text-center mb-6">
          How would you like to use Vehndr today?
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleSelection("vendor")}
            className="w-full flex items-center gap-4 p-4 rounded-[var(--radius-xl)] bg-gradient-vendor text-white border border-white/20 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all group"
          >
            <div className="w-12 h-12 rounded-[var(--radius-full)] bg-white/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🏪
            </div>
            <div className="text-left">
              <div className="font-semibold text-white">Vendor</div>
              <div className="text-sm text-white/90">Sell products, services, and get booked</div>
            </div>
          </button>

          <button
            onClick={() => handleSelection("coordinator")}
            className="w-full flex items-center gap-4 p-4 rounded-[var(--radius-xl)] bg-gradient-organizer text-white border border-white/20 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all group"
          >
            <div className="w-12 h-12 rounded-[var(--radius-full)] bg-white/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📋
            </div>
            <div className="text-left">
              <div className="font-semibold text-white">Event Organizer</div>
              <div className="text-sm text-white/90">Plan events, invite vendors, and manage bookings</div>
            </div>
          </button>

          <button
            onClick={() => handleSelection("customer")}
            className="w-full flex items-center gap-4 p-4 rounded-[var(--radius-xl)] bg-gradient-customer text-white border border-white/20 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all group"
          >
            <div className="w-12 h-12 rounded-[var(--radius-full)] bg-white/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🛍️
            </div>
            <div className="text-left">
              <div className="font-semibold text-white">Customer</div>
              <div className="text-sm text-white/90">Browse vendors and shop experiences</div>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
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
