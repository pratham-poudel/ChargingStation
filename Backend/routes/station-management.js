const express = require('express');
const jwt = require('jsonwebtoken');
const ChargingStation = require('../models/ChargingStation');
const Booking = require('../models/Booking');
const StationEmployee = require('../models/StationEmployee');
const { authorizeVendor } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');
const multer = require('multer');
const { uploadFile } = require('../config/minio');
const { storeOTP, getOTP, deleteOTP, checkOTPRateLimit } = require('../config/redis');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Middleware to parse JSON fields from FormData
const parseFormDataJSON = (req, res, next) => {
  try {
    console.log('=== PARSING FORMDATA ===');
    console.log('Raw body before parsing:', req.body);
    
    // Parse JSON fields that come as strings in FormData
    if (req.body.address && typeof req.body.address === 'string') {
      console.log('Parsing address:', req.body.address);
      req.body.address = JSON.parse(req.body.address);
      console.log('Parsed address:', req.body.address);
    }
    if (req.body.location && typeof req.body.location === 'string') {
      console.log('Parsing location:', req.body.location);
      req.body.location = JSON.parse(req.body.location);
      console.log('Parsed location:', req.body.location);
    }
    if (req.body.stationMaster && typeof req.body.stationMaster === 'string') {
      console.log('Parsing stationMaster:', req.body.stationMaster);
      req.body.stationMaster = JSON.parse(req.body.stationMaster);
      console.log('Parsed stationMaster:', req.body.stationMaster);
    }
    if (req.body.operatingHours && typeof req.body.operatingHours === 'string') {
      console.log('Parsing operatingHours:', req.body.operatingHours);
      req.body.operatingHours = JSON.parse(req.body.operatingHours);
      console.log('Parsed operatingHours:', req.body.operatingHours);
    }
    if (req.body.chargingPorts && typeof req.body.chargingPorts === 'string') {
      console.log('Parsing chargingPorts:', req.body.chargingPorts);
      req.body.chargingPorts = JSON.parse(req.body.chargingPorts);
      console.log('Parsed chargingPorts:', req.body.chargingPorts);
    }
    if (req.body.amenities && typeof req.body.amenities === 'string') {
      console.log('Parsing amenities:', req.body.amenities);
      req.body.amenities = JSON.parse(req.body.amenities);
      console.log('Parsed amenities:', req.body.amenities);
    }
    
    console.log('Final parsed body:', JSON.stringify(req.body, null, 2));
    next();
  } catch (error) {
    console.error('JSON parsing error:', error);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request data',
      error: error.message
    });
  }
};

// Validation middleware for station updates
const stationValidation = [
  body('name')
    .notEmpty()
    .withMessage('Station name is required')
    .isLength({ max: 100 })
    .withMessage('Station name cannot exceed 100 characters'),
  body('address.street')
    .notEmpty()
    .withMessage('Street address is required'),
  body('address.city')
    .notEmpty()
    .withMessage('City is required'),
  body('address.state')
    .notEmpty()
    .withMessage('State is required'),
  body('address.pincode')
    .matches(/^[0-9]{6}$/)
    .withMessage('Please enter a valid 6-digit pincode'),
  body('location.coordinates')
    .custom((coordinates) => {
      if (!Array.isArray(coordinates)) {
        throw new Error('Coordinates must be an array');
      }
      if (coordinates.length !== 2) {
        throw new Error('Coordinates must have exactly 2 elements [longitude, latitude]');
      }
      const [lng, lat] = coordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new Error('Longitude and latitude must be numbers');
      }
      if (lng < -180 || lng > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      if (lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      return true;
    }),
  body('stationMaster.name')
    .notEmpty()
    .withMessage('Station master name is required')
    .isLength({ max: 100 })
    .withMessage('Station master name cannot exceed 100 characters'),
  body('stationMaster.phoneNumber')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please enter a valid 10-digit phone number'),
];

const chargingPortValidation = [
  body('chargingPorts.*.portNumber')
    .notEmpty()
    .withMessage('Port number is required'),
  body('chargingPorts.*.connectorType')
    .isIn(['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Tesla', 'CCS2'])
    .withMessage('Invalid connector type'),
  body('chargingPorts.*.powerOutput')
    .isFloat({ min: 1 })
    .withMessage('Power output must be at least 1 kW'),
  body('chargingPorts.*.chargingType')
    .isIn(['slow', 'fast', 'rapid'])
    .withMessage('Invalid charging type'),
  body('chargingPorts.*.pricePerUnit')
    .isFloat({ min: 0 })
    .withMessage('Price per unit must be non-negative'),
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('=== VALIDATION ERRORS ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Helper function to generate employee JWT
const generateEmployeeToken = (employeeId, stationId) => {
  return jwt.sign(
    { 
      id: employeeId, 
      stationId, 
      type: 'station_employee' 
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRE || '8h' }
  );
};

// Middleware for employee authentication
const authorizeEmployee = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'station_employee') {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token type.'
      });
    }

    const employee = await StationEmployee.findById(decoded.id)
      .populate('chargingStation', 'name')
      .populate('vendor', 'name businessName');
    
    if (!employee || !employee.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Employee not found or inactive.'
      });
    }

    req.employee = employee;
    req.stationId = decoded.stationId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token.'
    });
  }
};

