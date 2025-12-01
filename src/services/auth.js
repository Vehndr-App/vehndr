"use client";

import { api } from "./api";

export async function getCurrentUser() {
  try {
    const result = await api("/api/auth/current_user");
    return result && typeof result === 'object' && 'user' in result ? result.user : result;
  } catch (err) {
    if (err?.status === 401) return null;
    throw err;
  }
}

export async function login({ email, password }) {
  const result = await api("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (typeof window !== "undefined" && result?.token) {
    window.localStorage.setItem("vehndr_token", result.token);
  }
  return result?.user || result;
}

export async function register({ email, password, passwordConfirmation, name, role }) {
  const result = await api("/api/auth/register", {
    method: "POST",
    body: { email, password, password_confirmation: passwordConfirmation, name, role },
  });
  if (typeof window !== "undefined" && result?.token) {
    window.localStorage.setItem("vehndr_token", result.token);
  }
  return result?.user || result;
}

export async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("vehndr_token");
    }
  }
}









