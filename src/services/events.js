import { api } from "./api";

// Backend does not expose events routes yet; try API first, fallback to mock data.

const FALLBACK_EVENTS = [
  {
    id: "event_coachella_2024",
    name: "Coachella 2024",
    description: "Music and Arts Festival in the desert",
    location: "Indio, CA",
    startDate: "2024-04-12",
    endDate: "2024-04-14",
    image: "/globe.svg",
    category: "Music Festival",
    vendorIds: ["vendor_demo_1", "vendor_food_1", "vendor_drink_1", "vendor_service_1"],
    attendees: 125000,
    status: "upcoming",
  },
];

function fallbackList() {
  return FALLBACK_EVENTS;
}

function fallbackFind(id) {
  return FALLBACK_EVENTS.find((e) => e.id === id) ?? null;
}

export async function listEvents() {
  try {
    // Disable caching to always get fresh data
    return await api("/api/events", { cache: 'no-store' });
  } catch (_) {
    return fallbackList();
  }
}

export async function getEvent(eventId) {
  try {
    return await api(`/api/events/${eventId}`);
  } catch (_) {
    return fallbackFind(eventId);
  }
}

export async function getEventsByVendor(vendorId) {
  try {
    return await api(`/api/events?vendor_id=${encodeURIComponent(vendorId)}`);
  } catch (_) {
    return fallbackList().filter((e) => e.vendorIds?.includes(vendorId));
  }
}

export async function getUpcomingEvents(limit = 6) {
  try {
    return await api(`/api/events?status=upcoming&limit=${limit}`);
  } catch (_) {
    return fallbackList().filter((e) => e.status === "upcoming").slice(0, limit);
  }
}

export async function createEvent(eventData) {
  return await api("/api/events", {
    method: "POST",
    body: eventData,
  });
}

export async function updateEvent(eventId, eventData) {
  return await api(`/api/events/${eventId}`, {
    method: "PATCH",
    body: eventData,
  });
}

export async function publishEvent(eventId) {
  return await api(`/api/events/${eventId}/publish`, {
    method: "PATCH",
  });
}

export async function getMyEvents() {
  return await api("/api/events/my_events");
}