// Combined middleware for both vendor and employee access
const authorizeStationAccess = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type === 'vendor') {
      // Vendor access - full permissions
      const Vendor = require('../models/Vendor');
      const vendor = await Vendor.findById(decoded.id);
      
      if (!vendor) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Vendor not found.'
        });
      }
      
      req.vendor = vendor;
      req.accessType = 'vendor';
    } else if (decoded.type === 'station_employee') {
      // Employee access - limited permissions
      const employee = await StationEmployee.findById(decoded.id)
        .populate('chargingStation', 'name')
        .populate('vendor', 'name businessName');
      
      if (!employee || !employee.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Employee not found or inactive.'
        });
      }
      
      // Check if trying to access the assigned station
      if (req.params.stationId && req.params.stationId !== employee.chargingStation._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your assigned station.'
        });
      }
      
      req.employee = employee;
      req.stationId = employee.chargingStation._id;
      req.accessType = 'employee';
    } else {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token type.'
      });
    }
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Access denied. Invalid token.'
    });
  }
};

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to format address for display
const formatAddress = (address) => {
  if (typeof address === 'string') return address;
  if (!address || typeof address !== 'object') return 'Address not available';
  
  const parts = [
    address.street,
    address.landmark,
    address.city,
    address.state
  ].filter(Boolean);
  
  return parts.join(', ') || 'Address not available';
};

