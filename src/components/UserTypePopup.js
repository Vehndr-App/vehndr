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
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-scale-in">
        <h2 className="text-2xl font-bold text-[var(--gray-900)] text-center mb-2">
          Welcome to Vehndr
        </h2>
        <p className="text-[var(--gray-500)] text-center mb-6">
          How would you like to use Vehndr today?
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleSelection("customer")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[var(--gray-200)] hover:border-[var(--violet-500)] hover:bg-[var(--violet-50)] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--violet-100)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🛍️
            </div>
            <div className="text-left">
              <div className="font-semibold text-[var(--gray-900)]">Customer</div>
              <div className="text-sm text-[var(--gray-500)]">Browse vendors and shop for products</div>
            </div>
          </button>

          <button
            onClick={() => handleSelection("vendor")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[var(--gray-200)] hover:border-[var(--magenta-500)] hover:bg-[var(--magenta-50)] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--magenta-100)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🏪
            </div>
            <div className="text-left">
              <div className="font-semibold text-[var(--gray-900)]">Vendor</div>
              <div className="text-sm text-[var(--gray-500)]">Sell products and manage your store</div>
            </div>
          </button>

          <button
            onClick={() => handleSelection("coordinator")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[var(--gray-200)] hover:border-[var(--coral-500)] hover:bg-[var(--coral-50)] transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--coral-100)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📋
            </div>
            <div className="text-left">
              <div className="font-semibold text-[var(--gray-900)]">Coordinator</div>
              <div className="text-sm text-[var(--gray-500)]">Plan and manage events</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
