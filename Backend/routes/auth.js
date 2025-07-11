const express = require('express');
const jwt = require('jsonwebtoken');
const { 
  storeOTP, 
  getOTP, 
  deleteOTP, 
  checkOTPRateLimit 
} = require('../config/redis');
const User = require('../models/User');
const { 
  phoneValidation, 
  otpValidation, 
  userRegistrationValidation,
  handleValidationErrors 
} = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');

const router = express.Router();

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to generate JWT
const generateToken = (id, type = 'user') => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Send OTP to phone number
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    // Check rate limiting
    const rateLimitCheck = await checkOTPRateLimit(phoneNumber);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many OTP requests. Please try again in ${rateLimitCheck.resetInMinutes} minutes.`,
        retryAfter: rateLimitCheck.resetInMinutes
      });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP in Redis
    await storeOTP(phoneNumber, otp, parseInt(process.env.OTP_EXPIRE_MINUTES) || 10);
      // Send SMS
    const smsResult = await smsService.sendOTP(phoneNumber, otp);
    
    if (!smsResult.success) {
      console.error('Failed to send SMS:', smsResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      attemptsLeft: rateLimitCheck.attemptsLeft
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    next(error);
  }
};

// @desc    Check if user exists by phone number
// @route   POST /api/auth/check-user
// @access  Public
const checkUserExists = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Check if user exists
    const user = await User.findByPhoneNumber(phoneNumber);
    
    res.status(200).json({
      success: true,
      userExists: !!user,
      message: user ? 'User exists' : 'New user'
    });
  } catch (error) {
    console.error('Check user exists error:', error);
    next(error);
  }
};

// @desc    Verify OTP and register/login user
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { 
      phoneNumber, 
      otp, 
      name, 
      vehicleNumber, 
      fcmToken, 
      deviceInfo 
    } = req.body;
    
    console.log('Verify OTP Request:', {
      phoneNumber,
      otp,
      name,
      vehicleNumber,
      hasDeviceInfo: !!deviceInfo,
      hasFCMToken: !!fcmToken
    });

    // Get stored OTP
    const storedOTP = await getOTP(phoneNumber);
    
    console.log('Stored OTP:', storedOTP, 'Provided OTP:', otp);
    
    // Development bypass for testing (remove in production)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTestOTP = otp === '123456'; // Test OTP for development
    
    if (!storedOTP && !isTestOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new OTP.'
      });
    }

    if (storedOTP !== otp && !isTestOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Delete OTP from Redis
    await deleteOTP(phoneNumber);

    // Check if user exists
    let user = await User.findByPhoneNumber(phoneNumber);
    
    if (!user) {
      // Register new user
      if (!name || !vehicleNumber) {
        return res.status(400).json({
          success: false,
          message: 'Name and vehicle number are required for new users'
        });
      }

      user = new User({
        phoneNumber,
        name,
        isPhoneVerified: true,
        vehicles: [{
          vehicleNumber: vehicleNumber.toUpperCase(),
          isDefault: true
        }]
      });
    } else {
      // Update existing user
      user.isPhoneVerified = true;
      user.lastLogin = new Date();
      
      // Add vehicle if provided and not already exists
      if (vehicleNumber) {
        const existingVehicle = user.vehicles.find(
          v => v.vehicleNumber === vehicleNumber.toUpperCase()
        );
        
        if (!existingVehicle) {
          user.vehicles.push({
            vehicleNumber: vehicleNumber.toUpperCase(),
            isDefault: user.vehicles.length === 0
          });
        }
      }
    }

    // Handle FCM token if provided
    if (fcmToken) {
      try {
        await user.addFCMToken({
          token: fcmToken,
          platform: deviceInfo?.platform || 'web',
          deviceId: deviceInfo?.deviceId,
          deviceName: deviceInfo?.deviceName || 'Unknown Device',
          appVersion: deviceInfo?.appVersion,
          osVersion: deviceInfo?.osVersion
        });
        console.log('FCM token added successfully for user:', user._id);
      } catch (fcmError) {
        console.error('Error adding FCM token:', fcmError);
        // Don't fail login if FCM token addition fails
      }
    }

    // Handle device session if device info provided
    if (deviceInfo?.deviceId) {
      try {
        await user.addDeviceSession({
          deviceId: deviceInfo.deviceId,
          platform: deviceInfo.platform || 'web',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          location: deviceInfo.location
        });
        console.log('Device session added successfully for user:', user._id);
      } catch (sessionError) {
        console.error('Error adding device session:', sessionError);
        // Don't fail login if session addition fails
      }
    }

    await user.save();

    // Send welcome email for new users
    const isNewUser = !user.lastLogin || user.isNew;
    if (isNewUser && user.email) {
      try {
        await emailService.sendWelcomeEmail(user.email, user.name);
        console.log(`Welcome email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the registration if email fails
      }
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: user.isNew ? 'User registered successfully' : 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        vehicles: user.vehicles,
        preferences: user.preferences,
        appPreferences: user.appPreferences,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    next(error);
  }
};

