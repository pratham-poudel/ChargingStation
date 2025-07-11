/**
 * Notification Service
 * Handles sending various types of notifications using Firebase Cloud Messaging
 */

const firebaseAdminService = require('../config/firebase');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const { Expo } = require('expo-server-sdk');

// Initialize Expo client
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN, // Optional: for better rate limits
  useFcmV1: false, // Set to true if you want to use FCM v1
});

class NotificationService {
  constructor() {
    this.notificationTypes = {
      BOOKING_CONFIRMED: 'booking_confirmed',
      BOOKING_CANCELLED: 'booking_cancelled',
      BOOKING_COMPLETED: 'booking_completed',
      PAYMENT_SUCCESS: 'payment_success',
      PAYMENT_FAILED: 'payment_failed',
      STATION_AVAILABLE: 'station_available',
      STATION_UNAVAILABLE: 'station_unavailable',
      VENDOR_NEW_BOOKING: 'vendor_new_booking',
      VENDOR_PAYMENT_RECEIVED: 'vendor_payment_received',
      GENERAL_ANNOUNCEMENT: 'general_announcement'
    };
  }

  /**
   * Send notification to a user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data
   * @param {Object} data - Additional data
   * @returns {Promise<boolean>} Success status
   */
  async sendToUser(userId, notification, data = {}) {
    try {
      const user = await User.findById(userId).select('fcmTokens appPreferences');
      if (!user) {
        console.warn(`User not found: ${userId}`);
        return false;
      }

      // Check if notifications are enabled for this type
      if (!this.shouldSendNotification(user.appPreferences, data.type)) {
        console.log(`Notification disabled for user ${userId}, type: ${data.type}`);
        return true; // Return true as it's not an error
      }

      let successCount = 0;
      let totalAttempts = 0;

      // Separate FCM and Expo tokens
      const fcmTokens = [];
      const expoTokens = [];

      if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
        user.fcmTokens.forEach(tokenObj => {
          if (tokenObj.token) {
            if (tokenObj.deviceType === 'expo') {
              expoTokens.push(tokenObj.token);
            } else {
              fcmTokens.push(tokenObj.token);
            }
          }
        });
      }

      // Send FCM notifications
      if (fcmTokens.length > 0) {
        const fcmSuccess = await this.sendFCMNotification(fcmTokens, notification, data);
        if (fcmSuccess) successCount++;
        totalAttempts++;
      }

      // Send Expo notifications
      if (expoTokens.length > 0) {
        const expoSuccess = await this.sendExpoNotification(expoTokens, notification, data);
        if (expoSuccess) successCount++;
        totalAttempts++;
      }

      if (totalAttempts === 0) {
        console.warn(`No valid tokens for user: ${userId}`);
        return false;
      }

      return successCount > 0;
    } catch (error) {
      console.error('Failed to send notification to user:', error);
      return false;
    }
  }

  /**
   * Send notification to a vendor
   * @param {string} vendorId - Vendor ID
   * @param {Object} notification - Notification data
   * @param {Object} data - Additional data
   * @returns {Promise<boolean>} Success status
   */
  async sendToVendor(vendorId, notification, data = {}) {
    try {
      const vendor = await Vendor.findById(vendorId).select('fcmTokens appPreferences');
      if (!vendor) {
        console.warn(`Vendor not found: ${vendorId}`);
        return false;
      }

      // Check if notifications are enabled for this type
      if (!this.shouldSendNotification(vendor.appPreferences, data.type)) {
        console.log(`Notification disabled for vendor ${vendorId}, type: ${data.type}`);
        return true;
      }

      const validTokens = this.getValidTokens(vendor.fcmTokens);
      if (validTokens.length === 0) {
        console.warn(`No valid FCM tokens for vendor: ${vendorId}`);
        return false;
      }

      const result = await firebaseAdminService.sendToMultipleDevices(
        validTokens,
        notification,
        { ...data, vendorId }
      );

      // Clean up invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        await this.removeInvalidTokens(vendorId, result.invalidTokens, 'vendor');
      }

      return result.successCount > 0;
    } catch (error) {
      console.error('Failed to send notification to vendor:', error);
      return false;
    }
  }

  /**
   * Send notification to Expo push token
   * @param {string} expoPushToken - Expo push token
   * @param {Object} notification - Notification data
   * @param {Object} data - Additional data
   * @returns {Promise<boolean>} Success status
   */
  async sendToExpoPushToken(expoPushToken, notification, data = {}) {
    try {
      // Check that the token is valid
      if (!Expo.isExpoPushToken(expoPushToken)) {
        console.error(`Push token ${expoPushToken} is not a valid Expo push token`);
        return false;
      }

      // Construct the message
      const message = {
        to: expoPushToken,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: data,
        badge: 1,
      };

      // Send the push notification
      const chunks = expo.chunkPushNotifications([message]);
      const tickets = [];

      for (let chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending Expo push notification chunk:', error);
        }
      }

      // Check if any tickets have errors
      let hasSuccess = false;
      for (let ticket of tickets) {
        if (ticket.status === 'ok') {
          hasSuccess = true;
        } else {
          console.error('Expo push notification error:', ticket);
        }
      }

      return hasSuccess;
    } catch (error) {
      console.error('Failed to send Expo push notification:', error);
      return false;
    }
  }

  /**
   * Send notification using Expo Push Notifications
   * @param {Array} tokens - Array of Expo push tokens
   * @param {Object} notification - Notification data
   * @param {Object} data - Additional data
   * @returns {Promise<boolean>} Success status
   */
  async sendExpoNotification(tokens, notification, data = {}) {
    try {
      const messages = [];

      for (let pushToken of tokens) {
        // Check that all push tokens are valid
        if (!Expo.isExpoPushToken(pushToken)) {
          console.error(`Push token ${pushToken} is not a valid Expo push token`);
          continue;
        }

        messages.push({
          to: pushToken,
          sound: 'default',
          title: notification.title,
          body: notification.body,
          data: data,
          badge: 1,
        });
      }

      if (messages.length === 0) {
        console.warn('No valid Expo push tokens');
        return false;
      }

      const chunks = expo.chunkPushNotifications(messages);
      let successCount = 0;

      for (let chunk of chunks) {
        try {
          let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          
          // Check tickets for errors
          for (let i = 0; i < ticketChunk.length; i++) {
            let ticket = ticketChunk[i];
            if (ticket.status === 'ok') {
              successCount++;
            } else {
              console.error('Expo notification error:', ticket.message);
            }
          }
        } catch (error) {
          console.error('Error sending Expo notification chunk:', error);
        }
      }

      console.log(`✅ Sent ${successCount}/${messages.length} Expo notifications`);
      return successCount > 0;
    } catch (error) {
      console.error('Failed to send Expo notification:', error);
      return false;
    }
  }

  /**
   * Send booking confirmation notification
   * @param {string} userId - User ID
   * @param {Object} booking - Booking data
   * @returns {Promise<boolean>} Success status
   */
  async sendBookingConfirmation(userId, booking) {
    return await this.sendToUser(userId, {
      title: 'Booking Confirmed',
      body: `Your booking at ${booking.stationName} has been confirmed for ${new Date(booking.scheduledTime).toLocaleString()}`,
      icon: '/favicon.ico'
    }, {
      type: this.notificationTypes.BOOKING_CONFIRMED,
      bookingId: booking._id.toString(),
      stationId: booking.stationId?.toString(),
      click_action: '/bookings'
    });
  }

  /**
   * Send booking cancellation notification
   * @param {string} userId - User ID
   * @param {Object} booking - Booking data
   * @returns {Promise<boolean>} Success status
   */
  async sendBookingCancellation(userId, booking) {
    return await this.sendToUser(userId, {
      title: 'Booking Cancelled',
      body: `Your booking at ${booking.stationName} has been cancelled`,
      icon: '/favicon.ico'
    }, {
      type: this.notificationTypes.BOOKING_CANCELLED,
      bookingId: booking._id.toString(),
      stationId: booking.stationId?.toString(),
      click_action: '/bookings'
    });
  }

  /**
   * Send payment success notification
   * @param {string} userId - User ID
   * @param {Object} payment - Payment data
   * @returns {Promise<boolean>} Success status
   */
  async sendPaymentSuccess(userId, payment) {
    return await this.sendToUser(userId, {
      title: 'Payment Successful',
      body: `Payment of Rs. ${payment.amount} has been processed successfully`,
      icon: '/favicon.ico'
    }, {
      type: this.notificationTypes.PAYMENT_SUCCESS,
      paymentId: payment._id.toString(),
      amount: payment.amount.toString(),
      click_action: '/orders'
    });
  }

  /**
   * Send new booking notification to vendor
   * @param {string} vendorId - Vendor ID
   * @param {Object} booking - Booking data
   * @returns {Promise<boolean>} Success status
   */
  async sendNewBookingToVendor(vendorId, booking) {
    return await this.sendToVendor(vendorId, {
      title: 'New Booking Received',
      body: `New booking received at ${booking.stationName} for ${new Date(booking.scheduledTime).toLocaleString()}`,
      icon: '/favicon.ico'
    }, {
      type: this.notificationTypes.VENDOR_NEW_BOOKING,
      bookingId: booking._id.toString(),
      stationId: booking.stationId?.toString(),
      click_action: '/vendor/bookings'
    });
  }

  /**
   * Send station availability notification
   * @param {string[]} userIds - Array of user IDs
   * @param {Object} station - Station data
   * @returns {Promise<number>} Number of successful notifications sent
   */
  async sendStationAvailability(userIds, station) {
    let successCount = 0;
    
    for (const userId of userIds) {
      const success = await this.sendToUser(userId, {
        title: 'Station Available',
        body: `${station.name} is now available for booking`,
        icon: '/favicon.ico'
      }, {
        type: this.notificationTypes.STATION_AVAILABLE,
        stationId: station._id.toString(),
        click_action: `/stations/${station._id}`
      });
      
      if (success) successCount++;
    }
    
    return successCount;
  }

  /**
   * Send general announcement
   * @param {string} title - Announcement title
   * @param {string} body - Announcement body
   * @param {Object} options - Additional options
   * @returns {Promise<boolean>} Success status
   */
  async sendGeneralAnnouncement(title, body, options = {}) {
    try {
      const result = await firebaseAdminService.sendToTopic('all_users', {
        title,
        body,
        icon: '/favicon.ico'
      }, {
        type: this.notificationTypes.GENERAL_ANNOUNCEMENT,
        click_action: options.url || '/',
        ...options.data
      });

      return result;
    } catch (error) {
      console.error('Failed to send general announcement:', error);
      return false;
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   * @param {Object} appPreferences - User app preferences
   * @param {string} notificationType - Type of notification
   * @returns {boolean} Whether to send notification
   */
  shouldSendNotification(appPreferences, notificationType) {
    if (!appPreferences || !appPreferences.notifications) {
      return true; // Default to enabled if no preferences set
    }

    const notifications = appPreferences.notifications;

    switch (notificationType) {
      case this.notificationTypes.BOOKING_CONFIRMED:
      case this.notificationTypes.BOOKING_CANCELLED:
      case this.notificationTypes.BOOKING_COMPLETED:
        return notifications.bookingUpdates !== false;
      
      case this.notificationTypes.PAYMENT_SUCCESS:
      case this.notificationTypes.PAYMENT_FAILED:
        return notifications.paymentUpdates !== false;
      
      case this.notificationTypes.STATION_AVAILABLE:
      case this.notificationTypes.STATION_UNAVAILABLE:
        return notifications.stationUpdates !== false;
      
      case this.notificationTypes.GENERAL_ANNOUNCEMENT:
        return notifications.generalAnnouncements !== false;
      
      default:
        return true;
    }
  }

  /**
   * Get valid FCM tokens (filter out expired ones)
   * @param {Array} fcmTokens - Array of FCM token objects
   * @returns {string[]} Array of valid token strings
   */
  getValidTokens(fcmTokens) {
    if (!fcmTokens || !Array.isArray(fcmTokens)) {
      return [];
    }

    const now = new Date();
    return fcmTokens
      .filter(tokenObj => {
        // Filter out expired tokens (older than 90 days)
        const tokenAge = now - new Date(tokenObj.createdAt);
        const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
        return tokenAge < maxAge && tokenObj.token;
      })
      .map(tokenObj => tokenObj.token);
  }

  /**
   * Remove invalid tokens from user/vendor records
   * @param {string} id - User or vendor ID
   * @param {string[]} invalidTokens - Array of invalid tokens
   * @param {string} type - 'user' or 'vendor'
   */
  async removeInvalidTokens(id, invalidTokens, type) {
    try {
      const Model = type === 'user' ? User : Vendor;
      await Model.findByIdAndUpdate(id, {
        $pull: {
          fcmTokens: { token: { $in: invalidTokens } }
        }
      });
      
      console.log(`Removed ${invalidTokens.length} invalid FCM tokens for ${type}: ${id}`);
    } catch (error) {
      console.error(`Failed to remove invalid tokens for ${type}:`, error);
    }
  }

  /**
   * Send FCM notification to multiple tokens
   * @param {Array} tokens - Array of FCM tokens
   * @param {Object} notification - Notification data
   * @param {Object} data - Additional data
   * @returns {Promise<boolean>} Success status
   */
  async sendFCMNotification(tokens, notification, data = {}) {
    try {
      const result = await firebaseAdminService.sendToMultipleDevices(
        tokens,
        notification,
        data
      );

      console.log(`✅ Sent ${result.successCount || 0}/${tokens.length} FCM notifications`);
      return (result.successCount || 0) > 0;
    } catch (error) {
      console.error('Failed to send FCM notification:', error);
      return false;
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
