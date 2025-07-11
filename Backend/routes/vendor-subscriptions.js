const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Vendor = require('../models/Vendor');
const ChargingStation = require('../models/ChargingStation');
const { authorizeVendor } = require('../middleware/auth');
const Notification = require('../models/Notification');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Custom authorization middleware for subscriptions - allows access without verification
const authorizeVendorForSubscription = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if this is a vendor token
    if (decoded.type !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Vendor authorization required.'
      });
    }

    req.vendor = await Vendor.findById(decoded.id).select('-__v');
    
    if (!req.vendor) {
      return res.status(401).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (!req.vendor.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Vendor account is deactivated'
      });
    }

    // Note: We don't check verification status for subscription access
    // Vendors should be able to manage subscriptions even if not verified
    console.log(`Vendor ${req.vendor._id} accessing subscription endpoint - verification: ${req.vendor.verificationStatus}`);

    next();
  } catch (error) {
    console.error('Vendor token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Helper function to send comprehensive notifications (in-app, SMS, email)
const sendComprehensiveNotification = async (vendor, title, message, type = 'info', includeStationInfo = false) => {
  try {
    // Send in-app notification
    await Notification.createNotification({
      recipient: vendor._id,
      recipientModel: 'Vendor',
      title,
      message,
      type,
      priority: 'high'
    });

    // Prepare personalized messages
    const businessName = vendor.businessName || vendor.name || 'Vendor';
    const personalizedMessage = `Dear ${businessName},\n\n${message}`;

    // Send SMS notification
    if (vendor.phoneNumber) {
      try {
        await smsService.sendSMS(
          vendor.phoneNumber,
          `${title}\n\n${personalizedMessage}\n\nBest regards,\nDockIt Team`
        );
        console.log(`✅ SMS sent to vendor: ${vendor._id}`);
      } catch (smsError) {
        console.error('Error sending SMS:', smsError);
      }
    }

    // Send email notification
    if (vendor.email) {
      try {
        await emailService.sendEmail({
          to: vendor.email,
          subject: `${title} - DockIt`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">DockIt</h1>
                <p style="color: white; margin: 5px 0;">EV Charging Station Platform</p>
              </div>
              
              <div style="padding: 30px; background: white;">
                <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
                
                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  Dear ${businessName},
                </p>
                
                <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                  <p style="color: #555; line-height: 1.6; margin: 0;">
                    ${message.replace(/\n/g, '<br>')}
                  </p>
                </div>
                
                ${includeStationInfo ? `
                <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="color: #2d7a2d; margin: 0 0 10px 0;">📍 Station Status</h3>
                  <p style="color: #2d7a2d; margin: 0; font-size: 14px;">
                    Your stations are now live and ready to accept bookings. Customers can find and book your stations immediately.
                  </p>
                </div>
                ` : ''}
                
                <div style="margin: 30px 0; text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'https://dockit.app'}/merchant/dashboard" 
                     style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    View Dashboard
                  </a>
                </div>
                
                <p style="color: #555; line-height: 1.6;">
                  If you have any questions or need assistance, please don't hesitate to contact our support team.
                </p>
                
                <p style="color: #555; line-height: 1.6; margin-top: 30px;">
                  Best regards,<br>
                  <strong>The DockIt Team</strong>
                </p>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
                <p>This is an automated message from DockIt EV Charging Platform.</p>
                <p>For support, contact us at support@dockit.app</p>
              </div>
            </div>
          `
        });
        console.log(`✅ Email sent to vendor: ${vendor._id}`);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    console.log(`✅ Comprehensive notification sent to vendor: ${vendor._id}`);
  } catch (error) {
    console.error('Error sending comprehensive notification:', error);
  }
};

// Helper function for simple in-app notifications (backward compatibility)
const sendNotification = async (vendorId, title, message, type = 'info') => {
  try {
    await Notification.createNotification({
      recipient: vendorId,
      recipientModel: 'Vendor',
      title,
      message,
      type,
      priority: 'high'
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// @desc    Check subscription status for redirection
// @route   GET /api/vendor/subscription/status
// @access  Private (Vendor) - No verification required
router.get('/status', authorizeVendorForSubscription, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.vendor.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const isExpired = vendor.isSubscriptionExpired && vendor.isSubscriptionExpired();
    const daysUntilExpiration = vendor.getDaysUntilExpiration ? vendor.getDaysUntilExpiration() : 30;
    const timeUntilExpiration = vendor.getTimeUntilExpiration ? vendor.getTimeUntilExpiration() : { days: 30, hours: 0, minutes: 0, seconds: 0 };

    res.json({
      success: true,
      data: {
        isExpired,
        daysUntilExpiration,
        timeUntilExpiration,
        subscriptionType: vendor.subscription?.type || 'trial',
        subscriptionStatus: vendor.subscription?.status || 'active',
        endDate: vendor.subscription?.endDate,
        shouldRedirectToLicensing: isExpired,
        maxStations: vendor.licenseInfo?.maxStations || (vendor.subscription?.type === 'yearly' ? 50 : 5),
        featuresEnabled: vendor.licenseInfo?.featuresEnabled || {}
      }
    });
  } catch (error) {
    console.error('Subscription status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription status'
    });
  }
});

// @desc    Get vendor subscription status
// @route   GET /api/vendor/subscription
// @access  Private (Vendor) - No verification required
router.get('/', authorizeVendorForSubscription, async (req, res) => {
  try {
    console.log(`📊 Getting subscription details for vendor: ${req.vendor._id}`);
    
    const vendor = await Vendor.findById(req.vendor.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get subscription details
    const subscriptionData = {
      vendor: {
        type: vendor.subscription.type,
        status: vendor.subscription.status,
        startDate: vendor.subscription.startDate,
        endDate: vendor.subscription.endDate,
        autoRenew: vendor.subscription.autoRenew,
        isActive: vendor.isSubscriptionActive(),
        daysUntilExpiration: vendor.getDaysUntilExpiration(),
        timeUntilExpiration: vendor.getTimeUntilExpiration()
      },
      licenseInfo: vendor.licenseInfo,
      paymentHistory: vendor.subscription.paymentHistory.slice(-5) // Last 5 payments
    };

    console.log(`✅ Subscription data retrieved:`, {
      vendorId: vendor._id,
      type: subscriptionData.vendor.type,
      status: subscriptionData.vendor.status,
      endDate: subscriptionData.vendor.endDate
    });

    res.json({
      success: true,
      data: subscriptionData
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription details'
    });
  }
});

// @desc    Upgrade vendor subscription to yearly
// @route   POST /api/vendor/subscription/upgrade
// @access  Private (Vendor) - No verification required
router.post('/upgrade', 
  authorizeVendorForSubscription,
  [
    body('paymentMethod').optional().isString().withMessage('Payment method must be a string'),
    body('autoRenew').optional().isBoolean().withMessage('Auto renew must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log(`💳 Processing subscription upgrade for vendor: ${req.vendor.id}`);
      
      const { paymentMethod = 'dummy', autoRenew = false } = req.body;
      const vendor = await Vendor.findById(req.vendor.id);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Check if already on yearly plan
      if (vendor.subscription.type === 'yearly' && vendor.subscription.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'Already on yearly subscription'
        });
      }

      // Process payment (dummy implementation)
      const transactionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`⏳ Simulating payment processing...`);
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Upgrade subscription
      await vendor.upgradeToYearly(transactionId);
      vendor.subscription.autoRenew = autoRenew;
      await vendor.save();

      // Reactivate stations if any were deactivated
      let reactivatedCount = 0;
      try {
        const stationsResult = await vendor.reactivateStations();
        reactivatedCount = stationsResult.modifiedCount;
      } catch (stationError) {
        console.error('Error reactivating stations during upgrade:', stationError);
      }

      // Send comprehensive notification (in-app, SMS, email) with station reactivation info
      const subscriptionEndDate = new Date(vendor.subscription.endDate).toLocaleDateString();
      const notificationMessage = reactivatedCount > 0 
        ? `Your subscription has been upgraded to yearly plan! You now have access to all premium features including advanced analytics, priority support, and can manage up to 50 stations.\n\n${reactivatedCount} station${reactivatedCount > 1 ? 's have' : ' has'} been automatically reactivated.\n\nYour yearly subscription is valid until ${subscriptionEndDate}.`
        : `Your subscription has been upgraded to yearly plan! You now have access to all premium features including advanced analytics, priority support, and can manage up to 50 stations.\n\nYour yearly subscription is valid until ${subscriptionEndDate}.`;

      await sendComprehensiveNotification(
        vendor,
        'Subscription Upgraded to Yearly! 🚀',
        notificationMessage,
        'success',
        reactivatedCount > 0 // Include station info if stations were reactivated
      );

      console.log(`✅ Subscription upgrade completed for vendor: ${vendor._id}`);

      res.json({
        success: true,
        message: 'Subscription upgraded successfully',
        data: {
          subscription: {
            type: vendor.subscription.type,
            status: vendor.subscription.status,
            endDate: vendor.subscription.endDate,
            transactionId
          }
        }
      });
    } catch (error) {
      console.error('Upgrade subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upgrade subscription'
      });
    }
  }
);

// @desc    Get station premium subscriptions
// @route   GET /api/vendor/subscription/stations
// @access  Private (Vendor) - No verification required
router.get('/stations', authorizeVendorForSubscription, async (req, res) => {
  try {
    console.log(`🏪 Getting station subscriptions for vendor: ${req.vendor.id}`);
    
    const stations = await ChargingStation.find({ vendor: req.vendor.id })
      .select('name premiumSubscription address totalPorts isActive isVerified')
      .lean();

    console.log(`📊 Found ${stations.length} stations for vendor`);

    const stationsWithPremium = stations.map(station => ({
      ...station,
      isPremiumActive: station.premiumSubscription?.isActive && 
                     station.premiumSubscription?.endDate > new Date(),
      timeUntilExpiration: station.premiumSubscription?.isActive ? 
        station.premiumSubscription.endDate > new Date() ? 
          station.premiumSubscription.endDate.getTime() - new Date().getTime() : 0 : 0
    }));

    console.log(`✅ Station subscription data prepared:`, {
      totalStations: stationsWithPremium.length,
      premiumActive: stationsWithPremium.filter(s => s.isPremiumActive).length
    });

    res.json({
      success: true,
      data: stationsWithPremium
    });
  } catch (error) {
    console.error('Get station subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get station subscriptions'
    });
  }
});

// @desc    Activate station premium subscription
// @route   POST /api/vendor/subscription/stations/:stationId/activate
// @access  Private (Vendor) - No verification required
router.post('/stations/:stationId/activate',
  authorizeVendorForSubscription,
  [
    param('stationId').isMongoId().withMessage('Invalid station ID'),
    body('subscriptionType').isIn(['monthly', 'yearly']).withMessage('Invalid subscription type'),
    body('paymentMethod').optional().isString().withMessage('Payment method must be a string'),
    body('autoRenew').optional().isBoolean().withMessage('Auto renew must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { stationId } = req.params;
      const { subscriptionType, paymentMethod = 'dummy', autoRenew = false } = req.body;

      console.log(`🔋 Activating premium for station: ${stationId}, type: ${subscriptionType}`);
      console.log(`📋 Request body:`, { subscriptionType, paymentMethod, autoRenew });

      // Additional validation for subscription type
      if (!subscriptionType || !['monthly', 'yearly'].includes(subscriptionType)) {
        console.log(`❌ Invalid subscription type: ${subscriptionType}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription type. Must be monthly or yearly'
        });
      }

      const station = await ChargingStation.findOne({ 
        _id: stationId, 
        vendor: req.vendor.id 
      });

      if (!station) {
        console.log(`❌ Station not found: ${stationId} for vendor: ${req.vendor.id}`);
        return res.status(404).json({
          success: false,
          message: 'Station not found'
        });
      }

      console.log(`📊 Station found: ${station.name}, current premium status:`, {
        isActive: station.premiumSubscription?.isActive,
        endDate: station.premiumSubscription?.endDate,
        type: station.premiumSubscription?.type
      });

      // Check if already active
      if (station.isPremiumActive()) {
        console.log(`⚠️ Station already has active premium: ${stationId}`);
        return res.status(400).json({
          success: false,
          message: 'Station already has active premium subscription'
        });
      }

      // Process payment (dummy implementation)
      const transactionId = `stn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`⏳ Simulating payment processing for station premium...`);
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Activate premium subscription
      console.log(`🔄 Activating premium with type: ${subscriptionType}`);
      await station.activatePremium(subscriptionType, transactionId);
      station.premiumSubscription.autoRenew = autoRenew;
      await station.save();

      console.log(`✅ Premium activated successfully. New premium data:`, {
        isActive: station.premiumSubscription.isActive,
        type: station.premiumSubscription.type,
        startDate: station.premiumSubscription.startDate,
        endDate: station.premiumSubscription.endDate,
        daysRemaining: station.getPremiumTimeUntilExpiration().days
      });

      // Send notification
      await sendNotification(
        req.vendor.id,
        'Station Premium Activated!',
        `Premium subscription activated for ${station.name}. Your station now has priority placement in search results.`,
        'success'
      );

      console.log(`✅ Station premium activated for station: ${station._id}`);

      res.json({
        success: true,
        message: 'Station premium subscription activated successfully',
        data: {
          station: {
            id: station._id,
            name: station.name,
            premiumSubscription: station.premiumSubscription,
            transactionId
          }
        }
      });
    } catch (error) {
      console.error('🚨 Activate station premium error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate station premium subscription'
      });
    }
  }
);

// @desc    Extend station premium subscription
// @route   POST /api/vendor/subscription/stations/:stationId/extend
// @access  Private (Vendor) - No verification required
router.post('/stations/:stationId/extend',
  authorizeVendorForSubscription,
  [
    param('stationId').isMongoId().withMessage('Invalid station ID'),
    body('subscriptionType').isIn(['monthly', 'yearly']).withMessage('Invalid subscription type'),
    body('paymentMethod').optional().isString().withMessage('Payment method must be a string'),
    body('autoRenew').optional().isBoolean().withMessage('Auto renew must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { stationId } = req.params;
      const { subscriptionType, paymentMethod = 'dummy', autoRenew = false } = req.body;

      console.log(`🔋 Extending premium for station: ${stationId}, type: ${subscriptionType}`);
      console.log(`📋 Request body:`, { subscriptionType, paymentMethod, autoRenew });

      // Additional validation for subscription type
      if (!subscriptionType || !['monthly', 'yearly'].includes(subscriptionType)) {
        console.log(`❌ Invalid subscription type: ${subscriptionType}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription type. Must be monthly or yearly'
        });
      }

      const station = await ChargingStation.findOne({ 
        _id: stationId, 
        vendor: req.vendor.id 
      });

      if (!station) {
        console.log(`❌ Station not found: ${stationId} for vendor: ${req.vendor.id}`);
        return res.status(404).json({
          success: false,
          message: 'Station not found'
        });
      }

      console.log(`📊 Station found: ${station.name}, current premium status:`, {
        isActive: station.premiumSubscription?.isActive,
        endDate: station.premiumSubscription?.endDate,
        type: station.premiumSubscription?.type
      });

      // Check if station has premium subscription
      if (!station.premiumSubscription || !station.premiumSubscription.isActive) {
        console.log(`❌ Station has no active premium subscription: ${stationId}`);
        return res.status(400).json({
          success: false,
          message: 'Station does not have an active premium subscription to extend'
        });
      }

      // Process payment (dummy implementation)
      const transactionId = `stn_ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`⏳ Simulating payment processing for station premium extension...`);
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Calculate extension time
      const currentEndDate = station.premiumSubscription.endDate;
      const now = new Date();
      const baseDate = currentEndDate > now ? currentEndDate : now;
      
      let newEndDate;
      let baseAmount;
      const vatRate = 0.13; // 13% VAT
      
      if (subscriptionType === 'monthly') {
        newEndDate = new Date(baseDate);
        newEndDate.setMonth(newEndDate.getMonth() + 1);
        baseAmount = 1000;
      } else if (subscriptionType === 'yearly') {
        newEndDate = new Date(baseDate);
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        baseAmount = 9999;
      }

      const vatAmount = Math.round(baseAmount * vatRate);
      const totalAmount = baseAmount + vatAmount;

      // Update premium subscription
      station.premiumSubscription.endDate = newEndDate;
      station.premiumSubscription.type = subscriptionType;
      station.premiumSubscription.autoRenew = autoRenew;
      station.premiumSubscription.lastPaymentDate = new Date();
      station.premiumSubscription.nextPaymentDate = newEndDate;

      // Add payment history record
      station.premiumSubscription.paymentHistory.push({
        transactionId: transactionId,
        baseAmount: baseAmount,
        vatAmount: vatAmount,
        totalAmount: totalAmount,
        currency: 'NPR',
        paymentDate: new Date(),
        paymentMethod: paymentMethod,
        status: 'completed',
        type: 'renewal'
      });

      await station.save();

      console.log(`✅ Premium extended successfully. New premium data:`, {
        isActive: station.premiumSubscription.isActive,
        type: station.premiumSubscription.type,
        startDate: station.premiumSubscription.startDate,
        endDate: station.premiumSubscription.endDate,
        daysRemaining: station.getPremiumTimeUntilExpiration().days
      });

      // Send notification
      await sendNotification(
        req.vendor.id,
        'Station Premium Extended!',
        `Premium subscription extended for ${station.name} until ${newEndDate.toLocaleDateString()}. Your station continues to have priority placement in search results.`,
        'success'
      );

      console.log(`✅ Station premium extended for station: ${station._id}`);

      res.json({
        success: true,
        message: 'Station premium subscription extended successfully',
        data: {
          station: {
            id: station._id,
            name: station.name,
            premiumSubscription: station.premiumSubscription,
            transactionId
          }
        }
      });
    } catch (error) {
      console.error('🚨 Extend station premium error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to extend station premium subscription'
      });
    }
  }
);

// @desc    Deactivate station premium subscription
// @route   POST /api/vendor/subscription/stations/:stationId/deactivate
// @access  Private (Vendor) - No verification required
router.post('/stations/:stationId/deactivate',
  authorizeVendorForSubscription,
  param('stationId').isMongoId().withMessage('Invalid station ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { stationId } = req.params;

      const station = await ChargingStation.findOne({ 
        _id: stationId, 
        vendor: req.vendor.id 
      });

      if (!station) {
        return res.status(404).json({
          success: false,
          message: 'Station not found'
        });
      }

      // Deactivate premium subscription
      await station.deactivatePremium();

      // Send notification
      await sendNotification(
        req.vendor.id,
        'Station Premium Deactivated',
        `Premium subscription deactivated for ${station.name}.`,
        'info'
      );

      console.log(`✅ Station premium deactivated for station: ${station._id}`);

      res.json({
        success: true,
        message: 'Station premium subscription deactivated successfully'
      });
    } catch (error) {
      console.error('Deactivate station premium error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate station premium subscription'
      });
    }
  }
);

// @desc    Get subscription payment history
// @route   GET /api/vendor/subscription/payment-history
// @access  Private (Vendor) - No verification required
router.get('/payment-history',
  authorizeVendorForSubscription,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const vendor = await Vendor.findById(req.vendor.id);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Get vendor payment history
      const vendorPayments = vendor.subscription.paymentHistory.map(payment => ({
        ...payment.toObject(),
        entityType: 'vendor',
        entityName: vendor.businessName,
        // Ensure VAT fields exist for backward compatibility
        baseAmount: payment.baseAmount || payment.amount || 0,
        vatAmount: payment.vatAmount || 0,
        totalAmount: payment.totalAmount || payment.amount || 0
      }));

      // Get station payment history
      const stations = await ChargingStation.find({ vendor: req.vendor.id })
        .select('name premiumSubscription.paymentHistory')
        .lean();

      const stationPayments = [];
      stations.forEach(station => {
        if (station.premiumSubscription?.paymentHistory) {
          station.premiumSubscription.paymentHistory.forEach(payment => {
            stationPayments.push({
              ...payment,
              entityType: 'station',
              entityName: station.name,
              entityId: station._id,
              // Ensure VAT fields exist for backward compatibility
              baseAmount: payment.baseAmount || payment.amount || 0,
              vatAmount: payment.vatAmount || 0,
              totalAmount: payment.totalAmount || payment.amount || 0
            });
          });
        }
      });

      // Combine and sort by date
      const allPayments = [...vendorPayments, ...stationPayments]
        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedPayments = allPayments.slice(startIndex, endIndex);

      console.log(`✅ Payment history retrieved for vendor: ${vendor._id}`);

      res.json({
        success: true,
        data: {
          payments: paginatedPayments,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(allPayments.length / limit),
            total: allPayments.length
          }
        }
      });
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment history'
      });
    }
  }
);

// @desc    Check and handle expired subscriptions
// @route   GET /api/vendor/subscription/check-expiration
// @access  Private (Vendor) - No verification required
router.get('/check-expiration', authorizeVendorForSubscription, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.vendor.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const isExpired = vendor.isSubscriptionExpired();
    const daysUntilExpiration = vendor.getDaysUntilExpiration();
    const timeUntilExpiration = vendor.getTimeUntilExpiration();

    // Check if subscription is expiring soon (within 7 days)
    const isExpiringSoon = daysUntilExpiration <= 7 && daysUntilExpiration > 0;

    // Handle expired subscription
    if (isExpired && vendor.subscription.status === 'active') {
      vendor.subscription.status = 'expired';
      vendor.licenseInfo.isActive = false;
      await vendor.save();

      // Send expiration notification
      await sendNotification(
        vendor._id,
        'Subscription Expired',
        'Your subscription has expired. Please renew to continue using the merchant portal.',
        'warning'
      );
    }

    // Handle expiring soon notification
    if (isExpiringSoon) {
      await sendNotification(
        vendor._id,
        'Subscription Expiring Soon',
        `Your subscription expires in ${daysUntilExpiration} days. Please renew to avoid service interruption.`,
        'warning'
      );
    }

    console.log(`✅ Subscription expiration check completed for vendor: ${vendor._id}`);

    res.json({
      success: true,
      data: {
        isExpired,
        isExpiringSoon,
        daysUntilExpiration,
        timeUntilExpiration,
        subscriptionStatus: vendor.subscription.status,
        licenseActive: vendor.licenseInfo.isActive
      }
    });
  } catch (error) {
    console.error('Check expiration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription expiration'
    });
  }
});

// @desc    Renew expired subscription
// @route   POST /api/vendor/subscription/renew
// @access  Private (Vendor) - No verification required
router.post('/renew',
  authorizeVendorForSubscription,
  [
    body('paymentMethod').optional().isString().withMessage('Payment method must be a string'),
    body('autoRenew').optional().isBoolean().withMessage('Auto renew must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log(`🔄 Processing subscription renewal for vendor: ${req.vendor.id}`);
      
      const { paymentMethod = 'dummy', autoRenew = false } = req.body;
      const vendor = await Vendor.findById(req.vendor.id);

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Process payment (dummy implementation)
      const transactionId = `ren_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`⏳ Simulating payment processing...`);
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Renew subscription
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      vendor.subscription.status = 'active';
      vendor.subscription.endDate = oneYearFromNow;
      vendor.subscription.lastPaymentDate = new Date();
      vendor.subscription.nextPaymentDate = oneYearFromNow;
      vendor.subscription.autoRenew = autoRenew;
      vendor.licenseInfo.isActive = true;

      // Add payment history record
      vendor.subscription.paymentHistory.push({
        transactionId,
        amount: 12000,
        currency: 'NPR',
        paymentDate: new Date(),
        paymentMethod,
        status: 'completed',
        type: 'renewal'
      });

      await vendor.save();

      // Reactivate stations that were deactivated due to subscription expiry
      let reactivatedCount = 0;
      try {
        const stationsResult = await vendor.reactivateStations();
        reactivatedCount = stationsResult.modifiedCount;
        console.log(`✅ Reactivated ${reactivatedCount} stations for vendor: ${vendor._id}`);
      } catch (stationError) {
        console.error('Error reactivating stations during renewal:', stationError);
        // Don't fail the entire renewal process if station reactivation fails
      }

      // Send comprehensive notification (in-app, SMS, email) with station reactivation info
      const notificationMessage = reactivatedCount > 0 
        ? `Your subscription has been renewed successfully! You now have access to all features for another year.\n\n${reactivatedCount} station${reactivatedCount > 1 ? 's have' : ' has'} been automatically reactivated and ${reactivatedCount > 1 ? 'are' : 'is'} now live for bookings.\n\nYour subscription is valid until ${oneYearFromNow.toLocaleDateString()}.`
        : `Your subscription has been renewed successfully! You now have access to all features for another year.\n\nYour subscription is valid until ${oneYearFromNow.toLocaleDateString()}.`;

      await sendComprehensiveNotification(
        vendor,
        'Subscription Renewed Successfully! 🎉',
        notificationMessage,
        'success',
        reactivatedCount > 0 // Include station info if stations were reactivated
      );

      console.log(`✅ Subscription renewed for vendor: ${vendor._id}`);

      res.json({
        success: true,
        message: 'Subscription renewed successfully',
        data: {
          subscription: {
            type: vendor.subscription.type,
            status: vendor.subscription.status,
            endDate: vendor.subscription.endDate,
            transactionId
          }
        }
      });
    } catch (error) {
      console.error('Renew subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to renew subscription'
      });
    }
  }
);

