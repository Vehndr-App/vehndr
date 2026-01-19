"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "../../../components/AuthGate";
import { api } from "../../../services/api";
import { getCurrentUser } from "../../../services/auth";

const OFFERING_TYPES = [
  { value: "flat_booth", label: "Flat Booth" },
  { value: "hourly", label: "Hourly" }
];

export default function OfferingsPage() {
  return (
    <AuthGate>
      <OfferingsInner />
    </AuthGate>
  );
}

function OfferingsInner() {
  const [vendorId, setVendorId] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    offeringType: "flat_booth",
    price: "",
    description: "",
    active: true
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (!user?.vendorId) {
          setVendorId(null);
          setOfferings([]);
          return;
        }
        setVendorId(user.vendorId);
        await fetchOfferings(user.vendorId);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const fetchOfferings = async (id) => {
    try {
      const data = await api(`/api/vendors/${id}/offerings`);
      setOfferings(Array.isArray(data) ? data : data?.offerings || []);
    } catch (err) {
      console.error("Failed to fetch offerings", err);
      setOfferings([]);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!vendorId) return;

    setSaving(true);
    setError(null);

    try {
      await api(`/api/vendors/${vendorId}/offerings`, {
        method: "POST",
        body: {
          vendor_offering: {
            title: formData.title,
            offering_type: formData.offeringType,
            price_cents: Math.round(Number(formData.price || 0) * 100),
            description: formData.description,
            active: formData.active
          }
        }
      });

      setFormData({
        title: "",
        offeringType: "flat_booth",
        price: "",
        description: "",
        active: true
      });
      await fetchOfferings(vendorId);
    } catch (err) {
      console.error("Failed to create offering", err);
      setError(err?.details?.error || err?.details?.errors?.join(", ") || "Failed to save offering.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      <div className="bg-white border-b border-[var(--gray-100)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Link href="/dashboard" className="text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)]">
            ← Back to Dashboard
          </Link>
          <h1 className="text-h2 text-[var(--foreground)] mt-3">Event Offerings</h1>
          <p className="text-sm text-[var(--gray-500)] mt-1">
            Add booth or hourly offerings for event hosts.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="section-header">
            <h2 className="text-h3 text-[var(--foreground)]">Add Offering</h2>
          </div>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--gray-600)]">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="input mt-2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--gray-600)]">Offering Type</label>
              <select
                value={formData.offeringType}
                onChange={(e) => handleChange("offeringType", e.target.value)}
                className="input mt-2"
              >
                {OFFERING_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[var(--gray-600)]">Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                className="input mt-2"
                placeholder="0.00"
                required
              />
              <p className="text-xs text-[var(--gray-400)] mt-1">
                {formData.offeringType === "hourly" ? "Hourly rate" : "Flat booth price"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--gray-600)]">Active</label>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => handleChange("active", e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--gray-300)] text-[var(--violet-600)]"
                />
                <span className="text-sm text-[var(--gray-600)]">Show to coordinators</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--gray-600)]">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="input mt-2 min-h-[120px] py-3"
              placeholder="Share what's included in this offering."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !vendorId}
              className="btn btn-gradient px-6"
            >
              {saving ? "Saving..." : "Save Offering"}
            </button>
          </div>
        </form>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3 text-[var(--foreground)]">Your Offerings</h2>
            <button
              type="button"
              onClick={() => vendorId && fetchOfferings(vendorId)}
              className="btn btn-ghost text-sm"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-[var(--gray-500)]">Loading offerings...</div>
          ) : offerings.length === 0 ? (
            <div className="text-sm text-[var(--gray-500)]">No offerings yet.</div>
          ) : (
            <div className="divide-y divide-[var(--gray-100)]">
              {offerings.map((offering) => (
                <div key={offering.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{offering.title}</p>
                    <p className="text-sm text-[var(--gray-500)]">
                      {offering.offeringType === "hourly" ? "Hourly" : "Flat booth"} • ${(offering.priceCents / 100).toFixed(2)}
                    </p>
                    {offering.description && (
                      <p className="text-sm text-[var(--gray-400)] mt-1">{offering.description}</p>
                    )}
                  </div>
                  <span className={`chip ${offering.active ? "bg-[var(--mint-100)] text-[var(--mint-600)]" : "chip-filled"}`}>
                    {offering.active ? "Active" : "Hidden"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

