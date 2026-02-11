"use client";

import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";

export default function ImpersonationBanner() {
  const { user, isImpersonating, refreshUser } = useAuth();

  if (!isImpersonating || !user) return null;

  const handleStopImpersonating = async () => {
    try {
      const res = await api("/api/admin/stop_impersonating", { method: "POST" });
      if (res.token) {
        localStorage.setItem("vehndr_token", res.token);
        localStorage.removeItem("vehndr_admin_token");
      }
      window.location.href = "/admin/users";
    } catch (err) {
      console.error("Failed to stop impersonating:", err);
      // Fallback: restore admin token if available
      const adminToken = localStorage.getItem("vehndr_admin_token");
      if (adminToken) {
        localStorage.setItem("vehndr_token", adminToken);
        localStorage.removeItem("vehndr_admin_token");
        window.location.href = "/admin/users";
      }
    }
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950">
        <div className="mx-auto max-w-6xl px-4 h-10 flex items-center justify-between text-sm">
          <span>
            Viewing as <strong>{user.name || user.email}</strong> ({user.role})
          </span>
          <button
            onClick={handleStopImpersonating}
            className="px-3 py-1 bg-amber-700 text-white rounded-md text-xs font-semibold hover:bg-amber-800 transition-colors"
          >
            Stop Impersonating
          </button>
        </div>
      </div>
      <div className="h-10" />
    </>
  );
}
