"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../services/api";
import { EVENT_TYPES, VENDOR_CATEGORIES, normalizeEventType, normalizeVendorCategory, normalizeVendorCategories } from "../../../constants/categories";

export default function AdminVendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [stripeFilter, setStripeFilter] = useState("");

  // Edit modal
  const [editingVendor, setEditingVendor] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "", description: "", location: "", collect_tax: true, booking_advance_minutes: 60, categories: [], event_types: []
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Delete confirmation
  const [deletingVendor, setDeletingVendor] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const vendorCategories = VENDOR_CATEGORIES;

  const fetchVendors = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), per_page: "20" });
      if (search) params.append("search", search);
      if (stripeFilter) params.append("stripe_enabled", stripeFilter);

      const res = await api(`/api/admin/vendors?${params.toString()}`);
      setVendors(res.vendors || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [search, stripeFilter]);

  useEffect(() => {
    fetchVendors(1);
  }, [fetchVendors]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVendors(1);
  };

  const openEditModal = (vendor) => {
    setEditingVendor(vendor);
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
  };

  const closeEditModal = () => {
    setEditingVendor(null);
    setSaveError(null);
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
      event_types: prev.event_types.includes(normalizedEventType)
        ? prev.event_types.filter((type) => type !== normalizedEventType)
        : [...prev.event_types, normalizedEventType],
    }));
  };

  const handleSaveVendor = async (e) => {
    e.preventDefault();
    if (!editingVendor) return;
    try {
      setSaving(true);
      setSaveError(null);
      const res = await api(`/api/admin/vendors/${editingVendor.id}`, {
        method: "PATCH",
        body: { vendor: { ...editForm, categories: normalizeVendorCategories(editForm.categories), event_types: editForm.event_types } },
      });
      setVendors((prev) => prev.map((v) => (v.id === editingVendor.id ? res.vendor : v)));
      closeEditModal();
    } catch (err) {
      setSaveError(err.message || "Failed to update vendor");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVendor = async () => {
    if (!deletingVendor) return;
    try {
      setDeleting(true);
      await api(`/api/admin/vendors/${deletingVendor.id}`, { method: "DELETE" });
      setVendors((prev) => prev.filter((v) => v.id !== deletingVendor.id));
      setDeletingVendor(null);
    } catch (err) {
      alert(err.message || "Failed to delete vendor");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)]">Vendors</h1>
          <p className="text-sm text-[var(--gray-500)] mt-1">
            {pagination.total} vendor{pagination.total !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="mb-6 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or location..."
          className="flex-1 px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)]"
        />
        <select
          value={stripeFilter}
          onChange={(e) => setStripeFilter(e.target.value)}
          className="px-3 py-2 border border-[var(--gray-300)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)]"
        >
          <option value="">All Stripe statuses</option>
          <option value="true">Stripe enabled</option>
          <option value="false">Stripe not enabled</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--violet-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--violet-700)] transition-colors"
        >
          Search
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--violet-600)] border-t-transparent rounded-full" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16 text-[var(--gray-500)]">No vendors found.</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--gray-50)] border-b border-[var(--gray-200)]">
                  <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Vendor</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Location</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Stripe</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--gray-700)]">Joined</th>
                  <th className="text-right px-4 py-3 font-semibold text-[var(--gray-700)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-[var(--gray-50)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {(vendor.profileImage || vendor.heroImage) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={vendor.profileImage || vendor.heroImage} alt={vendor.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {vendor.name?.charAt(0) || "V"}
                          </div>
                        )}
                        <div>
                          <Link href={`/admin/vendors/${vendor.id}`} className="font-medium text-[var(--violet-600)] hover:underline">
                            {vendor.name}
                          </Link>
                          {vendor.categories?.length > 0 && (
                            <p className="text-xs text-[var(--gray-500)]">{vendor.categories.slice(0, 2).join(", ")}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--gray-700)]">
                      <p>{vendor.ownerName || "—"}</p>
                      <p className="text-xs text-[var(--gray-500)]">{vendor.ownerEmail || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--gray-600)]">{vendor.location || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        vendor.stripeChargesEnabled
                          ? "bg-green-100 text-green-700"
                          : "bg-[var(--gray-100)] text-[var(--gray-600)]"
                      }`}>
                        {vendor.stripeChargesEnabled ? "Enabled" : "Not enabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--gray-500)] text-xs">
                      {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                          className="px-3 py-1.5 text-xs font-medium text-[var(--violet-600)] hover:bg-[var(--violet-50)] rounded-lg transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openEditModal(vendor)}
                          className="px-3 py-1.5 text-xs font-medium text-[var(--gray-700)] hover:bg-[var(--gray-100)] rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingVendor(vendor)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="bg-white rounded-xl border border-[var(--gray-200)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {(vendor.profileImage || vendor.heroImage) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vendor.profileImage || vendor.heroImage} alt={vendor.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {vendor.name?.charAt(0) || "V"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link href={`/admin/vendors/${vendor.id}`} className="font-semibold text-[var(--violet-600)] hover:underline truncate">
                        {vendor.name}
                      </Link>
                      <p className="text-xs text-[var(--gray-500)]">{vendor.ownerName || "No owner"}</p>
                      {vendor.location && <p className="text-xs text-[var(--gray-500)]">{vendor.location}</p>}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    vendor.stripeChargesEnabled ? "bg-green-100 text-green-700" : "bg-[var(--gray-100)] text-[var(--gray-600)]"
                  }`}>
                    {vendor.stripeChargesEnabled ? "Stripe ✓" : "No Stripe"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/admin/vendors/${vendor.id}`)}
                    className="flex-1 py-1.5 text-xs font-medium text-[var(--violet-600)] border border-[var(--violet-200)] rounded-lg hover:bg-[var(--violet-50)] transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => openEditModal(vendor)}
                    className="flex-1 py-1.5 text-xs font-medium text-[var(--gray-700)] border border-[var(--gray-200)] rounded-lg hover:bg-[var(--gray-50)] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingVendor(vendor)}
                    className="flex-1 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-[var(--gray-500)]">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchVendors(pagination.page - 1)}
                  className="px-3 py-1.5 border border-[var(--gray-300)] rounded-lg disabled:opacity-40 hover:bg-[var(--gray-50)] transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchVendors(pagination.page + 1)}
                  className="px-3 py-1.5 border border-[var(--gray-300)] rounded-lg disabled:opacity-40 hover:bg-[var(--gray-50)] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[var(--gray-900)]">Edit Vendor</h2>
                <button onClick={closeEditModal} className="text-[var(--gray-400)] hover:text-[var(--gray-600)]">
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
                          editForm.categories.includes(cat)
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
                          editForm.event_types.includes(type.slug)
                            ? "bg-[var(--violet-600)] text-white"
                            : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                {saveError && (
                  <p className="text-sm text-red-600">{saveError}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="flex-1 py-2 border border-[var(--gray-300)] rounded-lg text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 bg-[var(--violet-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--violet-700)] disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-2">Delete Vendor</h3>
              <p className="text-sm text-[var(--gray-600)] mb-6">
                Are you sure you want to delete <strong>{deletingVendor.name}</strong>? This action cannot be undone and will remove all associated data.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingVendor(null)}
                  disabled={deleting}
                  className="flex-1 py-2 border border-[var(--gray-300)] rounded-lg text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-50)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteVendor}
                  disabled={deleting}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
