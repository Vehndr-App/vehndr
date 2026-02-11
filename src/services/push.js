"use client";

import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { api } from "./api";

/** Default Android notification channel ID; must match backend and AndroidManifest meta-data. */
const ANDROID_DEFAULT_CHANNEL_ID = "vehndr_default";

/**
 * Register the current FCM token with the backend for the logged-in user.
 * No-op when not running in the native app (Capacitor WebView).
 * On Android 13+, requests notification permission first; creates default channel on Android.
 */
export async function registerPushToken() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return;
  }
  try {
    const platform = Capacitor.getPlatform();

    // Android 13+ requires runtime permission; otherwise notifications are blocked.
    await FirebaseMessaging.requestPermissions();

    // Android 8+: create default channel so FCM messages have a channel to display in.
    if (platform === "android") {
      await FirebaseMessaging.createChannel({
        id: ANDROID_DEFAULT_CHANNEL_ID,
        name: "General",
        importance: 4, // High (sound + heads-up)
        vibration: true,
      });
    }

    const { token } = await FirebaseMessaging.getToken();
    await api("/api/device_tokens", {
      method: "POST",
      body: { token, platform },
    });
  } catch (err) {
    console.warn("Push token registration failed:", err);
  }
}

/**
 * Unregister the current device token (e.g. on logout).
 * No-op when not running in the native app.
 */
export async function unregisterPushToken() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return;
  }
  try {
    const { token } = await FirebaseMessaging.getToken();
    await api("/api/device_tokens", {
      method: "DELETE",
      body: { token },
    });
  } catch (err) {
    console.warn("Push token unregister failed:", err);
  }
}

/**
 * Subscribe to FCM token refresh events and POST the new token to the backend.
 * Call once when the app loads (e.g. in AuthProvider) and only when on native.
 */
export function setupTokenRefreshListener() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return () => {};
  }
  const unsubscribe = FirebaseMessaging.addListener(
    "tokenReceived",
    async (event) => {
      try {
        const platform = Capacitor.getPlatform();
        await api("/api/device_tokens", {
          method: "POST",
          body: { token: event.token, platform },
        });
      } catch (err) {
        console.warn("Push token refresh registration failed:", err);
      }
    }
  );
  return () => {
    unsubscribe.then((fn) => fn.remove());
  };
}
