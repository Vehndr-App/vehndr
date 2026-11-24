import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--gray-200)] mt-12 pb-24">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-8 text-sm text-[var(--gray-600)] sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} Vehndr. All rights reserved.</span>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link
            href="/terms"
            className="hover:text-[var(--gray-800)] transition-colors"
          >
            Terms & Conditions
          </Link>
          <Link
            href="/privacy"
            className="hover:text-[var(--gray-800)] transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/refunds"
            className="hover:text-[var(--gray-800)] transition-colors"
          >
            Refunds & Cancellations
          </Link>
        </div>
      </div>
    </footer>
  );
}
