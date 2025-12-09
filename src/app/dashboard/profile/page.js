"use client";

import AuthGate from "../../../components/AuthGate";
import { getCurrentUser } from "../../../services/auth";
import { api } from "../../../services/api";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import VendorProfile from "../../../components/VendorProfile";

export default function StoreProfilePage() {
  return (
    <AuthGate>
      <StoreProfileInner />
    </AuthGate>
  );
}

function StoreProfileInner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      setLoading(false);
    })();
  }, []);

  const handleProfileSuccess = (vendorData) => {
    setSuccessMessage('Profile saved successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center pb-20">
        <div className="animate-pulse-soft">
          <div className="w-12 h-12 rounded-full bg-[var(--violet-200)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className="bg-[var(--success)] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-200)] px-4 pt-12 pb-4 safe-area-top">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="w-10 h-10 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-h2">Store Profile</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="max-w-lg mx-auto">
          <VendorProfile user={user} onSuccess={handleProfileSuccess} />
        </div>
      </div>
    </div>
  );
}

