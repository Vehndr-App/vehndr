import { api } from './api';

let PushNotifications = null;
let Capacitor = null;

// Dynamically import Capacitor modules (only available in native app)
async function loadCapacitor() {
  if (PushNotifications) return true;

  try {
    const core = await import('@capacitor/core');
    const push = await import('@capacitor/push-notifications');
    Capacitor = core.Capacitor;
    PushNotifications = push.PushNotifications;
    return true;
  } catch (e) {
    console.log('Capacitor not available (running in browser)');
    return false;
  }
}

// Check if running inside native Capacitor app
export async function isNativeApp() {
  const loaded = await loadCapacitor();
  if (!loaded) return false;
  return Capacitor.isNativePlatform();
}

// Get the current platform
export async function getPlatform() {
  const loaded = await loadCapacitor();
  if (!loaded) return 'web';
  return Capacitor.getPlatform(); // 'ios', 'android', or 'web'
}

// Request permission and register for push notifications
export async function registerPushNotifications() {
  const loaded = await loadCapacitor();
  if (!loaded) {
    console.log('Push notifications not available in browser');
    return null;
  }

  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications only work in native app');
    return null;
  }

  // Check current permission status
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    // Request permission
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  // Register with APNs/FCM
  await PushNotifications.register();

  return new Promise((resolve) => {
    // Listen for registration success
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);

      // Send token to backend
      try {
        const platform = await getPlatform();
        await api('/api/device_tokens', {
          method: 'POST',
          body: { token: token.value, platform },
        });
        console.log('Device token registered with backend');
      } catch (err) {
        console.error('Failed to register device token:', err);
      }

      resolve(token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration failed:', err);
      resolve(null);
    });
  });
}

// Set up notification listeners
export async function setupNotificationListeners(callbacks = {}) {
  const loaded = await loadCapacitor();
  if (!loaded || !Capacitor.isNativePlatform()) return;

  const { onReceive, onTap } = callbacks;

  // Notification received while app is in foreground
  if (onReceive) {
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
      onReceive(notification);
    });
  }

  // User tapped on notification
  if (onTap) {
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push notification tapped:', action);
      onTap(action.notification, action.actionId);
    });
  }
}

// Remove device token from backend (e.g., on logout)
export async function unregisterPushNotifications() {
  try {
    await api('/api/device_tokens', { method: 'DELETE' });
    console.log('Device token unregistered');
  } catch (err) {
    console.error('Failed to unregister device token:', err);
  }
}
