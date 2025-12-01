"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, login } from "../services/auth";
import Link from "next/link";

export default function AuthGate({ children, allowedRoles = ['vendor'] }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-sm text-black/60">
        Checking auth…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-md mx-auto rounded-lg border border-black/[.08] bg-white/60">
        <div className="text-sm mb-3">Log in to access this page.</div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-black text-white px-3 py-2 text-sm hover:opacity-90 w-full"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-2">Access Denied</div>
        <div className="text-sm text-gray-600">
          You must be logged in as a {allowedRoles.join(' or ')} to view this page.
        </div>
        <Link
          href="/"
          className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-800"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return children;
}
