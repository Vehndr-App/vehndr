"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getCoordinatorStripeAccount,
  createCoordinatorAccountLink,
  refreshCoordinatorStripeAccount,
} from "../../../services/coordinators";

export default function CoordinatorPaymentsPage() {
  const [accountStatus, setAccountStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  const fetchAccountStatus = useCallback(async () => {
    try {
      const res = await getCoordinatorStripeAccount();
      setAccountStatus(res);
      setError(null);
    } catch (err) {
      if (err?.status === 403) {
        setError("Only event coordinators can connect a payout account.");
      } else {
        setError(err?.message || "Failed to load your payout account.");
      }
      setAccountStatus(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchAccountStatus();
      setLoading(false);
    })();
  }, [fetchAccountStatus]);

  const handleConnect = async () => {
    setWorking(true);
    setError(null);
    try {
      const here = window.location.href;
      const res = await createCoordinatorAccountLink({ refreshUrl: here, returnUrl: here });
      window.location.href = res.url;
    } catch (err) {
      setError(err?.message || "Failed to start Stripe onboarding.");
      setWorking(false);
    }
  };

  const handleRefresh = async () => {
    setWorking(true);
    setError(null);
    try {
      await refreshCoordinatorStripeAccount();
      await fetchAccountStatus();
    } catch (err) {
      setError(err?.message || "Failed to refresh account status.");
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full bg-[var(--violet-200)]" />
        </div>
      </div>
    );
  }

  const connected = !!accountStatus?.connected;
  const isActive = !!accountStatus?.chargesEnabled;
  const needsOnboarding = !connected || accountStatus?.needsOnboarding;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-display font-bold text-[var(--gray-900)]">Payouts</h1>
        <p className="text-sm text-[var(--gray-500)] mt-1">
          Connect a Stripe account to collect vending fees from vendors you book for your events.
        </p>
      </div>

      {/* Status banner */}
      <div
        className={`rounded-2xl p-5 mb-6 flex items-start gap-4 border ${
          isActive
            ? "bg-[var(--mint-50)] border-[var(--mint-100)]"
            : "bg-[var(--amber-50)] border-[var(--amber-100)]"
        }`}
      >
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isActive ? "bg-[var(--mint-100)]" : "bg-[var(--amber-100)]"
          }`}
        >
          {isActive ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mint-700)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--amber-700)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${isActive ? "text-[var(--mint-800)]" : "text-[var(--amber-800)]"}`}>
            {isActive ? "Payouts active" : "Setup required"}
          </p>
          <p className={`text-sm mt-0.5 leading-relaxed ${isActive ? "text-[var(--mint-700)]" : "text-[var(--amber-700)]"}`}>
            {isActive
              ? "Your Stripe account is connected and ready to receive vendor fees."
              : "Complete Stripe onboarding to start collecting fees from vendors."}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Action card */}
      <div className="bg-white rounded-2xl p-6 mb-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--gray-900)]">Stripe payout account</h2>
          <StatusBadge accountStatus={accountStatus} />
        </div>

        {connected && (
          <div className="space-y-2 text-sm mb-5">
            <Row label="Charges enabled" enabled={accountStatus.chargesEnabled} />
            <Row label="Payouts enabled" enabled={accountStatus.payoutsEnabled} />
            <Row label="Details submitted" enabled={accountStatus.detailsSubmitted} />
            {accountStatus.accountId && (
              <div className="flex justify-between pt-1">
                <span className="text-[var(--gray-500)]">Account ID</span>
                <span className="font-mono text-xs text-[var(--gray-400)]">{accountStatus.accountId}</span>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-[var(--gray-100)] flex gap-3">
          {needsOnboarding ? (
            <button
              onClick={handleConnect}
              disabled={working}
              className="flex-1 py-2.5 rounded-xl bg-[var(--violet-600)] text-white text-sm font-semibold hover:bg-[var(--violet-700)] transition-colors disabled:opacity-50"
            >
              {working ? "Loading…" : connected ? "Complete onboarding" : "Connect Stripe account"}
            </button>
          ) : (
            <button
              onClick={handleRefresh}
              disabled={working}
              className="flex-1 py-2.5 rounded-xl border border-[var(--gray-200)] text-sm font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors disabled:opacity-50"
            >
              {working ? "Refreshing…" : "Refresh status"}
            </button>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl p-6 mb-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <h2 className="text-base font-bold text-[var(--gray-900)] mb-4">How it works</h2>
        <div className="space-y-4">
          <Step n={1} title="Connect your account" desc="Link a Stripe account to receive payouts." />
          <Step n={2} title="Charge vendors" desc="Send a fee-based offer; the vendor pays to confirm their spot at your event." />
          <Step n={3} title="Get paid" desc="The fee is deposited to your bank, minus the platform fee." />
        </div>
      </div>

      {/* Fee note */}
      <div className="bg-[var(--gray-50)] rounded-2xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-[var(--gray-400)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-[var(--gray-500)] leading-relaxed">
          VEHNDR keeps the same platform fee it takes on vendor sales; the rest of each vending fee is paid out to you.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ accountStatus }) {
  let label = "Not connected";
  let cls = "bg-[var(--gray-100)] text-[var(--gray-600)]";
  if (accountStatus?.chargesEnabled) {
    label = "Active";
    cls = "bg-[var(--mint-100)] text-[var(--mint-700)]";
  } else if (accountStatus?.detailsSubmitted) {
    label = "Under review";
    cls = "bg-[var(--amber-100)] text-[var(--amber-700)]";
  } else if (accountStatus?.connected) {
    label = "Incomplete";
    cls = "bg-[var(--violet-50)] text-[var(--violet-700)]";
  }
  return <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cls}`}>{label}</span>;
}

function Row({ label, enabled }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--gray-500)]">{label}</span>
      <span className={enabled ? "text-[var(--mint-600)] font-medium" : "text-[var(--gray-400)]"}>
        {enabled ? "Yes" : "Pending"}
      </span>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-[var(--violet-100)] flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-[var(--violet-600)]">{n}</span>
      </div>
      <div>
        <p className="font-medium text-[var(--gray-900)]">{title}</p>
        <p className="text-sm text-[var(--gray-500)]">{desc}</p>
      </div>
    </div>
  );
}
