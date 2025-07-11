/**
 * Push Notification Service with Firebase Cloud Messaging
 * Handles push notifications for both web and React Native WebView environments
 */

import { 
  getRegistrationToken, 
  setupForegroundMessageListener, 
  isMessagingSupported,
  isReactNativeWebView,
  getReactNativeFCMToken,
  setupReactNativeMessageListener
} from '../config/firebase.js';

class PushNotificationService {
  constructor() {
    this.isInitialized = false;
    this.currentToken = null;
    this.foregroundUnsubscribe = null;
    this.reactNativeUnsubscribe = null;
    this.messageHandlers = new Set();
    this.isReactNative = isReactNativeWebView();
    this.processedMessages = new Set(); // Track processed messages to prevent duplicates
    this.messageTimeWindow = 5000; // 5 seconds window for duplicate detection
  }
  /**
   * Initialize Firebase messaging
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('🔄 Push notification service already initialized, skipping...');
        return true;
      }
      
      console.log('🚀 Initializing push notification service...');
      
      // Check if messaging is supported
      const supported = await isMessagingSupported();
      if (!supported && !this.isReactNative) {
        console.warn('Firebase Messaging not supported in this environment');
        return false;
      }

      // Setup message listeners (only if not already set up)
      if (!this.foregroundUnsubscribe && !this.reactNativeUnsubscribe) {
        this.setupMessageListeners();
      }
      
      console.log(`✅ Push notification service initialized for ${this.isReactNative ? 'React Native' : 'web'}`);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Request permission for notifications
   * @returns {Promise<boolean>} Permission granted status
   */
  async requestPermission() {
    try {
      if (this.isReactNative) {
        // React Native handles permissions internally
        return true;
      }

      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
      }

      if (Notification.permission === 'granted') {
        return true;
      }

      if (Notification.permission === 'denied') {
        console.warn('Notification permission denied');
        return false;
      }

      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Get FCM registration token
   * @returns {Promise<string|null>} FCM token or null if failed
   */
  async getToken() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.warn('Notification permission not granted');
        return null;
      }

      let token = null;

      if (this.isReactNative) {
        // Get token from React Native
        token = await getReactNativeFCMToken();
      } else {
        // Get token for web
        token = await getRegistrationToken();
      }

