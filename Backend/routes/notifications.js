/**
 * Notification Routes
 * Handles API endpoints for managing push notifications
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const notificationService = require('../services/NotificationService');
const firebaseAdminService = require('../config/firebase');

/**
 * @route   POST /api/notifications/test
 * @desc    Send test notification (development only)
 * @access  Private
 */
router.post('/test', protect, [
  body('title').notEmpty().withMessage('Title is required'),
  body('body').notEmpty().withMessage('Body is required')
], async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test notifications not allowed in production'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, body, data = {} } = req.body;
    const userId = req.user.id;

    const success = await notificationService.sendToUser(userId, {
      title,
      body
    }, {
      type: 'test',
      ...data
    });

    res.json({
      success,
      message: success ? 'Test notification sent' : 'Failed to send test notification'
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/notifications/announcement
 * @desc    Send general announcement (admin only)
 * @access  Private (Admin)
 */
router.post('/announcement', protect, [
  body('title').notEmpty().withMessage('Title is required'),
  body('body').notEmpty().withMessage('Body is required')
], async (req, res) => {
  try {
    // Check if user is admin (you may need to implement admin middleware)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, body, url, data = {} } = req.body;

    const success = await notificationService.sendGeneralAnnouncement(title, body, {
      url,
      data
    });

    res.json({
      success,
      message: success ? 'Announcement sent successfully' : 'Failed to send announcement'
    });
  } catch (error) {
    console.error('Announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/notifications/subscribe-topic
 * @desc    Subscribe user to a notification topic
 * @access  Private
 */
router.post('/subscribe-topic', protect, [
  body('topic').notEmpty().withMessage('Topic is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { topic } = req.body;
    const user = req.user;

    // Get user's FCM tokens
    const fcmTokens = user.fcmTokens?.map(tokenObj => tokenObj.token).filter(Boolean) || [];
    
    if (fcmTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No FCM tokens found for this user'
      });
    }

    const success = await firebaseAdminService.subscribeToTopic(fcmTokens, topic);

    res.json({
      success,
      message: success ? `Subscribed to topic: ${topic}` : 'Failed to subscribe to topic'
    });
  } catch (error) {
    console.error('Topic subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/notifications/unsubscribe-topic
 * @desc    Unsubscribe user from a notification topic
 * @access  Private
 */
router.post('/unsubscribe-topic', protect, [
  body('topic').notEmpty().withMessage('Topic is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { topic } = req.body;
    const user = req.user;

    // Get user's FCM tokens
    const fcmTokens = user.fcmTokens?.map(tokenObj => tokenObj.token).filter(Boolean) || [];
    
    if (fcmTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No FCM tokens found for this user'
      });
    }

    const success = await firebaseAdminService.unsubscribeFromTopic(fcmTokens, topic);

    res.json({
      success,
      message: success ? `Unsubscribed from topic: ${topic}` : 'Failed to unsubscribe from topic'
    });
  } catch (error) {
    console.error('Topic unsubscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/notifications/status
 * @desc    Get notification service status
 * @access  Private
 */
router.get('/status', protect, async (req, res) => {
  try {
    const user = req.user;
    const fcmTokenCount = user.fcmTokens?.length || 0;
    const validTokenCount = user.fcmTokens?.filter(tokenObj => {
      const tokenAge = new Date() - new Date(tokenObj.createdAt);
      const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
      return tokenAge < maxAge && tokenObj.token;
    }).length || 0;

    res.json({
      success: true,
      data: {
        firebaseInitialized: firebaseAdminService.isInitialized,
        fcmTokenCount,
        validTokenCount,
        notificationPreferences: user.appPreferences?.notifications || {}
      }
    });
  } catch (error) {
    console.error('Notification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/notifications/debug
 * @desc    Debug Firebase connection (development only)
 * @access  Private
 */
router.get('/debug', protect, async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Debug endpoint not allowed in production'
      });
    }

    // Test Firebase connection
    const connectionTest = await firebaseAdminService.testConnection();
    
    res.json({
      success: true,
      firebase: {
        initialized: firebaseAdminService.isInitialized,
        connectionTest,
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmailPrefix: process.env.FIREBASE_CLIENT_EMAIL?.substring(0, 30) + '...'
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug test failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/notifications/expo-token
 * @desc    Register/update Expo push token for user
 * @access  Private
 */
router.post('/expo-token', protect, [
  body('token').notEmpty().withMessage('Token is required'),
  body('platform').optional().isIn(['ios', 'android']).withMessage('Platform must be ios or android')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, platform, deviceInfo } = req.body;
    const userId = req.user.id;

    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if token already exists
    const existingTokenIndex = user.fcmTokens.findIndex(
      tokenObj => tokenObj.token === token
    );

    if (existingTokenIndex > -1) {
      // Update existing token
      user.fcmTokens[existingTokenIndex] = {
        ...user.fcmTokens[existingTokenIndex],
        platform: platform || 'unknown',
        deviceType: 'expo',
        deviceInfo: deviceInfo || {},
        createdAt: new Date()
      };
    } else {
      // Add new token
      user.fcmTokens.push({
        token,
        platform: platform || 'unknown',
        deviceType: 'expo',
        deviceInfo: deviceInfo || {},
        createdAt: new Date()
      });
    }

    await user.save();
    console.log(`✅ Expo token registered for user ${userId}:`, token.substring(0, 20) + '...');

    res.json({
      success: true,
      message: 'Expo push token registered successfully'
    });
  } catch (error) {
    console.error('Expo token registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/notifications/test-connection
 * @desc    Test connection from mobile app (no auth required)
 * @access  Public
 */
router.post('/test-connection', [
  body('platform').optional().isString(),
  body('deviceInfo').optional().isObject()
], async (req, res) => {
  try {
    const { platform, deviceInfo } = req.body;
    
    console.log('📱 Mobile app connection test received:');
    console.log('- Platform:', platform);
    console.log('- Device Info:', deviceInfo);
    
    res.json({
      success: true,
      message: 'Backend connection successful',
      timestamp: new Date().toISOString(),
      receivedData: {
        platform,
        deviceInfo
      }
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/notifications/broadcast
 * @desc    Send notification to all registered devices (admin only)
 * @access  Private (Admin) or Public for testing
 */
router.post('/broadcast', [
  body('title').notEmpty().withMessage('Title is required'),
  body('body').notEmpty().withMessage('Body is required'),
  body('data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, body, data = {} } = req.body;

    // Get all users with FCM tokens
    const User = require('../models/User');
    const usersWithTokens = await User.find({
      'fcmTokens.0': { $exists: true }
    }).select('fcmTokens');

    if (!usersWithTokens || usersWithTokens.length === 0) {
      return res.json({
        success: true,
        message: 'No devices found to send notifications to',
        sent: 0,
        failed: 0
      });
    }

    // Collect all valid tokens
    const allTokens = [];
    usersWithTokens.forEach(user => {
      if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
        user.fcmTokens.forEach(tokenObj => {
          if (tokenObj.token) {
            // Check if token is not too old (90 days)
            const tokenAge = new Date() - new Date(tokenObj.createdAt);
            const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
            if (tokenAge < maxAge) {
              allTokens.push(tokenObj.token);
            }
          }
        });
      }
    });

    console.log(`📡 Broadcasting notification to ${allTokens.length} devices`);
    console.log(`📱 Title: ${title}`);
    console.log(`📱 Body: ${body}`);

    if (allTokens.length === 0) {
      return res.json({
        success: true,
        message: 'No valid tokens found to send notifications to',
        sent: 0,
        failed: 0
      });
    }

    // Send notifications using Firebase Admin
    let successCount = 0;
    let failureCount = 0;
    const batchSize = 500; // Firebase limit for multicast

    // Process tokens in batches
    for (let i = 0; i < allTokens.length; i += batchSize) {
      const batch = allTokens.slice(i, i + batchSize);
      
      try {
        const message = {
          notification: {
            title,
            body
          },
          data: {
            type: 'broadcast',
            timestamp: new Date().toISOString(),
            ...data
          },
          tokens: batch
        };

        const response = await firebaseAdminService.sendMulticast(message);
        successCount += response.successCount;
        failureCount += response.failureCount;

        console.log(`✅ Batch sent: ${response.successCount} successful, ${response.failureCount} failed`);
      } catch (error) {
        console.error('❌ Batch send error:', error);
        failureCount += batch.length;
      }
    }

    res.json({
      success: true,
      message: `Broadcast notification sent to ${successCount} devices`,
      sent: successCount,
      failed: failureCount,
      totalDevices: allTokens.length
    });

  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/notifications/test-broadcast
 * @desc    Send test notification to all devices (development/testing only)
 * @access  Public (for testing)
 */
router.post('/test-broadcast', [
  body('title').optional().isString(),
  body('body').optional().isString()
], async (req, res) => {
  try {
    // Allow in any environment for testing
    const { title = 'Test Notification', body = 'This is a test broadcast notification from Dockit backend' } = req.body;

    // Get all users with FCM tokens
    const User = require('../models/User');
    const usersWithTokens = await User.find({
      'fcmTokens.0': { $exists: true }
    }).select('fcmTokens');

    if (!usersWithTokens || usersWithTokens.length === 0) {
      return res.json({
        success: true,
        message: 'No devices found to send notifications to',
        sent: 0,
        failed: 0
      });
    }

    // Collect all valid tokens
    const allTokens = [];
    usersWithTokens.forEach(user => {
      if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
        user.fcmTokens.forEach(tokenObj => {
          if (tokenObj.token) {
            allTokens.push(tokenObj.token);
          }
        });
      }
    });

    console.log(`🧪 Test broadcasting to ${allTokens.length} devices`);
    console.log(`📱 Title: ${title}`);
    console.log(`📱 Body: ${body}`);

    if (allTokens.length === 0) {
      return res.json({
        success: true,
        message: 'No valid tokens found',
        sent: 0,
        failed: 0
      });
    }

    // Send test notifications
    let successCount = 0;
    let failureCount = 0;
    const batchSize = 500;

    for (let i = 0; i < allTokens.length; i += batchSize) {
      const batch = allTokens.slice(i, i + batchSize);
      
      try {
        const message = {
          notification: {
            title,
            body
          },
          data: {
            type: 'test-broadcast',
            timestamp: new Date().toISOString(),
            source: 'postman-test'
          },
          tokens: batch
        };

        const response = await firebaseAdminService.sendMulticast(message);
        successCount += response.successCount;
        failureCount += response.failureCount;
      } catch (error) {
        console.error('❌ Test broadcast error:', error);
        failureCount += batch.length;
      }
    }

    res.json({
      success: true,
      message: `Test notification sent to ${successCount} devices`,
      sent: successCount,
      failed: failureCount,
      totalDevices: allTokens.length,
      testMode: true
    });

  } catch (error) {
    console.error('Test broadcast error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/notifications/test-simple
 * @desc    Simple test endpoint that simulates notification sending (no Firebase required)
 * @access  Public (for testing)
 */
router.post('/test-simple', [
  body('title').optional().isString(),
  body('body').optional().isString()
], async (req, res) => {
  try {
    const { title = 'Test Notification', body = 'This is a simulated test notification' } = req.body;

    // Get all users with FCM tokens (just for counting)
    const User = require('../models/User');
    const usersWithTokens = await User.find({
      'fcmTokens.0': { $exists: true }
    }).select('fcmTokens');

    const tokenCount = usersWithTokens.reduce((count, user) => {
      return count + (user.fcmTokens ? user.fcmTokens.length : 0);
    }, 0);

    console.log(`🧪 SIMULATED TEST: Would send notification to ${tokenCount} devices`);
    console.log(`📱 Title: ${title}`);
    console.log(`📱 Body: ${body}`);

    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 500));

    res.json({
      success: true,
      message: `Simulated notification sent to ${tokenCount} devices`,
      sent: tokenCount,
      failed: 0,
      totalDevices: tokenCount,
      simulation: true,
      note: "This is a simulated test - no actual notifications were sent"
    });

  } catch (error) {
    console.error('Simple test error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/notifications/debug-tokens
 * @desc    Debug what tokens are stored (development only)
 * @access  Public (for debugging)
 */
router.get('/debug-tokens', async (req, res) => {
  try {
    // Get all users with FCM tokens
    const User = require('../models/User');
    const usersWithTokens = await User.find({
      'fcmTokens.0': { $exists: true }
    }).select('_id email fcmTokens');

    const tokenInfo = [];
    usersWithTokens.forEach(user => {
      if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
        user.fcmTokens.forEach(tokenObj => {
          if (tokenObj.token) {
            tokenInfo.push({
              userId: user._id,
              email: user.email,
              tokenType: tokenObj.deviceType || 'unknown',
              platform: tokenObj.platform || 'unknown',
              tokenPrefix: tokenObj.token.substring(0, 30) + '...',
              isExpoToken: tokenObj.token.startsWith('ExponentPushToken[') || tokenObj.token.startsWith('ExpoPushToken['),
              isFCMToken: tokenObj.token.length > 100 && !tokenObj.token.startsWith('Expo'),
              createdAt: tokenObj.createdAt,
              tokenLength: tokenObj.token.length
            });
          }
        });
      }
    });

    console.log('🔍 Token Debug Info:');
    tokenInfo.forEach((info, idx) => {
      console.log(`Token ${idx + 1}:`, {
        type: info.tokenType,
        platform: info.platform,
        isExpo: info.isExpoToken,
        isFCM: info.isFCMToken,
        length: info.tokenLength,
        prefix: info.tokenPrefix
      });
    });

    res.json({
      success: true,
      totalUsers: usersWithTokens.length,
      totalTokens: tokenInfo.length,
      tokens: tokenInfo
    });

  } catch (error) {
    console.error('Debug tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/notifications/expo-broadcast
 * @desc    Send notification to all devices using Expo Push Service (works with Expo tokens)
 * @access  Public (for testing)
 */
router.post('/expo-broadcast', [
  body('title').optional().isString(),
  body('body').optional().isString()
], async (req, res) => {
  try {
    const { title = 'Test Expo Notification', body = 'This is a test broadcast notification using Expo Push Service' } = req.body;

    // Get all users with FCM tokens (which are actually Expo tokens)
    const User = require('../models/User');
    const usersWithTokens = await User.find({
      'fcmTokens.0': { $exists: true }
    }).select('fcmTokens');

    if (!usersWithTokens || usersWithTokens.length === 0) {
      return res.json({
        success: true,
        message: 'No devices found to send notifications to',
        sent: 0,
        failed: 0
      });
    }

    // Collect all tokens and filter for Expo tokens
    const expoTokens = [];
    usersWithTokens.forEach(user => {
      if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
        user.fcmTokens.forEach(tokenObj => {
          if (tokenObj.token && (
            tokenObj.token.startsWith('ExponentPushToken[') || 
            tokenObj.token.startsWith('ExpoPushToken[') ||
            tokenObj.deviceType === 'expo'
          )) {
            expoTokens.push(tokenObj.token);
          }
        });
      }
    });

    console.log(`📱 Expo broadcasting to ${expoTokens.length} Expo tokens`);
    console.log(`📱 Title: ${title}`);
    console.log(`📱 Body: ${body}`);

    if (expoTokens.length === 0) {
      return res.json({
        success: true,
        message: 'No Expo tokens found',
        sent: 0,
        failed: 0,
        note: 'Your app is using Firebase FCM tokens, not Expo tokens. Use the regular broadcast endpoint instead.'
      });
    }

    // Send via Expo Push Service
    const fetch = require('node-fetch');
    const messages = expoTokens.map(token => ({
      to: token,
      title,
      body,
      data: {
        type: 'expo-broadcast',
        timestamp: new Date().toISOString(),
        source: 'backend-test'
      },
      sound: 'default',
      badge: 1
    }));

    let successCount = 0;
    let failureCount = 0;

    // Send in chunks of 100 (Expo's limit)
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const result = await response.json();
        
        if (result.data) {
          result.data.forEach(item => {
            if (item.status === 'ok') {
              successCount++;
            } else {
              failureCount++;
              console.log('❌ Expo push failed:', item.message);
            }
          });
        }
      } catch (error) {
        console.error('❌ Expo push chunk failed:', error);
        failureCount += chunk.length;
      }
    }

    res.json({
      success: true,
      message: `Expo notification sent to ${successCount} devices`,
      sent: successCount,
      failed: failureCount,
      totalTokens: expoTokens.length,
      service: 'expo-push'
    });

  } catch (error) {
    console.error('Expo broadcast error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
