"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../services/api";
import { useAdminTimezone } from "../../../../contexts/AdminTimezoneContext";
import { EVENT_TYPES, VENDOR_CATEGORIES, normalizeEventType, normalizeVendorCategory, normalizeVendorCategories } from "../../../../constants/categories";

export default function AdminVendorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { formatDateTime, localInputToUtcIso, utcIsoToLocalInput, timezone } = useAdminTimezone();

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit vendor
  const [editingVendor, setEditingVendor] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Delete vendor
  const [showDeleteVendor, setShowDeleteVendor] = useState(false);
  const [deletingVendor, setDeletingVendor] = useState(false);

  // Fee rates
  const [feeRates, setFeeRates] = useState([]);
  const [feeRatesLoading, setFeeRatesLoading] = useState(true);

  // Add fee rate modal
  const [showAddFeeRate, setShowAddFeeRate] = useState(false);
  const [feeRateForm, setFeeRateForm] = useState({ fee_percent: "", starts_at: "", ends_at: "", notes: "" });
  const [savingFeeRate, setSavingFeeRate] = useState(false);
  const [feeRateError, setFeeRateError] = useState(null);

  // Edit fee rate modal
  const [editingFeeRate, setEditingFeeRate] = useState(null);
  const [editFeeRateForm, setEditFeeRateForm] = useState({});
  const [savingEditFeeRate, setSavingEditFeeRate] = useState(false);
  const [editFeeRateError, setEditFeeRateError] = useState(null);

  // Delete fee rate
  const [deletingFeeRate, setDeletingFeeRate] = useState(null);
  const [confirmDeleteFeeRate, setConfirmDeleteFeeRate] = useState(false);

  const vendorCategories = VENDOR_CATEGORIES;

  const fetchVendor = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api(`/api/admin/vendors/${id}`);
      setVendor(res.vendor);
      setFeeRates(res.vendor.feeRates || []);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load vendor");
    } finally {
      setLoading(false);
      setFeeRatesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  const openEditVendor = () => {
    setEditForm({
      name: vendor.name || "",
      description: vendor.description || "",
      location: vendor.location || "",
      collect_tax: vendor.collectTax ?? true,
      booking_advance_minutes: vendor.bookingAdvanceMinutes ?? 60,
      categories: normalizeVendorCategories(vendor.categories || []),
      event_types: (vendor.eventTypes || []).map(normalizeEventType).filter(Boolean),
    });
    setSaveError(null);
    setEditingVendor(true);
  };

  const toggleCategory = (cat) => {
    const normalizedCategory = normalizeVendorCategory(cat);
    setEditForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(normalizedCategory)
        ? prev.categories.filter((c) => c !== normalizedCategory)
        : [...prev.categories, normalizedCategory],
    }));
  };

  const toggleEventType = (eventType) => {
    const normalizedEventType = normalizeEventType(eventType);
    setEditForm((prev) => ({
      ...prev,
      event_types: (prev.event_types || []).includes(normalizedEventType)
        ? (prev.event_types || []).filter((type) => type !== normalizedEventType)
        : [...(prev.event_types || []), normalizedEventType],
    }));
  };

  const handleSaveVendor = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveError(null);
      const res = await api(`/api/admin/vendors/${id}`, {
        method: "PATCH",
        body: { vendor: { ...editForm, categories: normalizeVendorCategories(editForm.categories), event_types: editForm.event_types || [] } },
      });
      setVendor((prev) => ({ ...prev, ...res.vendor }));
      setEditingVendor(false);
    } catch (err) {
      setSaveError(err.message || "Failed to update vendor");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVendor = async () => {
    try {
      setDeletingVendor(true);
      await api(`/api/admin/vendors/${id}`, { method: "DELETE" });
      router.push("/admin/vendors");
    } catch (err) {
      alert(err.message || "Failed to delete vendor");
      setDeletingVendor(false);
      setShowDeleteVendor(false);
    }
  };

  const handleAddFeeRate = async (e) => {
    e.preventDefault();
    try {
      setSavingFeeRate(true);
      setFeeRateError(null);
      const body = {
        fee_percent: feeRateForm.fee_percent,
        starts_at: localInputToUtcIso(feeRateForm.starts_at),
        ends_at: localInputToUtcIso(feeRateForm.ends_at),
        notes: feeRateForm.notes,
      };
      const res = await api(`/api/admin/vendors/${id}/fee_rates`, {
        method: "POST",
        body: { fee_rate: body },
      });
      setFeeRates((prev) => [res.feeRate, ...prev]);
      setShowAddFeeRate(false);
      setFeeRateForm({ fee_percent: "", starts_at: "", ends_at: "", notes: "" });
    } catch (err) {
      setFeeRateError(err.message || "Failed to create fee rate");
    } finally {
      setSavingFeeRate(false);
    }
  };

  const openEditFeeRate = (rate) => {
    setEditingFeeRate(rate);
    setEditFeeRateForm({
      fee_percent: rate.feePercent,
      starts_at: utcIsoToLocalInput(rate.startsAt),
      ends_at: utcIsoToLocalInput(rate.endsAt),
      notes: rate.notes || "",
    });
    setEditFeeRateError(null);
  };

  const handleSaveEditFeeRate = async (e) => {
    e.preventDefault();
    try {
      setSavingEditFeeRate(true);
      setEditFeeRateError(null);
      const body = {
        fee_percent: editFeeRateForm.fee_percent,
        starts_at: localInputToUtcIso(editFeeRateForm.starts_at),
        ends_at: localInputToUtcIso(editFeeRateForm.ends_at),
        notes: editFeeRateForm.notes,
      };
      const res = await api(`/api/admin/vendors/${id}/fee_rates/${editingFeeRate.id}`, {
        method: "PATCH",
        body: { fee_rate: body },
      });
      setFeeRates((prev) => prev.map((r) => (r.id === editingFeeRate.id ? res.feeRate : r)));
      setEditingFeeRate(null);
    } catch (err) {
      setEditFeeRateError(err.message || "Failed to update fee rate");
    } finally {
      setSavingEditFeeRate(false);
    }
  };

  const handleDeleteFeeRate = async () => {
    try {
      setConfirmDeleteFeeRate(true);
      await api(`/api/admin/vendors/${id}/fee_rates/${deletingFeeRate.id}`, { method: "DELETE" });
      setFeeRates((prev) => prev.filter((r) => r.id !== deletingFeeRate.id));
      setDeletingFeeRate(null);
    } catch (err) {
      alert(err.message || "Failed to delete fee rate");
    } finally {
      setConfirmDeleteFeeRate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--violet-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{error}</div>
      </div>
    );
  }

  if (!vendor) return null;

  const totalRevenue = (vendor.totalRevenueCents || 0) / 100;

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-[var(--gray-500)]">
        <Link href="/admin/vendors" className="hover:text-[var(--violet-600)] transition-colors">
          Vendors
        </Link>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-[var(--gray-900)] font-medium">{vendor.name}</span>
      </div>

      {/* Vendor Profile Card */}
      <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {(vendor.profileImage || vendor.heroImage) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.profileImage || vendor.heroImage} alt={vendor.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)] flex items-center justify-center text-white text-2xl font-bold">
                {vendor.name?.charAt(0) || "V"}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-[var(--gray-900)]">{vendor.name}</h1>
              {vendor.location && <p className="text-sm text-[var(--gray-500)] mt-0.5">{vendor.location}</p>}
              {vendor.categories?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {vendor.categories.map((cat) => (
                    <span key={cat} className="px-2 py-0.5 bg-[var(--violet-50)] text-[var(--violet-700)] rounded-full text-xs font-medium">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openEditVendor}
              className="px-4 py-2 text-sm font-medium text-[var(--gray-700)] border border-[var(--gray-300)] rounded-lg hover:bg-[var(--gray-50)] transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteVendor(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {vendor.description && (
          <p className="mt-4 text-sm text-[var(--gray-600)] leading-relaxed">{vendor.description}</p>
        )}

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-[var(--gray-100)]">
          <div>
            <p className="text-xs text-[var(--gray-500)] uppercase tracking-wide font-medium">Orders</p>
            <p className="text-lg font-bold text-[var(--gray-900)] mt-0.5">{vendor.ordersCount ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--gray-500)] uppercase tracking-wide font-medium">Revenue</p>
            <p className="text-lg font-bold text-[var(--gray-900)] mt-0.5">${totalRevenue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--gray-500)] uppercase tracking-wide font-medium">Rating</p>
            <p className="text-lg font-bold text-[var(--gray-900)] mt-0.5">{vendor.rating ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--gray-500)] uppercase tracking-wide font-medium">Tax</p>
            <p className="text-lg font-bold text-[var(--gray-900)] mt-0.5">{vendor.collectTax ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      {/* Owner & Stripe Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {/* Owner */}
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-5">
          <h2 className="text-sm font-semibold text-[var(--gray-700)] uppercase tracking-wide mb-4">Owner</h2>
          {vendor.ownerName || vendor.ownerEmail ? (
            <div className="space-y-2">
              {vendor.ownerName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--gray-500)]">Name</span>
                  <span className="text-sm font-medium text-[var(--gray-900)]">{vendor.ownerName}</span>
                </div>
              )}
              {vendor.ownerEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--gray-500)]">Email</span>
                  <span className="text-sm font-medium text-[var(--gray-900)]">{vendor.ownerEmail}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--gray-400)]">No owner assigned</p>
          )}
        </div>

        {/* Stripe */}
        <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-5">
          <h2 className="text-sm font-semibold text-[var(--gray-700)] uppercase tracking-wide mb-4">Stripe</h2>
          <div className="space-y-2">
            {[
              { label: "Charges enabled", value: vendor.stripeChargesEnabled },
              { label: "Onboarding complete", value: vendor.stripeOnboardingCompleted },
              { label: "Payouts enabled", value: vendor.stripePayoutsEnabled },
              { label: "Details submitted", value: vendor.stripeDetailsSubmitted },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-[var(--gray-500)]">{label}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  value ? "bg-green-100 text-green-700" : "bg-[var(--gray-100)] text-[var(--gray-500)]"
                }`}>
                  {value ? "Yes" : "No"}
                </span>
              </div>
            ))}
            {vendor.stripeConnectedAt && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-[var(--gray-500)]">Connected</span>
                <span className="text-sm text-[var(--gray-700)]">
                  {new Date(vendor.stripeConnectedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fee Rates */}
      <div className="bg-white rounded-2xl border border-[var(--gray-200)] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-[var(--gray-900)]">Fee Rates</h2>
            <p className="text-xs text-[var(--gray-500)] mt-0.5">
              Platform fee overrides for this vendor. Vendor-wide rates apply when no date-specific rate is active.
            </p>
          </div>
          <button
            onClick={() => { setShowAddFeeRate(true); setFeeRateError(null); setFeeRateForm({ fee_percent: "", starts_at: "", ends_at: "", notes: "" }); }}
            className="px-4 py-2 bg-[var(--violet-600)] text-white text-sm font-medium rounded-lg hover:bg-[var(--violet-700)] transition-colors"
          >
            + Add Rate
          </button>
        </div>

        {feeRatesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-[var(--violet-600)] border-t-transparent rounded-full" />
          </div>
        ) : feeRates.length === 0 ? (
          <div className="text-center py-8 text-[var(--gray-400)] text-sm">
            No custom fee rates. Default platform rate applies.
          </div>
        ) : (
          <div className="space-y-3">
            {feeRates.map((rate) => (
              <div key={rate.id} className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-100)]">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-[var(--violet-600)]">{rate.feePercent}%</p>
                    <p className="text-xs text-[var(--gray-500)]">fee</p>
                  </div>
                  <div>
                    {rate.startsAt || rate.endsAt ? (
                      <p className="text-sm font-medium text-[var(--gray-800)]">
                        {rate.startsAt ? formatDateTime(rate.startsAt) : "Open"}
                        {" → "}
                        {rate.endsAt ? formatDateTime(rate.endsAt) : "Open"}
                      </p>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--violet-100)] text-[var(--violet-700)]">
                        Vendor-wide default
                      </span>
                    )}
                    {rate.notes && (
                      <p className="text-xs text-[var(--gray-500)] mt-1">{rate.notes}</p>
                    )}
                    <p className="text-xs text-[var(--gray-400)] mt-1">
                      Added {new Date(rate.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEditFeeRate(rate)}
                    className="px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] hover:bg-white border border-[var(--gray-200)] rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingFeeRate(rate)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Vendor Modal */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--gray-900)]">Edit Vendor</h2>
                <button onClick={() => setEditingVendor(false)} className="text-[var(--gray-400)] hover:text-[var(--gray-600)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSaveVendor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Booking Lead Time (min)</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.booking_advance_minutes}
                      onChange={(e) => setEditForm((p) => ({ ...p, booking_advance_minutes: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)]"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.collect_tax}
                        onChange={(e) => setEditForm((p) => ({ ...p, collect_tax: e.target.checked }))}
                        className="w-4 h-4 text-[var(--violet-600)] rounded"
                      />
                      <span className="text-sm font-medium text-[var(--gray-700)]">Collect Tax</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {vendorCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          editForm.categories?.includes(cat)
                            ? "bg-[var(--violet-600)] text-white"
                            : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Bookable Event Types</label>
                  <p className="text-xs text-[var(--gray-500)] mb-2">Leave blank if this vendor is open to any event type.</p>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((type) => (
                      <button
                        key={type.slug}
                        type="button"
                        onClick={() => toggleEventType(type.slug)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          editForm.event_types?.includes(type.slug)
                            ? "bg-[var(--violet-600)] text-white"
                            : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditingVendor(false)} className="flex-1 py-2 border border-[var(--gray-300)] rounded-lg text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="flex-1 py-2 bg-[var(--violet-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--violet-700)] disabled:opacity-50 transition-colors">
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Vendor Modal */}
      {showDeleteVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-2">Delete Vendor</h3>
            <p className="text-sm text-[var(--gray-600)] mb-6">
              Are you sure you want to delete <strong>{vendor.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteVendor(false)} disabled={deletingVendor} className="flex-1 py-2 border border-[var(--gray-300)] rounded-lg text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteVendor} disabled={deletingVendor} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deletingVendor ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Fee Rate Modal */}
      {showAddFeeRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--gray-900)]">Add Fee Rate</h2>
                <button onClick={() => setShowAddFeeRate(false)} className="text-[var(--gray-400)] hover:text-[var(--gray-600)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <FeeRateForm
                form={feeRateForm}
                setForm={setFeeRateForm}
                onSubmit={handleAddFeeRate}
                onCancel={() => setShowAddFeeRate(false)}
                saving={savingFeeRate}
                error={feeRateError}
                submitLabel="Add Rate"
                timezone={timezone}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Fee Rate Modal */}
      {editingFeeRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--gray-900)]">Edit Fee Rate</h2>
                <button onClick={() => setEditingFeeRate(null)} className="text-[var(--gray-400)] hover:text-[var(--gray-600)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <FeeRateForm
                form={editFeeRateForm}
                setForm={setEditFeeRateForm}
                onSubmit={handleSaveEditFeeRate}
                onCancel={() => setEditingFeeRate(null)}
                saving={savingEditFeeRate}
                error={editFeeRateError}
                submitLabel="Save Changes"
                timezone={timezone}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Fee Rate Modal */}
      {deletingFeeRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-2">Delete Fee Rate</h3>
            <p className="text-sm text-[var(--gray-600)] mb-6">
              Delete the <strong>{deletingFeeRate.feePercent}%</strong> fee rate? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingFeeRate(null)} disabled={confirmDeleteFeeRate} className="flex-1 py-2 border border-[var(--gray-300)] rounded-lg text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteFeeRate} disabled={confirmDeleteFeeRate} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {confirmDeleteFeeRate ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Time options in 30-minute increments, e.g. "12:00 AM", "12:30 AM", ...
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  const h24 = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const label = `${h12}:${String(min).padStart(2, "0")} ${period}`;
  const value = `${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  return { label, value };
});

