const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const RestaurantEmployee = require('../models/RestaurantEmployee');
const Order = require('../models/Order');
const ChargingStation = require('../models/ChargingStation');
const Vendor = require('../models/Vendor');
const Notification = require('../models/Notification');
const { protectAdmin, requirePermission } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');

const router = express.Router();

// Helper function to send comprehensive notifications (in-app, SMS, email)
const sendRestaurantNotification = async (vendor, title, message, type = 'info', restaurantInfo = null) => {
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
        console.log(`✅ Restaurant SMS sent to vendor: ${vendor._id}`);
      } catch (smsError) {
        console.error('Error sending restaurant SMS:', smsError);
      }
    }

    // Send email notification
    if (vendor.email) {
      try {
        await emailService.sendEmail({
          to: vendor.email,
          subject: `${title} - DockIt Restaurant`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">DockIt Restaurant</h1>
                <p style="color: white; margin: 5px 0;">EV Charging Station Restaurant Platform</p>
              </div>
              
              <div style="padding: 30px; background: white;">
                <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
                
                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  Dear ${businessName},
                </p>
                
                <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                  <p style="color: #555; line-height: 1.6; margin: 0;">
                    ${message.replace(/\n/g, '<br>')}
                  </p>
                </div>
                
                ${restaurantInfo ? `
                <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="color: #92400e; margin: 0 0 10px 0;">🍽️ Restaurant Status</h3>
                  <p style="color: #92400e; margin: 0; font-size: 14px;">
                    Your restaurant "${restaurantInfo.name}" is now verified and ready to accept orders from EV customers.
                  </p>
                </div>
                ` : ''}
                
                <div style="margin: 30px 0; text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'https://dockit.app'}/merchant/restaurants" 
                     style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Manage Restaurant
                  </a>
                </div>
                
                <p style="color: #555; line-height: 1.6;">
                  If you have any questions about restaurant management, please don't hesitate to contact our support team.
                </p>
                
                <p style="color: #555; line-height: 1.6; margin-top: 30px;">
                  Best regards,<br>
                  <strong>The DockIt Restaurant Team</strong>
                </p>
              </div>
              
              <div style="background: #f3f4f6; padding: 20px; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  This is an automated message. Please do not reply to this email.
                </p>
              </div>
            </div>
          `
        });
        console.log(`✅ Restaurant email sent to vendor: ${vendor._id}`);
      } catch (emailError) {
        console.error('Error sending restaurant email:', emailError);
      }
    }

  } catch (error) {
    console.error('Error sending restaurant notification:', error);
  }
};

// @desc    Get all restaurants for admin
// @route   GET /api/admin/restaurants
// @access  Private (Admin)
router.get('/', protectAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      verificationStatus = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filters
    if (status) {
      if (status === 'active') {
        query.isActive = true;
        query.isVerified = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }
    }

    if (verificationStatus) {
      query.verificationStatus = verificationStatus;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get restaurants with populated fields
    const restaurants = await Restaurant.find(query)
      .populate('vendor', 'name businessName email phoneNumber verificationStatus')
      .populate('chargingStation', 'name address location isActive isVerified')
      .populate('verifiedBy', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalRestaurants = await Restaurant.countDocuments(query);
    const totalPages = Math.ceil(totalRestaurants / parseInt(limit));

    // Add statistics for each restaurant
    const restaurantsWithStats = await Promise.all(
      restaurants.map(async (restaurant) => {
        const [dailyStats, employeeCount, totalOrders] = await Promise.all([
          Order.getDailySummary(restaurant._id),
          RestaurantEmployee.countDocuments({ restaurant: restaurant._id, isActive: true }),
          Order.countDocuments({ restaurant: restaurant._id })
        ]);

        return {
          ...restaurant.toObject(),
          stats: {
            ...dailyStats,
            employeeCount,
            totalOrders
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        restaurants: restaurantsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRestaurants,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get admin restaurants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurants'
    });
  }
});

// @desc    Get restaurant by ID with full details
// @route   GET /api/admin/restaurants/:id
// @access  Private (Admin)
router.get('/:id', [
  protectAdmin,
  param('id').isMongoId()
], async (req, res) => {
  try {
    const restaurantId = req.params.id;

    const restaurant = await Restaurant.findById(restaurantId)
      .populate('vendor', 'name businessName email phoneNumber address verificationStatus')
      .populate('chargingStation', 'name address location isActive isVerified')
      .populate('verifiedBy', 'name email');

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Get detailed statistics
    const [employees, recentOrders, monthlyStats] = await Promise.all([
      RestaurantEmployee.find({ restaurant: restaurantId })
        .populate('assignedBy', 'name')
        .select('-password'),
      Order.findByRestaurant(restaurantId)
        .limit(20)
        .populate('assignedTo.waiter assignedTo.chef assignedTo.cashier'),
      Order.aggregate([
        {
          $match: {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            orderedAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$orderedAt' },
              month: { $month: '$orderedAt' }
            },
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        restaurant,
        employees,
        recentOrders,
        monthlyStats
      }
    });

  } catch (error) {
    console.error('Get admin restaurant details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant details'
    });
  }
});

// @desc    Verify and activate restaurant
// @route   PATCH /api/admin/restaurants/:id/verify
// @access  Private (Admin)
router.patch('/:id/verify', [
  protectAdmin,
  requirePermission(['superadmin', 'admin']),
  param('id').isMongoId(),
  body('approved').isBoolean(),
  body('rejectionReason').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const { approved, rejectionReason } = req.body;
    const adminId = req.user.id;

    const restaurant = await Restaurant.findById(restaurantId)
      .populate('vendor', 'name businessName email phoneNumber')
      .populate('chargingStation', 'name address');

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    if (restaurant.verificationStatus !== 'pending' && restaurant.verificationStatus !== 'under_review') {
      return res.status(400).json({
        success: false,
        message: 'Restaurant has already been processed'
      });
    }

    if (approved) {
      // Approve restaurant
      restaurant.verificationStatus = 'approved';
      restaurant.isVerified = true;
      restaurant.isActive = true;
      restaurant.verificationDate = new Date();
      restaurant.verifiedBy = adminId;
      restaurant.rejectionReason = undefined;

      await restaurant.save();

      // Send approval notification
      await sendRestaurantNotification(
        restaurant.vendor,
        'Restaurant Verified Successfully! 🎉',
        `Congratulations! Your restaurant "${restaurant.name}" at ${restaurant.chargingStation.name} has been verified and activated.\n\nYou can now:\n• Accept orders from EV charging customers\n• Manage your menu and staff\n• View order analytics and reports\n\nStart serving delicious food to your EV customers today!`,
        'success',
        { name: restaurant.name }
      );

      res.json({
        success: true,
        message: 'Restaurant verified and activated successfully. Vendor has been notified.',
        data: restaurant
      });

    } else {
      // Reject restaurant
      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required when rejecting a restaurant'
        });
      }

      restaurant.verificationStatus = 'rejected';
      restaurant.isVerified = false;
      restaurant.isActive = false;
      restaurant.rejectionReason = rejectionReason;
      restaurant.verifiedBy = adminId;

      await restaurant.save();

      // Send rejection notification
      await sendRestaurantNotification(
        restaurant.vendor,
        'Restaurant Application Update',
        `We regret to inform you that your restaurant "${restaurant.name}" application has been rejected.\n\nReason: ${rejectionReason}\n\nPlease review the requirements and resubmit your application with the necessary corrections. Our team is here to help you succeed.`,
        'warning'
      );

      res.json({
        success: true,
        message: 'Restaurant rejected. Vendor has been notified with the reason.',
        data: restaurant
      });
    }

  } catch (error) {
    console.error('Verify restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process restaurant verification'
    });
  }
});

// @desc    Toggle restaurant active status
// @route   PATCH /api/admin/restaurants/:id/toggle-status
// @access  Private (Admin)
router.patch('/:id/toggle-status', [
  protectAdmin,
  requirePermission(['superadmin', 'admin']),
  param('id').isMongoId(),
  body('isActive').isBoolean(),
  body('reason').optional().isLength({ max: 200 })
], async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const { isActive, reason } = req.body;

    const restaurant = await Restaurant.findById(restaurantId)
      .populate('vendor', 'name businessName email phoneNumber')
      .populate('chargingStation', 'name');

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    if (!restaurant.isVerified && isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot activate unverified restaurant'
      });
    }

    restaurant.isActive = isActive;
    restaurant.acceptingOrders = isActive; // Stop accepting orders if deactivated
    await restaurant.save();

    // Send notification to vendor
    const action = isActive ? 'activated' : 'deactivated';
    const message = isActive 
      ? `Your restaurant "${restaurant.name}" has been activated and is now live for customers.`
      : `Your restaurant "${restaurant.name}" has been deactivated. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`;

    await sendRestaurantNotification(
      restaurant.vendor,
      `Restaurant ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message,
      isActive ? 'success' : 'warning'
    );

    res.json({
      success: true,
      message: `Restaurant ${action} successfully. Vendor has been notified.`,
      data: restaurant
    });

  } catch (error) {
    console.error('Toggle restaurant status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update restaurant status'
    });
  }
});

