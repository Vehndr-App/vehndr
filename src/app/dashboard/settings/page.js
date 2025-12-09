"use client";

import AuthGate from "../../../components/AuthGate";
import { getCurrentUser, logout } from "../../../services/auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsInner />
    </AuthGate>
  );
}

function SettingsInner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      setLoading(false);
    })();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
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
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-200)] px-4 pt-12 pb-4 safe-area-top">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="w-10 h-10 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-h2">Settings</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Account Section */}
          <div>
            <h3 className="text-sm font-medium text-[var(--gray-500)] uppercase tracking-wide mb-3 px-1">Account</h3>
            <div className="card bg-white p-0 overflow-hidden">
              <SettingsLink href="/dashboard/profile" icon={<StoreIcon />} label="Store Profile" />
              <SettingsLink href="/profile" icon={<UserIcon />} label="Personal Account" />
              <SettingsLink href="/dashboard/payments" icon={<PaymentIcon />} label="Banking & Payments" isLast />
            </div>
          </div>

          {/* Business Section */}
          <div>
            <h3 className="text-sm font-medium text-[var(--gray-500)] uppercase tracking-wide mb-3 px-1">Business</h3>
            <div className="card bg-white p-0 overflow-hidden">
              <SettingsLink href="/dashboard/products" icon={<ProductsIcon />} label="Items & Services" />
              <SettingsLink href="/dashboard/orders" icon={<OrdersSettingsIcon />} label="Orders" />
              <SettingsLink href="/dashboard/transactions" icon={<TransactionsSettingsIcon />} label="Transactions" />
              <SettingsLink href="/dashboard/reports" icon={<ReportsSettingsIcon />} label="Reports" isLast />
            </div>
          </div>

          {/* Support Section */}
          <div>
            <h3 className="text-sm font-medium text-[var(--gray-500)] uppercase tracking-wide mb-3 px-1">Support</h3>
            <div className="card bg-white p-0 overflow-hidden">
              <SettingsLink href="/help" icon={<HelpIcon />} label="Help Center" />
              <SettingsLink href="/contact" icon={<ContactIcon />} label="Contact Support" isLast />
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full card bg-white p-4 flex items-center justify-center gap-2 text-[var(--error)] font-medium"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>

          {/* Version */}
          <p className="text-center text-xs text-[var(--gray-400)]">
            Vehndr for Vendors v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsLink({ href, icon, label, isLast }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-4 p-4 hover:bg-[var(--gray-50)] transition-colors ${!isLast ? 'border-b border-[var(--gray-100)]' : ''}`}
    >
      <div className="w-6 h-6 flex items-center justify-center text-[var(--gray-600)]">
        {icon}
      </div>
      <span className="flex-1 font-medium text-[var(--foreground)]">{label}</span>
      <svg className="w-5 h-5 text-[var(--gray-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// Icons
function StoreIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function OrdersSettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function TransactionsSettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function ReportsSettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

