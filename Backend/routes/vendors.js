const express = require('express');
const jwt = require('jsonwebtoken');
const ChargingStation = require('../models/ChargingStation');
const Booking = require('../models/Booking');
const Vendor = require('../models/Vendor');
const { 
  vendorRegistrationValidation,
  stationValidation,
  mongoIdValidation,
  paginationValidation,
  handleValidationErrors 
} = require('../middleware/validation');
const { authorizeVendor, checkVendorOwnership } = require('../middleware/auth');

const router = express.Router();

// Helper function to generate JWT for vendor
const generateVendorToken = (id) => {
  return jwt.sign({ id, type: 'vendor' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register new vendor
// @route   POST /api/vendors/register
// @access  Public
const registerVendor = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      businessName,
      businessRegistrationNumber,
      gstNumber,
      address,
      bankDetails
    } = req.body;

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({
      $or: [
        { email },
        { phoneNumber },
        { businessRegistrationNumber }
      ]
    });

    if (existingVendor) {
      let message = 'Vendor already exists with this ';
      if (existingVendor.email === email) message += 'email';
      else if (existingVendor.phoneNumber === phoneNumber) message += 'phone number';
      else if (existingVendor.businessRegistrationNumber === businessRegistrationNumber) message += 'business registration number';
      
      return res.status(400).json({
        success: false,
        message
      });
    }

    const vendor = new Vendor({
      name,
      email,
      phoneNumber,
      businessName,
      businessRegistrationNumber,
      gstNumber,
      address,
      bankDetails,
      verificationStatus: 'pending'
    });

    await vendor.save();

    const token = generateVendorToken(vendor._id);

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully. Verification pending.',
      token,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        businessName: vendor.businessName,
        verificationStatus: vendor.verificationStatus,
        isActive: vendor.isActive
      }
    });
  } catch (error) {
    console.error('Vendor registration error:', error);
    next(error);
  }
};

// @desc    Vendor login (send OTP)
// @route   POST /api/vendors/login
// @access  Public
const vendorLogin = async (req, res, next) => {
  try {
    const { email } = req.body;

    const vendor = await Vendor.findOne({ email, isActive: true });
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found with this email'
      });
    }

    // For now, we'll generate a token directly
    // In production, implement OTP verification similar to user auth
    const token = generateVendorToken(vendor._id);

    vendor.lastLogin = new Date();
    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        businessName: vendor.businessName,
        verificationStatus: vendor.verificationStatus,
        isActive: vendor.isActive
      }
    });
  } catch (error) {
    console.error('Vendor login error:', error);
    next(error);
  }
};

// @desc    Get vendor profile
// @route   GET /api/vendors/profile
// @access  Private (Vendor)
const getVendorProfile = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.vendor.id)
      .populate('stationsCount')
      .select('-__v');

    res.status(200).json({
      success: true,
      data: vendor
    });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    next(error);
  }
};

// @desc    Update vendor profile
// @route   PUT /api/vendors/profile
// @access  Private (Vendor)
const updateVendorProfile = async (req, res, next) => {
  try {
    const {
      name,
      businessName,
      gstNumber,
      address,
      bankDetails
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (businessName) updateData.businessName = businessName;
    if (gstNumber) updateData.gstNumber = gstNumber;
    if (address) updateData.address = { ...req.vendor.address, ...address };
    if (bankDetails) updateData.bankDetails = { ...req.vendor.bankDetails, ...bankDetails };

    const vendor = await Vendor.findByIdAndUpdate(
      req.vendor.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Update vendor profile error:', error);
    next(error);
  }
};

// @desc    Add charging station
// @route   POST /api/vendors/stations
// @access  Private (Vendor)
const addChargingStation = async (req, res, next) => {
  try {
    const stationData = {
      ...req.body,
      vendor: req.vendor.id,
      isVerified: false // Stations need verification
    };

    const station = new ChargingStation(stationData);
    await station.save();

    res.status(201).json({
      success: true,
      message: 'Charging station added successfully. Pending verification.',
      data: station
    });
  } catch (error) {
    console.error('Add charging station error:', error);
    next(error);
  }
};

// @desc    Get vendor's charging stations
// @route   GET /api/vendors/stations
// @access  Private (Vendor)
const getVendorStations = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let query = { vendor: req.vendor.id };
    
    if (status) {
      if (status === 'active') {
        query.isActive = true;
        query.isVerified = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      } else if (status === 'pending') {
        query.isVerified = false;
      }
    }

    const skip = (page - 1) * limit;

    const stations = await ChargingStation.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalStations = await ChargingStation.countDocuments(query);
    const totalPages = Math.ceil(totalStations / limit);

    res.status(200).json({
      success: true,
      count: stations.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalStations,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      data: stations
    });
  } catch (error) {
    console.error('Get vendor stations error:', error);
    next(error);
  }
};

// @desc    Update charging station
// @route   PUT /api/vendors/stations/:id
// @access  Private (Vendor)
const updateChargingStation = async (req, res, next) => {
  try {
    const station = await ChargingStation.findOneAndUpdate(
      { _id: req.params.id, vendor: req.vendor.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Charging station updated successfully',
      data: station
    });
  } catch (error) {
    console.error('Update charging station error:', error);
    next(error);
  }
};

