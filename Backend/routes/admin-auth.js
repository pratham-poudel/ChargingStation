const express = require('express');
const jwt = require('jsonwebtoken');
const { 
  storeOTP, 
  getOTP, 
  deleteOTP, 
  checkOTPRateLimit 
} = require('../config/redis');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const { 
  phoneValidation, 
  emailValidation,
  otpValidation, 
  handleValidationErrors 
} = require('../middleware/validation');
const { protectAdmin } = require('../middleware/auth');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to generate JWT
const generateToken = (id, type = 'admin') => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '8h' // Shorter for admin sessions
  });
};

// Generate device ID from device info
const generateDeviceId = (deviceInfo) => {
  if (!deviceInfo) return 'web_' + Date.now();
  
  const { platform, deviceName, userAgent } = deviceInfo;
  const identifier = `${platform || 'web'}_${deviceName || 'unknown'}_${userAgent?.slice(0, 20) || 'browser'}`;
  return identifier.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 50);
};

/**
 * @desc    Send OTP for admin login (email then phone)
 * @route   POST /api/admin/auth/send-login-otp
 * @access  Public
 */
const sendAdminLoginOTP = async (req, res) => {
  try {
    const { 
      identifier, // email or phone
      deviceId, 
      deviceInfo 
    } = req.body;

    // Check rate limiting
    const rateLimitKey = `admin_otp_${identifier}`;
    const canSendOTP = await checkOTPRateLimit(rateLimitKey);
    
    if (!canSendOTP) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please wait 5 minutes before trying again.'
      });
    }

    // Find admin by email or phone
    const admin = await Admin.findByIdentifier(identifier);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Check if account is locked
    if (admin.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed attempts'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated'
      });
    }

    // Generate separate OTPs for email and SMS
    const emailOTP = generateOTP();
    const phoneOTP = generateOTP();
    const finalDeviceId = deviceId || generateDeviceId(deviceInfo);

    // Store both OTPs in Redis (5 minutes expiry)
    const emailOtpKey = `admin_email_otp_${identifier}`;
    const phoneOtpKey = `admin_phone_otp_${identifier}`;
    
    console.log('🔍 Storing OTPs:', {
      emailOtpKey,
      phoneOtpKey,
      emailOTP,
      phoneOTP
    });
    
    await storeOTP(emailOtpKey, emailOTP, 300); // 5 minutes
    await storeOTP(phoneOtpKey, phoneOTP, 300); // 5 minutes

    // Verify storage worked
    const storedEmailCheck = await getOTP(emailOtpKey);
    const storedPhoneCheck = await getOTP(phoneOtpKey);
    
    console.log('✅ OTP Storage verification:', {
      storedEmailOTP: storedEmailCheck,
      storedPhoneOTP: storedPhoneCheck,
      emailMatch: storedEmailCheck === emailOTP,
      phoneMatch: storedPhoneCheck === phoneOTP
    });

    // Store device info temporarily
    const deviceKey = `admin_device_${identifier}`;
    await storeOTP(deviceKey, JSON.stringify({
      deviceId: finalDeviceId,
      deviceInfo
    }), 300);

    // Send separate OTPs via email and SMS
    const emailPromise = emailService.sendAdminLoginOTP(admin.email, admin.fullName, emailOTP);
    const smsPromise = smsService.sendAdminLoginOTP(admin.phoneNumber, admin.fullName, phoneOTP);

    // Wait for both to complete
    await Promise.allSettled([emailPromise, smsPromise]);

    res.json({
      success: true,
      message: 'Separate login OTPs sent to email and phone',
      email: admin.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      phone: admin.phoneNumber.replace(/(\d{3})(\d{4})(\d{3})/, '$1***$3'),
      deviceId: finalDeviceId,
      expiresIn: 300
    });

  } catch (error) {
    console.error('Send admin login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send login OTP'
    });
  }
};

