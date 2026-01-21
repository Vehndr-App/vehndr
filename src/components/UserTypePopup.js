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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-scale-in border-2 border-black">
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            router.push("/");
          }}
          className="absolute right-4 top-4 text-lg font-bold text-black hover:opacity-70 transition-opacity"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold text-[var(--gray-900)] text-center mb-2">
          Welcome to Vehndr
        </h2>
        <p className="text-[var(--gray-500)] text-center mb-6">
          How would you like to use Vehndr today?
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleSelection("vendor")}
            className="w-full flex items-center gap-4 p-4 rounded-[var(--radius-xl)] bg-gradient-vendor text-black border-2 border-black shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-cardHover)] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-white/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🏪
            </div>
            <div className="text-left">
              <div className="font-bold text-black">Vendor</div>
              <div className="text-sm font-bold text-white">Sell Products / Services &amp; Get Booked for Events!</div>
            </div>
          </button>

          <button
            onClick={() => handleSelection("coordinator")}
            className="w-full flex items-center gap-4 p-4 rounded-[var(--radius-xl)] bg-gradient-organizer text-black border-2 border-black shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-cardHover)] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-white/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📋
            </div>
            <div className="text-left">
              <div className="font-bold text-black">Event Organizer</div>
              <div className="text-sm font-bold text-white">Plan / Manage Events / Book Vendors!</div>
            </div>
          </button>

          <button
            onClick={() => handleSelection("customer")}
            className="w-full flex items-center gap-4 p-4 rounded-[var(--radius-xl)] bg-gradient-customer text-black border-2 border-black shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-cardHover)] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-white/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🛍️
            </div>
            <div className="text-left">
              <div className="font-bold text-black">Customer</div>
              <div className="text-sm font-bold text-white">Browse Vendors / Shop for Products / Services IRL!</div>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            router.push("/");
          }}
          className="mt-6 w-full h-12 rounded-full bg-gradient-browse text-[var(--gray-700)] font-semibold border-2 border-black shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-card)] transition-all"
        >
          Just browsing
        </button>
      </div>
    </div>
  );
}
