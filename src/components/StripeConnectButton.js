'use client';

import { useState } from 'react';
import { api } from '@/services/api';

export default function StripeConnectButton({ vendorId, coordinatorId, accountStatus, onStatusUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const accountLinkPath = coordinatorId
    ? `/api/coordinators/${coordinatorId}/stripe/account_link`
    : `/api/vendors/${vendorId}/stripe/account_link`;

  const refreshPath = coordinatorId
    ? `/api/coordinators/${coordinatorId}/stripe/refresh`
    : `/api/vendors/${vendorId}/stripe/refresh`;

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const refreshUrl = window.location.href;
      const returnUrl = window.location.href;

      const response = await api(accountLinkPath, {
        method: 'POST',
        body: { refreshUrl, returnUrl }
      });

      // Redirect to Stripe onboarding
      window.location.href = response.url;
    } catch (err) {
      setError(err.message || 'Failed to start Stripe onboarding');
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      await api(refreshPath, {
        method: 'POST'
      });

      // Notify parent to refresh account status
      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (err) {
      setError(err.message || 'Failed to refresh account status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!accountStatus || !accountStatus.connected) {
      return (
        <span className="badge bg-[var(--gray-100)] text-[var(--gray-700)]">
          Not Connected
        </span>
      );
    }

    if (accountStatus.chargesEnabled) {
      return (
        <span className="badge bg-[var(--mint-100)] text-[var(--mint-700)]">
          Active
        </span>
      );
    }

    if (accountStatus.detailsSubmitted) {
      return (
        <span className="badge bg-[var(--amber-100)] text-[var(--amber-700)]">
          Under Review
        </span>
      );
    }

    return (
      <span className="badge bg-[var(--info-50)] text-[var(--info)]">
        Onboarding Incomplete
      </span>
    );
  };

  const getActionButton = () => {
    if (!accountStatus || !accountStatus.connected || accountStatus.needsOnboarding) {
      return (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="btn btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : accountStatus?.connected ? 'Complete Onboarding' : 'Connect Stripe Account'}
        </button>
      );
    }

    return (
      <button
        onClick={handleRefreshStatus}
        disabled={loading}
        className="btn btn-secondary h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Refreshing...' : 'Refresh Status'}
      </button>
    );
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--gray-900)]">Stripe Payment Account</h3>
        {getStatusBadge()}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[var(--error-50)] border border-[var(--error-100)] rounded-[var(--radius-lg)] text-[var(--error)] text-sm">
          {error}
        </div>
      )}

      {accountStatus?.connected && (
        <div className="mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--gray-600)]">Charges Enabled:</span>
            <span className={accountStatus.chargesEnabled ? 'text-[var(--mint-600)] font-medium' : 'text-[var(--error)]'}>
              {accountStatus.chargesEnabled ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--gray-600)]">Payouts Enabled:</span>
            <span className={accountStatus.payoutsEnabled ? 'text-[var(--mint-600)] font-medium' : 'text-[var(--error)]'}>
              {accountStatus.payoutsEnabled ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--gray-600)]">Details Submitted:</span>
            <span className={accountStatus.detailsSubmitted ? 'text-[var(--mint-600)] font-medium' : 'text-[var(--amber-600)]'}>
              {accountStatus.detailsSubmitted ? 'Yes' : 'Incomplete'}
            </span>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-[var(--gray-200)]">
        {getActionButton()}
      </div>

      <p className="mt-4 text-xs text-[var(--gray-500)]">
        {accountStatus?.chargesEnabled
          ? 'Your Stripe account is active and can accept payments.'
          : 'Connect your Stripe account to start accepting payments from customers.'}
      </p>
    </div>
  );
}
