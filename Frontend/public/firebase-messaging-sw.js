/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications for web browsers
 */

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

// Firebase configuration - must match your app config
const firebaseConfig = {
  apiKey: 'AIzaSyD_--4ztuhHvzx1pv3Rb7g9D11JumKL06s',
  authDomain: 'chargease-nepal.firebaseapp.com',
  projectId: 'chargease-nepal',
  storageBucket: 'chargease-nepal.firebasestorage.app',
  messagingSenderId: '590101700590',
  appId: '1:590101700590:web:a3ce3f93e0739362e8b8ff',
  measurementId: 'G-F90E7360VF'
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

/**
 * Handle background messages when app is not in focus
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const { notification, data } = payload;
    // Extract notification details
  const notificationTitle = notification?.title || data?.title || 'ChargEase Notification';
  const notificationOptions = {
    body: notification?.body || data?.body || 'You have a new notification',
    icon: notification?.icon || data?.icon || '/vite.svg',
    badge: '/vite.svg',
    image: notification?.image || data?.image,
    data: {
      ...data,
      click_action: notification?.click_action || data?.click_action || '/',
      url: data?.url || '/'
    },    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/vite.svg'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/vite.svg'
      }
    ],
    requireInteraction: true,
    silent: false,
    renotify: true,
    tag: data?.tag || 'chargease-notification'
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification click events
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);

  const notification = event.notification;
  const data = notification.data || {};
  
  notification.close();

  if (event.action === 'dismiss') {
    // User dismissed the notification
    return;
  }

  // Handle notification click
  const urlToOpen = data.click_action || data.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Focus existing window and navigate to URL
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      
      // Open new window if no existing window found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Handle push events (backup for onBackgroundMessage)
 * Only show notifications when app is NOT in foreground
 */
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);

  if (event.data) {
    try {
      const payload = event.data.json();
      const { notification, data } = payload;

      // Check if any clients (app windows) are currently focused
      event.waitUntil(
        clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        }).then((clientList) => {
          // Check if app is in foreground
          const isAppInForeground = clientList.some(client => 
            client.visibilityState === 'visible' && 
            client.focused && 
            client.url.includes(self.location.origin)
          );          // Only show notification if app is NOT in foreground
          if (!isAppInForeground) {
            console.log('[firebase-messaging-sw.js] App not in foreground, showing notification');
            const notificationTitle = notification?.title || data?.title || 'ChargEase Notification';

            const notificationOptions = {
              body: notification?.body || data?.body || 'You have a new notification',
              icon: notification?.icon || data?.icon || '/vite.svg',
              badge: '/vite.svg',
              data: data || {},
              tag: data?.tag || 'chargease-notification',
              requireInteraction: true,
              silent: false
            };

            return self.registration.showNotification(notificationTitle, notificationOptions);
          } else {
            console.log('[firebase-messaging-sw.js] App is in foreground, skipping service worker notification');
          }
        })
      );
    } catch (error) {
      console.error('[firebase-messaging-sw.js] Error processing push event:', error);
    }
  }
});

/**
 * Service Worker installation
 */
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing');
  self.skipWaiting();
});

/**
 * Service Worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activating');
  event.waitUntil(clients.claim());
});

/**
 * Handle service worker errors
 */
self.addEventListener('error', (event) => {
  console.error('[firebase-messaging-sw.js] Service worker error:', event.error);
});

/**
 * Handle unhandled promise rejections
 */
self.addEventListener('unhandledrejection', (event) => {
  console.error('[firebase-messaging-sw.js] Unhandled promise rejection:', event.reason);
});

console.log('[firebase-messaging-sw.js] Service worker loaded and ready');
