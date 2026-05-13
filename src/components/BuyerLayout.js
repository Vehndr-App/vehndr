"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { getUnreadCount } from "../services/notifications";

// ─── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function CalendarIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      {active && <rect x="8" y="14" width="3" height="3" rx="0.5" fill="currentColor" />}
    </svg>
  );
}

function ClipboardIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" fill={active ? "currentColor" : "none"} />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}

function MessageIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function BellIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV = [
  { href: "/buyer-dashboard",               label: "Home",                Icon: HomeIcon,      exact: true  },
  { href: "/buyer-dashboard/events",        label: "Events",              Icon: CalendarIcon,  exact: false },
  { href: "/buyer-dashboard/proposals",     label: "Proposals",           Icon: ClipboardIcon, exact: false },
  { href: "/messages",                      label: "Messages",            Icon: MessageIcon,   exact: false },
  { href: "/buyer-dashboard/notifications", label: "Notifications",       Icon: BellIcon,      exact: false },
];

function isActive(pathname, href, exact) {
  if (exact) return pathname === href;
  if (href === "/messages") return pathname.startsWith("/messages");
  return pathname.startsWith(href);
}

function NavLink({ item, collapsed, onClick, badge }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href, item.exact);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 relative ${
        active
          ? "bg-[var(--violet-50)] text-[var(--violet-700)]"
          : "text-[var(--gray-500)] hover:bg-[var(--gray-50)] hover:text-[var(--gray-800)]"
      } ${collapsed ? "justify-center" : ""}`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--violet-600)]" />
      )}
      <div className="relative flex-shrink-0">
        <item.Icon active={active} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && badge > 0 && (
        <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function BuyerLayout({ children }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = () => getUnreadCount().then(setUnreadCount).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? "U";
  const sidebarW = collapsed ? "w-[68px]" : "w-[240px]";

  const activeItem = NAV.find((n) => isActive(pathname, n.href, n.exact)) ?? NAV[0];

  return (
    <div className="min-h-screen bg-[var(--gray-50)] flex">

      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-50 bg-white border-r border-[var(--gray-100)] transition-[width] duration-200 ease-in-out ${sidebarW}`}
        style={{ boxShadow: "1px 0 0 0 var(--gray-100)" }}
      >
        {/* Logo */}
        <div className={`flex items-center h-[60px] flex-shrink-0 border-b border-[var(--gray-100)] ${collapsed ? "justify-center px-4" : "px-5"}`}>
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{ background: "var(--gradient-vendor)" }}
            >
              V
            </div>
            {!collapsed && (
              <span className="font-display font-bold text-[15px] text-[var(--gray-900)] truncate">
                Vehndr
              </span>
            )}
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} badge={item.href === "/buyer-dashboard/notifications" ? unreadCount : 0} />
          ))}
        </nav>

        {/* Bottom: user + collapse toggle */}
        <div className="flex-shrink-0 border-t border-[var(--gray-100)] p-3 space-y-1">
          {!collapsed && user && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-[10px] bg-[var(--gray-50)]">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: "var(--gradient-customer)" }}
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--gray-900)] truncate">{user.name || user.email}</p>
                <p className="text-[10px] text-[var(--gray-400)] truncate capitalize">{user.role}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-[10px] text-[var(--gray-400)] hover:bg-[var(--gray-50)] hover:text-[var(--gray-600)] transition-colors text-xs font-medium ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}>
              <polyline points="15 18 9 12 15 6" />
              <line x1="9" y1="12" x2="3" y2="12" />
            </svg>
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* ── Mobile overlay sidebar ── */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col shadow-2xl">
            <div className="flex items-center justify-between h-[60px] px-5 border-b border-[var(--gray-100)]">
              <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--gradient-vendor)" }}>V</div>
                <span className="font-display font-bold text-[15px] text-[var(--gray-900)]">Vehndr</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--gray-100)] text-[var(--gray-500)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {NAV.map((item) => (
                <NavLink key={item.href} item={item} collapsed={false} onClick={() => setMobileOpen(false)} badge={item.href === "/buyer-dashboard/notifications" ? unreadCount : 0} />
              ))}
            </nav>
            {user && (
              <div className="border-t border-[var(--gray-100)] p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "var(--gradient-customer)" }}>{initial}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--gray-900)] truncate">{user.name || user.email}</p>
                    <p className="text-xs text-[var(--gray-400)] capitalize">{user.role}</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </>
      )}

      {/* ── Main content ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-[margin] duration-200 ${collapsed ? "md:ml-[68px]" : "md:ml-[240px]"}`}>

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-[var(--gray-100)] flex items-center gap-3 px-4 h-[56px]">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center hover:bg-[var(--gray-50)] text-[var(--gray-600)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="font-semibold text-[15px] text-[var(--gray-900)] flex-1">{activeItem.label}</span>
          {user && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "var(--gradient-customer)" }}>
              {initial}
            </div>
          )}
        </header>

        {/* Page */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--gray-100)] flex">
        {NAV.slice(0, 5).map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const badge = item.href === "/buyer-dashboard/notifications" ? unreadCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                active ? "text-[var(--violet-600)]" : "text-[var(--gray-400)]"
              }`}
            >
              <div className="relative">
                <item.Icon active={active} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="leading-none">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