// @desc    Get restaurant statistics for admin dashboard
// @route   GET /api/admin/restaurants/stats/overview
// @access  Private (Admin)
router.get('/stats/overview', protectAdmin, async (req, res) => {
  try {
    const [
      totalRestaurants,
      verifiedRestaurants,
      activeRestaurants,
      pendingRestaurants,
      totalOrders,
      totalRevenue,
      recentRestaurants
    ] = await Promise.all([
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ isVerified: true }),
      Restaurant.countDocuments({ isActive: true }),
      Restaurant.countDocuments({ verificationStatus: 'pending' }),
      Order.countDocuments(),
      Order.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Restaurant.find({ verificationStatus: 'pending' })
        .populate('vendor', 'name businessName')
        .populate('chargingStation', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Get monthly growth data
    const monthlyGrowth = await Restaurant.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalRestaurants,
          verifiedRestaurants,
          activeRestaurants,
          pendingRestaurants,
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          verificationRate: totalRestaurants > 0 ? (verifiedRestaurants / totalRestaurants * 100).toFixed(1) : 0
        },
        recentRestaurants,
        monthlyGrowth
      }
    });

  } catch (error) {
    console.error('Get restaurant stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant statistics'
    });
  }
});

// @desc    Update restaurant verification status to under review
// @route   PATCH /api/admin/restaurants/:id/review
// @access  Private (Admin)
router.patch('/:id/review', [
  protectAdmin,
  param('id').isMongoId(),
  body('notes').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const { notes } = req.body;

    const restaurant = await Restaurant.findById(restaurantId)
      .populate('vendor', 'name businessName email phoneNumber');

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    if (restaurant.verificationStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Restaurant is not in pending status'
      });
    }

    restaurant.verificationStatus = 'under_review';
    if (notes) {
      restaurant.rejectionReason = notes; // Temporarily store review notes
    }
    await restaurant.save();

    // Send notification to vendor
    await sendRestaurantNotification(
      restaurant.vendor,
      'Restaurant Under Review',
      `Your restaurant "${restaurant.name}" is now under review by our team. We will notify you once the review is complete.\n\n${notes ? `Review Notes: ${notes}` : 'Our team is carefully reviewing your application to ensure quality standards.'}`,
      'info'
    );

    res.json({
      success: true,
      message: 'Restaurant marked as under review. Vendor has been notified.',
      data: restaurant
    });

  } catch (error) {
    console.error('Mark restaurant under review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update restaurant review status'
    });
  }
});

