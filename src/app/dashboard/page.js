"use client";

import AuthGate from "../../components/AuthGate";
import { getCurrentUser } from "../../services/auth";
import { api } from "../../services/api";
import { useEffect, useState, useCallback } from "react";
import { useVendorOrders } from "../../hooks/useVendorOrders";
import Link from "next/link";
import OnboardingResumeCard from "../../components/onboarding/OnboardingResumeCard";
import { ONBOARDING_SKIP_STORAGE_KEY } from "../../constants/vendorOnboardingSteps";

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}

function DashboardInner() {
  const [user, setUser] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [showSetupBanner, setShowSetupBanner] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);

  const fetchOrders = useCallback(async (vendorId) => {
    try {
      const vendorOrders = await api(`/api/vendors/${vendorId}/orders`);
      setOrders(vendorOrders || []);
    } catch (err) {
      console.error("Failed to fetch orders", err);
      setOrders([]);
    }
  }, []);

  const fetchVendor = useCallback(async (vendorId) => {
    try {
      const data = await api(`/api/vendors/${vendorId}`);
      const vendorData = data.vendor || data;
      setVendor(vendorData);
    } catch (err) {
      console.error("Failed to fetch vendor", err);
      setVendor(null);
    }
  }, []);

  const fetchAccountStatus = useCallback(async (vendorId) => {
    try {
      const response = await api(`/api/vendors/${vendorId}/stripe/account`);
      setAccountStatus(response);
    } catch (err) {
      console.error("Failed to fetch account status", err);
      setAccountStatus(null);
    }
  }, []);

  const fetchOnboarding = useCallback(async (vendorId) => {
    try {
      const data = await api(`/api/vendors/${vendorId}/onboarding`);
      setOnboarding(data);
      return data;
    } catch (err) {
      console.error("Failed to fetch onboarding status", err);
      setOnboarding(null);
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);

      if (u?.vendorId) {
        const [, , , onboardingData] = await Promise.all([
          fetchVendor(u.vendorId),
          fetchOrders(u.vendorId),
          fetchAccountStatus(u.vendorId),
          fetchOnboarding(u.vendorId),
        ]);
        if (onboardingData && !onboardingData.isComplete) {
          const skippedAt =
            typeof window !== "undefined"
              ? parseInt(window.localStorage.getItem(ONBOARDING_SKIP_STORAGE_KEY) || "", 10)
              : NaN;
          const skippedRecently =
            Number.isFinite(skippedAt) && Date.now() - skippedAt < 24 * 60 * 60 * 1000;
          setShowSetupBanner(!skippedRecently);
        }
      }
      setLoading(false);
    })();
  }, [fetchVendor, fetchOrders, fetchAccountStatus, fetchOnboarding]);

  const handleBiometricAuth = async () => {
    setAuthError(null);
    
    if (!window.PublicKeyCredential) {
      setAuthError("Biometric authentication not supported");
      return;
    }

    try {
      // Check if biometrics are available
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!available) {
        setAuthError("Face ID/Touch ID not available");
        return;
      }

      // Simple authentication - in production, you'd verify with backend
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        userVerification: "required",
        allowCredentials: []
      };

      await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setAuthError("Authentication cancelled");
      } else {
        // Fallback: allow manual unlock for development/testing
        setIsAuthenticated(true);
      }
    }
  };

  // Real-time order updates
  const handleNewOrder = useCallback((newOrder) => {
    setOrders((prevOrders) => [newOrder, ...prevOrders]);
  }, []);

  useVendorOrders(user?.vendorId, handleNewOrder);

  // Calculate metrics
  const completedOrders = orders.filter(o => o.status === 'completed' || o.paymentStatus === 'succeeded');
  const todaysOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at || o.createdAt);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });
  const thisWeekOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at || o.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return orderDate >= weekAgo;
  });
  
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_cents || o.totalCents || 0), 0);
  const todayRevenue = todaysOrders.filter(o => o.paymentStatus === 'succeeded').reduce((sum, o) => sum + (o.total_cents || o.totalCents || 0), 0);
  const weekRevenue = thisWeekOrders.filter(o => o.paymentStatus === 'succeeded').reduce((sum, o) => sum + (o.total_cents || o.totalCents || 0), 0);
  const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
  
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center pb-20">
        <div className="animate-pulse-soft">
          <div className="w-12 h-12 rounded-full bg-[var(--violet-200)]"></div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 pb-24">
        <div className="max-w-lg mx-auto pt-8">
          <div className="card-gradient text-center py-12 px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-h2 text-white mb-2">Set Up Your Store</h2>
            <p className="text-white/80 mb-6">Create your vendor profile to start selling</p>
            <Link href="/dashboard/setup" className="btn btn-primary bg-white text-[var(--violet-700)]">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isNewVendor = orders.length === 0;

  const setupProgress = onboarding?.percentComplete ?? 0;

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      {/* Header - New vendor vs Established */}
      {isNewVendor ? (
        <div className="safe-area-top">
          {/* New Vendor Profile Card Header - Inspired by profile cards */}
          <div className="relative">
            {/* Cover Photo Area */}
            <div className="h-32 bg-gradient-primary relative overflow-hidden">
              {vendor?.heroImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vendor.heroImage}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-vendor opacity-90" />
              )}
              
              {/* Settings button */}
              <Link 
                href="/dashboard/settings" 
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors z-10"
              >
                <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>

            {/* Profile Content Card */}
            <div className="px-4">
              <div className="max-w-lg mx-auto">
                <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] -mt-12 relative">
                  {/* Avatar with Progress Ring */}
                  <div className="flex flex-col items-center pt-14 pb-5 px-5">
                    {/* Profile Photo - positioned to overlap cover, clickable to edit */}
                    <Link 
                      href="/dashboard/profile#profile-photo" 
                      className="absolute -top-10 left-1/2 -translate-x-1/2 group"
                      title="Add your profile photo"
                    >
                      {/* Progress ring background */}
                      <svg className="w-20 h-20" viewBox="0 0 80 80">
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          fill="white"
                          stroke="var(--gray-200)"
                          strokeWidth="4"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          fill="none"
                          stroke="url(#progressGradient)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${setupProgress * 2.26} 226`}
                          transform="rotate(-90 40 40)"
                        />
                        <defs>
                          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--violet-500)" />
                            <stop offset="100%" stopColor="var(--magenta-500)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      {/* Profile photo inside ring */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-[var(--violet-100)] flex items-center justify-center overflow-hidden relative">
                          {vendor?.profileImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={vendor.profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-7 h-7 text-[var(--violet-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                          {/* Edit overlay on hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-full">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Vendor Name */}
                    <h1 className="text-h3 text-[var(--foreground)] text-center">{vendor.name}</h1>
                    
                    {/* Progress Label */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--violet-50)]">
                        <div className="w-2 h-2 rounded-full bg-[var(--violet-500)]" />
                        <span className="text-xs font-semibold text-[var(--violet-700)]">
                          {setupProgress}% Setup
                        </span>
                      </div>
                    </div>

                    {/* Quick message */}
                    <p className="text-sm text-[var(--gray-500)] text-center mt-3 max-w-xs">
                      Complete the steps below to start getting booked!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-primary text-white px-4 pt-12 pb-8 safe-area-top">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-white/70 text-sm">Welcome back</p>
                <h1 className="text-h2 text-white">{vendor.name}</h1>
              </div>
              <Link href="/dashboard/settings" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>

            {/* Orders Card for established vendors */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-white/70 text-sm mb-3">Total Orders</p>
                  <div className="mb-2">
                    <p className="text-4xl font-bold text-white leading-tight">{orders.length}</p>
                  </div>
                  <p className="text-white/60 text-sm">{todaysOrders.length} order{todaysOrders.length !== 1 ? 's' : ''} today</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSetupBanner && onboarding && !onboarding.isComplete && (
        <div className="px-4 mt-4 safe-area-top">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between gap-3 p-4 rounded-[var(--radius-xl)] bg-gradient-primary text-white shadow-[var(--shadow-card)]">
              <div className="min-w-0">
                <p className="font-semibold text-sm">Finish setup to get booked</p>
                <p className="text-xs text-white/80 mt-0.5">{onboarding.percentComplete}% complete</p>
              </div>
              <Link
                href="/dashboard/setup"
                className="shrink-0 btn bg-white text-[var(--violet-700)] h-9 px-4 text-sm"
              >
                Continue
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className={`px-4 ${isNewVendor ? 'mt-4' : '-mt-6'}`}>
        <div className="max-w-lg mx-auto">
          <OnboardingResumeCard onboarding={onboarding} className="mb-4" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-4">
        <div className="max-w-lg mx-auto">
          <div className="grid grid-cols-3 gap-3">
            <div className="card bg-white p-4 text-center">
              <p className="text-[var(--gray-500)] text-xs mb-1">This Week</p>
              <div className="relative" style={{ display: 'inline-block' }}>
                {!isAuthenticated && (
                  <div className="absolute backdrop-blur-md bg-white/60 rounded-lg z-10" style={{ top: '-4px', left: '-4px', right: '-4px', bottom: '-4px' }}></div>
                )}
                <p className="text-h4 text-[var(--foreground)]">${(weekRevenue / 100).toFixed(0)}</p>
              </div>
            </div>
            <div className="card bg-white p-4 text-center">
              <p className="text-[var(--gray-500)] text-xs mb-1">Total Sales</p>
              <div className="relative" style={{ display: 'inline-block' }}>
                {!isAuthenticated && (
                  <div className="absolute backdrop-blur-md bg-white/60 rounded-lg z-10" style={{ top: '-4px', left: '-4px', right: '-4px', bottom: '-4px' }}></div>
                )}
                <p className="text-h4 text-[var(--foreground)]">${(totalRevenue / 100).toFixed(0)}</p>
              </div>
            </div>
            <div className="card bg-white p-4 text-center">
              <p className="text-[var(--gray-500)] text-xs mb-1">Avg Order</p>
              <div className="relative" style={{ display: 'inline-block' }}>
                {!isAuthenticated && (
                  <div className="absolute backdrop-blur-md bg-white/60 rounded-lg z-10" style={{ top: '-4px', left: '-4px', right: '-4px', bottom: '-4px' }}></div>
                )}
                <p className="text-h4 text-[var(--foreground)]">${(avgOrderValue / 100).toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Status Alert */}
      {accountStatus && !accountStatus.chargesEnabled && (
        <div className="px-4 mt-4">
          <div className="max-w-lg mx-auto">
            <Link href="/dashboard/payments" className="block">
              <div className="card bg-[var(--amber-500)]/10 border border-[var(--amber-500)]/30 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--amber-500)]/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[var(--amber-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[var(--amber-600)]">Complete Payment Setup</p>
                    <p className="text-sm text-[var(--amber-600)]/80">Finish Stripe onboarding to accept payments</p>
                  </div>
                  <svg className="w-5 h-5 text-[var(--amber-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="px-4 mt-6">
          <div className="max-w-lg mx-auto">
            <div className="section-header">
              <h2 className="text-h3">Active Orders</h2>
              <Link href="/dashboard/orders" className="text-[var(--violet-600)] text-sm font-medium flex items-center gap-1">
                View All
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="space-y-3">
              {pendingOrders.slice(0, 3).map((order) => (
                <OrderCard key={order.id} order={order} isAuthenticated={isAuthenticated} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 mt-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-h3 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            <QuickActionCard
              href="/dashboard/orders"
              icon={<OrdersQuickIcon />}
              label="Orders"
              badge={pendingOrders.length > 0 ? pendingOrders.length : null}
            />
            <QuickActionCard
              href="/dashboard/bookings"
              icon={<BookingsQuickIcon />}
              label="Bookings"
            />
            <QuickActionCard
              href="/dashboard/availability"
              icon={<AvailabilityQuickIcon />}
              label="Schedule"
            />
            <QuickActionCard
              href="/dashboard/products"
              icon={<ProductsQuickIcon />}
              label="Products"
            />
          </div>
        </div>
      </div>

      {/* More Menu */}
      <div className="px-4 mt-8">
        <div className="max-w-lg mx-auto">
          <h2 className="text-h3 mb-4">Manage</h2>
          <div className="card bg-white p-0 overflow-hidden">
            <MenuLink href="/dashboard/products" icon={<ItemsIcon />} label="Items & Services" />
            <MenuLink href="/dashboard/offerings" icon={<OfferingsMenuIcon />} label="Event Offerings" />
            <MenuLink href="/dashboard/inquiries" icon={<RequestsMenuIcon />} label="Inquiries" />
            <MenuLink href="/dashboard/requests" icon={<RequestsMenuIcon />} label="Event Requests" />
            <MenuLink href="/dashboard/orders" icon={<OrdersMenuIcon />} label="Orders" badge={pendingOrders.length > 0 ? pendingOrders.length : null} />
            <MenuLink href="/dashboard/transactions" icon={<TransactionsMenuIcon />} label="Transactions" />
            <MenuLink href="/dashboard/reports" icon={<ReportsMenuIcon />} label="Reports" />
            <MenuLink href="/dashboard/payments" icon={<BankingIcon />} label="Banking & Payments" />
            <MenuLink href="/dashboard/profile" icon={<ProfileMenuIcon />} label="Store Profile" isLast />
          </div>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-8"></div>
    </div>
  );
}

function OrderCard({ order, isAuthenticated }) {
  const orderDate = new Date(order.created_at || order.createdAt);
  const total = (order.total_cents || order.totalCents) / 100;
  const customerName = order.customer?.name || 'Guest';
  const itemCount = order.line_items?.length || 0;
  
  return (
    <Link href={`/dashboard/orders?id=${order.id}`} className="block">
      <div className="card bg-white p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[var(--violet-100)] flex items-center justify-center flex-shrink-0">
          <span className="text-[var(--violet-600)] font-semibold">
            {customerName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-[var(--foreground)] truncate">{customerName}</p>
            <span className={`chip text-xs ${
              order.status === 'confirmed' ? 'bg-[var(--info)]/10 text-[var(--info)]' :
              order.status === 'pending' ? 'bg-[var(--warning)]/10 text-[var(--warning)]' :
              'bg-[var(--gray-100)] text-[var(--gray-600)]'
            }`}>
              {order.status}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-[var(--gray-500)]">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
            <div className="relative" style={{ display: 'inline-block' }}>
              {!isAuthenticated && (
                <div className="absolute backdrop-blur-md bg-white/60 rounded-lg z-10" style={{ top: '-4px', left: '-4px', right: '-4px', bottom: '-4px' }}></div>
              )}
              <p className="font-semibold text-[var(--foreground)]">${total.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-[var(--gray-400)] mt-1">
            {orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </Link>
  );
}

function QuickActionCard({ href, icon, label, badge }) {
  return (
    <Link href={href} className="block">
      <div className="card bg-white p-3 text-center interactive relative">
        {badge && (
          <span className="absolute -top-1 -right-1 badge badge-error text-xs min-w-[20px]">
            {badge}
          </span>
        )}
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--violet-50)] flex items-center justify-center mb-2">
          {icon}
        </div>
        <p className="text-xs font-medium text-[var(--gray-700)]">{label}</p>
      </div>
    </Link>
  );
}

function MenuLink({ href, icon, label, badge, isLast }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-4 p-4 hover:bg-[var(--gray-50)] transition-colors ${!isLast ? 'border-b border-[var(--gray-100)]' : ''}`}
    >
      <div className="w-6 h-6 flex items-center justify-center text-[var(--gray-600)]">
        {icon}
      </div>
      <span className="flex-1 font-medium text-[var(--foreground)]">{label}</span>
      {badge && (
        <span className="badge bg-[var(--violet-600)] text-white text-xs">{badge}</span>
      )}
      <svg className="w-5 h-5 text-[var(--gray-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// Quick Action Icons
function OrdersQuickIcon() {
  return (
    <svg className="w-6 h-6 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function BookingsQuickIcon() {
  return (
    <svg className="w-6 h-6 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function AvailabilityQuickIcon() {
  return (
    <svg className="w-6 h-6 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ProductsQuickIcon() {
  return (
    <svg className="w-6 h-6 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function TransactionsQuickIcon() {
  return (
    <svg className="w-6 h-6 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function ReportsQuickIcon() {
  return (
    <svg className="w-6 h-6 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

// Menu Icons
function ItemsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function OfferingsMenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

function RequestsMenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function OrdersMenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function TransactionsMenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function ReportsMenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function BankingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ProfileMenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
