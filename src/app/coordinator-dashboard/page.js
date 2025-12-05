"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import AuthGate from "../../components/AuthGate";
import { api } from "../../services/api";
import Link from "next/link";

export default function CoordinatorDashboardPage() {
  return (
    <AuthGate allowedRoles={["coordinator"]}>
      <CoordinatorDashboardInner />
    </AuthGate>
  );
}

function CoordinatorDashboardInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [eventUrl, setEventUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    // Redirect non-coordinators
    if (user && user.role !== 'coordinator') {
      router.push('/');
    }

    // Fetch coordinator's events
    if (user && user.role === 'coordinator') {
      fetchMyEvents();
    }
  }, [user, router]);

  const fetchMyEvents = async () => {
    setLoadingEvents(true);
    try {
      const events = await api("/api/events/my_events");
      setMyEvents(Array.isArray(events) ? events : events?.events || []);
    } catch (err) {
      console.error("Failed to fetch events", err);
      setMyEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api("/api/events/from_url", {
        method: "POST",
        body: { url: eventUrl }
      });

      setSuccess("Event created successfully!");
      setEventUrl("");

      // Refresh events list
      await fetchMyEvents();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to create event", err);
      setError(err?.details?.error || "Failed to create event from URL. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'past':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6 w-full min-h-screen">
      {/* Success Toast */}
      {success && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#01DBE0] via-[#FD237A] to-[#FE9C05] bg-clip-text text-transparent mb-2">
          Event Coordinator Dashboard
        </h1>
        {user && (
          <p className="text-sm text-gray-600">
            Signed in as <span className="font-medium text-gray-900">{user.name || user.email}</span>
          </p>
        )}
      </div>

      {/* Create Event Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Create New Event</h2>
        <p className="text-sm text-gray-600 mb-6">
          Paste the URL of your event page below. We&apos;ll automatically extract all the event details.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event URL
            </label>
            <input
              type="url"
              value={eventUrl}
              onChange={(e) => setEventUrl(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#01DBE0] focus:ring-2 focus:ring-[#01DBE0]/20 outline-none transition-all"
              placeholder="https://example.com/my-event"
            />
            <p className="mt-2 text-xs text-gray-500">
              Enter the full URL of your event&apos;s webpage (e.g., Eventbrite, Facebook Event, or your own website)
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !eventUrl}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {loading ? "Creating Event..." : "Create Event from URL"}
          </button>
        </form>
      </div>

      {/* My Events List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">My Events</h2>
          <button
            onClick={fetchMyEvents}
            disabled={loadingEvents}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            {loadingEvents ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loadingEvents ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#01DBE0]"></div>
            <p className="text-sm text-gray-500 mt-4">Loading events...</p>
          </div>
        ) : myEvents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No events yet</h3>
            <p className="mt-1 text-sm text-gray-500">Create your first event using the form above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myEvents.map((event) => (
              <div
                key={event.id}
                className="border-2 border-gray-200 rounded-xl p-6 hover:border-[#01DBE0] hover:shadow-lg transition-all group bg-white"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-xl text-gray-900 truncate group-hover:text-[#01DBE0] transition-colors">
                        {event.name}
                      </h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {event.location && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate text-sm">{event.location}</span>
                        </div>
                      )}

                      {event.category && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span className="text-sm">{event.category}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">{formatDate(event.startDate)}</span>
                      </div>

                      {event.attendees > 0 && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-sm">{event.attendees} attendees</span>
                        </div>
                      )}
                    </div>

                    {/* CTA Button */}
                    <Link
                      href={`/events/${event.id}/dashboard`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#01DBE0] to-[#FD237A] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity group-hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      View Event Dashboard
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>

                  {event.image && (
                    <div className="flex-shrink-0">
                      <img
                        src={event.image}
                        alt={event.name}
                        className="w-32 h-32 object-cover rounded-xl shadow-md"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