// Split a "YYYY-MM-DDTHH:mm" string into its date and time parts.
function splitDatetime(datetimeLocal) {
  if (!datetimeLocal) return { date: "", time: "" };
  const [date, time = ""] = datetimeLocal.split("T");
  // Snap the time to the nearest 30-min slot so pre-filled values match an option.
  const [h = "00", m = "00"] = time.split(":");
  const totalMin = parseInt(h, 10) * 60 + parseInt(m, 10);
  const snapped = Math.round(totalMin / 30) * 30;
  const sh = String(Math.floor(snapped / 60) % 24).padStart(2, "0");
  const sm = String(snapped % 60).padStart(2, "0");
  return { date, time: `${sh}:${sm}` };
}

function DateTimeSelect({ value, onChange, label }) {
  const { date, time } = splitDatetime(value);

  const handleDate = (e) => {
    const newDate = e.target.value;
    if (!newDate) { onChange(""); return; }
    onChange(`${newDate}T${time || "09:00"}`);
  };

  const handleTime = (e) => {
    if (!date) return;
    onChange(`${date}T${e.target.value}`);
  };

  const selectClass = "px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] bg-white";

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={handleDate}
          className={`flex-1 min-w-0 ${selectClass}`}
        />
        <select
          value={time}
          onChange={handleTime}
          disabled={!date}
          className={`w-32 flex-shrink-0 ${selectClass} disabled:opacity-40`}
        >
          <option value="">Time</option>
          {TIME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function FeeRateForm({ form, setForm, onSubmit, onCancel, saving, error, submitLabel, timezone }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
          Fee Percent <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="number"
            required
            min="0"
            max="100"
            step="0.01"
            value={form.fee_percent}
            onChange={(e) => setForm((p) => ({ ...p, fee_percent: e.target.value }))}
            placeholder="e.g. 5.00"
            className="w-full px-3 py-2 pr-8 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)]"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] text-sm">%</span>
        </div>
      </div>
      <DateTimeSelect
        label="Starts At"
        value={form.starts_at}
        onChange={(v) => setForm((p) => ({ ...p, starts_at: v }))}
      />
      <DateTimeSelect
        label="Ends At"
        value={form.ends_at}
        onChange={(v) => setForm((p) => ({ ...p, ends_at: v }))}
      />
      <p className="text-xs text-[var(--gray-500)] -mt-2">
        Times are in <span className="font-medium">{timezone}</span>. Leave both empty to create a vendor-wide default rate.
      </p>
      <div>
        <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">Notes</label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Optional description"
          className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)]"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-2 border border-[var(--gray-300)] rounded-lg text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 py-2 bg-[var(--violet-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--violet-700)] disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
