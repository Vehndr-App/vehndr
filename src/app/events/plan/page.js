"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../../services/api";
import { EVENT_TYPES, VENDOR_CATEGORY_TREE } from "../../../constants/categories";

const currencyToCents = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : null;
};

export default function EventPlanningPage() {
  const [form, setForm] = useState({
    eventType: "weddings",
    guestCount: "",
    themeOrVibe: "",
    locationOrVenueType: "",
    startDate: "",
    startTime: "",
    budget: "",
    desiredVendorCategories: []
  });
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const selectedEventType = EVENT_TYPES.find((type) => type.slug === form.eventType);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleVendorCategory = (category) => {
    setForm((prev) => ({
      ...prev,
      desiredVendorCategories: prev.desiredVendorCategories.includes(category)
        ? prev.desiredVendorCategories.filter((item) => item !== category)
        : [...prev.desiredVendorCategories, category]
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setResult(null);

    try {
      const response = await api("/api/event_planning_requests", {
        method: "POST",
        body: {
          event_planning_request: {
            event_type: form.eventType,
            guest_count: form.guestCount ? Number(form.guestCount) : null,
            theme_or_vibe: form.themeOrVibe,
            location_or_venue_type: form.locationOrVenueType,
            start_date: form.startDate || null,
            start_time: form.startTime || null,
            budget_cents: form.budget ? currencyToCents(form.budget) : null,
            desired_vendor_categories: form.desiredVendorCategories
          }
        }
      });
      setResult(response);
    } catch (err) {
      setError(err?.details?.errors?.join(", ") || err.message || "Could not save planning request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <Link href="/events" className="text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)]">
          Back to events
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="card bg-white p-6">
            <p className="text-sm font-semibold text-[var(--violet-600)] mb-2">Planning Preview</p>
            <h1 className="font-display text-3xl text-[var(--gray-900)] tracking-tight">
              Plan with recommendations
            </h1>
            <p className="mt-2 text-sm text-[var(--gray-500)]">
              This saves structured planning data now so VEHNDR can power AI recommendations later.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="rounded-[var(--radius-2xl)] bg-[var(--violet-50)] p-4 text-[var(--gray-800)] leading-8">
                I want a{" "}
                <select
                  value={form.eventType}
                  onChange={(event) => updateForm("eventType", event.target.value)}
                  className="mx-1 rounded-lg border border-[var(--violet-200)] bg-white px-2 py-1 text-sm font-semibold"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.slug} value={type.slug}>
                      {type.label}
                    </option>
                  ))}
                </select>
                for{" "}
                <input
                  type="number"
                  min="1"
                  value={form.guestCount}
                  onChange={(event) => updateForm("guestCount", event.target.value)}
                  placeholder="150"
                  className="mx-1 w-20 rounded-lg border border-[var(--violet-200)] px-2 py-1 text-sm font-semibold"
                />{" "}
                people with a{" "}
                <input
                  value={form.themeOrVibe}
                  onChange={(event) => updateForm("themeOrVibe", event.target.value)}
                  placeholder="romantic garden party"
                  className="mx-1 w-full max-w-[220px] rounded-lg border border-[var(--violet-200)] px-2 py-1 text-sm font-semibold"
                />{" "}
                theme at{" "}
                <input
                  value={form.locationOrVenueType}
                  onChange={(event) => updateForm("locationOrVenueType", event.target.value)}
                  placeholder="an outdoor venue in Austin"
                  className="mx-1 w-full max-w-[240px] rounded-lg border border-[var(--violet-200)] px-2 py-1 text-sm font-semibold"
                />{" "}
                on{" "}
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => updateForm("startDate", event.target.value)}
                  className="mx-1 rounded-lg border border-[var(--violet-200)] px-2 py-1 text-sm font-semibold"
                />{" "}
                at{" "}
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => updateForm("startTime", event.target.value)}
                  className="mx-1 rounded-lg border border-[var(--violet-200)] px-2 py-1 text-sm font-semibold"
                />
                . My budget is{" "}
                <input
                  type="number"
                  min="0"
                  value={form.budget}
                  onChange={(event) => updateForm("budget", event.target.value)}
                  placeholder="25000"
                  className="mx-1 w-28 rounded-lg border border-[var(--violet-200)] px-2 py-1 text-sm font-semibold"
                />
                .
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
                  Vendor categories you already know you need
                </label>
                <div className="flex flex-wrap gap-2">
                  {VENDOR_CATEGORY_TREE.map((category) => (
                    <button
                      key={category.slug}
                      type="button"
                      onClick={() => toggleVendorCategory(category.label)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        form.desiredVendorCategories.includes(category.label)
                          ? "bg-[var(--violet-600)] text-white"
                          : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="btn btn-gradient w-full justify-center disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save planning request"}
              </button>
            </form>
          </section>

          <aside className="card bg-white p-6 h-fit">
            <h2 className="text-lg font-semibold text-[var(--gray-900)]">Future recommendation output</h2>
            <p className="mt-2 text-sm text-[var(--gray-500)]">
              Once the recommendation engine is connected, this area will use category, vendor, price, location, and availability data.
            </p>

            <div className="mt-5 space-y-4 text-sm">
              <PreviewSection title="Event type" value={selectedEventType?.label || "Select an event type"} />
              <PreviewSection title="Recommended vendor categories" value={(result?.recommendationSnapshot?.vendorCategories || form.desiredVendorCategories).join(", ") || "Saved request will generate category ideas."} />
              <PreviewSection title="Specific vendors" value="Coming soon: marketplace matches by category, location, price, and availability." />
              <PreviewSection title="Budget allocation" value="Coming soon: category-level spend ranges." />
              <PreviewSection title="Rentals, staffing, entertainment, timeline" value="Coming soon: structured checklist and staffing plan." />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PreviewSection({ title, value }) {
  return (
    <div className="rounded-xl border border-[var(--gray-100)] bg-[var(--gray-50)] p-3">
      <p className="font-semibold text-[var(--gray-900)]">{title}</p>
      <p className="mt-1 text-[var(--gray-600)]">{value}</p>
    </div>
  );
}
