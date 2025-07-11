/**
 * Firebase Configuration and Initialization
 * Handles Firebase SDK setup for web and React Native environments
 */

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// VAPID key for web push notifications
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in production and if supported)
let analytics = null;
if (import.meta.env.PROD && typeof window !== 'undefined') {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    console.debug('Firebase Analytics not supported in this environment');
  });
}

// Initialize Messaging (only if supported)
let messaging = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  }).catch(() => {
    console.debug('Firebase Messaging not supported in this environment');
  });
}

/**
 * Check if Firebase Messaging is supported in current environment
 * @returns {Promise<boolean>} Whether messaging is supported
 */
export const isMessagingSupported = async () => {
  if (typeof window === 'undefined') return false;
  
  try {
    return await isSupported();
  } catch (error) {
    console.debug('Firebase Messaging support check failed:', error);
    return false;
  }
};

/**
 * Get FCM registration token for web
 * @returns {Promise<string|null>} FCM token or null if failed
 */
export const getRegistrationToken = async () => {
  try {
    if (!messaging || !vapidKey) {
      console.warn('Firebase Messaging not initialized or VAPID key missing');
      return null;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Wait for service worker to be ready and get its registration
    const registration = await navigator.serviceWorker.ready;
    
    // Get registration token with the existing service worker
    const token = await getToken(messaging, { 
      vapidKey,
      serviceWorkerRegistration: registration 
    });
    if (token) {
      console.debug('FCM registration token obtained');
      return token;
    } else {
      console.warn('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Failed to get FCM registration token:', error);
    return null;
  }
};

/**
 * Set up foreground message listener for web
 * @param {Function} callback - Callback function to handle received messages
 * @returns {Function|null} Unsubscribe function or null
 */
export const setupForegroundMessageListener = (callback) => {
  try {
    if (!messaging) {
      console.warn('Firebase Messaging not initialized');
      return null;
    }

    return onMessage(messaging, (payload) => {
      console.debug('Foreground message received:', payload);
      callback(payload);
    });
  } catch (error) {
    console.error('Failed to setup foreground message listener:', error);
    return null;
  }
};

/**
 * Check if running in React Native WebView
 * @returns {boolean} Whether running in React Native WebView
 */
export const isReactNativeWebView = () => {
  return typeof window !== 'undefined' && 
         (window.ReactNativeWebView || window.webkit?.messageHandlers?.ReactNativeWebView);
};

/**
 * Get FCM token for React Native (via WebView bridge)
 * This function will be called from React Native side
 * @returns {Promise<string|null>} FCM token from React Native
 */
export const getReactNativeFCMToken = () => {
  return new Promise((resolve) => {
    if (!isReactNativeWebView()) {
      resolve(null);
      return;
    }

    // Set up listener for React Native response
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'FCM_TOKEN_RESPONSE') {
          window.removeEventListener('message', handleMessage);
          resolve(data.token);
        }
      } catch (error) {
        console.error('Failed to parse React Native message:', error);
      }
    };

    window.addEventListener('message', handleMessage);

    // Request FCM token from React Native
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'GET_FCM_TOKEN'
      }));
    } else if (window.webkit?.messageHandlers?.ReactNativeWebView) {
      window.webkit.messageHandlers.ReactNativeWebView.postMessage({
        type: 'GET_FCM_TOKEN'
      });
    }

    // Timeout after 5 seconds
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      resolve(null);
    }, 5000);
  });
};

/**
 * Set up message listener for React Native
 * @param {Function} callback - Callback function to handle received messages
 */
export const setupReactNativeMessageListener = (callback) => {
  if (!isReactNativeWebView()) return;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'FCM_MESSAGE') {
        callback(data.message);
      }
    } catch (error) {
      console.error('Failed to parse React Native message:', error);
    }
  };

  window.addEventListener('message', handleMessage);

  // Return cleanup function
  return () => {
    window.removeEventListener('message', handleMessage);
  };
};

// Export Firebase instances
export { app, messaging, analytics };
export default app;