// @desc    Send OTP to customer before starting charging session
// @route   POST /api/station-management/:stationId/bookings/:bookingId/send-start-otp
// @access  Private (Vendor/Employee)
router.post('/:stationId/bookings/:bookingId/send-start-otp', [
  authorizeStationAccess,
  param('stationId').isMongoId(),
  param('bookingId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { stationId, bookingId } = req.params;

    // Check employee permissions
    if (req.accessType === 'employee' && !req.employee.permissions.canUpdateBookings) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to start charging sessions'
      });
    }

    // Find the booking
    const booking = await Booking.findOne({
      _id: bookingId,
      chargingStation: stationId
    })
    .populate('user', 'name phoneNumber email')
    .populate('chargingStation', 'name address')
    .populate('chargingPort', 'portNumber connectorType');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be started
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot start session. Booking status is '${booking.status}'. Only confirmed bookings can be started.`
      });
    }

    const customerPhone = booking.user.phoneNumber;
    const customerEmail = booking.user.email;

    if (!customerPhone || (!customerEmail && !customerPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Customer contact information not available'
      });
    }

    // Check rate limit for OTP requests for this booking
    const otpKey = `start_session_${bookingId}`;
    const rateLimitCheck = await checkOTPRateLimit(otpKey, 3, 10); // 3 attempts in 10 minutes

    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many OTP requests for this booking. Please try again in ${rateLimitCheck.resetInMinutes} minutes.`,
        resetInMinutes: rateLimitCheck.resetInMinutes
      });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with 10 minute expiration
    await storeOTP(otpKey, otp, 10);

    // Prepare data for notifications
    const stationName = booking.chargingStation.name;
    const stationAddress = formatAddress(booking.chargingStation.address);
    const userName = booking.user.name;
    const portNumber = booking.chargingPort?.portNumber || 'N/A';
    const connectorType = booking.chargingPort?.connectorType || 'N/A';
    const requestTime = new Date().toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Send OTP via SMS
    try {
      const smsMessage = `🔐 OTP to start charging at ${stationName}: ${otp}. Share this with the station employee to begin your session. Valid for 10 minutes. - ChargingStation Nepal`;
      
      const smsResult = await smsService.sendSMS(customerPhone, smsMessage);
      console.log('Start session OTP SMS result:', smsResult);
    } catch (smsError) {
      console.error('Failed to send start session OTP SMS:', smsError);
      // Continue even if SMS fails
    }

    // Send OTP via Email (if email is available)
    if (customerEmail) {
      try {
        const emailResult = await emailService.sendEmail({
          to: customerEmail,
          template: 'charging-start-otp',
          data: {
            userName,
            otp,
            stationName,
            stationAddress,
            bookingId: booking.bookingId || booking._id,
            portNumber,
            connectorType,
            requestTime,
            supportPhone: process.env.SUPPORT_PHONE || '+977-9800000000'
          }
        });
        console.log('Start session OTP email result:', emailResult);
      } catch (emailError) {
        console.error('Failed to send start session OTP email:', emailError);
        // Continue even if email fails
      }
    }

    res.json({
      success: true,
      message: `OTP sent to customer's ${customerEmail ? 'phone and email' : 'phone'}`,
      data: {
        otpSentTo: {
          phone: customerPhone,
          email: customerEmail || null
        },
        expiresIn: 10, // minutes
        attemptsLeft: rateLimitCheck.attemptsLeft
      }
    });

  } catch (error) {
    console.error('Send start session OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

// @desc    Verify OTP and start charging session
// @route   POST /api/station-management/:stationId/bookings/:bookingId/verify-start-otp
// @access  Private (Vendor/Employee)
router.post('/:stationId/bookings/:bookingId/verify-start-otp', [
  authorizeStationAccess,
  param('stationId').isMongoId(),
  param('bookingId').isMongoId(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('actualStartTime').optional().isISO8601(),
  body('actualUnitsConsumed').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { stationId, bookingId } = req.params;
    const { otp, actualStartTime, actualUnitsConsumed } = req.body;

    // Check employee permissions
    if (req.accessType === 'employee' && !req.employee.permissions.canUpdateBookings) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to start charging sessions'
      });
    }

    // Find the booking
    const booking = await Booking.findOne({
      _id: bookingId,
      chargingStation: stationId
    }).populate('user', 'name phoneNumber email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be started
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot start session. Booking status is '${booking.status}'. Only confirmed bookings can be started.`
      });
    }

    // Verify OTP
    const otpKey = `start_session_${bookingId}`;
    const storedOTP = await getOTP(otpKey);
    
    if (!storedOTP || storedOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Delete OTP after successful verification
    await deleteOTP(otpKey);

    // Update booking status to active
    booking.status = 'active';
    booking.actualUsage = {
      actualStartTime: actualStartTime || new Date(),
      actualUnitsConsumed: actualUnitsConsumed || 0
    };

    await booking.save();

    // Send welcome SMS notification
    try {
      const station = await ChargingStation.findById(stationId);
      const amenitiesText = station.amenities?.slice(0, 3).join(', ') || 'charging services';
      
      await smsService.sendSMS(
        booking.user.phoneNumber,
        `Welcome to ${station.name}! Your charging session has started. We have ${amenitiesText} available. Have a great experience! - ChargingStation Nepal`
      );
    } catch (smsError) {
      console.error('Welcome SMS sending error:', smsError);
    }

    res.json({
      success: true,
      message: 'OTP verified successfully. Charging session started! Welcome SMS sent to customer.',
      data: booking
    });

  } catch (error) {
    console.error('Verify start session OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP and start session'
    });
  }
});

// @desc    Get comprehensive station details with bookings
// @route   GET /api/station-management/:stationId
// @access  Private (Vendor/Employee)
router.get('/:stationId', authorizeStationAccess, async (req, res) => {
  try {
    const { stationId } = req.params;
    const { date } = req.query;
    
    // Verify station access permissions
    let stationQuery = { _id: stationId };
    if (req.accessType === 'vendor') {
      stationQuery.vendor = req.vendor.id;
    }
    
    const station = await ChargingStation.findOne(stationQuery)
      .populate('vendor', 'name businessName email phoneNumber')
      .lean();
    
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found or access denied'
      });
    }

    // Get bookings for today or specified date
    const targetDate = date ? new Date(date) : new Date();
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);    // Get all bookings for the station on the target date
    // Look for bookings created on this date OR with time slots on this date
    const bookings = await Booking.find({
      chargingStation: stationId,
      $or: [
        {
          // Bookings with time slots on the target date
          'timeSlot.startTime': {
            $gte: startDate,
            $lte: endDate
          }
        },
        {
          // Bookings created on the target date
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      ]
    })
    .populate('user', 'name phoneNumber email')
    .populate('chargingStation', 'name')
    .populate('chargingPort', 'portNumber connectorType powerOutput')
    .sort({ 'timeSlot.startTime': 1 })
    .lean();

    // Transform bookings to include customerDetails for frontend compatibility
    const transformedBookings = bookings.map(booking => ({
      ...booking,
      customerDetails: {
        name: booking.user?.name || 'Unknown Customer',
        phoneNumber: booking.user?.phoneNumber || 'N/A',
        email: booking.user?.email || null
      },
      bookingId: booking.bookingId || booking._id?.toString()
    }));

    // Categorize bookings
    const now = new Date();
    const upcomingBookings = transformedBookings.filter(booking => 
      new Date(booking.timeSlot.startTime) > now && 
      ['confirmed', 'active'].includes(booking.status)
    );
    
    const ongoingBookings = transformedBookings.filter(booking => 
      new Date(booking.timeSlot.startTime) <= now && 
      new Date(booking.timeSlot.endTime) > now && 
      booking.status === 'active'
    );
    
    const completedBookings = transformedBookings.filter(booking => 
      booking.status === 'completed' ||
      (booking.status === 'active' && new Date(booking.timeSlot.endTime) <= now)    );

    // Helper function to calculate merchant revenue including payment adjustments
    const calculateMerchantRevenue = (booking) => {
      let baseAmount = 0;
      
      // Get base merchant amount
      if (booking.pricing?.merchantAmount !== undefined) {
        baseAmount = booking.pricing.merchantAmount;
      } else if (booking.pricing?.totalAmount !== undefined) {
        // For old bookings, subtract ₹5 platform fee from totalAmount
        baseAmount = Math.max(0, booking.pricing.totalAmount - 5);
      } else if (booking.actualUsage?.finalAmount !== undefined) {
        // For completed bookings with finalAmount, subtract ₹5 platform fee
        baseAmount = Math.max(0, booking.actualUsage.finalAmount - 5);
      }
      
      // Add payment adjustments
      const additionalCharges = booking.paymentAdjustments
        ?.filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
        ?.reduce((total, adj) => total + adj.amount, 0) || 0;
      
      const refunds = booking.paymentAdjustments
        ?.filter(adj => adj.type === 'refund' && adj.status === 'processed')
        ?.reduce((total, adj) => total + adj.amount, 0) || 0;
      
      return baseAmount + additionalCharges - refunds;
    };

    const todayRevenue = completedBookings.reduce((total, booking) => {
      return total + calculateMerchantRevenue(booking);
    }, 0);

    // Get station employees (only for vendors)
    let employees = [];
    if (req.accessType === 'vendor') {
      employees = await StationEmployee.find({ 
        chargingStation: stationId, 
        isActive: true 
      })
      .select('-password')
      .sort({ createdAt: -1 });
    }

    // Station analytics for the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekBookings = await Booking.find({
      chargingStation: stationId,
      createdAt: { $gte: weekAgo }
    }).lean();    const analytics = {
      totalBookings: weekBookings.length,
      completedBookings: weekBookings.filter(b => b.status === 'completed').length,
      totalRevenue: weekBookings
        .filter(b => b.status === 'completed')
        .reduce((total, booking) => {
          return total + calculateMerchantRevenue(booking);
        }, 0),
      averageRating: station.rating?.average || 0,
      utilizationRate: Math.round((weekBookings.length / (station.totalPorts * 7 * 24)) * 100)
    };

    res.json({
      success: true,
      data: {
        station: {
          ...station,
          accessType: req.accessType,
          employeeName: req.employee?.employeeName || null,
          employeeRole: req.employee?.role || null
        },        bookings: {
          upcoming: upcomingBookings,
          ongoing: ongoingBookings,
          completed: completedBookings.slice(0, 10), // Last 10 completed
          allBookings: transformedBookings, // Include ALL bookings for the day
          todayRevenue,
          totalToday: transformedBookings.length
        },
        employees: req.accessType === 'vendor' ? employees : [],
        analytics,
        date: targetDate.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Get station details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch station details'
    });
  }
});

// @desc    Assign employee to station
// @route   POST /api/station-management/:stationId/assign-employee
// @access  Private (Vendor only)
router.post('/:stationId/assign-employee', [
  authorizeVendor,
  param('stationId').isMongoId(),
  body('employeeName').notEmpty().trim().isLength({ max: 100 }),
  body('phoneNumber').matches(/^[0-9]{10}$/),
  body('password').isLength({ min: 6 }),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['station_manager', 'technician', 'customer_service']),
  body('notes').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { stationId } = req.params;
    const { employeeName, phoneNumber, password, email, role, notes } = req.body;

    // Verify station ownership
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

    // Check if phone number already exists for this vendor
    const existingEmployee = await StationEmployee.findOne({
      phoneNumber,
      vendor: req.vendor.id,
      isActive: true
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'An employee with this phone number already exists'
      });
    }    // Create new employee
    const employee = new StationEmployee({
      employeeName,
      phoneNumber,
      password,
      email,
      chargingStation: stationId,
      vendor: req.vendor.id,
      role: role || 'station_manager',
      assignedBy: req.vendor.id,
      notes
    });

    console.log('Employee object before save:', {
      employeeName: employee.employeeName,
      phoneNumber: employee.phoneNumber,
      assignmentNumber: employee.assignmentNumber,
      chargingStation: employee.chargingStation,
      vendor: employee.vendor
    });

    // Save the employee
    await employee.save();
    
    console.log('Employee object after save:', {
      employeeName: employee.employeeName,
      phoneNumber: employee.phoneNumber,
      assignmentNumber: employee.assignmentNumber,
      _id: employee._id
    });
    
    // Verify the assignment number was generated
    if (!employee.assignmentNumber) {
      throw new Error('Failed to generate assignment number');
    }

    // Send SMS notification to employee with credentials
    try {
      const station = await ChargingStation.findById(stationId);
      const stationName = station?.name || 'the charging station';
      
      const smsMessage = `Welcome! You have been assigned as an employee at ${stationName}. Your login credentials are: Assignment Number: ${employee.assignmentNumber}, Password: ${password}. Please login at the station management portal and change your password. - ChargingStation Nepal`;
      
      console.log(`Sending SMS to ${employee.phoneNumber}: ${smsMessage}`);
      
      const smsResult = await smsService.sendSMS(employee.phoneNumber, smsMessage);
      
      if (smsResult.success) {
        console.log('Employee credentials SMS sent successfully:', smsResult.data);
      } else {
        console.error('Employee credentials SMS failed:', smsResult.error);
      }
    } catch (smsError) {
      console.error('Error sending employee credentials SMS:', smsError);
      // Don't fail the request if SMS fails
    }

    // Remove password from response
    const employeeResponse = employee.toObject();
    delete employeeResponse.password;

    res.status(201).json({
      success: true,
      message: `Employee assigned successfully! Assignment Number: ${employee.assignmentNumber}. SMS sent with login credentials.`,
      data: employeeResponse
    });
  } catch (error) {
    console.error('Assign employee error:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to assign employee'
    });
  }
});

// @desc    Employee login
// @route   POST /api/station-management/employee-login
// @access  Public
router.post('/employee-login', [
  body('assignmentNumber').notEmpty().trim(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide assignment number and password'
      });
    }

    const { assignmentNumber, password } = req.body;

    console.log('Employee login attempt:', { assignmentNumber, passwordLength: password.length });

    // Find employee with detailed debugging
    const employee = await StationEmployee.findOne({ 
      assignmentNumber: assignmentNumber.trim().toUpperCase(), 
      isActive: true 
    })
    .populate('chargingStation', 'name address')
    .populate('vendor', 'name businessName');

    console.log('Employee found:', employee ? 'Yes' : 'No');

    if (!employee) {
      // Check if employee exists but is inactive
      const inactiveEmployee = await StationEmployee.findOne({ 
        assignmentNumber: assignmentNumber.trim().toUpperCase()
      });
      
      if (inactiveEmployee) {
        console.log('Employee exists but is inactive');
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated. Please contact your supervisor.'
        });
      }

      // Check if any employees exist at all (for debugging)
      const totalEmployees = await StationEmployee.countDocuments();
      console.log('Total employees in database:', totalEmployees);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid assignment number or password'
      });
    }

    console.log('Checking password for employee:', employee.employeeName);

    // Check password
    const isPasswordValid = await employee.comparePassword(password);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid assignment number or password'
      });
    }

    // Update last login
    employee.lastLogin = new Date();
    await employee.save();

    console.log('Employee login successful:', employee.employeeName);

    // Generate token
    const token = generateEmployeeToken(employee._id, employee.chargingStation._id);

    // Remove password from response
    const employeeResponse = employee.toObject();
    delete employeeResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        employee: employeeResponse,
        token,
        stationId: employee.chargingStation._id
      }
    });

  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// @desc    Update booking status (start/complete charging)
// @route   PATCH /api/station-management/:stationId/bookings/:bookingId/status
// @access  Private (Vendor/Employee)
router.patch('/:stationId/bookings/:bookingId/status', [
  authorizeStationAccess,
  param('stationId').isMongoId(),
  param('bookingId').isMongoId(),
  body('status').isIn(['active', 'completed']),
  body('actualStartTime').optional().isISO8601(),
  body('actualEndTime').optional().isISO8601(),
  body('finalAmount').optional().isNumeric(),
  body('actualUnitsConsumed').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { stationId, bookingId } = req.params;
    const { status, actualStartTime, actualEndTime, finalAmount, actualUnitsConsumed } = req.body;

    // Check employee permissions
    if (req.accessType === 'employee' && !req.employee.permissions.canUpdateBookings) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update bookings'
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      chargingStation: stationId
    }).populate('user', 'name phoneNumber email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking status
    if (status === 'active' && booking.status === 'confirmed') {
      booking.status = 'active';
      booking.actualUsage = {
        actualStartTime: actualStartTime || new Date(),
        actualUnitsConsumed: actualUnitsConsumed || 0
      };

      // Send SMS notification
      try {
        const station = await ChargingStation.findById(stationId);
        const amenitiesText = station.amenities?.slice(0, 3).join(', ') || 'charging services';
        
        await smsService.sendSMS(
          booking.user.phoneNumber,
          `Welcome to ${station.name}! Your charging session has started. We have ${amenitiesText} available. Have a great experience! - ChargingStation Nepal`
        );
      } catch (smsError) {
        console.error('SMS sending error:', smsError);
      }    } else if (status === 'completed' && booking.status === 'active') {
      booking.status = 'completed';
      if (booking.actualUsage) {
        booking.actualUsage.actualEndTime = actualEndTime || new Date();
        booking.actualUsage.finalAmount = finalAmount || booking.pricing.totalAmount;
        booking.actualUsage.actualUnitsConsumed = actualUnitsConsumed || booking.estimatedUnits;
      }// Send completion SMS notification with rating request
      try {
        const station = await ChargingStation.findById(stationId);
        const ratingUrl = `${process.env.FRONTEND_URL || 'https://chargingstation.com.np'}/rate-experience?bookingId=${booking._id}`;
        
        console.log(`Attempting to send completion SMS to ${booking.user.phoneNumber}`);
        const smsResult = await smsService.sendSMS(
          booking.user.phoneNumber,
          `Thank you for using ${station.name}! Your charging session is complete. Please rate your experience at ${ratingUrl} to help us improve. - ChargingStation Nepal`
        );
        
        if (smsResult.success) {
          console.log('Completion SMS sent successfully:', smsResult.data);
        } else {
          console.error('Completion SMS failed:', smsResult.error);
        }
      } catch (smsError) {
        console.error('Completion SMS sending error:', smsError);
      }
    }

    await booking.save();

    res.json({
      success: true,
      message: `Booking ${status === 'active' ? 'started' : 'completed'} successfully`,
      data: booking
    });

  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
});

// @desc    Get station employees
// @route   GET /api/station-management/:stationId/employees
// @access  Private (Vendor only)
router.get('/:stationId/employees', authorizeVendor, async (req, res) => {
  try {
    const { stationId } = req.params;

    // Verify station ownership
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

    const employees = await StationEmployee.find({ 
      chargingStation: stationId 
    })
    .select('-password')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: employees
    });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees'
    });
  }
});

// @desc    Remove/deactivate employee
// @route   DELETE /api/station-management/:stationId/employees/:employeeId
// @access  Private (Vendor only)
router.delete('/:stationId/employees/:employeeId', authorizeVendor, async (req, res) => {
  try {
    const { stationId, employeeId } = req.params;

    // Verify station ownership
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

    const employee = await StationEmployee.findOneAndUpdate(
      { 
        _id: employeeId, 
        chargingStation: stationId,
        vendor: req.vendor.id
      },
      { isActive: false },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee removed successfully'
    });
  } catch (error) {
    console.error('Remove employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove employee'
    });
  }
});

// @desc    Test SMS functionality (Debug endpoint)
// @route   POST /api/station-management/debug/test-sms
// @access  Private (Development only)
router.post('/debug/test-sms', authorizeStationAccess, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Debug endpoints not available in production'
      });
    }

    const { phoneNumber, messageType = 'completion', bookingId } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    let message;
    if (messageType === 'completion') {
      const ratingUrl = `${process.env.FRONTEND_URL || 'https://chargingstation.com.np'}/rate-experience?bookingId=${bookingId || 'test123'}`;
      message = `Thank you for using Test Station! Your charging session is complete. Please rate your experience at ${ratingUrl} to help us improve. - ChargingStation Nepal`;
    } else if (messageType === 'welcome') {
      message = `Welcome to Test Station! Your charging session has started. We have WiFi, Coffee, Restroom available. Have a great experience! - ChargingStation Nepal`;
    } else {
      message = req.body.message || 'Test message from ChargingStation Nepal';
    }

    console.log(`Testing SMS to ${phoneNumber}: ${message}`);

    const result = await smsService.sendSMS(phoneNumber, message);

    res.json({
      success: true,
      message: 'SMS test completed',
      data: {
        phoneNumber,
        messageType,
        messageSent: message,
        smsResult: result
      }
    });

  } catch (error) {
    console.error('SMS test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test SMS',
      error: error.message
    });
  }
});

// @desc    Create payment adjustment for a booking
// @route   POST /api/station-management/:stationId/bookings/:bookingId/payment-adjustment
// @access  Private (Vendor/Employee)
router.post('/:stationId/bookings/:bookingId/payment-adjustment', [
  authorizeStationAccess,
  param('stationId').isMongoId(),
  param('bookingId').isMongoId(),
  body('type').isIn(['additional_charge', 'refund']),
  body('amount').isFloat({ min: 0.01 }),
  body('reason').notEmpty().trim().isLength({ max: 500 }),
  body('notes').optional().isLength({ max: 500 }),
  body('refundMethod').optional().isIn(['cash', 'bank_transfer', 'wallet'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { stationId, bookingId } = req.params;
    const { type, amount, reason, notes, refundMethod } = req.body;

    // Check employee permissions
    if (req.accessType === 'employee' && !req.employee.permissions.canUpdateBookings) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create payment adjustments'
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      chargingStation: stationId
    }).populate('user', 'name phoneNumber email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Only allow adjustments for active or completed bookings
    if (!['active', 'completed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Payment adjustments can only be made for active or completed bookings'
      });
    }

    // Get adjuster information
    let adjustedBy, adjustedById, adjustedByName;
    if (req.accessType === 'vendor') {
      adjustedBy = 'vendor';
      adjustedById = req.vendor.id;
      adjustedByName = req.vendor.businessName || req.vendor.name;
    } else {
      adjustedBy = 'employee';
      adjustedById = req.employee._id;
      adjustedByName = req.employee.employeeName;
    }

    // Create payment adjustment
    const adjustment = {
      type,
      amount: parseFloat(amount),
      reason: reason.trim(),
      notes: notes?.trim() || '',
      adjustedBy,
      adjustedById,
      adjustedByName,
      refundMethod: type === 'refund' ? (refundMethod || 'cash') : undefined,
      status: type === 'refund' ? 'processed' : 'pending', // Refunds are processed immediately, charges need payment
      processedAt: type === 'refund' ? new Date() : undefined
    };

    // For additional charges, simulate payment request (in production, integrate with payment gateway)
    if (type === 'additional_charge') {
      // Generate dummy payment request ID
      adjustment.paymentRequestId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In production, you would:
      // 1. Create payment link/request with your payment gateway
      // 2. Send SMS/email to customer with payment link
      // 3. Handle webhook for payment completion
      
      // For demo, auto-process after 2 seconds (simulate payment)
      setTimeout(async () => {
        try {
          const updatedBooking = await Booking.findById(bookingId);
          const adjustmentToUpdate = updatedBooking.paymentAdjustments.find(
            adj => adj.paymentRequestId === adjustment.paymentRequestId
          );
          
          if (adjustmentToUpdate && adjustmentToUpdate.status === 'pending') {
            adjustmentToUpdate.status = 'processed';
            adjustmentToUpdate.processedAt = new Date();
            await updatedBooking.save();
            
            console.log(`Demo: Payment of ₹${amount} processed for booking ${bookingId}`);
          }
        } catch (error) {
          console.error('Demo payment processing error:', error);
        }
      }, 2000);
    }

    booking.paymentAdjustments.push(adjustment);
    await booking.save();

    res.status(201).json({
      success: true,
      message: type === 'additional_charge' 
        ? 'Payment request created successfully! Customer will receive payment link.'
        : 'Refund processed successfully!',
      data: {
        adjustment,
        booking: booking
      }
    });

  } catch (error) {
    console.error('Create payment adjustment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment adjustment'
    });
  }
});

// @desc    Get payment adjustments for a booking
// @route   GET /api/station-management/:stationId/bookings/:bookingId/payment-adjustments
// @access  Private (Vendor/Employee)
router.get('/:stationId/bookings/:bookingId/payment-adjustments', [
  authorizeStationAccess,
  param('stationId').isMongoId(),
  param('bookingId').isMongoId()
], async (req, res) => {
  try {
    const { stationId, bookingId } = req.params;

    const booking = await Booking.findOne({
      _id: bookingId,
      chargingStation: stationId
    }).select('paymentAdjustments pricing actualUsage');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: {
        adjustments: booking.paymentAdjustments,
        summary: {
          originalAmount: booking.pricing.totalAmount,
          finalAmount: booking.actualUsage?.finalAmount || booking.pricing.totalAmount,
          totalAdditionalCharges: booking.getTotalAdditionalCharges(),
          totalRefunds: booking.getTotalRefunds(),
          netAmount: booking.getNetAmount(),
          merchantNetAmount: booking.getMerchantNetAmount()
        }
      }
    });

  } catch (error) {
    console.error('Get payment adjustments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment adjustments'
    });
  }
});

// @desc    Change employee password (Admin only)
// @route   PATCH /api/station-management/:stationId/employees/:employeeId/change-password
// @access  Private (Vendor only)
router.patch('/:stationId/employees/:employeeId/change-password', [
  authorizeVendor,
  param('stationId').isMongoId(),
  param('employeeId').isMongoId(),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { stationId, employeeId } = req.params;
    const { newPassword } = req.body;

    // Verify station ownership
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

    // Find the employee
    const employee = await StationEmployee.findOne({
      _id: employeeId,
      chargingStation: stationId,
      vendor: req.vendor.id,
      isActive: true
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Update password (will be hashed by pre-save middleware)
    employee.password = newPassword;
    await employee.save();

    // Send SMS notification about password change
    try {
      const smsMessage = `Your password for ${station.name} has been changed by your supervisor. Your new password is: ${newPassword}. Please login and change it to something secure. Assignment Number: ${employee.assignmentNumber} - ChargingStation Nepal`;
      
      const smsResult = await smsService.sendSMS(employee.phoneNumber, smsMessage);
      
      if (smsResult.success) {
        console.log('Password change SMS sent successfully:', smsResult.data);
      } else {
        console.error('Password change SMS failed:', smsResult.error);
      }
    } catch (smsError) {
      console.error('Error sending password change SMS:', smsError);
    }

    res.json({
      success: true,
      message: `Password changed successfully for ${employee.employeeName}. SMS notification sent.`
    });

  } catch (error) {
    console.error('Change employee password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// @desc    Update station details (for employees with permission)
// @route   PUT /api/station-management/:stationId/update
// @access  Private (Vendor/Employee)
router.put('/:stationId/update',
  authorizeStationAccess,
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'stationMasterPhoto', maxCount: 1 }
  ]),
  parseFormDataJSON, // Parse JSON fields before validation
  param('stationId').isMongoId(),
  [...stationValidation, ...chargingPortValidation],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { stationId } = req.params;
      
      // Find the station and verify access
      let stationQuery = { _id: stationId };
      if (req.accessType === 'vendor') {
        stationQuery.vendor = req.vendor.id;
      } else if (req.accessType === 'employee') {
        // For employees, they can only update their assigned station
        stationQuery._id = req.stationId;
      }

      const station = await ChargingStation.findOne(stationQuery);

      if (!station) {
        return res.status(404).json({
          success: false,
          message: 'Station not found or access denied'
        });
      }

      // Since parseFormDataJSON middleware already parsed JSON fields, 
      // we can use the data directly
      const updateData = { ...req.body };
        
      // Convert string numbers to actual numbers
      if (updateData.totalSlots) updateData.totalSlots = parseInt(updateData.totalSlots);
      if (updateData.availableSlots) updateData.availableSlots = parseInt(updateData.availableSlots);
      if (updateData.pricePerHour) updateData.pricePerHour = parseFloat(updateData.pricePerHour);
      if (updateData.isActive) updateData.isActive = updateData.isActive === 'true';
      
      // Handle existingImages if it's still a JSON string
      if (updateData.existingImages && typeof updateData.existingImages === 'string') {
        try {
          updateData.existingImages = JSON.parse(updateData.existingImages);
        } catch (e) {
          console.log('Error parsing existingImages:', e);
          delete updateData.existingImages;
        }
      }

      // Update station data
      Object.assign(station, updateData);

      // Handle existingImages - replace station.images with the filtered list
      if (updateData.existingImages && Array.isArray(updateData.existingImages)) {
        // Filter existing images to keep only those in the existingImages array
        station.images = station.images.filter(img => 
          updateData.existingImages.includes(img.url)
        );
      }

      // Handle new image uploads with actual MinIO upload
      if (req.files && req.files.images && req.files.images.length > 0) {
        console.log('Uploading new station images to MinIO...');
        const newImages = [];
        
        for (let i = 0; i < req.files.images.length; i++) {
          const file = req.files.images[i];
          try {
            const uploadResult = await uploadFile(
              file.buffer,
              file.originalname,
              'Images', // Use Images folder from MinIO config
              file.mimetype
            );
            
            newImages.push({
              url: uploadResult.url,
              objectName: uploadResult.objectName,
              originalName: uploadResult.originalName,
              isPrimary: station.images.length === 0 && i === 0, // First image as primary if no existing images
              isThumbnail: station.images.length === 0 && i === 0, // First image as thumbnail if no existing images
              uploadedAt: new Date()
            });
            
            console.log(`✅ Uploaded station image ${i + 1}:`, uploadResult.objectName);
          } catch (uploadError) {
            console.error(`❌ Error uploading station image ${i + 1}:`, uploadError);
            // Continue with other images
          }
        }
        
        if (newImages.length > 0) {
          station.images.push(...newImages);
        }
      }

      // Handle station master photo update with actual MinIO upload
      if (req.files && req.files.stationMasterPhoto && req.files.stationMasterPhoto.length > 0) {
        console.log('Uploading station master photo to MinIO...');
        const photoFile = req.files.stationMasterPhoto[0];
        
        try {
          const uploadResult = await uploadFile(
            photoFile.buffer,
            photoFile.originalname,
            'Profiles', // Use Profiles folder for station master photos
            photoFile.mimetype
          );
          
          if (!station.stationMaster) {
            station.stationMaster = {};
          }
          station.stationMaster.photo = {
            url: uploadResult.url,
            objectName: uploadResult.objectName,
            originalName: uploadResult.originalName,
            uploadedAt: new Date()
          };
          
          console.log('✅ Uploaded station master photo:', uploadResult.objectName);
        } catch (uploadError) {
          console.error('❌ Error uploading station master photo:', uploadError);
          // Continue without photo update
        }
      }

      // Update the lastModified timestamp
      station.lastModified = new Date();
      
      await station.save();
      await station.populate('vendor', 'name businessName');

      res.json({
        success: true,
        message: 'Station updated successfully',
        data: station
      });
    } catch (error) {
      console.error('Update station error:', error);
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update station'
      });
    }
  }
);

module.exports = router;
