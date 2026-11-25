"use client";

import Link from "next/link";
import { EVENT_BESTIE_OPEN } from "../../constants/eventBestie";

const SUPPORT_EMAIL = "admin@vehndr.com";

function openChat() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_BESTIE_OPEN));
  }
}

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold text-[var(--gray-900)]">
        Support
      </h1>
      <p className="mt-2 text-[var(--gray-600)]">
        Get help from the Vehndr team.
      </p>

      <div className="mt-10 space-y-6">
        {/* Email */}
        <section className="rounded-[var(--radius-2xl)] border border-[var(--gray-200)] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--violet-100)] text-[var(--violet-600)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--gray-900)]">Email us</h2>
              <p className="mt-1 text-sm text-[var(--gray-600)]">
                Send a message and we’ll get back to you as soon as we can.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--violet-600)] hover:text-[var(--violet-700)]"
              >
                {SUPPORT_EMAIL}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7"/><path d="M17 7h-6v6"/>
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* Chat */}
        <section className="rounded-[var(--radius-2xl)] border border-[var(--gray-200)] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--magenta-100)] text-[var(--magenta-600)]">
              <span className="text-2xl">✨</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--gray-900)]">Chat with Event Bestie</h2>
              <p className="mt-1 text-sm text-[var(--gray-600)]">
                Get instant answers and ideas from our AI assistant.
              </p>
              <button
                type="button"
                onClick={openChat}
                className="mt-3 inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-gradient-to-r from-[var(--violet-500)] to-[var(--magenta-500)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                Open chat
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7"/><path d="M17 7h-6v6"/>
                </svg>
              </button>
            </div>
          </div>
        </section>
      </div>

      <p className="mt-10 text-center text-sm text-[var(--gray-500)]">
        <Link href="/" className="text-[var(--violet-600)] hover:underline">Back to home</Link>
      </p>
    </div>
  );
}
