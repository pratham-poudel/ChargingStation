const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Refund = require('../models/Refund');
const RefundService = require('../services/RefundService');
const upload = require('../middleware/upload');

const router = express.Router();

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, preferences } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (preferences) updateData.preferences = { ...preferences };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Add vehicle to user profile
// @route   POST /api/users/vehicles
// @access  Private
router.post('/vehicles', protect, async (req, res) => {
  try {
    const { vehicleNumber, vehicleType, batteryCapacity, isDefault } = req.body;

    if (!vehicleNumber || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle number and type are required'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if vehicle already exists
    const existingVehicle = user.vehicles.find(
      vehicle => vehicle.vehicleNumber.toUpperCase() === vehicleNumber.toUpperCase()
    );

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle already exists'
      });
    }

    await user.addVehicle({
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleType,
      batteryCapacity,
      isDefault: isDefault || user.vehicles.length === 0
    });

    res.status(201).json({
      success: true,
      data: user,
      message: 'Vehicle added successfully'
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update vehicle
// @route   PUT /api/users/vehicles/:vehicleId
// @access  Private
router.put('/vehicles/:vehicleId', protect, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { vehicleNumber, vehicleType, batteryCapacity, isDefault } = req.body;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const vehicle = user.vehicles.id(vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Update vehicle fields
    if (vehicleNumber) vehicle.vehicleNumber = vehicleNumber.toUpperCase();
    if (vehicleType) vehicle.vehicleType = vehicleType;
    if (batteryCapacity) vehicle.batteryCapacity = batteryCapacity;
    
    // Handle default vehicle setting
    if (isDefault) {
      user.vehicles.forEach(v => v.isDefault = false);
      vehicle.isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      data: user,
      message: 'Vehicle updated successfully'
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete vehicle
// @route   DELETE /api/users/vehicles/:vehicleId
// @access  Private
router.delete('/vehicles/:vehicleId', protect, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const vehicle = user.vehicles.id(vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Don't allow deletion of the last vehicle
    if (user.vehicles.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last vehicle. Add another vehicle first.'
      });
    }

    const wasDefault = vehicle.isDefault;
    vehicle.remove();

    // If deleted vehicle was default, make the first remaining vehicle default
    if (wasDefault && user.vehicles.length > 0) {
      user.vehicles[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      data: user,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user bookings
// @route   GET /api/users/bookings
// @access  Private
router.get('/bookings', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query = { user: req.user.id };
    
    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const bookings = await Booking.find(query)
      .populate('chargingStation', 'name address location images pricing')
      .populate('vendor', 'businessName')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Booking.countDocuments(query);

    // Get booking stats
    const stats = await Booking.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    const bookingStats = {
      total: total,
      completed: stats.find(s => s._id === 'completed')?.count || 0,
      active: stats.find(s => s._id === 'active')?.count || 0,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      cancelled: stats.find(s => s._id === 'cancelled')?.count || 0,
      totalSpent: stats.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
    };

    res.json({
      success: true,
      data: {
        bookings,
        stats: bookingStats,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single booking details
// @route   GET /api/users/bookings/:bookingId
// @access  Private
router.get('/bookings/:bookingId', protect, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      user: req.user.id
    })
      .populate('chargingStation', 'name address location images pricing contactInfo')
      .populate('vendor', 'businessName contactInfo')
      .select('-__v');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Cancel booking with refund calculation
// @route   PUT /api/users/bookings/:bookingId/cancel
// @access  Private
router.put('/bookings/:bookingId/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason must be at least 10 characters long'
      });
    }

    // Get security data
    const securityData = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestedAmount: req.body.amount // Check for amount manipulation
    };

    const result = await RefundService.cancelBookingWithRefund(
      req.params.bookingId,
      req.user.id,
      reason.trim(),
      securityData
    );

    res.json(result);
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel booking'
    });
  }
});

// @desc    Get refund calculation preview
// @route   GET /api/users/bookings/:bookingId/refund-preview
// @access  Private
router.get('/bookings/:bookingId/refund-preview', protect, async (req, res) => {
  try {
    const result = await RefundService.calculateRefund(
      req.params.bookingId,
      req.user.id
    );

    res.json(result);
  } catch (error) {
    console.error('Get refund preview error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to calculate refund'
    });
  }
});

// @desc    Get refund status
// @route   GET /api/users/refunds/:refundId
// @access  Private
router.get('/refunds/:refundId', protect, async (req, res) => {
  try {
    const result = await RefundService.getRefundStatus(
      req.params.refundId,
      req.user.id
    );

    res.json(result);
  } catch (error) {
    console.error('Get refund status error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get refund status'
    });
  }
});

// @desc    Get user refund history
// @route   GET /api/users/refunds
// @access  Private
router.get('/refunds', protect, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    const result = await RefundService.getUserRefunds(req.user.id, filters);

    res.json(result);
  } catch (error) {
    console.error('Get refund history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get refund history'
    });
  }
});

// @desc    Check in to booking
// @route   PUT /api/users/bookings/:bookingId/checkin
// @access  Private
router.put('/bookings/:bookingId/checkin', protect, async (req, res) => {
  try {
    const { method = 'manual' } = req.body;
    
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      user: req.user.id
    }).populate('chargingStation', 'name address');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check in the user
    await booking.checkIn(method);

    res.json({
      success: true,
      data: booking,
      message: 'Successfully checked in to your booking'
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to check in'
    });
  }
});

module.exports = router;
