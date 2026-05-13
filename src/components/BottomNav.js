"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { listVendorInquiries } from "../services/inquiries";

// Get favorites count from localStorage
function getFavoritesCount() {
  if (typeof window === "undefined") return 0;
  try {
    const favorites = JSON.parse(localStorage.getItem("vehndr_favorites") || "[]");
    return favorites.length;
  } catch {
    return 0;
  }
}

export default function BottomNav() {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { user } = useAuth();
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [newInquiriesCount, setNewInquiriesCount] = useState(0);
  const isAdminRoute        = pathname?.startsWith("/admin");
  const isBuyerDashboard    = pathname?.startsWith("/buyer-dashboard");
  const isMessages          = pathname?.startsWith("/messages");

  // Track favorites count
  useEffect(() => {
    setFavoritesCount(getFavoritesCount());

    // Listen for storage changes
    const handleStorage = () => setFavoritesCount(getFavoritesCount());
    window.addEventListener("storage", handleStorage);

    // Also check on focus (when returning to tab)
    const handleFocus = () => setFavoritesCount(getFavoritesCount());
    window.addEventListener("focus", handleFocus);

    // Poll for changes (for same-tab updates)
    const interval = setInterval(() => setFavoritesCount(getFavoritesCount()), 1000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, []);
  
  // Determine which nav items to show based on user role
  const getNavItems = () => {
    if (user?.role === 'vendor') {
      return [
        { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
        { href: '/dashboard/inquiries', label: 'Inquiries', icon: MessagesIcon, badge: newInquiriesCount > 0 ? newInquiriesCount : null },
        { href: '/dashboard/storefront', label: 'Storefront', icon: StorefrontIcon },
        { href: '/dashboard/profile', label: 'Account', icon: ProfileIcon },
      ];
    }
    
    if (user?.role === 'coordinator') {
      return [
        { href: '/', label: 'Explore', icon: ExploreIcon },
        { href: '/events', label: 'Events', icon: EventsIcon },
        { href: '/buyer-dashboard', label: 'Proposals', icon: BuyerDashboardIcon },
        { href: '/vendors', label: 'Vendors', icon: VendorsIcon },
        { href: '/profile', label: 'Profile', icon: ProfileIcon },
      ];
    }
    
    // Default: customer/attendee
    return [
      { href: '/', label: 'Explore', icon: ExploreIcon },
      { href: '/buyer-dashboard', label: 'Dashboard', icon: BuyerDashboardIcon },
      { href: '/cart', label: 'Cart', icon: CartIcon, badge: totalItems > 0 ? totalItems : null },
      { href: '/favorites', label: 'Saved', icon: FavoritesIcon, badge: favoritesCount > 0 ? favoritesCount : null },
      { href: user ? '/profile' : '/login', label: user ? 'Profile' : 'Login', icon: ProfileIcon },
    ];
  };

  // Fetch new inquiry count for vendors
  useEffect(() => {
    if (user?.role !== "vendor") return;
    const fetch = () =>
      listVendorInquiries()
        .then((inqs) => setNewInquiriesCount(inqs.filter((i) => i.status === "submitted").length))
        .catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Admin, buyer-dashboard, and messages pages have their own navigation.
  if (isAdminRoute || isBuyerDashboard || isMessages) {
    return null;
  }

  const navItems = getNavItems();

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[var(--gray-200)] safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors relative ${
                  isActive 
                    ? 'text-[var(--violet-600)]' 
                    : 'text-black hover:text-black'
                }`}
              >
                <div className="relative">
                  <Icon filled={isActive} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--coral-500)] text-white text-[10px] font-bold px-1">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--violet-600)] rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// Icon Components
function ExploreIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" fill="none" stroke="currentColor" strokeWidth="2"/>
      ) : (
        <>
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </>
      )}
    </svg>
  );
}

function EventsIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
      ) : (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </>
      )}
    </svg>
  );
}

function VendorsIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/>
      ) : (
        <>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </>
      )}
    </svg>
  );
}

function CartIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
      ) : (
        <>
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </>
      )}
    </svg>
  );
}

function DashboardIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
      ) : (
        <>
          <rect x="3" y="3" width="7" height="9"/>
          <rect x="14" y="3" width="7" height="5"/>
          <rect x="14" y="12" width="7" height="9"/>
          <rect x="3" y="16" width="7" height="5"/>
        </>
      )}
    </svg>
  );
}

function OrdersIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
      ) : (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </>
      )}
    </svg>
  );
}

function StorefrontIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/>
      ) : (
        <>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </>
      )}
    </svg>
  );
}

function MessagesIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      ) : (
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      )}
    </svg>
  );
}

function ProfileIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "2.5"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      ) : (
        <>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </>
      )}
    </svg>
  );
}

function FavoritesIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "var(--coral-500)" : "none"} stroke={filled ? "var(--coral-500)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function BuyerDashboardIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2"/>
      ) : (
        <>
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="13" y2="16"/>
        </>
      )}
    </svg>
  );
}

function AppointmentsIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z"/>
      ) : (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <rect x="12" y="14" width="5" height="4" rx="1"/>
        </>
      )}
    </svg>
  );
}
