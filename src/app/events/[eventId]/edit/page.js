"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGate from "../../../../components/AuthGate";
import { api } from "../../../../services/api";
import { EVENT_TYPES, VENDOR_CATEGORY_TREE, normalizeEventType, normalizeVendorCategory, normalizeVendorCategories } from "../../../../constants/categories";

const STATUS_OPTIONS = ["draft", "upcoming", "active", "past"];

const TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hour = h % 12 || 12;
      const period = h < 12 ? "AM" : "PM";
      slots.push({
        label: `${hour}:${m.toString().padStart(2, "0")} ${period}`,
        value: `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      });
    }
  }
  return slots;
})();

function parseStoredLoadTime(stored) {
  if (!stored) return { date: "", time: "" };
  const m = stored.match(/^(\d{4}-\d{2}-\d{2}) (.+)$/);
  if (m) return { date: m[1], time: m[2] };
  const slot = TIME_SLOTS.find((s) => s.label === stored);
  return { date: "", time: slot?.value ?? "" };
}

function buildLoadTimeString(field, isMultiDay) {
  if (!field.time) return null;
  const label = TIME_SLOTS.find((s) => s.value === field.time)?.label ?? field.time;
  if (isMultiDay) return field.date ? `${field.date} ${label}` : label;
  return label;
}

export default function EventEditPage() {
  return (
    <AuthGate allowedRoles={["coordinator"]}>
      <EventEditInner />
    </AuthGate>
  );
}

function EventEditInner() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [vendorLoadIn,  setVendorLoadIn]  = useState({ date: "", time: "" });
  const [vendorLoadOut, setVendorLoadOut] = useState({ date: "", time: "" });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    category: "",
    eventType: "",
    desiredVendorCategories: [],
    attendees: "",
    status: "draft",
    image: ""
  });

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const event = await api(`/api/events/${params.eventId}`);
        setEventId(event.id);
        setFormData({
          name: event.name || "",
          description: event.description || "",
          location: event.location || "",
          startDate: formatDateInput(event.startDate),
          startTime: formatTimeInput(event.startDate),
          endDate: formatDateInput(event.endDate),
          endTime: formatTimeInput(event.endDate),
          category: event.category || "",
          eventType: normalizeEventType(event.eventType || event.category || ""),
          desiredVendorCategories: normalizeVendorCategories(event.desiredVendorCategories || []),
          attendees: event.attendees || "",
          status: event.status || "draft",
          image: event.image || ""
        });
        setVendorLoadIn(parseStoredLoadTime(event.vendorLoadIn));
        setVendorLoadOut(parseStoredLoadTime(event.vendorLoadOut));
      } catch (err) {
        console.error("Failed to load event", err);
        setError("Unable to load event details.");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [params.eventId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const isMultiDay = formData.startDate && formData.endDate && formData.startDate !== formData.endDate;
      const loadIn  = buildLoadTimeString(vendorLoadIn,  isMultiDay);
      const loadOut = buildLoadTimeString(vendorLoadOut, isMultiDay);
      const payload = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        start_date: buildDateTime(formData.startDate, formData.startTime),
        end_date: buildDateTime(formData.endDate, formData.endTime),
        category: formData.category,
        event_type: formData.eventType,
        desired_vendor_categories: normalizeVendorCategories(formData.desiredVendorCategories),
        attendees: formData.attendees ? Number(formData.attendees) : 0,
        status: formData.status,
        image: formData.image || null,
        ...(loadIn  !== null && { vendor_load_in:  loadIn  }),
        ...(loadOut !== null && { vendor_load_out: loadOut }),
      };

      await api(`/api/events/${eventId}`, {
        method: "PATCH",
        body: payload
      });

      router.push(`/events/${eventId}/dashboard`);
    } catch (err) {
      console.error("Failed to update event", err);
      setError(err?.details?.error || err?.details?.errors?.join(", ") || "Failed to update event.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDesiredVendorCategory = (category) => {
    const normalizedCategory = normalizeVendorCategory(category);
    setFormData((prev) => ({
      ...prev,
      desiredVendorCategories: prev.desiredVendorCategories.includes(normalizedCategory)
        ? prev.desiredVendorCategories.filter((item) => item !== normalizedCategory)
        : [...prev.desiredVendorCategories, normalizedCategory]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--gray-500)]">
        Loading event...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      <div className="bg-white border-b border-[var(--gray-100)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href={`/events/${eventId}/dashboard`}
            className="inline-flex items-center gap-2 text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)] mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-h2 text-[var(--foreground)]">Edit Event</h1>
          <p className="text-sm text-[var(--gray-500)] mt-1">Update details shown to vendors and attendees.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <form onSubmit={handleSubmit} className="card space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-[var(--gray-700)]">Event Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="input mt-2"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-[var(--gray-700)]">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="input mt-2 min-h-[120px] py-3"
              rows={4}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-[var(--gray-700)]">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              className="input mt-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-[var(--gray-700)]">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
                className="input mt-2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--gray-700)]">Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleChange("startTime", e.target.value)}
                className="input mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--gray-700)]">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
                className="input mt-2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--gray-700)]">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleChange("endTime", e.target.value)}
                className="input mt-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-[var(--gray-700)]">Event Type</label>
              <select
                value={formData.eventType}
                onChange={(e) => {
                  const selected = EVENT_TYPES.find((type) => type.slug === e.target.value);
                  handleChange("eventType", e.target.value);
                  handleChange("category", selected?.label || "");
                }}
                className="input mt-2"
              >
                <option value="">Select event type</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type.slug} value={type.slug}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--gray-700)]">Expected Attendees</label>
              <input
                type="number"
                min="0"
                value={formData.attendees}
                onChange={(e) => handleChange("attendees", e.target.value)}
                className="input mt-2"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-[var(--gray-700)]">Desired Vendor Categories</label>
            <p className="text-xs text-[var(--gray-500)] mt-1 mb-3">
              Used for vendor matching and recommendations.
            </p>
            <div className="flex flex-wrap gap-2">
              {VENDOR_CATEGORY_TREE.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => toggleDesiredVendorCategory(category.label)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    formData.desiredVendorCategories.includes(category.label)
                      ? "bg-[var(--violet-600)] text-white"
                      : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-[var(--gray-700)]">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="input mt-2"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--gray-700)]">Cover Image URL</label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => handleChange("image", e.target.value)}
                className="input mt-2"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Vendor load-in / load-out */}
          {(() => {
            const isMultiDay = formData.startDate && formData.endDate && formData.startDate !== formData.endDate;
            const minDate = formData.startDate || undefined;
            const maxDate = formData.endDate   || undefined;
            return (
              <div className="space-y-4">
                <label className="text-sm font-semibold text-[var(--gray-700)]">Vendor Schedule</label>
                {isMultiDay ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--gray-500)] mb-1.5">Vendor load-in</label>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="date" value={vendorLoadIn.date} min={minDate} max={maxDate}
                          onChange={(e) => setVendorLoadIn((p) => ({ ...p, date: e.target.value }))}
                          className="input" />
                        <select value={vendorLoadIn.time}
                          onChange={(e) => setVendorLoadIn((p) => ({ ...p, time: e.target.value }))}
                          className="input">
                          <option value="">Select time</option>
                          {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--gray-500)] mb-1.5">Vendor load-out</label>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="date" value={vendorLoadOut.date} min={minDate} max={maxDate}
                          onChange={(e) => setVendorLoadOut((p) => ({ ...p, date: e.target.value }))}
                          className="input" />
                        <select value={vendorLoadOut.time}
                          onChange={(e) => setVendorLoadOut((p) => ({ ...p, time: e.target.value }))}
                          className="input">
                          <option value="">Select time</option>
                          {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--gray-500)] mb-1.5">Vendor load-in</label>
                      <select value={vendorLoadIn.time}
                        onChange={(e) => setVendorLoadIn((p) => ({ ...p, time: e.target.value }))}
                        className="input">
                        <option value="">Select time</option>
                        {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--gray-500)] mb-1.5">Vendor load-out</label>
                      <select value={vendorLoadOut.time}
                        onChange={(e) => setVendorLoadOut((p) => ({ ...p, time: e.target.value }))}
                        className="input">
                        <option value="">Select time</option>
                        {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
            <Link
              href={`/events/${eventId}/dashboard`}
              className="btn btn-outline px-4"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-gradient px-6 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildDateTime(date, time) {
  if (!date) return null;
  if (!time) return `${date}T00:00:00`;
  return `${date}T${time}:00`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

