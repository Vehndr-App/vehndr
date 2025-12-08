"use client";

import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useState, useEffect, useRef } from "react";
import { logout } from "../services/auth";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const { user, clearUser } = useAuth();
  const { totalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    clearUser();
    router.push('/');
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Get page title based on current route
  const getPageTitle = () => {
    if (pathname === '/') return null; // Show logo on home
    if (pathname === '/events') return 'Events';
    if (pathname.startsWith('/events/')) return 'Event Details';
    if (pathname === '/vendors') return 'Vendors';
    if (pathname.startsWith('/store/')) return 'Store';
    if (pathname === '/cart') return 'Cart';
    if (pathname === '/checkout') return 'Checkout';
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/coordinator-dashboard') return 'Dashboard';
    if (pathname === '/login') return 'Sign In';
    if (pathname === '/register') return 'Create Account';
    return null;
  };

  const pageTitle = getPageTitle();
  const showBackButton = pathname !== '/' && pathname !== '/events' && pathname !== '/vendors';
  
  return (
    <>
      <header className="w-full bg-white/95 backdrop-blur-xl sticky top-0 z-50 border-b border-[var(--gray-100)]">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
          {/* Left: Back button or Logo */}
          <div className="flex items-center gap-3 min-w-0">
            {showBackButton ? (
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[var(--gray-100)] transition-colors -ml-1"
                aria-label="Go back"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
            ) : null}
            
            {pageTitle ? (
              <h1 className="text-lg font-semibold text-[var(--gray-900)] truncate">
                {pageTitle}
              </h1>
            ) : (
              <Link 
                href="/" 
                className="font-display text-xl tracking-tight text-gradient-primary"
              >
                vehndr
              </Link>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2" ref={menuRef}>
            {/* Cart button - always visible */}
            <Link
              href="/cart"
              className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-[var(--gray-100)] transition-colors"
              aria-label="Shopping cart"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--coral-500)] text-white text-[10px] font-bold flex items-center justify-center">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </Link>
            
            {/* Hamburger Menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[var(--gray-100)] transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
            </button>

            {/* Dropdown Menu */}
            <div 
              className={`absolute top-full right-2 w-72 bg-white border border-[var(--gray-200)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] overflow-hidden transition-all duration-200 ${
                isMenuOpen ? 'opacity-100 translate-y-2' : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}
            >
              {/* User Section */}
              {user ? (
                <div className="p-4 bg-gradient-to-r from-[var(--violet-50)] to-[var(--magenta-50)] border-b border-[var(--gray-100)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--gray-900)] truncate">{user.name || user.email}</p>
                      <p className="text-xs text-[var(--gray-500)] capitalize">{user.role}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gradient-to-r from-[var(--violet-50)] to-[var(--magenta-50)] border-b border-[var(--gray-100)]">
                  <p className="text-sm text-[var(--gray-600)] mb-3">Sign in to access all features</p>
                  <div className="flex gap-2">
                    <Link 
                      href="/login" 
                      className="flex-1 h-9 flex items-center justify-center text-sm font-semibold text-[var(--violet-700)] bg-white rounded-[var(--radius-lg)] hover:bg-[var(--gray-50)] transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link 
                      href="/register" 
                      className="flex-1 h-9 flex items-center justify-center text-sm font-semibold text-white bg-gradient-primary rounded-[var(--radius-lg)] hover:shadow-md transition-all"
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <div className="p-2">
                <p className="px-3 py-2 text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">Navigate</p>
                
                <MenuLink 
                  href="/" 
                  icon={<HomeIcon />}
                  active={pathname === '/'}
                >
                  Home
                </MenuLink>
                <MenuLink 
                  href="/events" 
                  icon={<CalendarIcon />}
                  active={pathname === '/events'}
                >
                  Events
                </MenuLink>
                <MenuLink 
                  href="/vendors" 
                  icon={<StoreIcon />}
                  active={pathname === '/vendors'}
                >
                  Vendors
                </MenuLink>
                <MenuLink 
                  href="/cart" 
                  icon={<CartIcon />}
                  active={pathname === '/cart'}
                  badge={totalItems > 0 ? totalItems : null}
                >
                  Cart
                </MenuLink>
              </div>

              {/* User-specific links */}
              {user && (
                <div className="p-2 border-t border-[var(--gray-100)]">
                  <p className="px-3 py-2 text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">Account</p>
                  
                  {user.role === 'vendor' && (
                    <MenuLink 
                      href="/dashboard" 
                      icon={<DashboardIcon />}
                      active={pathname === '/dashboard'}
                    >
                      Vendor Dashboard
                    </MenuLink>
                  )}
                  {user.role === 'coordinator' && (
                    <MenuLink 
                      href="/coordinator-dashboard" 
                      icon={<DashboardIcon />}
                      active={pathname === '/coordinator-dashboard'}
                    >
                      Coordinator Dashboard
                    </MenuLink>
                  )}
                  
                  <MenuLink 
                    href="/profile" 
                    icon={<ProfileIcon />}
                    active={pathname === '/profile'}
                  >
                    Profile Settings
                  </MenuLink>
                  <MenuLink 
                    href="/orders" 
                    icon={<OrdersIcon />}
                    active={pathname === '/orders'}
                  >
                    Order History
                  </MenuLink>
                  <MenuLink 
                    href="/favorites" 
                    icon={<HeartIcon />}
                    active={pathname === '/favorites'}
                  >
                    Saved Vendors
                  </MenuLink>
                </div>
              )}

              {/* Logout */}
              {user && (
                <div className="p-2 border-t border-[var(--gray-100)]">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[var(--error)] hover:bg-red-50 rounded-[var(--radius-lg)] transition-colors"
                  >
                    <LogoutIcon />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

function MenuLink({ href, icon, active, badge, children }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-[var(--radius-lg)] transition-colors ${
        active 
          ? 'bg-[var(--violet-50)] text-[var(--violet-700)]' 
          : 'text-[var(--gray-700)] hover:bg-[var(--gray-50)]'
      }`}
    >
      <span className={active ? 'text-[var(--violet-600)]' : 'text-[var(--gray-400)]'}>
        {icon}
      </span>
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="w-5 h-5 rounded-full bg-[var(--coral-500)] text-white text-xs font-bold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

// Icons
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <path d="M9 22V12h6v10"/>
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/>
      <circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