// @desc    Verify token and get user
// @route   GET /api/auth/verify-token
// @access  Private
const verifyToken = async (req, res, next) => {
  try {
    console.log('Verify token request - User ID:', req.user?.id);
    
    const user = await User.findById(req.user.id).select('-__v');
    
    if (!user) {
      console.log('User not found for ID:', req.user.id);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      console.log('User account deactivated:', user._id);
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    console.log('Token verification successful for user:', user._id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        vehicles: user.vehicles,
        preferences: user.preferences,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('bookingCount');
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        vehicles: user.vehicles,
        preferences: user.preferences,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified,
        bookingCount: user.bookingCount,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, email, preferences } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        vehicles: user.vehicles,
        preferences: user.preferences,
        isPhoneVerified: user.isPhoneVerified,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    next(error);
  }
};

// @desc    Add vehicle to user profile
// @route   POST /api/auth/vehicles
// @access  Private
const addVehicle = async (req, res, next) => {
  try {
    const { vehicleNumber, vehicleType, batteryCapacity, isDefault } = req.body;
    
    const user = await User.findById(req.user.id);
    
    // Check if vehicle already exists
    const existingVehicle = user.vehicles.find(
      v => v.vehicleNumber === vehicleNumber.toUpperCase()
    );
    
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle already exists in your profile'
      });
    }

    await user.addVehicle({
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleType,
      batteryCapacity,
      isDefault
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      vehicles: user.vehicles
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    next(error);
  }
};

// @desc    Remove vehicle from user profile
// @route   DELETE /api/auth/vehicles/:vehicleId
// @access  Private
const removeVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    
    const user = await User.findById(req.user.id);
    
    if (user.vehicles.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the last vehicle. At least one vehicle is required.'
      });
    }

    const vehicleIndex = user.vehicles.findIndex(
      v => v._id.toString() === vehicleId
    );
    
    if (vehicleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const removedVehicle = user.vehicles[vehicleIndex];
    user.vehicles.splice(vehicleIndex, 1);

    // If removed vehicle was default, make first vehicle default
    if (removedVehicle.isDefault && user.vehicles.length > 0) {
      user.vehicles[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle removed successfully',
      vehicles: user.vehicles
    });
  } catch (error) {
    console.error('Remove vehicle error:', error);
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = async (req, res, next) => {
  try {
    const newToken = generateToken(req.user.id);
    
    res.status(200).json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    next(error);
  }
};

// @desc    Update FCM token
// @route   POST /api/auth/fcm-token
// @access  Private
const updateFCMToken = async (req, res, next) => {
  try {
    const { fcmToken, deviceInfo } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const user = await User.findById(req.user.id);
    
    await user.addFCMToken({
      token: fcmToken,
      platform: deviceInfo?.platform || 'web',
      deviceId: deviceInfo?.deviceId,
      deviceName: deviceInfo?.deviceName || 'Unknown Device',
      appVersion: deviceInfo?.appVersion,
      osVersion: deviceInfo?.osVersion
    });

    res.status(200).json({
      success: true,
      message: 'FCM token updated successfully'
    });
  } catch (error) {
    console.error('Update FCM token error:', error);
    next(error);
  }
};

// @desc    Remove FCM token
// @route   DELETE /api/auth/fcm-token
// @access  Private
const removeFCMToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const user = await User.findById(req.user.id);
    await user.removeFCMToken(fcmToken);

    res.status(200).json({
      success: true,
      message: 'FCM token removed successfully'
    });
  } catch (error) {
    console.error('Remove FCM token error:', error);
    next(error);
  }
};

// @desc    Update app preferences
// @route   PUT /api/auth/app-preferences
// @access  Private
const updateAppPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    await user.updateAppPreferences(req.body);

    res.status(200).json({
      success: true,
      message: 'App preferences updated successfully',
      appPreferences: user.appPreferences
    });
  } catch (error) {
    console.error('Update app preferences error:', error);
    next(error);
  }
};

// @desc    Get device sessions
// @route   GET /api/auth/sessions
// @access  Private
const getDeviceSessions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const sessions = user.getActiveSessions();

    res.status(200).json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Get device sessions error:', error);
    next(error);
  }
};

// @desc    End device session
// @route   DELETE /api/auth/sessions/:deviceId
// @access  Private
const endDeviceSession = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    
    const user = await User.findById(req.user.id);
    await user.endDeviceSession(deviceId);

    res.status(200).json({
      success: true,
      message: 'Device session ended successfully'
    });
  } catch (error) {
    console.error('End device session error:', error);
    next(error);
  }
};

// @desc    Logout (remove FCM token and end session)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const { fcmToken, deviceId } = req.body;
    
    const user = await User.findById(req.user.id);
    
    // Remove FCM token if provided
    if (fcmToken) {
      try {
        await user.removeFCMToken(fcmToken);
      } catch (fcmError) {
        console.error('Error removing FCM token during logout:', fcmError);
      }
    }
    
    // End device session if provided
    if (deviceId) {
      try {
        await user.endDeviceSession(deviceId);
      } catch (sessionError) {
        console.error('Error ending session during logout:', sessionError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    next(error);
  }
};

// Routes
router.post('/send-otp', phoneValidation(), handleValidationErrors, sendOTP);
router.post('/check-user', phoneValidation(), handleValidationErrors, checkUserExists);
router.post('/verify-otp', 
  [...phoneValidation(), ...otpValidation()], 
  handleValidationErrors, 
  verifyOTP
);
router.get('/verify-token', protect, verifyToken);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/vehicles', protect, addVehicle);
router.delete('/vehicles/:vehicleId', protect, removeVehicle);
router.post('/refresh', protect, refreshToken);

// FCM and App Routes
router.post('/fcm-token', protect, updateFCMToken);
router.delete('/fcm-token', protect, removeFCMToken);
router.put('/app-preferences', protect, updateAppPreferences);
router.get('/sessions', protect, getDeviceSessions);
router.delete('/sessions/:deviceId', protect, endDeviceSession);
router.post('/logout', protect, logout);

module.exports = router;
