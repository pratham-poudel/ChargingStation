/**
 * Firebase Admin SDK Configuration
 * Handles server-side Firebase operations including sending push notifications
 */

const admin = require('firebase-admin');

class FirebaseAdminService {
  constructor() {
    this.isInitialized = false;
    this.app = null;
  }

  /**
   * Initialize Firebase Admin SDK
   * @returns {boolean} Success status
   */
  initialize() {
    try {
      if (this.isInitialized) {
        return true;
      }

      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        console.warn('Firebase Admin credentials not found. Push notifications will not work.');
        return false;
      }      // Parse private key (handle escaped newlines)
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

      // Verify project ID format
      if (!/^[a-z0-9-]+$/.test(projectId)) {
        throw new Error(`Invalid project ID format: ${projectId}`);
      }

      console.log(`Initializing Firebase for project: ${projectId}`);
      console.log(`Using service account: ${clientEmail}`);

      const credential = admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey
      });// Initialize without database URL for FCM-only usage
      this.app = admin.initializeApp({
        credential,
        projectId
      });

      console.log('Firebase Admin SDK initialized successfully');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      return false;
    }
  }

  /**
   * Send push notification to a single device
   * @param {string} fcmToken - FCM registration token
   * @param {Object} notification - Notification payload
   * @param {Object} data - Data payload
   * @returns {Promise<boolean>} Success status
   */
  async sendToDevice(fcmToken, notification, data = {}) {
    try {
      if (!this.isInitialized) {
        console.warn('Firebase Admin not initialized');
        return false;
      }

      if (!fcmToken) {
        console.warn('FCM token is required');
        return false;
      }

      const message = {
        token: fcmToken,
        notification: {
          title: notification.title || 'ChargEase Notification',
          body: notification.body || 'You have a new notification',
          ...notification
        },
        data: {
          click_action: data.click_action || '/',
          ...data
        },
        webpush: {
          headers: {
            Urgency: 'high'
          },
          notification: {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
            ...notification
          }
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#10B981',
            sound: 'default',
            clickAction: data.click_action || 'FLUTTER_NOTIFICATION_CLICK',
            ...notification
          },
          priority: 'high'
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body
              },
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log('Push notification sent successfully:', response);
      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      
      // Handle specific error cases
      if (error.code === 'messaging/registration-token-not-registered') {
        console.log('FCM token is no longer valid, should be removed from database');
      }
      
      return false;
    }
  }

  /**
   * Send push notification to multiple devices
   * @param {string[]} fcmTokens - Array of FCM registration tokens
   * @param {Object} notification - Notification payload
   * @param {Object} data - Data payload
   * @returns {Promise<Object>} Result with success and failure counts
   */
  async sendToMultipleDevices(fcmTokens, notification, data = {}) {
    try {
      if (!this.isInitialized) {
        console.warn('Firebase Admin not initialized');
        return { successCount: 0, failureCount: fcmTokens.length };
      }

      if (!fcmTokens || fcmTokens.length === 0) {
        console.warn('No FCM tokens provided');
        return { successCount: 0, failureCount: 0 };
      }

      const message = {
        notification: {
          title: notification.title || 'ChargEase Notification',
          body: notification.body || 'You have a new notification',
          ...notification
        },
        data: {
          click_action: data.click_action || '/',
          ...data
        },
        webpush: {
          headers: {
            Urgency: 'high'
          },
          notification: {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
            ...notification
          }
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#10B981',
            sound: 'default',
            clickAction: data.click_action || 'FLUTTER_NOTIFICATION_CLICK',
            ...notification
          },
          priority: 'high'
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body
              },
              sound: 'default',
              badge: 1
            }
          }
        }
      };      // Try individual sends instead of batch to avoid /batch endpoint issues
      const results = [];
      const invalidTokens = [];
      
      for (const token of fcmTokens) {
        try {
          await admin.messaging().send({
            token,
            ...message
          });
          results.push({ success: true });
        } catch (error) {
          results.push({ success: false, error });
          if (error.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(token);
            console.log(`Invalid FCM token should be removed: ${token?.substring(0, 20)}...`);
          }
        }
      }      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      console.log(`Push notifications sent: ${successCount} successful, ${failureCount} failed`);
      
      return {
        successCount,
        failureCount,
        invalidTokens
      };
    } catch (error) {
      console.error('Failed to send push notifications to multiple devices:', error);
      return { 
        successCount: 0, 
        failureCount: fcmTokens.length,
        invalidTokens: []
      };
    }
  }

  /**
   * Send notification to a topic
   * @param {string} topic - Topic name
   * @param {Object} notification - Notification payload
   * @param {Object} data - Data payload
   * @returns {Promise<boolean>} Success status
   */
  async sendToTopic(topic, notification, data = {}) {
    try {
      if (!this.isInitialized) {
        console.warn('Firebase Admin not initialized');
        return false;
      }

      const message = {
        topic,
        notification: {
          title: notification.title || 'ChargEase Notification',
          body: notification.body || 'You have a new notification',
          ...notification
        },
        data: {
          click_action: data.click_action || '/',
          ...data
        }
      };

      const response = await admin.messaging().send(message);
      console.log('Topic notification sent successfully:', response);
      return true;
    } catch (error) {
      console.error('Failed to send topic notification:', error);
      return false;
    }
  }

  /**
   * Subscribe tokens to a topic
   * @param {string[]} fcmTokens - Array of FCM tokens
   * @param {string} topic - Topic name
   * @returns {Promise<boolean>} Success status
   */
  async subscribeToTopic(fcmTokens, topic) {
    try {
      if (!this.isInitialized) {
        console.warn('Firebase Admin not initialized');
        return false;
      }

      const response = await admin.messaging().subscribeToTopic(fcmTokens, topic);
      console.log(`Subscribed ${response.successCount} tokens to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      return false;
    }
  }

  /**
   * Unsubscribe tokens from a topic
   * @param {string[]} fcmTokens - Array of FCM tokens
   * @param {string} topic - Topic name
   * @returns {Promise<boolean>} Success status
   */
  async unsubscribeFromTopic(fcmTokens, topic) {
    try {
      if (!this.isInitialized) {
        console.warn('Firebase Admin not initialized');
        return false;
      }

      const response = await admin.messaging().unsubscribeFromTopic(fcmTokens, topic);
      console.log(`Unsubscribed ${response.successCount} tokens from topic: ${topic}`);
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from topic:', error);
      return false;
    }
  }

  /**
   * Debug method to test Firebase connection
   */
  async testConnection() {
    try {
      console.log('🔍 Testing Firebase connection...');
      console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
      console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL?.substring(0, 50) + '...');
      
      if (!this.isInitialized) {
        console.log('❌ Firebase not initialized');
        return false;
      }
      
      // Test if messaging is accessible
      const messaging = admin.messaging();
      console.log('✅ Firebase Messaging instance created successfully');
      
      // Try to validate a dummy token (this will fail but test the connection)
      try {
        await messaging.send({
          token: 'dummy-token-for-connection-test',
          notification: { title: 'Test', body: 'Test' }
        });
      } catch (error) {
        if (error.code === 'messaging/registration-token-not-registered') {
          console.log('✅ Firebase connection working (expected dummy token error)');
          return true;
        } else {
          console.log('❌ Firebase connection issue:', error.code, error.message);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const firebaseAdminService = new FirebaseAdminService();

module.exports = firebaseAdminService;
