"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "../../../components/AuthGate";
import GuidanceModal from "../../../components/GuidanceModal";
import { api } from "../../../services/api";
import { getCurrentUser } from "../../../services/auth";

const OFFERING_TYPES = [
  {
    value: "flat_booth",
    label: "Flat Booth",
    description: "One fixed fee for your booth/space. Organizer pays once; you attend for the whole event.",
    icon: "flat_booth"
  },
  {
    value: "hourly",
    label: "Hourly (Book Vendor)",
    description: "Organizer pays per hour you're there. Good for DJs, photographers, bartenders.",
    icon: "hourly"
  },
  {
    value: "trade",
    label: "Trade for Exposure",
    description: "No fee; you get visibility at the event in exchange for your presence.",
    icon: "trade"
  },
  {
    value: "free_with_sales",
    label: "Free + Sales Allowed",
    description: "Free to book; you sell products/services on-site and keep the revenue.",
    icon: "free_with_sales"
  },
  {
    value: "package",
    label: "Package",
    description: "Bundled service (e.g., 4-hour DJ + lighting). Organizer pays one price for everything.",
    icon: "package"
  }
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
  const [showIntroModal, setShowIntroModal] = useState(false);
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
    setFormData((prev) => {
      if (field === "offeringType") {
        const isFreeType = value === "trade" || value === "free_with_sales";
        return {
          ...prev,
          offeringType: value,
          price: isFreeType ? "0" : prev.price
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!vendorId) return;

    setSaving(true);
    setError(null);

    try {
      const isFreeType = formData.offeringType === "trade" || formData.offeringType === "free_with_sales";
      await api(`/api/vendors/${vendorId}/offerings`, {
        method: "POST",
        body: {
          vendor_offering: {
            title: formData.title,
            offering_type: formData.offeringType,
            price_cents: isFreeType ? 0 : Math.round(Number(formData.price || 0) * 100),
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
          <div className="flex items-start justify-between gap-4 mt-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[var(--violet-100)] flex items-center justify-center flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/onboarding/offerings-hero.svg" alt="" className="w-8 h-8 object-contain" />
              </div>
              <div>
              <h1 className="text-h2 text-[var(--foreground)]">Event Offerings & Packages</h1>
              <p className="text-sm text-[var(--gray-600)] mt-1 max-w-xl">
                Event organizers can book you for their event and pay a flat fee, hourly rate, or package—like a buyout or bar tab. Define how you want to be booked.
              </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIntroModal(true)}
              className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center text-[var(--violet-600)] hover:bg-[var(--violet-200)] transition-colors flex-shrink-0"
              aria-label="Learn more about event offerings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <GuidanceModal
        isOpen={showIntroModal}
        onClose={() => setShowIntroModal(false)}
        title="What are Event Offerings?"
        description="Event offerings are how organizers book you for their event. Think of it like a buyout or bar tab—they pay you to be there. You can charge a flat booth fee, hourly rate, trade for exposure, allow free booking with on-site sales, or offer bundled packages. Choose what works best for your business."
        primaryAction={{ label: "Got it", onClick: () => setShowIntroModal(false) }}
      />

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
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-[var(--gray-600)] block mb-3">Offering Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OFFERING_TYPES.map((type) => {
                  const isSelected = formData.offeringType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange("offeringType", type.value)}
                      className={`text-left p-4 rounded-[var(--radius-xl)] border-2 transition-all min-h-[80px] flex flex-col gap-1 ${
                        isSelected
                          ? "border-[var(--violet-600)] bg-[var(--violet-50)]"
                          : "border-[var(--gray-200)] hover:border-[var(--violet-300)] hover:bg-[var(--violet-50)]/50"
                      }`}
                    >
                      <span className="font-semibold text-[var(--foreground)]">{type.label}</span>
                      <span className="text-xs text-[var(--gray-600)] line-clamp-2">{type.description}</span>
                    </button>
                  );
                })}
              </div>
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
                disabled={formData.offeringType === "trade" || formData.offeringType === "free_with_sales"}
                required={formData.offeringType !== "trade" && formData.offeringType !== "free_with_sales"}
              />
              <p className="text-xs text-[var(--gray-400)] mt-1">
                {formData.offeringType === "hourly"
                  ? "Hourly rate"
                  : formData.offeringType === "package"
                  ? "Package price"
                  : formData.offeringType === "trade"
                  ? "Trade for event exposure (no fee)"
                  : formData.offeringType === "free_with_sales"
                  ? "Free to book, vendor can sell on-site"
                  : "Flat booth price"}
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
                <span className="text-sm text-[var(--gray-600)]">Show to event organizers</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--gray-600)]">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="input mt-2 min-h-[120px] py-3"
              placeholder={
                formData.offeringType === "package"
                  ? "List what is included in the package."
                  : "Share what's included in this offering."
              }
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
              {offerings.map((offering) => {
                const typeLabel = OFFERING_TYPES.find((type) => type.value === offering.offeringType)?.label || "Offering";
                const isFreeType = offering.offeringType === "trade" || offering.offeringType === "free_with_sales";
                return (
                  <div key={offering.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{offering.title}</p>
                      <p className="text-sm text-[var(--gray-500)]">
                        {typeLabel} • {isFreeType ? "No fee" : `$${(offering.priceCents / 100).toFixed(2)}`}
                      </p>
                      {offering.description && (
                        <p className="text-sm text-[var(--gray-400)] mt-1">{offering.description}</p>
                      )}
                    </div>
                    <span className={`chip ${offering.active ? "bg-[var(--mint-100)] text-[var(--mint-600)]" : "chip-filled"}`}>
                      {offering.active ? "Active" : "Hidden"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

