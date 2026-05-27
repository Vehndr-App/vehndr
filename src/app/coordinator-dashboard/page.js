"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import AuthGate from "../../components/AuthGate";
import { api } from "../../services/api";
import { updateEvent } from "../../services/events";
import Link from "next/link";
import OnboardingChecklist from "../../components/OnboardingChecklist";

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

  const handleTogglePublic = async (e, event) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await updateEvent(event.id, { is_public: !event.isPublic });
      setMyEvents((prev) => prev.map((ev) => ev.id === event.id ? { ...ev, isPublic: !ev.isPublic } : ev));
    } catch (err) {
      console.error("Failed to update event visibility", err);
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
      year: 'numeric'
    });
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-[var(--violet-100)] text-[var(--violet-700)]';
      case 'active':
        return 'bg-[var(--mint-100)] text-[var(--mint-700)]';
      case 'past':
        return 'bg-[var(--gray-100)] text-[var(--gray-600)]';
      default:
        return 'bg-[var(--gray-100)] text-[var(--gray-600)]';
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'upcoming': return '📅';
      case 'active': return '🎉';
      case 'past': return '✓';
      default: return '📌';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--gray-50)] pb-24">
      {/* Success Toast */}
      {success && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-[var(--mint-600)] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <span className="font-semibold">{success}</span>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[var(--violet-600)] via-[var(--magenta-500)] to-[var(--coral-500)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdi0yMGgtNjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
        
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl">
              🎪
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl text-white tracking-tight">
                Event Dashboard
              </h1>
              {user && (
                <p className="text-white/80 text-sm">
                  Welcome back, <span className="font-semibold text-white">{user.name || user.email}</span>
                </p>
              )}
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-[var(--radius-xl)] p-4 text-center">
              <div className="text-2xl font-bold text-white">{myEvents.length}</div>
              <div className="text-xs text-white/70 font-medium">Total Events</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-[var(--radius-xl)] p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {myEvents.filter(e => e.status === 'upcoming').length}
              </div>
              <div className="text-xs text-white/70 font-medium">Upcoming</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-[var(--radius-xl)] p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {myEvents.filter(e => e.status === 'active').length}
              </div>
              <div className="text-xs text-white/70 font-medium">Active Now</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 -mt-6 relative z-10">
        <OnboardingChecklist role="coordinator" />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link
            href="/coordinator-dashboard/payments"
            className="bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--amber-100)] flex items-center justify-center flex-shrink-0">
              <span className="text-xl">💳</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-[var(--gray-900)]">Banking</p>
              <p className="text-xs text-[var(--gray-500)]">Connect Stripe</p>
            </div>
          </Link>
          <Link
            href="/coordinator-dashboard/create"
            className="bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🎪</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-[var(--gray-900)]">New Event</p>
              <p className="text-xs text-[var(--gray-500)]">Create manually</p>
            </div>
          </Link>
        </div>

        {/* Create Event Card */}
        <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 aspect-square rounded-full bg-[var(--violet-100)] grid place-items-center flex-none">
              <span className="text-[var(--violet-600)] text-xl">+</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--gray-900)]">Create New Event</h2>
              <p className="text-sm text-[var(--gray-500)]">Import from URL or create manually</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                Event URL
              </label>
              <input
                type="url"
                value={eventUrl}
                onChange={(e) => setEventUrl(e.target.value)}
                required
                className="input w-full"
                placeholder="https://eventbrite.com/my-event"
                style={{ fontSize: '16px' }}
              />
              <p className="mt-2 text-xs text-[var(--gray-400)]">
                Paste a link from Eventbrite, Facebook Events, or any event page
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-[var(--radius-lg)] flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !eventUrl}
              className="w-full h-12 rounded-[var(--radius-xl)] bg-gradient-primary text-white font-semibold hover:shadow-lg hover:shadow-[var(--violet-500)]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                  </svg>
                  Creating Event...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Import Event from URL
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[var(--gray-200)]" />
            <span className="text-xs text-[var(--gray-400)] font-medium">or create manually</span>
            <div className="flex-1 h-px bg-[var(--gray-200)]" />
          </div>

          {/* Manual Create Button */}
          <Link
            href="/coordinator-dashboard/create"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-[var(--radius-xl)] border-2 border-dashed border-[var(--gray-300)] text-[var(--gray-600)] font-medium hover:border-[var(--violet-400)] hover:text-[var(--violet-600)] hover:bg-[var(--violet-50)] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Create Event Manually
          </Link>
        </div>

        {/* My Events Section */}
        <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-6 border-b border-[var(--gray-100)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--amber-100)] flex items-center justify-center text-xl">
                📅
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--gray-900)]">My Events</h2>
                <p className="text-sm text-[var(--gray-500)]">{myEvents.length} event{myEvents.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              onClick={fetchMyEvents}
              disabled={loadingEvents}
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] text-sm font-medium text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors disabled:opacity-50"
            >
              <svg className={loadingEvents ? "animate-spin" : ""} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Refresh
            </button>
          </div>

          {loadingEvents ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-3 border-[var(--violet-200)] border-t-[var(--violet-600)] animate-spin" />
              <p className="text-sm text-[var(--gray-500)]">Loading your events...</p>
            </div>
          ) : myEvents.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
                <span className="text-4xl">🎪</span>
              </div>
              <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-2">No events yet</h3>
              <p className="text-[var(--gray-500)] mb-6 max-w-sm mx-auto">
                Create your first event using the form above and start connecting with amazing vendors!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--gray-100)]">
              {myEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}/dashboard`}
                  className="flex items-center gap-4 p-4 sm:p-6 hover:bg-[var(--gray-50)] transition-colors group"
                >
                  {/* Event Image/Emoji */}
                  <div className="flex-shrink-0">
                    {event.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={event.image}
                        alt={event.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-[var(--radius-xl)] shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)] flex items-center justify-center">
                        <span className="text-2xl sm:text-3xl">🎪</span>
                      </div>
                    )}
                  </div>

                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--gray-900)] truncate group-hover:text-[var(--violet-600)] transition-colors">
                        {event.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(event.status)}`}>
                        {getStatusEmoji(event.status)} {event.status}
                      </span>
                      <button
                        onClick={(e) => handleTogglePublic(e, event)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          event.isPublic
                            ? "bg-[var(--mint-50)] text-[var(--mint-700)] hover:bg-[var(--mint-100)]"
                            : "bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]"
                        }`}
                      >
                        {event.isPublic ? "🌐 Public" : "🔒 Private"}
                      </button>
                    </div>

                    {event.description && (
                      <p className="text-sm text-[var(--gray-500)] line-clamp-1 mb-2">
                        {event.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--gray-400)]">
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                        </svg>
                        {formatDate(event.startDate)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {event.location.split(',')[0]}
                        </span>
                      )}
                      {event.attendees > 0 && (
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          {(event.attendees / 1000).toFixed(0)}K expected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--gray-100)] group-hover:bg-[var(--violet-100)] flex items-center justify-center transition-colors">
                    <svg className="text-[var(--gray-400)] group-hover:text-[var(--violet-600)] transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