      if (token) {
        this.currentToken = token;
        console.log('FCM token obtained:', token.substring(0, 20) + '...');
      } else {
        console.warn('Failed to obtain FCM token');
      }

      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Setup message listeners for both web and React Native
   */
  setupMessageListeners() {
    if (this.isReactNative) {
      // Setup React Native message listener
      this.reactNativeUnsubscribe = setupReactNativeMessageListener((message) => {
        this.handleMessage(message);
      });
    } else {
      // Setup web foreground message listener
      this.foregroundUnsubscribe = setupForegroundMessageListener((payload) => {
        this.handleMessage(payload);
      });
    }
  }  /**
   * Handle incoming messages
   * @param {Object} message - The received message
   */
  handleMessage(message) {
    console.log('📨 Message received in foreground:', message);
    
    // Create unique message ID for duplicate detection
    const messageId = this.createMessageId(message);
    
    // Check if we've already processed this message recently
    if (this.processedMessages.has(messageId)) {
      console.log('🔄 Duplicate message detected, skipping:', messageId);
      return;
    }
    
    // Mark message as processed
    this.processedMessages.add(messageId);
    
    // Clean up old message IDs after the time window
    setTimeout(() => {
      this.processedMessages.delete(messageId);
    }, this.messageTimeWindow);
    
    console.log('✅ Processing new foreground message:', messageId);
    
    // Notify all registered handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });

    // Show notification ONLY in foreground (service worker handles background)
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      console.log('🔔 App is in foreground, showing foreground notification');
      if (message.notification) {
        this.showNotification(
          message.notification.title || 'ChargEase',
          {
            body: message.notification.body,
            icon: message.notification.icon || '/vite.svg',
            data: message.data || {},
            tag: messageId // Use message ID as tag to prevent browser duplicates
          }
        );
      }
    } else {
      console.log('🎯 App not in foreground, letting service worker handle notification');
    }
  }

  /**
   * Create unique message ID for duplicate detection
   * @param {Object} message - The received message
   * @returns {string} Unique message ID
   */
  createMessageId(message) {
    const timestamp = Date.now();
    const title = message.notification?.title || '';
    const body = message.notification?.body || '';
    const data = JSON.stringify(message.data || {});
    
    // Create a simple hash-like ID
    const content = `${title}-${body}-${data}`;
    const hash = content.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return `msg-${Math.abs(hash)}-${Math.floor(timestamp / 1000)}`;
  }

  /**
   * Add message handler
   * @param {Function} callback - Message handler callback
   * @returns {Function} Unsubscribe function
   */
  onMessage(callback) {
    if (typeof callback !== 'function') {
      console.error('Message handler must be a function');
      return () => {};
    }

    this.messageHandlers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(callback);
    };
  }

  /**
   * Show local notification
   * @param {string} title - Notification title
   * @param {Object} options - Notification options
   */  showNotification(title, options = {}) {
    try {
      console.log('🔔 Attempting to show notification:', title, options);
      
      if (this.isReactNative) {
        // For React Native, notifications are handled by the native layer
        console.log('Notification shown via React Native:', title);
        return;
      }

      if (!('Notification' in window)) {
        console.warn('❌ Browser does not support notifications');
        return;
      }

      console.log('🔍 Notification permission status:', Notification.permission);
      if (Notification.permission !== 'granted') {
        console.warn('❌ Notification permission not granted:', Notification.permission);
        
        // Try to request permission again
        Notification.requestPermission().then((permission) => {
          console.log('📝 New permission status:', permission);
          if (permission === 'granted') {
            console.log('✅ Permission granted, showing notification');
            this.showNotification(title, options); // Retry
          }
        });
        return;
      }

      console.log('✅ Creating browser notification...');
      const notification = new Notification(title, {
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'chargease-notification', // Prevent duplicate notifications
        requireInteraction: true, // Keep notification visible until user interacts
        ...options
      });

      console.log('✅ Notification created successfully');

      // Auto-close after 10 seconds (increased from 5)
      setTimeout(() => {
        notification.close();
        console.log('🕒 Notification auto-closed after 10 seconds');
      }, 10000);

      // Handle notification click
      notification.onclick = () => {
        console.log('👆 Notification clicked');
        window.focus();
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
        notification.close();
      };

      // Handle notification errors
      notification.onerror = (error) => {
        console.error('❌ Notification error:', error);
      };

      // Handle notification show
      notification.onshow = () => {
        console.log('👀 Notification displayed successfully');
      };

      // Handle notification close
      notification.onclose = () => {
        console.log('❌ Notification closed');
      };

    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Clear all notifications (if supported)
   */
  clearNotifications() {
    try {
      if (this.isReactNative) {
        // React Native handles clearing notifications
        return;
      }

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.getNotifications().then(notifications => {
            notifications.forEach(notification => {
              notification.close();
            });
          });
        });
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Update token on server
   * @param {string} token - FCM token
   * @param {string} userType - Type of user ('user' or 'vendor')
   * @returns {Promise<boolean>} Success status
   */
  async updateTokenOnServer(token, userType = 'user') {
    try {
      console.log(`Would send token to server for ${userType}:`, token?.substring(0, 20) + '...');
      return true;
    } catch (error) {
      console.error('Error updating token on server:', error);
      return false;
    }
  }

  /**
   * Remove token from server
   * @param {string} token - FCM token
   * @param {string} userType - Type of user ('user' or 'vendor')
   * @returns {Promise<boolean>} Success status
   */
  async removeTokenFromServer(token, userType = 'user') {
    try {
      console.log(`Would remove token from server for ${userType}:`, token?.substring(0, 20) + '...');
      return true;
    } catch (error) {
      console.error('Error removing token from server:', error);
      return false;
    }
  }

  /**
   * Test notification display (for debugging)
   * @param {string} title - Test notification title  
   * @param {string} body - Test notification body
   */
  testNotification(title = 'Test Notification', body = 'This is a test notification from ChargEase') {
    console.log('🧪 Testing notification display...');
    this.showNotification(title, {
      body,
      icon: '/vite.svg',
      tag: 'test-notification',
      data: { type: 'test' }
    });
  }

  /**
   * Cleanup function
   */
  cleanup() {
    if (this.foregroundUnsubscribe) {
      this.foregroundUnsubscribe();
      this.foregroundUnsubscribe = null;
    }

    if (this.reactNativeUnsubscribe) {
      this.reactNativeUnsubscribe();
      this.reactNativeUnsubscribe = null;
    }

    this.messageHandlers.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;

// Make pushNotificationService available globally for debugging
if (typeof window !== 'undefined') {
  window.pushNotificationService = pushNotificationService;
  
  // Global test function for debugging notifications
  window.testNotification = async (title = 'Test Notification', body = 'This is a test notification') => {
    console.log('🧪 Testing notification:', title, body);
    
    // Check permission
    const hasPermission = await pushNotificationService.requestPermission();
    console.log('Permission status:', hasPermission);
    
    if (!hasPermission) {
      console.error('❌ No notification permission');
      return false;
    }
    
    // Show test notification
    pushNotificationService.showNotification(title, {
      body: body,
      icon: '/vite.svg',
      tag: `test-${Date.now()}`, // Unique tag for test
      data: {
        url: '/',
        test: true
      }
    });
    
    return true;
  };
  
  console.log('🔧 Debug functions available: window.testNotification(), window.pushNotificationService');
}

// Helper functions for common notification types

/**
 * Show booking notification
 * @param {Object} booking - Booking data
 */
export const showBookingNotification = (booking) => {
  pushNotificationService.showNotification('Booking Update', {
    body: `Your booking at ${booking.stationName} has been ${booking.status}`,
    icon: '/vite.svg',
    data: {
      url: '/bookings',
      bookingId: booking._id
    }
  });
};

/**
 * Show payment notification
 * @param {Object} payment - Payment data
 */
export const showPaymentNotification = (payment) => {
  pushNotificationService.showNotification('Payment Update', {
    body: `Payment of Rs. ${payment.amount} has been ${payment.status}`,
    icon: '/vite.svg',
    data: {
      url: '/orders',
      paymentId: payment._id
    }
  });
};

/**
 * Show station notification
 * @param {Object} station - Station data
 */
export const showStationNotification = (station) => {
  pushNotificationService.showNotification('Station Update', {
    body: `${station.name} is now ${station.status}`,
    icon: '/vite.svg',
    data: {
      url: `/stations/${station._id}`,
      stationId: station._id
    }
  });
};
