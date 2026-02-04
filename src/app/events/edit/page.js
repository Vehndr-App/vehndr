"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGate from "../../../components/AuthGate";
import { api } from "../../../services/api";

const STATUS_OPTIONS = ["draft", "upcoming", "active", "past"];

export default function EventEditPage() {
  return (
    <AuthGate allowedRoles={["coordinator"]}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-[var(--gray-500)]">
          Loading…
        </div>
      }>
        <EventEditInner />
      </Suspense>
    </AuthGate>
  );
}

function EventEditInner() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    category: "",
    attendees: "",
    status: "draft",
    image: ""
  });

  useEffect(() => {
    if (!eventId) return;
    const loadEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const event = await api(`/api/events/${eventId}`);
        setFormData({
          name: event.name || "",
          description: event.description || "",
          location: event.location || "",
          startDate: formatDateInput(event.startDate),
          startTime: formatTimeInput(event.startDate),
          endDate: formatDateInput(event.endDate),
          endTime: formatTimeInput(event.endDate),
          category: event.category || "",
          attendees: event.attendees || "",
          status: event.status || "draft",
          image: event.image || ""
        });
      } catch (err) {
        console.error("Failed to load event", err);
        setError("Unable to load event details.");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventId) return;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        start_date: buildDateTime(formData.startDate, formData.startTime),
        end_date: buildDateTime(formData.endDate, formData.endTime),
        category: formData.category,
        attendees: formData.attendees ? Number(formData.attendees) : 0,
        status: formData.status,
        image: formData.image || null
      };

      await api(`/api/events/${eventId}`, {
        method: "PATCH",
        body: payload
      });

      router.push(`/events/dashboard?eventId=${eventId}`);
    } catch (err) {
      console.error("Failed to update event", err);
      setError(err?.details?.error || err?.details?.errors?.join(", ") || "Failed to update event.");
    } finally {
      setSaving(false);
    }
  };

  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--gray-500)]">
        Please provide an event ID.
      </div>
    );
  }

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
            href={`/events/dashboard?eventId=${eventId}`}
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
              <label className="text-sm font-semibold text-[var(--gray-700)]">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="input mt-2"
              />
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

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
            <Link
              href={`/events/dashboard?eventId=${eventId}`}
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
