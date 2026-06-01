import { api } from "./api";

export async function listNotifications() {
  return api("/api/notifications");
}

export async function getUnreadCount() {
  const res = await api("/api/notifications/unread_count");
  return res?.unreadCount ?? 0;
}

export async function markNotificationRead(id) {
  return api(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  return api("/api/notifications/mark_all_read", { method: "PATCH" });
}
