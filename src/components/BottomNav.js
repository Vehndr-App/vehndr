"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";

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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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

  // Close menu when clicking outside
  useEffect(() => {
    if (showMoreMenu) {
      const handleClickOutside = () => setShowMoreMenu(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMoreMenu]);
  
  // Determine which nav items to show based on user role
  const getNavItems = () => {
    if (user?.role === 'vendor') {
      return [
        { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
        { href: '/dashboard/orders', label: 'Orders', icon: OrdersIcon },
        { href: '/dashboard/transactions', label: 'Sales', icon: SalesIcon },
        { href: '/messages', label: 'Messages', icon: MessagesIcon },
        { type: 'more', label: 'More', icon: MoreIcon },
      ];
    }
    
    if (user?.role === 'coordinator') {
      return [
        { href: '/', label: 'Explore', icon: ExploreIcon },
        { href: '/events', label: 'Events', icon: EventsIcon },
        { href: '/coordinator-dashboard', label: 'Dashboard', icon: DashboardIcon },
        { href: '/vendors', label: 'Vendors', icon: VendorsIcon },
        { href: '/profile', label: 'Profile', icon: ProfileIcon },
      ];
    }
    
    // Default: customer/attendee
    return [
      { href: '/', label: 'Explore', icon: ExploreIcon },
      { href: '/appointments', label: 'Bookings', icon: AppointmentsIcon },
      { href: '/cart', label: 'Cart', icon: CartIcon, badge: totalItems > 0 ? totalItems : null },
      { href: '/favorites', label: 'Saved', icon: FavoritesIcon, badge: favoritesCount > 0 ? favoritesCount : null },
      { href: user ? '/profile' : '/login', label: user ? 'Profile' : 'Login', icon: ProfileIcon },
    ];
  };

  const navItems = getNavItems();

  // Vendor "More" menu items
  const moreMenuItems = [
    { href: '/dashboard/products', label: 'Items & Services', icon: ItemsMenuIcon },
    { href: '/dashboard/transactions', label: 'Transactions', icon: TransactionsMenuIcon },
    { href: '/dashboard/reports', label: 'Reports', icon: ReportsMenuIcon },
    { href: '/dashboard/payments', label: 'Banking', icon: BankingMenuIcon },
    { href: '/dashboard/profile', label: 'Store Profile', icon: StoreMenuIcon },
    { href: '/profile', label: 'Account', icon: ProfileIcon },
  ];

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && user?.role === 'vendor' && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div 
            className="absolute bottom-20 right-4 w-56 bg-white rounded-2xl shadow-xl overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              {moreMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMoreMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--gray-50)] transition-colors"
                >
                  <div className="w-5 h-5 text-[var(--gray-600)]">
                    <item.icon filled={false} />
                  </div>
                  <span className="font-medium text-[var(--foreground)]">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[var(--gray-200)] safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item, index) => {
            if (item.type === 'more') {
              return (
                <button
                  key="more"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(!showMoreMenu);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] transition-colors relative ${
                    showMoreMenu 
                      ? 'text-[var(--violet-600)]' 
                      : 'text-[var(--gray-400)] hover:text-[var(--gray-600)]'
                  }`}
                >
                  <div className="relative">
                    <item.icon filled={showMoreMenu} />
                  </div>
                  <span className={`text-[10px] font-medium ${showMoreMenu ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                  {showMoreMenu && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--violet-600)] rounded-full" />
                  )}
                </button>
              );
            }

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
                    : 'text-[var(--gray-400)] hover:text-[var(--gray-600)]'
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
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

function SalesIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
      ) : (
        <>
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v12M9 9.5c0-1.1.9-2 2.5-2s2.5.9 2.5 2-.9 2-2.5 2H9m6 3c0 1.1-.9 2-2.5 2s-2.5-.9-2.5-2"/>
        </>
      )}
    </svg>
  );
}

function MessagesIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      ) : (
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      )}
    </svg>
  );
}

function MoreIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function ProfileIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "var(--coral-500)" : "none"} stroke={filled ? "var(--coral-500)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function AppointmentsIcon({ filled }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? "0" : "1.5"} strokeLinecap="round" strokeLinejoin="round">
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

// More Menu Icons
function ItemsMenuIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
    </svg>
  );
}

function TransactionsMenuIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
    </svg>
  );
}

function ReportsMenuIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
    </svg>
  );
}

function BankingMenuIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}

function StoreMenuIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
    </svg>
  );
}
