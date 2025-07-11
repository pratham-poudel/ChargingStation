const Vendor = require('../models/Vendor');
const Notification = require('../models/Notification');

// Middleware to check vendor subscription status
const checkVendorSubscription = async (req, res, next) => {
  try {
    // Skip for auth routes and basic dashboard access
    if (req.path.includes('/auth') || 
        req.path.includes('/subscription') ||
        req.path.includes('/stats') ||
        req.path.includes('/onboarding') ||
        req.path.includes('/profile') ||
        req.method === 'GET' && req.path.includes('/dashboard')) {
      return next();
    }

    // Check if user is authenticated - support both req.user and req.vendor
    const userId = req.user?.id || req.vendor?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Vendor authentication required'
      });
    }

    // Check if user is a vendor
    if (req.user && req.user.type !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Vendor access required'
      });
    }

    const vendor = await Vendor.findById(userId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // More robust subscription validation
    let isExpired = false;
    let daysUntilExpiration = 0;
    
    try {
      // Check if subscription object exists
      if (!vendor.subscription) {
        console.warn(`Vendor ${vendor._id} has no subscription object`);
        isExpired = true;
      } else {
        // Check subscription expiration with better date handling
        const now = new Date();
        const endDate = new Date(vendor.subscription.endDate);
        
        // Debug logging
        console.log(`Subscription check for vendor ${vendor._id}:`, {
          subscriptionType: vendor.subscription.type,
          subscriptionStatus: vendor.subscription.status,
          endDate: endDate.toISOString(),
          now: now.toISOString(),
          endDateValid: !isNaN(endDate.getTime()),
          licenseActive: vendor.licenseInfo?.isActive
        });
        
        // Check if end date is valid
        if (isNaN(endDate.getTime())) {
          console.warn(`Invalid end date for vendor ${vendor._id}: ${vendor.subscription.endDate}`);
          isExpired = true;
        } else {
          isExpired = endDate <= now || vendor.subscription.status === 'expired';
          if (!isExpired) {
            const timeDiff = endDate.getTime() - now.getTime();
            daysUntilExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24));
          }
        }
      }
    } catch (error) {
      console.error('Error checking subscription dates:', error);
      isExpired = true;
    }

    // Handle expired subscription - block access and deactivate stations
    if (isExpired) {
      console.log(`Subscription expired for vendor ${vendor._id}`);
      
      // Update status if not already updated
      if (vendor.subscription && vendor.subscription.status === 'active') {
        vendor.subscription.status = 'expired';
        if (vendor.licenseInfo) {
          vendor.licenseInfo.isActive = false;
        }
        await vendor.save();

        // Deactivate all vendor stations
        try {
          const ChargingStation = require('../models/ChargingStation');
          const deactivatedStations = await ChargingStation.updateMany(
            { vendor: vendor._id, isActive: true },
            { 
              isActive: false,
              deactivationReason: 'Vendor subscription expired',
              deactivatedAt: new Date()
            }
          );
          console.log(`Deactivated ${deactivatedStations.modifiedCount} stations for expired vendor: ${vendor._id}`);
        } catch (stationError) {
          console.error('Error deactivating vendor stations:', stationError);
        }

        // Send expiration notification
        try {
          await Notification.createNotification({
            recipient: vendor._id,
            recipientModel: 'Vendor',
            title: 'Subscription Expired - Stations Deactivated',
            message: 'Your subscription has expired. All your stations have been deactivated. Please renew immediately to restore service.',
            type: 'error',
            priority: 'high'
          });
        } catch (notificationError) {
          console.error('Error sending expiration notification:', notificationError);
        }
      }

      // Redirect to licensing page for expired subscription
      return res.status(403).json({
        success: false,
        message: 'Subscription expired. All services suspended.',
        error: 'SUBSCRIPTION_EXPIRED',
        data: {
          isExpired: true,
          daysUntilExpiration: 0,
          subscriptionType: vendor.subscription?.type || 'trial',
          endDate: vendor.subscription?.endDate,
          redirectTo: '/merchant/licensing',
          renewalUrl: '/merchant/licensing?action=renew'
        }
      });
    }

    // Check if subscription is expiring soon (within 7 days)
    const isExpiringSoon = daysUntilExpiration <= 7 && daysUntilExpiration > 0;
    
    if (isExpiringSoon) {
      try {
        // Check if we've already sent a warning notification today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingNotification = await Notification.findOne({
          recipient: vendor._id,
          recipientModel: 'Vendor',
          type: 'warning',
          title: 'Subscription Expiring Soon',
          createdAt: { $gte: today }
        });

        if (!existingNotification) {
          await Notification.createNotification({
            recipient: vendor._id,
            recipientModel: 'Vendor',
            title: 'Subscription Expiring Soon',
            message: `Your subscription expires in ${daysUntilExpiration} days. Please renew to avoid service interruption.`,
            type: 'warning',
            priority: 'high',
            actionUrl: '/merchant/licensing?action=renew',
            actionText: 'Renew Now'
          });
        }
      } catch (notificationError) {
        console.error('Error sending expiry warning notification:', notificationError);
      }
    }

    // Add subscription info to request for further use
    req.subscriptionInfo = {
      isExpired,
      isExpiringSoon,
      daysUntilExpiration,
      timeUntilExpiration: vendor.getTimeUntilExpiration ? vendor.getTimeUntilExpiration() : { days: 0, hours: 0, minutes: 0, seconds: 0 },
      subscriptionType: vendor.subscription?.type || 'trial',
      subscriptionStatus: vendor.subscription?.status || 'expired',
      licenseActive: vendor.licenseInfo?.isActive || false
    };

    // Also add vendor to request for compatibility
    req.vendor = vendor;

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id || req.vendor?.id,
      path: req.path
    });
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware to check if vendor has permission to access premium features
const checkPremiumAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      // Support both req.user and req.vendor
      const userId = req.user?.id || req.vendor?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Vendor authentication required'
        });
      }

      const vendor = await Vendor.findById(userId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      // Check if subscription is active using the model method
      const isSubscriptionActive = vendor.isSubscriptionActive && vendor.isSubscriptionActive();
      if (!isSubscriptionActive) {
        return res.status(403).json({
          success: false,
          message: 'Active subscription required for this feature',
          error: 'SUBSCRIPTION_REQUIRED',
          data: {
            featureName,
            upgradeUrl: '/merchant/licensing?action=upgrade'
          }
        });
      }

      // Check if feature is enabled for current plan
      const hasFeature = vendor.licenseInfo?.featuresEnabled?.[featureName] || false;
      if (!hasFeature) {
        return res.status(403).json({
          success: false,
          message: `Feature '${featureName}' not available in current plan`,
          error: 'FEATURE_NOT_AVAILABLE',
          data: {
            featureName,
            currentPlan: vendor.subscription?.type || 'trial',
            upgradeUrl: '/merchant/licensing?action=upgrade'
          }
        });
      }

      next();
    } catch (error) {
      console.error('Premium access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check feature access',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

// Middleware to check station limits
const checkStationLimit = async (req, res, next) => {
  try {
    if (!req.vendor || !req.vendor.id) {
      return res.status(401).json({
        success: false,
        message: 'Vendor authentication required'
      });
    }

    const vendor = await Vendor.findById(req.vendor.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get current station count
    const ChargingStation = require('../models/ChargingStation');
    const currentStationCount = await ChargingStation.countDocuments({ 
      vendor: vendor._id 
    });

    // Check if adding new station would exceed limit
    const maxStations = vendor.licenseInfo.maxStations;
    if (currentStationCount >= maxStations) {
      return res.status(403).json({
        success: false,
        message: `Station limit reached. Current plan allows ${maxStations} stations.`,
        error: 'STATION_LIMIT_EXCEEDED',
        data: {
          currentCount: currentStationCount,
          maxAllowed: maxStations,
          upgradeUrl: '/merchant/licensing?action=upgrade'
        }
      });
    }

    req.stationInfo = {
      currentCount: currentStationCount,
      maxAllowed: maxStations,
      remaining: maxStations - currentStationCount
    };

    next();
  } catch (error) {
    console.error('Station limit check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check station limit'
    });
  }
};

// Helper function to check and update expired subscriptions
const checkAndUpdateExpiredSubscriptions = async () => {
  try {
    console.log('Checking for expired subscriptions...');
    
    const expiredVendors = await Vendor.find({
      'subscription.status': 'active',
      'subscription.endDate': { $lte: new Date() }
    });

    console.log(`Found ${expiredVendors.length} expired subscriptions`);

    for (const vendor of expiredVendors) {
      vendor.subscription.status = 'expired';
      vendor.licenseInfo.isActive = false;
      await vendor.save();

      // Send expiration notification
      try {
        await Notification.createNotification({
          recipient: vendor._id,
          recipientModel: 'Vendor',
          title: 'Subscription Expired',
          message: 'Your subscription has expired. Please renew to continue using the merchant portal.',
          type: 'warning',
          priority: 'high',
          actionUrl: '/merchant/licensing?action=renew',
          actionText: 'Renew Now'
        });
      } catch (notificationError) {
        console.error('Error sending expiration notification:', notificationError);
      }
    }

    // Check for subscriptions expiring in 7 days
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 7);

    const expiringSoonVendors = await Vendor.find({
      'subscription.status': 'active',
      'subscription.endDate': { 
        $lte: expiringDate,
        $gt: new Date()
      }
    });

    console.log(`Found ${expiringSoonVendors.length} subscriptions expiring soon`);

    for (const vendor of expiringSoonVendors) {
      const daysUntilExpiration = Math.ceil(
        (vendor.subscription.endDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
      );

      // Check if we've already sent a warning today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingNotification = await Notification.findOne({
        recipient: vendor._id,
        recipientModel: 'Vendor',
        type: 'warning',
        title: 'Subscription Expiring Soon',
        createdAt: { $gte: today }
      });

      if (!existingNotification) {
        try {
          await Notification.createNotification({
            recipient: vendor._id,
            recipientModel: 'Vendor',
            title: 'Subscription Expiring Soon',
            message: `Your subscription expires in ${daysUntilExpiration} days. Please renew to avoid service interruption.`,
            type: 'warning',
            priority: 'high',
            actionUrl: '/merchant/licensing?action=renew',
            actionText: 'Renew Now'
          });
        } catch (notificationError) {
          console.error('Error sending expiry warning notification:', notificationError);
        }
      }
    }
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
  }
};

module.exports = {
  checkVendorSubscription,
  checkPremiumAccess,
  checkStationLimit,
  checkAndUpdateExpiredSubscriptions
}; 