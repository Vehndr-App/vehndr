"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser } from "../services/auth";
import { registerPushToken, setupTokenRefreshListener } from "../services/push";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatorName, setImpersonatorName] = useState(null);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser?.impersonating || (typeof window !== "undefined" && localStorage.getItem("vehndr_admin_token"))) {
        setIsImpersonating(true);
        setImpersonatorName(currentUser?.impersonatorName || null);
      } else {
        setIsImpersonating(false);
        setImpersonatorName(null);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
      setIsImpersonating(false);
      setImpersonatorName(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // Push: register token when user is loaded (e.g. app open when already logged in)
  useEffect(() => {
    if (!user) return;
    registerPushToken().catch(() => {});
  }, [user]);

  // Push: listen for FCM token refresh and re-register with backend
  useEffect(() => {
    const cleanup = setupTokenRefreshListener();
    return cleanup;
  }, []);

  const refreshUser = async () => {
    await loadUser();
  };

  const clearUser = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, clearUser, isImpersonating, impersonatorName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
