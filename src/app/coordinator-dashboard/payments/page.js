"use client";

import AuthGate from "../../../components/AuthGate";
import { getCurrentUser } from "../../../services/auth";
import { api } from "../../../services/api";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import StripeConnectButton from "../../../components/StripeConnectButton";

export default function CoordinatorPaymentsPage() {
  return (
    <AuthGate allowedRoles={["coordinator"]}>
      <PaymentsInner />
    </AuthGate>
  );
}

function PaymentsInner() {
  const [user, setUser] = useState(null);
  const [accountStatus, setAccountStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAccountStatus = useCallback(async (coordinatorId) => {
    try {
      const response = await api(`/api/coordinators/${coordinatorId}/stripe/account`);
      setAccountStatus(response);
    } catch (err) {
      console.error("Failed to fetch coordinator account status", err);
      setAccountStatus(null);
    }
  }, []);

  const refreshAccountStatus = async () => {
    if (!user?.coordinatorId || refreshing) return;

    setRefreshing(true);
    try {
      const response = await api(`/api/coordinators/${user.coordinatorId}/stripe/refresh`, {
        method: "POST",
      });

      if (response.success) {
        setAccountStatus({
          ...accountStatus,
          chargesEnabled:      response.chargesEnabled,
          payoutsEnabled:      response.payoutsEnabled,
          detailsSubmitted:    response.detailsSubmitted,
          onboardingCompleted: response.onboardingCompleted,
        });
      }
    } catch (err) {
      console.error("Failed to refresh coordinator account status", err);
      alert("Failed to refresh account status. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);

      if (u?.coordinatorId) {
        await fetchAccountStatus(u.coordinatorId);
      }
      setLoading(false);
    })();
  }, [fetchAccountStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center pb-20">
        <div className="animate-pulse-soft">
          <div className="w-12 h-12 rounded-full bg-[var(--violet-200)]"></div>
        </div>
      </div>
    );
  }

  const isConnected = accountStatus?.chargesEnabled;

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-200)] px-4 pt-12 pb-4 safe-area-top">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Link
              href="/coordinator-dashboard"
              className="w-10 h-10 rounded-full bg-[var(--gray-100)] flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-h2">Banking &amp; Payments</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Status Card */}
          <div
            className={`card p-5 ${
              isConnected
                ? "bg-[var(--success)]/5 border border-[var(--success)]/20"
                : "bg-[var(--warning)]/5 border border-[var(--warning)]/20"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isConnected ? "bg-[var(--success)]/10" : "bg-[var(--warning)]/10"
                }`}
              >
                {isConnected ? (
                  <svg className="w-6 h-6 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-[var(--warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-h4 ${isConnected ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                  {isConnected ? "Payments Active" : "Setup Required"}
                </h3>
                <p className={`text-sm mt-1 ${isConnected ? "text-[var(--success)]/80" : "text-[var(--warning)]/80"}`}>
                  {isConnected
                    ? "Your Stripe account is connected and ready to receive payments from vendors"
                    : "Connect your Stripe account so vendors can pay you directly"}
                </p>
              </div>
            </div>
          </div>

          {/* Stripe Connect Button */}
          <StripeConnectButton
            coordinatorId={user?.coordinatorId}
            accountStatus={accountStatus}
            onStatusUpdate={() => fetchAccountStatus(user?.coordinatorId)}
          />

          {/* Account Details */}
          {accountStatus && (
            <div className="card bg-white p-0 overflow-hidden">
              <div className="p-4 border-b border-[var(--gray-100)] flex items-center justify-between">
                <h3 className="text-h4">Account Details</h3>
                {accountStatus.connected && (
                  <button
                    onClick={refreshAccountStatus}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--violet-600)] hover:bg-[var(--violet-50)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {refreshing ? "Refreshing..." : "Refresh Status"}
                  </button>
                )}
              </div>
              <div className="divide-y divide-[var(--gray-100)]">
                <div className="flex items-center justify-between p-4">
                  <span className="text-[var(--gray-600)]">Charges Enabled</span>
                  <StatusBadge enabled={accountStatus.chargesEnabled} />
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-[var(--gray-600)]">Payouts Enabled</span>
                  <StatusBadge enabled={accountStatus.payoutsEnabled} />
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-[var(--gray-600)]">Details Submitted</span>
                  <StatusBadge enabled={accountStatus.detailsSubmitted} />
                </div>
                {accountStatus.accountId && (
                  <div className="flex items-center justify-between p-4">
                    <span className="text-[var(--gray-600)]">Account ID</span>
                    <span className="font-mono text-sm text-[var(--gray-500)]">{accountStatus.accountId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="card bg-white p-5">
            <h3 className="text-h4 mb-4">How Payments Work</h3>
            <div className="space-y-4">
              <Step number={1} title="Connect Your Account" description="Link your Stripe account to receive payments from vendors" />
              <Step number={2} title="Vendors Pay You" description="When vendors join your event, their payment is sent directly to you" />
              <Step number={3} title="Get Paid" description="Funds are deposited directly to your bank account" />
            </div>
          </div>

          {/* Fee Info */}
          <div className="card bg-[var(--gray-50)] p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[var(--gray-500)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-[var(--gray-700)]">Vendor Payments</p>
                <p className="text-sm text-[var(--gray-500)] mt-1">
                  Vendor participation fees are transferred directly to your connected Stripe account. Standard Stripe processing fees apply.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ enabled }) {
  return (
    <span
      className={`chip text-xs ${
        enabled ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--gray-200)] text-[var(--gray-500)]"
      }`}
    >
      {enabled ? "Active" : "Pending"}
    </span>
  );
}

function Step({ number, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-[var(--violet-100)] flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-[var(--violet-600)]">{number}</span>
      </div>
      <div>
        <p className="font-medium text-[var(--foreground)]">{title}</p>
        <p className="text-sm text-[var(--gray-500)]">{description}</p>
      </div>
    </div>
  );
}
