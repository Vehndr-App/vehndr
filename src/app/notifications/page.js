"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDate(notifications) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = { Today: [], Yesterday: [], "This week": [], Older: [] };
  for (const n of notifications) {
    const d = new Date(n.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d >= today) groups["Today"].push(n);
    else if (d >= yesterday) groups["Yesterday"].push(n);
    else if (d >= weekAgo) groups["This week"].push(n);
    else groups["Older"].push(n);
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

function notificationLink(n) {
  const { inquiry_id, recipient_role } = n.data ?? {};
  if (!inquiry_id) return null;
  if (n.type === "offer_sent" || n.type === "offer_revised") {
    return `/messages/${inquiry_id}/offer`;
  }
  if (n.type === "offer_accepted" || n.type === "payment_received") {
    return `/dashboard/inquiries/${inquiry_id}`;
  }
  if (n.type === "new_message" || n.type === "booking_cancelled") {
    // Route to the recipient's own thread view.
    return recipient_role === "vendor"
      ? `/dashboard/inquiries/${inquiry_id}`
      : `/messages/${inquiry_id}`;
  }
  if (n.type === "tip_updated") {
    return recipient_role === "vendor"
      ? `/dashboard/inquiries/${inquiry_id}`
      : `/messages/${inquiry_id}`;
  }
  return `/messages/${inquiry_id}`;
}

// ─── Type Icon ────────────────────────────────────────────────────────────────

function NotificationIcon({ type }) {
  const base = "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0";

  if (type === "offer_sent") {
    return (
      <div className={`${base} bg-[var(--violet-100)]`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </div>
    );
  }
  if (type === "offer_revised") {
    return (
      <div className={`${base} bg-[var(--amber-50)]`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </div>
    );
  }
  if (type === "offer_accepted") {
    return (
      <div className={`${base} bg-[var(--mint-50)]`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    );
  }
  if (type === "payment_received") {
    return (
      <div className={`${base} bg-[var(--mint-100)]`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mint-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
    );
  }
  if (type === "new_message") {
    return (
      <div className={`${base} bg-[var(--violet-100)]`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
      </div>
    );
  }
  if (type === "booking_cancelled") {
    return (
      <div className={`${base} bg-red-50`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
    );
  }
  return (
    <div className={`${base} bg-[var(--gray-100)]`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    </div>
  );
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotificationRow({ notification, onRead }) {
  const link = notificationLink(notification);
  const unread = !notification.readAt;

  async function handleClick() {
    if (unread) {
      onRead(notification.id);
      await markNotificationRead(notification.id).catch(() => {});
    }
  }

  const content = (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 rounded-[var(--radius-xl)] transition-colors ${
        unread
          ? "bg-[var(--violet-50)] hover:bg-[var(--violet-100)/50]"
          : "bg-white hover:bg-[var(--gray-50)]"
      }`}
    >
      <NotificationIcon type={notification.type} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug break-words ${unread ? "font-semibold text-[var(--gray-900)]" : "font-medium text-[var(--gray-700)]"}`}>
            {notification.title}
          </p>
          <span className="text-[11px] text-[var(--gray-400)] whitespace-nowrap flex-shrink-0 mt-0.5">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        {notification.body && (
          <p className="text-xs text-[var(--gray-500)] mt-0.5 leading-relaxed">
            {notification.body}
          </p>
        )}
      </div>
      {unread && (
        <div className="w-2 h-2 rounded-full bg-[var(--violet-500)] flex-shrink-0 mt-1.5" />
      )}
    </div>
  );

  if (link) {
    return (
      <Link href={link} onClick={handleClick}>
        {content}
      </Link>
    );
  }
  return <div onClick={handleClick} className="cursor-pointer">{content}</div>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="w-10 h-10 rounded-xl bg-[var(--gray-100)] animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3.5 bg-[var(--gray-100)] rounded-full w-2/3 animate-pulse" />
        <div className="h-3 bg-[var(--gray-100)] rounded-full w-1/2 animate-pulse" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    listNotifications()
      .then((res) => {
        const list = res?.notifications ?? [];
        setNotifications(list);
        // Mark all as read silently after fetch
        if (list.some((n) => !n.readAt)) {
          markAllNotificationsRead().catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  function handleRead(id) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
  }

  if (!user) return null;

  const groups = groupByDate(notifications);

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-100)] sticky top-0 z-30">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[var(--gray-900)]">Notifications</h1>
          {notifications.some((n) => !n.readAt) && (
            <button
              onClick={() => {
                markAllNotificationsRead().catch(() => {});
                setNotifications((prev) =>
                  prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
                );
              }}
              className="text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)]"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-4 space-y-6">
        {loading ? (
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] overflow-hidden">
            {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] flex flex-col items-center justify-center py-20 text-center px-6">
            <div
              className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
              style={{ background: "var(--gradient-browse)" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-[var(--gray-700)]">No notifications yet</p>
            <p className="text-xs text-[var(--gray-400)] mt-1 max-w-xs">
              Activity on your proposals and offers will appear here.
            </p>
          </div>
        ) : (
          groups.map(([label, items]) => (
            <div key={label}>
              <p className="text-[11px] font-semibold text-[var(--gray-400)] uppercase tracking-wider px-1 mb-2">
                {label}
              </p>
              <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--gray-100)] overflow-hidden divide-y divide-[var(--gray-50)]">
                {items.map((n) => (
                  <NotificationRow key={n.id} notification={n} onRead={handleRead} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
