"use client";

import { useEffect, useState, useCallback } from "react";
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

// Generate every calendar date between two YYYY-MM-DD strings (inclusive)
function dateRange(start, end) {
  if (!start || !end) return [];
  const dates = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function emptyDay(date) {
  return { date, startDate: date, startTime: "", endDate: date, endTime: "", vendorLoadIn: "", vendorLoadOut: "" };
}

// Merge saved schedule entries onto the canonical date list.
// Dates that exist in saved are kept; new dates get blank entries.
function mergeSchedule(dates, saved) {
  return dates.map((date) => {
    const existing = (saved || []).find((d) => d.date === date);
    return existing ? { ...emptyDay(date), ...existing } : emptyDay(date);
  });
}

function fmtDayLabel(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
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
  const [scheduleError, setScheduleError] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [dailySchedule, setDailySchedule] = useState([]);
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
    isPublic: false,
    image: "",
  });

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const event = await api(`/api/events/${params.eventId}`);
        setEventId(event.id);

        const startDate = formatDateInput(event.startDate);
        const endDate   = formatDateInput(event.endDate);

        setFormData({
          name: event.name || "",
          description: event.description || "",
          location: event.location || "",
          startDate,
          startTime: formatTimeInput(event.startDate),
          endDate,
          endTime: formatTimeInput(event.endDate),
          category: event.category || "",
          eventType: normalizeEventType(event.eventType || event.category || ""),
          desiredVendorCategories: normalizeVendorCategories(event.desiredVendorCategories || []),
          attendees: event.attendees || "",
          status: event.status || "draft",
          isPublic: !!event.isPublic,
          image: event.image || "",
        });

        const isMultiDay = startDate && endDate && startDate !== endDate;
        if (isMultiDay) {
          setDailySchedule(mergeSchedule(dateRange(startDate, endDate), event.dailySchedule || []));
        } else {
          // Single-day: one synthetic entry from existing fields
          setDailySchedule([{
            date: startDate,
            startTime: formatTimeInput(event.startDate),
            endTime: formatTimeInput(event.endDate),
            vendorLoadIn: timeValueFromLabel(event.vendorLoadIn),
            vendorLoadOut: timeValueFromLabel(event.vendorLoadOut),
          }]);
        }
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

  // When dates change, rebuild the daily schedule preserving any existing values
  const handleDateChange = useCallback((field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      const { startDate, endDate } = next;
      const isMultiDay = startDate && endDate && startDate !== endDate;
      if (isMultiDay) {
        setDailySchedule((prevSchedule) =>
          mergeSchedule(dateRange(startDate, endDate), prevSchedule)
        );
      } else if (startDate) {
        setDailySchedule((prevSchedule) => {
          const existing = prevSchedule[0] || {};
          return [{ ...emptyDay(startDate), ...existing, date: startDate }];
        });
      }
      return next;
    });
  }, []);

  const updateDay = (date, field, value) => {
    setDailySchedule((prev) =>
      prev.map((d) => (d.date === date ? { ...d, [field]: value } : d))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const isMultiDay = formData.startDate && formData.endDate && formData.startDate !== formData.endDate;

      // For multi-day: store daily_schedule. Also keep vendor_load_in/vendor_load_out on the first
      // and last day for backward-compat with anything reading those fields.
      const cleanSchedule = dailySchedule.map((d) => ({
        date: d.date,
        startDate: d.startDate || d.date,
        startTime: d.startTime || "",
        endDate: d.endDate || d.date,
        endTime: d.endTime || "",
        vendorLoadIn: d.vendorLoadIn || "",
        vendorLoadOut: d.vendorLoadOut || "",
      }));

      const payload = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        start_date: buildDateTime(formData.startDate, isMultiDay ? (dailySchedule[0]?.startTime || formData.startTime) : formData.startTime),
        end_date: buildDateTime(formData.endDate, isMultiDay ? (dailySchedule[dailySchedule.length - 1]?.endTime || formData.endTime) : formData.endTime),
        category: formData.category,
        event_type: formData.eventType,
        desired_vendor_categories: normalizeVendorCategories(formData.desiredVendorCategories),
        attendees: formData.attendees ? Number(formData.attendees) : 0,
        status: formData.status,
        is_public: formData.isPublic,
        image: formData.image || null,
        daily_schedule: cleanSchedule,
      };

      // For single-day, also keep legacy fields populated
      if (!isMultiDay && dailySchedule[0]) {
        const day = dailySchedule[0];
        if (day.vendorLoadIn) {
          payload.vendor_load_in = TIME_SLOTS.find((s) => s.value === day.vendorLoadIn)?.label ?? day.vendorLoadIn;
        }
        if (day.vendorLoadOut) {
          payload.vendor_load_out = TIME_SLOTS.find((s) => s.value === day.vendorLoadOut)?.label ?? day.vendorLoadOut;
        }
      }

      await api(`/api/events/${eventId}`, {
        method: "PATCH",
        body: payload,
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
        : [...prev.desiredVendorCategories, normalizedCategory],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--gray-500)]">
        Loading event...
      </div>
    );
  }

  const isMultiDay = formData.startDate && formData.endDate && formData.startDate !== formData.endDate;

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

          {/* Event dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-[var(--gray-700)]">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleDateChange("startDate", e.target.value)}
                className="input mt-2"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--gray-700)]">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleDateChange("endDate", e.target.value)}
                className="input mt-2"
                required
              />
            </div>
          </div>

          {/* Per-day schedule */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <label className="text-sm font-semibold text-[var(--gray-700)]">
                  {isMultiDay ? "Per-Day Schedule" : "Event Hours & Vendor Schedule"}
                </label>
                {isMultiDay && (
                  <p className="text-xs text-[var(--gray-500)] mt-0.5">
                    Set start/end dates &amp; times and vendor load-in/load-out for each day.
                  </p>
                )}
              </div>
              {isMultiDay && dailySchedule.length > 1 && (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const first = dailySchedule[0];
                        if (!first.startTime || !first.endTime) {
                          setScheduleError("Enter an event start and end time for the first day first.");
                          return;
                        }
                        setScheduleError(null);
                        setDailySchedule((prev) =>
                          prev.map((d) => ({ ...d, startTime: first.startTime, endTime: first.endTime }))
                        );
                      }}
                      className="text-xs font-medium text-[var(--violet-600)] border border-[var(--violet-200)] bg-[var(--violet-50)] hover:bg-[var(--violet-100)] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Same hours every day
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const first = dailySchedule[0];
                        if (!first.vendorLoadIn || !first.vendorLoadOut) {
                          setScheduleError("Enter a vendor load-in and load-out time for the first day first.");
                          return;
                        }
                        setScheduleError(null);
                        setDailySchedule((prev) =>
                          prev.map((d) => ({ ...d, vendorLoadIn: first.vendorLoadIn, vendorLoadOut: first.vendorLoadOut }))
                        );
                      }}
                      className="text-xs font-medium text-[var(--violet-600)] border border-[var(--violet-200)] bg-[var(--violet-50)] hover:bg-[var(--violet-100)] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Same vendor times every day
                    </button>
                  </div>
                  {scheduleError && (
                    <p className="text-xs text-red-500 text-right">{scheduleError}</p>
                  )}
                </div>
              )}
            </div>

            {dailySchedule.map((day) => (
              <div
                key={day.date}
                className="rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-4 space-y-3"
              >
                {isMultiDay && (
                  <p className="text-xs font-bold text-[var(--violet-700)] uppercase tracking-wide">
                    {fmtDayLabel(day.date)}
                  </p>
                )}
                {/* Event start date + time */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--gray-500)] mb-1.5">
                    Event start
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={day.startDate || day.date}
                      onChange={(e) => updateDay(day.date, "startDate", e.target.value)}
                      className="input"
                    />
                    <select
                      value={day.startTime}
                      onChange={(e) => updateDay(day.date, "startTime", e.target.value)}
                      className="input"
                    >
                      <option value="">Select time</option>
                      {TIME_SLOTS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Event end date + time */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--gray-500)] mb-1.5">
                    Event end
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={day.endDate || day.date}
                      onChange={(e) => updateDay(day.date, "endDate", e.target.value)}
                      className="input"
                    />
                    <select
                      value={day.endTime}
                      onChange={(e) => updateDay(day.date, "endTime", e.target.value)}
                      className="input"
                    >
                      <option value="">Select time</option>
                      {TIME_SLOTS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Vendor load-in / load-out */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--gray-500)] mb-1.5">
                      Vendor load-in
                    </label>
                    <select
                      value={day.vendorLoadIn}
                      onChange={(e) => updateDay(day.date, "vendorLoadIn", e.target.value)}
                      className="input"
                    >
                      <option value="">Select time</option>
                      {TIME_SLOTS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--gray-500)] mb-1.5">
                      Vendor load-out
                    </label>
                    <select
                      value={day.vendorLoadOut}
                      onChange={(e) => updateDay(day.date, "vendorLoadOut", e.target.value)}
                      className="input"
                    >
                      <option value="">Select time</option>
                      {TIME_SLOTS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
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
            <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3 cursor-pointer hover:bg-white transition-colors">
              <div>
                <span className="text-sm font-semibold text-[var(--gray-700)]">Public Event</span>
                <p className="text-xs text-[var(--gray-500)] mt-0.5">Visible in public event listings.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => handleChange("isPublic", e.target.checked)}
                className="w-5 h-5 rounded-md border-[var(--gray-300)] text-[var(--violet-600)] focus:ring-[var(--violet-500)]"
              />
            </label>
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
  // Only return non-midnight times (midnight likely means "no time set")
  if (date.getHours() === 0 && date.getMinutes() === 0) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Convert a stored label like "6:00 PM" back to a TIME_SLOTS value like "18:00"
function timeValueFromLabel(label) {
  if (!label) return "";
  // If it has a date prefix, strip it
  const stripped = label.replace(/^\d{4}-\d{2}-\d{2} /, "");
  return TIME_SLOTS.find((s) => s.label === stripped)?.value ?? "";
}

function buildDateTime(date, time) {
  if (!date) return null;
  if (!time) return `${date}T00:00:00`;
  return `${date}T${time}:00`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

// TIME_SLOTS duplicate needed in module scope for buildDateTime usage in handleSubmit
const TIME_SLOTS_LABELS = TIME_SLOTS;
void TIME_SLOTS_LABELS;