// @desc    Delete charging station
// @route   DELETE /api/vendors/stations/:id
// @access  Private (Vendor)
const deleteChargingStation = async (req, res, next) => {
  try {
    const station = await ChargingStation.findOne({
      _id: req.params.id,
      vendor: req.vendor.id
    });

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found'
      });
    }

    // Check if there are any active bookings
    const activeBookings = await Booking.countDocuments({
      chargingStation: station._id,
      status: { $in: ['confirmed', 'active'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete station with active bookings'
      });
    }

    station.isActive = false;
    await station.save();

    res.status(200).json({
      success: true,
      message: 'Charging station deactivated successfully'
    });
  } catch (error) {
    console.error('Delete charging station error:', error);
    next(error);
  }
};

// @desc    Get vendor's bookings
// @route   GET /api/vendors/bookings
// @access  Private (Vendor)
const getVendorBookings = async (req, res, next) => {
  try {
    const {
      status,
      stationId,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    let query = { vendor: req.vendor.id };

    if (status) {
      query.status = status;
    }

    if (stationId) {
      query.chargingStation = stationId;
    }

    if (startDate || endDate) {
      query['timeSlot.startTime'] = {};
      if (startDate) {
        query['timeSlot.startTime'].$gte = new Date(startDate);
      }
      if (endDate) {
        query['timeSlot.startTime'].$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const bookings = await Booking.find(query)
      .populate([
        {
          path: 'chargingStation',
          select: 'name address'
        },
        {
          path: 'user',
          select: 'name phoneNumber'
        }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalBookings = await Booking.countDocuments(query);
    const totalPages = Math.ceil(totalBookings / limit);

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalBookings,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      data: bookings
    });
  } catch (error) {
    console.error('Get vendor bookings error:', error);
    next(error);
  }
};

// @desc    Get vendor dashboard stats
// @route   GET /api/vendors/dashboard
// @access  Private (Vendor)
const getVendorDashboard = async (req, res, next) => {
  try {
    const vendorId = req.vendor.id;

    // Get station stats
    const stationStats = await ChargingStation.aggregate([
      { $match: { vendor: vendorId } },
      {
        $group: {
          _id: null,
          totalStations: { $sum: 1 },
          activeStations: { $sum: { $cond: ['$isActive', 1, 0] } },
          verifiedStations: { $sum: { $cond: ['$isVerified', 1, 0] } },
          totalPorts: { $sum: '$totalPorts' },
          availablePorts: { $sum: '$availablePorts' }
        }
      }
    ]);

    // Get booking stats
    const bookingStats = await Booking.aggregate([
      { $match: { vendor: vendorId } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          activeBookings: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          todayBookings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$timeSlot.startTime', new Date(new Date().setHours(0, 0, 0, 0))] },
                    { $lt: ['$timeSlot.startTime', new Date(new Date().setHours(23, 59, 59, 999))] }
                  ]
                },
                1,
                0
              ]
            }
          },          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $ifNull: ['$actualUsage.finalAmount', '$pricing.merchantAmount'] }, // Use merchant amount
                0
              ]
            }
          }
        }
      }
    ]);

    // Get recent bookings
    const recentBookings = await Booking.find({ vendor: vendorId })
      .populate([
        { path: 'chargingStation', select: 'name' },
        { path: 'user', select: 'name phoneNumber' }
      ])
      .sort({ createdAt: -1 })
      .limit(10)
      .select('bookingId status timeSlot pricing.totalAmount createdAt');

    const stats = {
      stations: stationStats[0] || {
        totalStations: 0,
        activeStations: 0,
        verifiedStations: 0,
        totalPorts: 0,
        availablePorts: 0
      },
      bookings: bookingStats[0] || {
        totalBookings: 0,
        completedBookings: 0,
        activeBookings: 0,
        todayBookings: 0,
        totalRevenue: 0
      },
      recentBookings
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get vendor dashboard error:', error);
    next(error);
  }
};

// Routes
router.post('/register', 
  vendorRegistrationValidation(), 
  handleValidationErrors, 
  registerVendor
);

router.post('/login', vendorLogin);

router.get('/profile', authorizeVendor, getVendorProfile);
router.put('/profile', authorizeVendor, updateVendorProfile);

router.post('/stations', 
  stationValidation(), 
  handleValidationErrors, 
  authorizeVendor, 
  addChargingStation
);

router.get('/stations', 
  paginationValidation(), 
  handleValidationErrors, 
  authorizeVendor, 
  getVendorStations
);

router.put('/stations/:id', 
  mongoIdValidation('id'), 
  handleValidationErrors, 
  authorizeVendor, 
  updateChargingStation
);

router.delete('/stations/:id', 
  mongoIdValidation('id'), 
  handleValidationErrors, 
  authorizeVendor, 
  deleteChargingStation
);

router.get('/bookings', 
  paginationValidation(), 
  handleValidationErrors, 
  authorizeVendor, 
  getVendorBookings
);

router.get('/dashboard', authorizeVendor, getVendorDashboard);

module.exports = router;