/**
 * @desc    Verify OTP and login admin
 * @route   POST /api/admin/auth/verify-login-otp
 * @access  Public
 */
const verifyAdminLoginOTP = async (req, res) => {
  try {
    const { 
      identifier, 
      emailOTP,
      phoneOTP,
      deviceId, 
      deviceName, 
      deviceInfo 
    } = req.body;

    // Validate required fields
    if (!identifier || !emailOTP || !phoneOTP) {
      return res.status(400).json({
        success: false,
        message: 'Email OTP and Phone OTP are required'
      });
    }

    // Get stored OTPs
    const emailOtpKey = `admin_email_otp_${identifier}`;
    const phoneOtpKey = `admin_phone_otp_${identifier}`;
    const storedEmailOTP = await getOTP(emailOtpKey);
    const storedPhoneOTP = await getOTP(phoneOtpKey);

    console.log('🔍 OTP Verification Debug:', {
      identifier,
      emailOtpKey,
      phoneOtpKey,
      receivedEmailOTP: emailOTP,
      receivedPhoneOTP: phoneOTP,
      storedEmailOTP,
      storedPhoneOTP,
      emailMatch: storedEmailOTP === emailOTP,
      phoneMatch: storedPhoneOTP === phoneOTP
    });

    if (!storedEmailOTP || !storedPhoneOTP) {
      console.log('❌ OTP not found in Redis:', {
        hasStoredEmail: !!storedEmailOTP,
        hasStoredPhone: !!storedPhoneOTP
      });
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new OTP.'
      });
    }

    // Verify both OTPs match their respective stored values
    if (storedEmailOTP !== emailOTP || storedPhoneOTP !== phoneOTP) {
      console.log('❌ OTP mismatch:', {
        emailOTPMatch: storedEmailOTP === emailOTP,
        phoneOTPMatch: storedPhoneOTP === phoneOTP
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check both email and phone OTPs.'
      });
    }

    // Find admin
    const admin = await Admin.findByIdentifier(identifier);
    if (!admin || !admin.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found or deactivated'
      });
    }

    // Check if account is locked
    if (admin.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    // Delete both OTPs from Redis
    await Promise.all([
      deleteOTP(emailOtpKey),
      deleteOTP(phoneOtpKey)
    ]);

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Get stored device info
    const deviceKey = `admin_device_${identifier}`;
    const storedDeviceInfo = await getOTP(deviceKey);
    let finalDeviceId = deviceId;
    
    if (storedDeviceInfo) {
      const parsedDeviceInfo = JSON.parse(storedDeviceInfo);
      finalDeviceId = parsedDeviceInfo.deviceId;
      await deleteOTP(deviceKey);
    }

    // Handle device session
    if (finalDeviceId) {
      try {
        await admin.addDeviceSession({
          deviceId: finalDeviceId,
          platform: deviceInfo?.platform || 'web',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          location: deviceInfo?.location
        });
      } catch (sessionError) {
        console.error('Error adding admin device session:', sessionError);
        // Don't fail login if session addition fails
      }
    }

    // Update last login and verification status
    admin.lastLogin = Date.now();
    admin.emailVerified = true;
    admin.phoneVerified = true;
    await admin.save();

    // Generate token
    const token = generateToken(admin._id, 'admin');

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: {
          id: admin._id,
          adminId: admin.adminId,
          fullName: admin.fullName,
          email: admin.email,
          phoneNumber: admin.phoneNumber,
          role: admin.role,
          permissions: admin.permissions,
          profilePicture: admin.profilePicture,
          appPreferences: admin.appPreferences,
          isFullyVerified: admin.isFullyVerified
        },
        token
      }
    });

  } catch (error) {
    console.error('Verify admin login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Login verification failed'
    });
  }
};

/**
 * @desc    Get current admin profile
 * @route   GET /api/admin/auth/me
 * @access  Private (Admin)
 */
const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id)
      .populate('createdBy', 'fullName adminId role')
      .select('-deviceSessions');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: { admin }
    });

  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin profile'
    });
  }
};

