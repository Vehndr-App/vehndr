"use client";

import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[var(--violet-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-100)] sticky top-14 z-40">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4">
          <h1 className="text-xl font-semibold text-[var(--gray-900)]">Messages</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
        <div className="text-center bg-white border border-[var(--gray-100)] rounded-[var(--radius-xl)] p-8 sm:p-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--violet-100)] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="8" y1="9" x2="16" y2="9" />
              <line x1="8" y1="13" x2="14" y2="13" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-2">
            Messaging is coming soon.
          </h2>
          <p className="text-[var(--gray-500)] max-w-sm mx-auto">
            We’re building a better way for vendors to connect with customers and event organizers.
          </p>
        </div>
      </div>
    </div>
  );
}
