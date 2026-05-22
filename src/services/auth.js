"use client";

import { api } from "./api";
import { registerPushToken, unregisterPushToken } from "./push";

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
    registerPushToken().catch(() => {});
  }
  return result?.user || result;
}

export async function register({
  email,
  password,
  passwordConfirmation,
  name,
  phone,
  businessName,
  category,
  role,
  recaptchaToken,
  termsAccepted,
  privacyAccepted
}) {
  const result = await api("/api/auth/register", {
    method: "POST",
    body: {
      email,
      password,
      password_confirmation: passwordConfirmation,
      name,
      phone,
      business_name: businessName,
      category,
      role,
      recaptcha_token: recaptchaToken,
      terms_accepted: termsAccepted,
      privacy_accepted: privacyAccepted
    },
  });
  if (typeof window !== "undefined" && result?.token) {
    window.localStorage.setItem("vehndr_token", result.token);
    registerPushToken().catch(() => {});
  }
  return result?.user || result;
}

export async function logout() {
  try {
    await unregisterPushToken();
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("vehndr_token");
    }
  }
}

export async function verifyEmail(token) {
  const result = await api("/api/auth/verify_email", {
    method: "POST",
    body: { token },
  });
  if (typeof window !== "undefined" && result?.token) {
    window.localStorage.setItem("vehndr_token", result.token);
    registerPushToken().catch(() => {});
  }
  return result;
}

export async function resendVerification(email) {
  return api("/api/auth/resend_verification", {
    method: "POST",
    body: { email },
  });
}









