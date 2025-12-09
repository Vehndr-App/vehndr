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

export async function login({ email, password, recaptchaToken }) {
  const result = await api("/api/auth/login", {
    method: "POST",
    body: { email, password, recaptcha_token: recaptchaToken },
  });
  if (typeof window !== "undefined" && result?.token) {
    window.localStorage.setItem("vehndr_token", result.token);
  }
  return result?.user || result;
}

export async function register({ email, password, passwordConfirmation, name, businessName, role, recaptchaToken }) {
  const result = await api("/api/auth/register", {
    method: "POST",
    body: {
      email,
      password,
      password_confirmation: passwordConfirmation,
      name,
      business_name: businessName,
      role,
      recaptcha_token: recaptchaToken
    },
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









