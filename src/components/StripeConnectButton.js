'use client';

import { useState } from 'react';
import { api } from '@/services/api';

export default function StripeConnectButton({ vendorId, accountStatus, onStatusUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const refreshUrl = window.location.href;
      const returnUrl = window.location.href;

      const response = await api(`/api/vendors/${vendorId}/stripe/account_link`, {
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
      await api(`/api/vendors/${vendorId}/stripe/refresh`, {
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
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
          Not Connected
        </span>
      );
    }

    if (accountStatus.chargesEnabled) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          Active
        </span>
      );
    }

    if (accountStatus.detailsSubmitted) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
          Under Review
        </span>
      );
    }

    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
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
          className="px-6 py-3 bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Loading...' : accountStatus?.connected ? 'Complete Onboarding' : 'Connect Stripe Account'}
        </button>
      );
    }

    return (
      <button
        onClick={handleRefreshStatus}
        disabled={loading}
        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? 'Refreshing...' : 'Refresh Status'}
      </button>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Stripe Payment Account</h3>
        {getStatusBadge()}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {accountStatus?.connected && (
        <div className="mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Charges Enabled:</span>
            <span className={accountStatus.chargesEnabled ? 'text-green-600 font-medium' : 'text-red-600'}>
              {accountStatus.chargesEnabled ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Payouts Enabled:</span>
            <span className={accountStatus.payoutsEnabled ? 'text-green-600 font-medium' : 'text-red-600'}>
              {accountStatus.payoutsEnabled ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Details Submitted:</span>
            <span className={accountStatus.detailsSubmitted ? 'text-green-600 font-medium' : 'text-yellow-600'}>
              {accountStatus.detailsSubmitted ? 'Yes' : 'Incomplete'}
            </span>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200">
        {getActionButton()}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        {accountStatus?.chargesEnabled
          ? 'Your Stripe account is active and can accept payments.'
          : 'Connect your Stripe account to start accepting payments from customers.'}
      </p>
    </div>
  );
}
