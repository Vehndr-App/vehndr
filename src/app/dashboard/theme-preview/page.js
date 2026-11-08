"use client";

import Link from "next/link";

/** Local-only preview of the HOLO EYES vendor dashboard look (no login required). */
export default function DashboardThemePreviewPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      <div className="bg-gradient-primary text-white px-4 pt-12 pb-8 safe-area-top">
        <div className="max-w-lg mx-auto">
          <p className="text-white/70 text-sm">Theme preview</p>
          <h1 className="text-h2 text-white">HOLO EYES</h1>
          <p className="text-white/80 text-sm mt-2">
            This is how your vendor dashboard colors look locally.
          </p>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <div className="max-w-lg mx-auto grid grid-cols-3 gap-3">
          {["This Week", "Total Sales", "Avg Order"].map((label) => (
            <div key={label} className="card bg-white p-4 text-center">
              <p className="text-[var(--gray-500)] text-xs mb-1">{label}</p>
              <p className="text-h4 text-[var(--foreground)]">$0</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6 max-w-lg mx-auto space-y-3">
        <button type="button" className="btn btn-primary w-full">
          Primary button
        </button>
        <div className="h-2 rounded-full bg-gradient-vendor" />
        <p className="text-sm text-white/80 text-center">
          <Link href="/login" className="underline text-[var(--violet-400)]">
            Log in
          </Link>
          {" "}
          to see your real dashboard data.
        </p>
      </div>
    </div>
  );
}
