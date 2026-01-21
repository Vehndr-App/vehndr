"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";

// Mock conversations for demo
const MOCK_CONVERSATIONS = [
  {
    id: "1",
    participant: {
      id: "vendor_artisan_1",
      name: "Artisan Alley",
      avatar: null,
      role: "vendor",
    },
    lastMessage: {
      text: "Hi! Thanks for your interest in our handmade jewelry. Let me know if you have any questions!",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      unread: true,
    },
  },
  {
    id: "2",
    participant: {
      id: "coord_sarah_1",
      name: "Sarah Johnson",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
      role: "coordinator",
    },
    lastMessage: {
      text: "The Spring Makers Market is going to be amazing! Are you still interested in participating?",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      unread: false,
    },
  },
  {
    id: "3",
    participant: {
      id: "vendor_foodie_1",
      name: "Foodie Favorites",
      avatar: null,
      role: "vendor",
    },
    lastMessage: {
      text: "Your order is ready for pickup! 🎉",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      unread: false,
    },
  },
];

const getRoleLabel = (role) => {
  if (role === "coordinator") return "event organizer";
  return role;
};

export default function MessagesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const filteredConversations = conversations.filter((conv) =>
    conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[var(--violet-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-100)] sticky top-14 z-40">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-[var(--gray-900)]">Messages</h1>
            <button className="w-9 h-9 rounded-full bg-[var(--violet-100)] flex items-center justify-center text-[var(--violet-600)] hover:bg-[var(--violet-200)] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="8" y1="10" x2="16" y2="10"/>
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)]"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full h-10 pl-10 pr-4 rounded-[var(--radius-lg)] bg-[var(--gray-100)] text-sm outline-none focus:ring-2 focus:ring-[var(--violet-500)]/20"
              style={{ fontSize: "16px" }}
            />
          </div>
        </div>
      </div>

      {/* Conversations */}
      <div className="mx-auto max-w-2xl">
        {filteredConversations.length > 0 ? (
          <div className="divide-y divide-[var(--gray-100)]">
            {filteredConversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="flex items-center gap-3 px-4 sm:px-6 py-4 bg-white hover:bg-[var(--gray-50)] transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {conversation.participant.avatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={conversation.participant.avatar}
                      alt={conversation.participant.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                      {conversation.participant.name.charAt(0)}
                    </div>
                  )}
                  {conversation.lastMessage.unread && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--coral-500)] border-2 border-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-medium text-[var(--gray-900)] truncate ${conversation.lastMessage.unread ? "font-semibold" : ""}`}>
                      {conversation.participant.name}
                    </h3>
                    <span className="text-xs text-[var(--gray-400)] flex-shrink-0 ml-2">
                      {formatTime(conversation.lastMessage.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--gray-100)] text-[var(--gray-500)] capitalize">
                      {getRoleLabel(conversation.participant.role)}
                    </span>
                    <p className={`text-sm truncate ${conversation.lastMessage.unread ? "text-[var(--gray-900)] font-medium" : "text-[var(--gray-500)]"}`}>
                      {conversation.lastMessage.text}
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  className="flex-shrink-0 text-[var(--gray-300)]"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState searchQuery={searchQuery} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ searchQuery }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--gray-300)"
          strokeWidth="1.5"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      {searchQuery ? (
        <>
          <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-2">
            No results found
          </h2>
          <p className="text-[var(--gray-500)] max-w-sm mx-auto">
            No conversations match &ldquo;{searchQuery}&rdquo;
          </p>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-2">
            No messages yet
          </h2>
          <p className="text-[var(--gray-500)] mb-8 max-w-sm mx-auto">
            Start a conversation with vendors or event organizers to plan your perfect event!
          </p>
          <Link href="/vendors" className="btn btn-gradient inline-flex items-center gap-2">
            Browse Vendors
          </Link>
        </>
      )}
    </div>
  );
}