/**
 * @desc    Update admin profile
 * @route   PUT /api/admin/auth/profile
 * @access  Private (Admin)
 */
const updateAdminProfile = async (req, res) => {
  try {
    const { fullName, appPreferences, notes } = req.body;
    
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Update allowed fields
    if (fullName) admin.fullName = fullName;
    if (notes) admin.notes = notes;
    
    // Update app preferences
    if (appPreferences) {
      await admin.updateAppPreferences(appPreferences);
    }

    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { admin }
    });

  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

/**
 * @desc    Get admin device sessions
 * @route   GET /api/admin/auth/sessions
 * @access  Private (Admin)
 */
const getAdminSessions = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    const sessions = admin.getActiveSessions();

    res.json({
      success: true,
      data: { sessions }
    });
  } catch (error) {
    console.error('Get admin sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sessions'
    });
  }
};

/**
 * @desc    End admin device session
 * @route   DELETE /api/admin/auth/sessions/:deviceId
 * @access  Private (Admin)
 */
const endAdminSession = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const admin = await Admin.findById(req.user.id);
    await admin.endDeviceSession(deviceId);

    res.json({
      success: true,
      message: 'Device session ended successfully'
    });
  } catch (error) {
    console.error('End admin session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end session'
    });
  }
};

/**
 * @desc    Admin logout
 * @route   POST /api/admin/auth/logout
 * @access  Private (Admin)
 */
const adminLogout = async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (deviceId) {
      const admin = await Admin.findById(req.user.id);
      await admin.endDeviceSession(deviceId);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * @desc    Get admin profile statistics
 * @route   GET /api/admin/auth/profile/stats
 * @access  Private (Admin)
 */
const getAdminProfileStats = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Get active sessions count
    const activeSessions = admin.getActiveSessions();
    
    // Calculate login stats
    const totalLogins = admin.deviceSessions?.length || 0;
    const lastLogin = admin.lastLogin;
    const accountCreated = admin.createdAt;

    res.json({
      success: true,
      data: {
        lastLogin,
        totalLogins,
        sessionsActive: activeSessions.length,
        accountCreated,
        emailVerified: admin.emailVerified,
        phoneVerified: admin.phoneVerified,
        isFullyVerified: admin.isFullyVerified,
        role: admin.role,
        adminId: admin.adminId
      }
    });

  } catch (error) {
    console.error('Get admin profile stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile statistics'
    });
  }
};

// Validation middleware
const adminLoginValidation = () => [
  body('identifier')
    .notEmpty()
    .withMessage('Email or phone number is required')
    .custom((value) => {
      const isEmail = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value);
      const isPhone = /^[0-9]{10}$/.test(value);
      if (!isEmail && !isPhone) {
        throw new Error('Please provide a valid email or 10-digit phone number');
      }
      return true;
    })
];

const adminOTPValidation = () => [
  ...adminLoginValidation(),
  body('emailOTP')
    .matches(/^[0-9]{6}$/)
    .withMessage('Email OTP must be 6 digits'),
  body('phoneOTP')
    .matches(/^[0-9]{6}$/)
    .withMessage('Phone OTP must be 6 digits')
];

// Routes
router.post('/send-login-otp', adminLoginValidation(), handleValidationErrors, sendAdminLoginOTP);
router.post('/verify-login-otp', adminOTPValidation(), handleValidationErrors, verifyAdminLoginOTP);
router.get('/me', protectAdmin, getAdminProfile);
router.get('/profile/stats', protectAdmin, getAdminProfileStats);
router.put('/profile', protectAdmin, updateAdminProfile);
router.get('/sessions', protectAdmin, getAdminSessions);
router.delete('/sessions/:deviceId', protectAdmin, endAdminSession);
router.post('/logout', protectAdmin, adminLogout);
router.get('/profile/stats', protectAdmin, getAdminProfileStats);

module.exports = router;
