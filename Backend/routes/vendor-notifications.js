const express = require('express');
const Notification = require('../models/Notification');
const { authorizeVendor } = require('../middleware/auth');
const { query, param, validationResult } = require('express-validator');

const router = express.Router();

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

// @desc    Get notifications for authenticated vendor
// @route   GET /api/vendor/notifications
// @access  Private (Vendor)
router.get('/', 
  authorizeVendor,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('unreadOnly').optional().isBoolean().withMessage('unreadOnly must be a boolean'),
    query('type').optional().isIn([
      'info', 'success', 'warning', 'error', 'booking', 'payment', 
      'station', 'verification', 'maintenance', 'system'
    ]).withMessage('Invalid notification type')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        unreadOnly = false, 
        type = null 
      } = req.query;

      // Get notifications
      const notifications = await Notification.getNotifications(
        req.vendor.id,
        'Vendor',
        {
          page: parseInt(page),
          limit: parseInt(limit),
          unreadOnly: unreadOnly === 'true',
          type
        }
      );

      // Get total count for pagination
      const totalQuery = { recipient: req.vendor.id, recipientModel: 'Vendor' };
      if (unreadOnly === 'true') totalQuery.isRead = false;
      if (type) totalQuery.type = type;
      
      const total = await Notification.countDocuments(totalQuery);

      // Get unread count
      const unreadCount = await Notification.getUnreadCount(req.vendor.id, 'Vendor');

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            unreadCount
          }
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
  }
);

// @desc    Get unread notifications count
// @route   GET /api/vendor/notifications/unread-count
// @access  Private (Vendor)
router.get('/unread-count', authorizeVendor, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.vendor.id, 'Vendor');

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
});

// @desc    Mark notification as read
// @route   PATCH /api/vendor/notifications/:id/read
// @access  Private (Vendor)
router.patch('/:id/read', 
  authorizeVendor,
  param('id').isMongoId().withMessage('Invalid notification ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const notification = await Notification.findOne({
        _id: req.params.id,
        recipient: req.vendor.id,
        recipientModel: 'Vendor'
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      await notification.markAsRead();

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  }
);

// @desc    Mark all notifications as read
// @route   PATCH /api/vendor/notifications/mark-all-read
// @access  Private (Vendor)
router.patch('/mark-all-read', authorizeVendor, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.vendor.id, 'Vendor');

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// @desc    Delete notification
// @route   DELETE /api/vendor/notifications/:id
// @access  Private (Vendor)
router.delete('/:id',
  authorizeVendor,
  param('id').isMongoId().withMessage('Invalid notification ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        recipient: req.vendor.id,
        recipientModel: 'Vendor'
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
  }
);

// @desc    Create notification (admin/system use)
// @route   POST /api/vendor/notifications
// @access  Private (Vendor) - for testing purposes
router.post('/', authorizeVendor, async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'info',
      priority = 'medium',
      data = {},
      actionUrl,
      actionText,
      expiresInDays = 30
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    const notification = await Notification.createNotification({
      recipient: req.vendor.id,
      recipientModel: 'Vendor',
      title,
      message,
      type,
      priority,
      data,
      actionUrl,
      actionText,
      expiresInDays
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    });
  }
});

module.exports = router;