// @desc    Delete restaurant (soft delete)
// @route   DELETE /api/admin/restaurants/:id
// @access  Private (SuperAdmin only)
router.delete('/:id', [
  protectAdmin,
  requirePermission(['superadmin']),
  param('id').isMongoId(),
  body('reason').notEmpty().isLength({ max: 500 })
], async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const { reason } = req.body;

    const restaurant = await Restaurant.findById(restaurantId)
      .populate('vendor', 'name businessName email phoneNumber');

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Check if there are active orders
    const activeOrders = await Order.countDocuments({
      restaurant: restaurantId,
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
    });

    if (activeOrders > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete restaurant with ${activeOrders} active orders. Please complete or cancel all orders first.`
      });
    }

    // Soft delete - mark as inactive and add deletion reason
    restaurant.isActive = false;
    restaurant.isVerified = false;
    restaurant.verificationStatus = 'rejected';
    restaurant.rejectionReason = `Deleted by admin: ${reason}`;
    restaurant.acceptingOrders = false;
    await restaurant.save();

    // Deactivate all restaurant employees
    await RestaurantEmployee.updateMany(
      { restaurant: restaurantId },
      { isActive: false }
    );

    // Send notification to vendor
    await sendRestaurantNotification(
      restaurant.vendor,
      'Restaurant Removed',
      `Your restaurant "${restaurant.name}" has been removed from the platform.\n\nReason: ${reason}\n\nIf you believe this was done in error, please contact our support team immediately.`,
      'error'
    );

    res.json({
      success: true,
      message: 'Restaurant deleted successfully. Vendor has been notified.'
    });

  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete restaurant'
    });
  }
});

module.exports = router;
