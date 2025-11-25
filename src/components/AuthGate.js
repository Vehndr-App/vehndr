"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, login } from "../services/auth";

export default function AuthGate({ children }) {
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
        <div className="text-sm mb-3">Log in to access your dashboard.</div>
        <div className="space-y-2">
          <button
            id="login-demo-vendor-btn"
            className="inline-flex items-center justify-center rounded-md bg-black text-white px-3 py-2 text-sm hover:opacity-90 w-full cursor-pointer"
            onClick={async () => {
              try {
                await login({ email: "vendor@example.com", password: "password123" });
                const u2 = await getCurrentUser();
                setUser(u2);
              } catch (e) {
                console.error(e);
                alert("Login failed");
              }
            }}
          >
            Login as Demo Vendor
          </button>
        </div>
      </div>
    );
  }

  if (user.role !== 'vendor') {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-2">Access Denied</div>
        <div className="text-sm text-gray-600">You must be logged in as a vendor to view this page.</div>
      </div>
    );
  }

  return children;
}
