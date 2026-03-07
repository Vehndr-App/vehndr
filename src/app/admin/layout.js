"use client";

import AuthGate from "../../components/AuthGate";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AdminTimezoneProvider, useAdminTimezone, TIMEZONE_OPTIONS } from "../../contexts/AdminTimezoneContext";

export default function AdminLayout({ children }) {
  return (
    <AuthGate allowedRoles={['admin']}>
      <AdminTimezoneProvider>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </AdminTimezoneProvider>
    </AuthGate>
  );
}

function AdminLayoutInner({ children }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { timezone, setTimezone } = useAdminTimezone();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: DashboardIcon },
    { href: "/admin/users", label: "Users", icon: UsersIcon },
    { href: "/admin/vendors", label: "Vendors", icon: VendorsIcon },
    { href: "/admin/orders", label: "Orders", icon: OrdersIcon },
    { href: "/admin/fees", label: "Fees", icon: FeesIcon },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 transition-[width] duration-200 ${
          isSidebarCollapsed ? "md:w-20" : "md:w-64"
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--gray-900)]">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div
              className={`flex items-center flex-shrink-0 px-3 ${
                isSidebarCollapsed ? "justify-center" : "justify-start"
              }`}
            >
              <Link
                href="/admin"
                className={`text-white font-bold ${isSidebarCollapsed ? "text-lg" : "text-xl"}`}
                title="Vehndr Admin"
              >
                {isSidebarCollapsed ? "VA" : "Vehndr Admin"}
              </Link>
            </div>
            <nav className="mt-8 flex-1 space-y-1 px-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`group flex items-center py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? "bg-[var(--violet-600)] text-white"
                        : "text-[var(--gray-300)] hover:bg-[var(--gray-800)] hover:text-white"
                    } ${isSidebarCollapsed ? "justify-center px-2" : "px-3"} ${
                      isSidebarCollapsed ? "" : "text-sm"
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 ${isActive ? "text-white" : "text-[var(--gray-400)] group-hover:text-white"} ${
                        isSidebarCollapsed ? "" : "mr-3"
                      }`}
                    />
                    {!isSidebarCollapsed && item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Timezone Picker */}
            {!isSidebarCollapsed && (
              <div className="px-3 pb-2 mt-4">
                <div className="border-t border-[var(--gray-800)] pt-4">
                  <p className="text-xs font-medium text-[var(--gray-500)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5" />
                    Timezone
                  </p>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-[var(--gray-800)] text-[var(--gray-200)] border border-[var(--gray-700)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--violet-500)] focus:border-[var(--violet-500)] cursor-pointer"
                  >
                    {TIMEZONE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    {/* If browser tz isn't in our list, add it as an option */}
                    {!TIMEZONE_OPTIONS.find((o) => o.value === timezone) && (
                      <option value={timezone}>{timezone}</option>
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div
            className={`flex-shrink-0 flex border-t border-[var(--gray-800)] ${
              isSidebarCollapsed ? "justify-center p-3" : "p-4"
            }`}
          >
            <Link
              href="/"
              title={isSidebarCollapsed ? "Back to Vehndr" : undefined}
              className={`flex items-center text-[var(--gray-400)] hover:text-white text-sm ${
                isSidebarCollapsed ? "justify-center" : ""
              }`}
            >
              <svg
                className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-2"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              {!isSidebarCollapsed && "Back to Vehndr"}
            </Link>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar Toggle */}
      <button
        type="button"
        onClick={() => setIsSidebarCollapsed((current) => !current)}
        className="hidden md:flex fixed top-6 -translate-x-1/2 z-40 h-9 w-9 items-center justify-center rounded-full border border-[var(--gray-700)] bg-[var(--gray-900)] text-[var(--gray-200)] hover:text-white hover:border-[var(--gray-500)] shadow-lg transition-[left,border-color,color] duration-200"
        style={{ left: isSidebarCollapsed ? "5rem" : "16rem" }}
        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <SidebarToggleIcon collapsed={isSidebarCollapsed} />
      </button>

      {/* Mobile Header */}
      <div className="md:hidden bg-[var(--gray-900)] text-white px-4 py-3 flex items-center justify-between">
        <Link href="/admin" className="text-lg font-bold">
          Vehndr Admin
        </Link>
        <div className="flex items-center gap-3">
          {/* Mobile timezone picker */}
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="text-xs bg-[var(--gray-800)] text-[var(--gray-200)] border border-[var(--gray-700)] rounded px-1.5 py-1 focus:outline-none max-w-[120px]"
          >
            {TIMEZONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {!TIMEZONE_OPTIONS.find((o) => o.value === timezone) && (
              <option value={timezone}>{timezone}</option>
            )}
          </select>
          <Link href="/" className="text-[var(--gray-400)] hover:text-white text-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--gray-200)] z-50">
        <nav className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center px-3 py-1 ${
                  isActive ? "text-[var(--violet-600)]" : "text-[var(--gray-500)]"
                }`}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div
        className={`flex flex-col flex-1 transition-[padding] duration-200 ${
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarToggleIcon({ collapsed }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {collapsed ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M9 5l7 7-7 7"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M15 19l-7-7 7-7"
        />
      )}
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DashboardIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function OrdersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function VendorsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function FeesIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
