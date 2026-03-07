"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "../../../services/api";
import { useAdminTimezone } from "../../../contexts/AdminTimezoneContext";

export default function AdminFeesPage() {
  const { formatDateTime } = useAdminTimezone();

  // Platform fee percent state
  const [platformFee, setPlatformFee] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Platform fixed fee cents state
  const [fixedCents, setFixedCents] = useState(null);
  const [editingFixed, setEditingFixed] = useState(false);
  const [editFixedValue, setEditFixedValue] = useState("");
  const [savingFixed, setSavingFixed] = useState(false);
  const [saveFixedError, setSaveFixedError] = useState(null);

  // Vendor fee rates state
  const [feeRates, setFeeRates] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const res = await api("/api/admin/settings");
      setPlatformFee(res.platformFeePercent);
      setFixedCents(res.platformFeeFixedCents);
      setSettingsError(null);
    } catch (err) {
      setSettingsError(err.message || "Failed to load settings");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const fetchFeeRates = useCallback(async () => {
    try {
      setRatesLoading(true);
      const res = await api("/api/admin/fee_rates");
      setFeeRates(res.feeRates || []);
      setRatesError(null);
    } catch (err) {
      setRatesError(err.message || "Failed to load vendor fee rates");
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchFeeRates();
  }, [fetchSettings, fetchFeeRates]);

  const openEdit = () => {
    setEditValue(platformFee?.toString() ?? "");
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0 || val > 100) {
      setSaveError("Fee must be a number between 0 and 100");
      return;
    }
    try {
      setSaving(true);
      setSaveError(null);
      const res = await api("/api/admin/settings", {
        method: "PATCH",
        body: { platformFeePercent: val },
      });
      setPlatformFee(res.platformFeePercent);
      setEditing(false);
    } catch (err) {
      setSaveError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const openEditFixed = () => {
    setEditFixedValue(fixedCents?.toString() ?? "");
    setSaveFixedError(null);
    setEditingFixed(true);
  };

  const cancelEditFixed = () => {
    setEditingFixed(false);
    setSaveFixedError(null);
  };

  const handleSaveFixed = async (e) => {
    e.preventDefault();
    const val = parseInt(editFixedValue, 10);
    if (isNaN(val) || val < 0) {
      setSaveFixedError("Fixed fee must be 0 or greater");
      return;
    }
    try {
      setSavingFixed(true);
      setSaveFixedError(null);
      const res = await api("/api/admin/settings", {
        method: "PATCH",
        body: { platformFeeFixedCents: val },
      });
      setFixedCents(res.platformFeeFixedCents);
      setEditingFixed(false);
    } catch (err) {
      setSaveFixedError(err.message || "Failed to save");
    } finally {
      setSavingFixed(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Fees</h1>
        <p className="text-[var(--gray-500)] mt-1">
          Manage platform-wide fee settings and view vendor-specific overrides.
        </p>
      </div>

      {/* Platform Fee Section */}
      <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-6 mb-6 space-y-6">
        <h2 className="text-base font-semibold text-[var(--gray-900)]">Platform Application Fee</h2>

        {settingsLoading ? (
          <div className="flex items-center gap-2 py-2">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--violet-600)] border-t-transparent rounded-full" />
            <span className="text-sm text-[var(--gray-500)]">Loading…</span>
          </div>
        ) : settingsError ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {settingsError}
          </div>
        ) : (
          <>
            {/* Fee Percent row */}
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-[var(--gray-100)]">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--gray-700)]">Fee Percent</p>
                <p className="text-xs text-[var(--gray-500)] mt-0.5">
                  Percentage of each order charged as a platform fee. Vendor-specific rates take precedence.
                </p>
                {editing ? (
                  <form onSubmit={handleSave} className="flex items-end gap-3 mt-3">
                    <div className="max-w-xs w-full">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          className="w-full px-3 py-2 pr-8 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] text-sm">%</span>
                      </div>
                      {saveError && <p className="text-xs text-red-600 mt-1">{saveError}</p>}
                    </div>
                    <button type="submit" disabled={saving} className="px-4 py-2 bg-[var(--violet-600)] text-white text-sm font-medium rounded-lg hover:bg-[var(--violet-700)] disabled:opacity-50 transition-colors">
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={cancelEdit} className="px-4 py-2 border border-[var(--gray-300)] text-sm font-medium text-[var(--gray-700)] rounded-lg hover:bg-[var(--gray-50)] transition-colors">
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="mt-2 text-3xl font-bold text-[var(--violet-600)]">
                    {parseFloat(platformFee).toFixed(2)}%
                  </div>
                )}
              </div>
              {!editing && (
                <button onClick={openEdit} className="flex-shrink-0 px-4 py-2 text-sm font-medium text-[var(--gray-700)] border border-[var(--gray-300)] rounded-lg hover:bg-[var(--gray-50)] transition-colors">
                  Edit
                </button>
              )}
            </div>

            {/* Fixed Fee Cents row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--gray-700)]">Fixed Fee</p>
                <p className="text-xs text-[var(--gray-500)] mt-0.5">
                  Flat cent amount added to every platform fee calculation (e.g. 30 = $0.30).
                </p>
                {editingFixed ? (
                  <form onSubmit={handleSaveFixed} className="flex items-end gap-3 mt-3">
                    <div className="max-w-xs w-full">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={editFixedValue}
                          onChange={(e) => setEditFixedValue(e.target.value)}
                          autoFocus
                          className="w-full px-3 py-2 pr-12 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] text-sm">¢</span>
                      </div>
                      {saveFixedError && <p className="text-xs text-red-600 mt-1">{saveFixedError}</p>}
                    </div>
                    <button type="submit" disabled={savingFixed} className="px-4 py-2 bg-[var(--violet-600)] text-white text-sm font-medium rounded-lg hover:bg-[var(--violet-700)] disabled:opacity-50 transition-colors">
                      {savingFixed ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={cancelEditFixed} className="px-4 py-2 border border-[var(--gray-300)] text-sm font-medium text-[var(--gray-700)] rounded-lg hover:bg-[var(--gray-50)] transition-colors">
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[var(--violet-600)]">
                      {fixedCents}
                    </span>
                    <span className="text-sm text-[var(--gray-500)]">
                      cents (${(parseInt(fixedCents) / 100).toFixed(2)})
                    </span>
                  </div>
                )}
              </div>
              {!editingFixed && (
                <button onClick={openEditFixed} className="flex-shrink-0 px-4 py-2 text-sm font-medium text-[var(--gray-700)] border border-[var(--gray-300)] rounded-lg hover:bg-[var(--gray-50)] transition-colors">
                  Edit
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Vendor Fee Overrides Section */}
      <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-[var(--gray-900)]">Vendor Fee Rates</h2>
          <p className="text-xs text-[var(--gray-500)] mt-0.5">
            Custom fee rates set per vendor. To edit or delete a rate, visit the vendor&apos;s page.
          </p>
        </div>

        {ratesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--violet-600)] border-t-transparent rounded-full" />
          </div>
        ) : ratesError ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {ratesError}
          </div>
        ) : feeRates.length === 0 ? (
          <div className="text-center py-12 text-[var(--gray-400)] text-sm">
            No vendor-specific fee overrides have been set.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--gray-200)] bg-[var(--gray-50)]">
                    <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Vendor</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Fee</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Date Range</th>
                    <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--gray-100)]">
                  {feeRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-[var(--gray-50)] transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/vendors/${rate.vendorId}`}
                          className="font-medium text-[var(--violet-600)] hover:underline"
                        >
                          {rate.vendorName || rate.vendorId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--violet-600)]">
                        {rate.feePercent}%
                      </td>
                      <td className="px-4 py-3">
                        {rate.startsAt || rate.endsAt ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Date-specific
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--violet-100)] text-[var(--violet-700)]">
                            Vendor-wide
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">
                        {rate.startsAt || rate.endsAt ? (
                          <span>
                            {rate.startsAt ? formatDateTime(rate.startsAt) : "Open"}
                            {" → "}
                            {rate.endsAt ? formatDateTime(rate.endsAt) : "Open"}
                          </span>
                        ) : (
                          <span className="text-[var(--gray-400)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--gray-500)]">
                        {rate.notes || <span className="text-[var(--gray-300)]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {feeRates.map((rate) => (
                <div
                  key={rate.id}
                  className="p-4 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-100)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Link
                      href={`/admin/vendors/${rate.vendorId}`}
                      className="font-semibold text-[var(--violet-600)] hover:underline"
                    >
                      {rate.vendorName || rate.vendorId}
                    </Link>
                    <span className="text-lg font-bold text-[var(--violet-600)]">
                      {rate.feePercent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {rate.startsAt || rate.endsAt ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Date-specific
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--violet-100)] text-[var(--violet-700)]">
                        Vendor-wide
                      </span>
                    )}
                  </div>
                  {(rate.startsAt || rate.endsAt) && (
                    <p className="text-xs text-[var(--gray-600)] mb-1">
                      {rate.startsAt ? formatDateTime(rate.startsAt) : "Open"}
                      {" → "}
                      {rate.endsAt ? formatDateTime(rate.endsAt) : "Open"}
                    </p>
                  )}
                  {rate.notes && (
                    <p className="text-xs text-[var(--gray-500)]">{rate.notes}</p>
                  )}
                  <div className="mt-2">
                    <Link
                      href={`/admin/vendors/${rate.vendorId}`}
                      className="text-xs text-[var(--violet-600)] hover:underline font-medium"
                    >
                      Edit on vendor page →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