// @desc    Toggle auto-renewal
// @route   POST /api/vendor/subscription/auto-renew
// @access  Private (Vendor) - No verification required
router.post('/auto-renew',
  authorizeVendorForSubscription,
  [
    body('autoRenew').isBoolean().withMessage('Auto renew must be boolean'),
    body('entityType').isIn(['vendor', 'station']).withMessage('Invalid entity type'),
    body('entityId').optional().isMongoId().withMessage('Invalid entity ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { autoRenew, entityType, entityId } = req.body;

      if (entityType === 'vendor') {
        const vendor = await Vendor.findById(req.vendor.id);
        if (!vendor) {
          return res.status(404).json({
            success: false,
            message: 'Vendor not found'
          });
        }

        vendor.subscription.autoRenew = autoRenew;
        await vendor.save();
      } else if (entityType === 'station') {
        if (!entityId) {
          return res.status(400).json({
            success: false,
            message: 'Station ID is required'
          });
        }

        const station = await ChargingStation.findOne({ 
          _id: entityId, 
          vendor: req.vendor.id 
        });

        if (!station) {
          return res.status(404).json({
            success: false,
            message: 'Station not found'
          });
        }

        station.premiumSubscription.autoRenew = autoRenew;
        await station.save();
      }

      console.log(`✅ Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} for vendor: ${req.vendor.id}`);

      res.json({
        success: true,
        message: `Auto-renewal ${autoRenew ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Toggle auto-renewal error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle auto-renewal'
      });
    }
  }
);

module.exports = router; 