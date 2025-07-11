const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body } = require('express-validator');
const { 
  storeOTP, 
  getOTP, 
  deleteOTP, 
  checkOTPRateLimit 
} = require('../config/redis');
const Vendor = require('../models/Vendor');
const { 
  identifierValidation, 
  otpValidation,
  vendorRegistrationValidation,
  handleValidationErrors 
} = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const smsService = require('../services/smsService');
const { merchantEmailService } = require('../services/emailService');

const router = express.Router();

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to generate JWT
const generateToken = (id, type = 'vendor') => {
  return jwt.sign({ id, type }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Helper function to generate device ID from frontend-provided device info
const generateDeviceId = (deviceInfo) => {
  if (!deviceInfo) {
    // Fallback to simple ID if no device info provided
    return crypto.randomBytes(32).toString('hex');
  }
  
  const {
    userAgent = '',
    language = '',
    screenResolution = '',
    timezone = '',
    hardwareConcurrency = '',
    platform = '',
    colorDepth = ''
  } = deviceInfo;
  
  // Create a consistent device fingerprint - MUST match frontend logic
  const fingerprint = `${userAgent}|${language}|${screenResolution}|${timezone}|${hardwareConcurrency}|${platform}|${colorDepth}`;
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
};

// Helper function to get device name from user agent
const getDeviceName = (userAgent) => {
  if (!userAgent) return 'Unknown Device';
  
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  
  // Detect browser
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  // Detect OS
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';
  
  return `${browser} on ${os}`;
};

// @desc    Register new vendor
// @route   POST /api/vendor/auth/register
// @access  Public
const registerVendor = async (req, res) => {
  try {    const {
      name,
      email,
      phoneNumber,
      password,
      businessName,
      businessRegistrationNumber,
      gstNumber,
      address
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
      let field = 'email';
      if (existingVendor.phoneNumber === phoneNumber) field = 'phone number';
      if (existingVendor.businessRegistrationNumber === businessRegistrationNumber) {
        field = 'business registration number';
      }
      
      return res.status(400).json({
        success: false,
        message: `Vendor with this ${field} already exists`
      });
    }    // Generate device ID for initial trusted device
    const deviceId = generateDeviceId(req);
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

    // Create vendor
    const vendor = await Vendor.create({
      name,
      email,
      phoneNumber,
      password,
      businessName,
      businessRegistrationNumber,
      gstNumber,
      address,
      trustedDevices: [{
        deviceId,
        deviceName: 'Registration Device',
        userAgent,
        ipAddress,
        lastUsed: new Date(),
        isActive: true
      }],
      verificationStatus: 'pending',
      onboardingStep: 'verification'
    });

    // Generate token
    const token = generateToken(vendor._id, 'vendor');

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully. Please wait for verification.',
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          businessName: vendor.businessName,
          verificationStatus: vendor.verificationStatus,
          onboardingStep: vendor.onboardingStep
        },
        token
      }
    });

  } catch (error) {
    console.error('Vendor registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
};

// @desc    Send OTP for vendor login
// @route   POST /api/vendor/auth/send-login-otp
// @access  Public
const sendLoginOTP = async (req, res) => {
  try {
    const { identifier, deviceInfo } = req.body; // Can be email or phone

    // Check rate limiting
    const rateLimitCheck = await checkOTPRateLimit(identifier);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many OTP requests. Please try again in ${rateLimitCheck.resetInMinutes} minutes.`,
        retryAfter: rateLimitCheck.resetInMinutes
      });
    }

    // Find vendor by email or phone
    const vendor = await Vendor.findOne({
      $or: [
        { email: identifier },
        { phoneNumber: identifier }
      ],
      isActive: true
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }    // Generate device ID from device info
    const deviceId = generateDeviceId(deviceInfo);
    const isTrustedDevice = vendor.isTrustedDevice(deviceId);

    console.log('Login Debug Info:');
    console.log('Device Info:', deviceInfo);
    console.log('Generated Device ID:', deviceId);
    console.log('Is Trusted Device:', isTrustedDevice);
    console.log('Vendor has password:', !!vendor.password);
    console.log('2FA Enabled:', vendor.twoFactorEnabled);
    console.log('Trusted devices count:', vendor.trustedDevices.length);
    console.log('Trusted devices:', vendor.trustedDevices.map(d => ({ id: d.deviceId, active: d.isActive })));

    // If 2FA is enabled, always require OTP regardless of device trust
    if (vendor.twoFactorEnabled) {
      console.log('2FA is enabled, forcing OTP verification');
    } else if (isTrustedDevice && vendor.password) {
      // Only allow password login if 2FA is disabled AND device is trusted
      return res.json({
        success: true,
        requiresOTP: false,
        message: 'You can login with password on this trusted device',
        data: {
          vendorId: vendor._id,
          deviceId,
          loginMethod: 'password'
        }
      });
    }// Generate and send OTP
    const otp = generateOTP();
    await storeOTP(identifier, otp);

    // Send OTP via SMS or Email
    const isPhone = /^[0-9]{10}$/.test(identifier);
    if (isPhone) {
      await smsService.sendSMS(identifier, `Your login OTP is: ${otp}. Valid for 5 minutes.`);
    } else {
      try {
        await merchantEmailService.sendMerchantOTP(identifier, vendor.name, otp);
      } catch (emailError) {
        console.error('Merchant email service failed, but continuing with OTP storage:', emailError);
        // Continue execution even if email fails - OTP is still stored
      }
    }

    res.json({
      success: true,
      requiresOTP: true,
      message: `OTP sent to your ${isPhone ? 'phone' : 'email'}`,
      data: {
        vendorId: vendor._id,
        deviceId,
        loginMethod: 'otp'
      }
    });

  } catch (error) {
    console.error('Send login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

// @desc    Verify OTP and login vendor
// @route   POST /api/vendor/auth/verify-login-otp
// @access  Public
const verifyLoginOTP = async (req, res) => {
  try {
    const { 
      identifier, 
      otp, 
      deviceId, 
      deviceName, 
      deviceInfo, 
      fcmToken 
    } = req.body;

    const vendor = await Vendor.findOne({
      $or: [
        { email: identifier },
        { phoneNumber: identifier }
      ],
      isActive: true
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    // Verify OTP
    const storedOTP = await getOTP(identifier);
    if (!storedOTP || storedOTP !== otp) {
      await vendor.incLoginAttempts();
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Delete OTP
    await deleteOTP(identifier);

    // Reset login attempts
    await vendor.resetLoginAttempts();

    // Generate consistent device ID and add as trusted
    const finalDeviceId = deviceId || generateDeviceId(deviceInfo);
    await vendor.addTrustedDevice({
      deviceId: finalDeviceId,
      deviceName: deviceName || 'Unknown Device',
      userAgent: deviceInfo?.userAgent || req.get('User-Agent'),
      ipAddress: req.ip
    });

    // Handle FCM token if provided
    if (fcmToken) {
      try {
        await vendor.addFCMToken({
          token: fcmToken,
          platform: deviceInfo?.platform || 'web',
          deviceId: finalDeviceId,
          deviceName: deviceName || 'Unknown Device',
          appVersion: deviceInfo?.appVersion,
          osVersion: deviceInfo?.osVersion
        });
        console.log('FCM token added successfully for vendor:', vendor._id);
      } catch (fcmError) {
        console.error('Error adding FCM token:', fcmError);
        // Don't fail login if FCM token addition fails
      }
    }

    // Handle device session
    try {
      await vendor.addDeviceSession({
        deviceId: finalDeviceId,
        platform: deviceInfo?.platform || 'web',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        location: deviceInfo?.location
      });
      console.log('Device session added successfully for vendor:', vendor._id);
    } catch (sessionError) {
      console.error('Error adding device session:', sessionError);
      // Don't fail login if session addition fails
    }

    // Update last login
    vendor.lastLogin = Date.now();
    await vendor.save();

    // Generate token
    const token = generateToken(vendor._id, 'vendor');

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          businessName: vendor.businessName,
          verificationStatus: vendor.verificationStatus,
          onboardingStep: vendor.onboardingStep,
          appPreferences: vendor.appPreferences
        },
        token,
        needsPasswordSetup: !vendor.password
      }
    });

  } catch (error) {
    console.error('Verify login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// @desc    Login with password (trusted device)
// @route   POST /api/vendor/auth/password-login
// @access  Public
const passwordLogin = async (req, res) => {
  try {
    const { 
      identifier, 
      password, 
      deviceId, 
      deviceInfo, 
      fcmToken 
    } = req.body;

    const vendor = await Vendor.findOne({
      $or: [
        { email: identifier },
        { phoneNumber: identifier }
      ],
      isActive: true
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (vendor.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    // Generate consistent device ID if not provided
    const finalDeviceId = deviceId || generateDeviceId(deviceInfo);

    // If 2FA is enabled, reject password login and require OTP
    if (vendor.twoFactorEnabled) {
      return res.status(401).json({
        success: false,
        message: 'Two-factor authentication is enabled. Please use OTP login.',
        requiresOTP: true
      });
    }

    // Check if device is trusted
    if (!vendor.isTrustedDevice(finalDeviceId)) {
      return res.status(401).json({
        success: false,
        message: 'Device not trusted. Please use OTP login.'
      });
    }

    // Check if vendor has a password set
    if (!vendor.password) {
      return res.status(400).json({
        success: false,
        message: 'Password not set. Please use OTP login to set your password.'
      });
    }

    // Check password
    const isPasswordValid = await vendor.comparePassword(password);
    if (!isPasswordValid) {
      await vendor.incLoginAttempts();
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts
    await vendor.resetLoginAttempts();

    // Update trusted device info
    const userAgent = deviceInfo?.userAgent || req.get('User-Agent') || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    
    await vendor.addTrustedDevice({
      deviceId: finalDeviceId,
      deviceName: getDeviceName(userAgent),
      userAgent,
      ipAddress
    });

    // Handle FCM token if provided
    if (fcmToken) {
      try {
        await vendor.addFCMToken({
          token: fcmToken,
          platform: deviceInfo?.platform || 'web',
          deviceId: finalDeviceId,
          deviceName: getDeviceName(userAgent),
          appVersion: deviceInfo?.appVersion,
          osVersion: deviceInfo?.osVersion
        });
        console.log('FCM token added successfully for vendor:', vendor._id);
      } catch (fcmError) {
        console.error('Error adding FCM token:', fcmError);
        // Don't fail login if FCM token addition fails
      }
    }

    // Handle device session
    try {
      await vendor.addDeviceSession({
        deviceId: finalDeviceId,
        platform: deviceInfo?.platform || 'web',
        ipAddress: ipAddress,
        userAgent: userAgent,
        location: deviceInfo?.location
      });
      console.log('Device session added successfully for vendor:', vendor._id);
    } catch (sessionError) {
      console.error('Error adding device session:', sessionError);
      // Don't fail login if session addition fails
    }

    // Update last login
    vendor.lastLogin = Date.now();
    await vendor.save();

    // Generate token
    const token = generateToken(vendor._id, 'vendor');

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          businessName: vendor.businessName,
          verificationStatus: vendor.verificationStatus,
          onboardingStep: vendor.onboardingStep,
          appPreferences: vendor.appPreferences
        },
        token
      }
    });

  } catch (error) {
    console.error('Password login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// @desc    Set password for vendor
// @route   POST /api/vendor/auth/set-password
// @access  Private (Vendor)
const setPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    vendor.password = password;
    await vendor.save();

    res.json({
      success: true,
      message: 'Password set successfully'
    });

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set password'
    });
  }
};

// @desc    Get current vendor
// @route   GET /api/vendor/auth/me
// @access  Private (Vendor)
const getMe = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id)
      .populate('stationsCount')
      .select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    res.json({
      success: true,
      data: { vendor }
    });

  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vendor data'
    });
  }
};

// @desc    Logout vendor
// @route   POST /api/vendor/auth/logout
// @access  Private (Vendor)
const logout = async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// @desc    Send OTP for password reset
// @route   POST /api/vendor/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or phone

    // Check rate limiting
    const rateLimitCheck = await checkOTPRateLimit(`forgot_${identifier}`);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many password reset requests. Please try again in ${rateLimitCheck.resetInMinutes} minutes.`,
        retryAfter: rateLimitCheck.resetInMinutes
      });
    }

    // Find vendor by email or phone
    const vendor = await Vendor.findOne({
      $or: [
        { email: identifier },
        { phoneNumber: identifier }
      ],
      isActive: true
    });

    if (!vendor) {
      // Don't reveal if vendor exists or not for security
      return res.json({
        success: true,
        message: 'If this account exists, you will receive a password reset code.'
      });
    }

    // Generate and send OTP
    const otp = generateOTP();
    await storeOTP(`forgot_${identifier}`, otp);

    // Send OTP via SMS or Email
    const isPhone = /^[0-9]{10}$/.test(identifier);
    if (isPhone) {
      await smsService.sendSMS(identifier, `Your password reset OTP is: ${otp}. Valid for 5 minutes.`);
    } else {
      try {
        await merchantEmailService.sendMerchantPasswordResetOTP(identifier, vendor.name, otp);
      } catch (emailError) {
        console.error('Password reset email failed, but continuing with OTP storage:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Password reset code sent successfully'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset code'
    });
  }
};

// @desc    Reset password with OTP
// @route   POST /api/vendor/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    // Verify OTP
    const storedOTP = await getOTP(`forgot_${identifier}`);
    if (!storedOTP || storedOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Find vendor
    const vendor = await Vendor.findOne({
      $or: [
        { email: identifier },
        { phoneNumber: identifier }
      ],
      isActive: true
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update password
    vendor.password = newPassword;
    vendor.loginAttempts = 0;
    vendor.lockUntil = undefined;
    await vendor.save();

    // Delete used OTP
    await deleteOTP(`forgot_${identifier}`);

    // Generate device ID and add as trusted device
    const deviceId = generateDeviceId(req);
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

    // Add current device as trusted
    vendor.trustedDevices.push({
      deviceId,
      deviceName: 'Password Reset Device',
      userAgent,
      ipAddress,
      lastUsed: new Date(),
      isActive: true
    });
    await vendor.save();

    // Generate token
    const token = generateToken(vendor._id, 'vendor');

    res.json({
      success: true,
      message: 'Password reset successful',
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phoneNumber: vendor.phoneNumber,
          verificationStatus: vendor.verificationStatus
        },
        token
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
};

// @desc    Get trusted devices
// @route   GET /api/vendor/auth/trusted-devices
// @access  Private (Vendor)
const getTrustedDevices = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const trustedDevices = vendor.getTrustedDevices();
    
    res.json({
      success: true,
      data: {
        devices: trustedDevices,
        total: trustedDevices.length
      }
    });

  } catch (error) {
    console.error('Get trusted devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trusted devices'
    });
  }
};

// @desc    Remove trusted device
// @route   DELETE /api/vendor/auth/trusted-devices/:deviceId
// @access  Private (Vendor)
const removeTrustedDeviceRoute = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    await vendor.removeTrustedDevice(deviceId);
    
    res.json({
      success: true,
      message: 'Device removed successfully'
    });

  } catch (error) {
    console.error('Remove trusted device error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove device'
    });
  }
};

// @desc    Cleanup old devices
// @route   POST /api/vendor/auth/cleanup-devices
// @access  Private (Vendor)
const cleanupDevices = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    await vendor.cleanupOldDevices();
    
    res.json({
      success: true,
      message: 'Old devices cleaned up successfully'
    });

  } catch (error) {
    console.error('Cleanup devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup devices'
    });
  }
};

// @desc    Change password for vendor
// @route   POST /api/vendor/auth/change-password
// @access  Private (Vendor)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check if vendor has a current password
    if (!vendor.password) {
      return res.status(400).json({
        success: false,
        message: 'No current password set. Please use set password instead.'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await vendor.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Set new password
    vendor.password = newPassword;
    await vendor.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// Routes
router.post('/register', vendorRegistrationValidation(), handleValidationErrors, registerVendor);
router.post('/send-login-otp', identifierValidation(), handleValidationErrors, sendLoginOTP);
router.post('/verify-login-otp', 
  [...identifierValidation(), ...otpValidation()], 
  handleValidationErrors, 
  verifyLoginOTP
);
router.post('/password-login', passwordLogin);
router.post('/forgot-password', identifierValidation(), handleValidationErrors, forgotPassword);
router.post('/reset-password', [
  ...identifierValidation(),
  ...otpValidation(),
  body('newPassword')
    .isLength({ min: 6, max: 50 })
    .withMessage('Password must be between 6 and 50 characters')
], handleValidationErrors, resetPassword);
router.post('/set-password', protect, setPassword);
router.post('/change-password', protect, changePassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/forgot-password', identifierValidation(), handleValidationErrors, forgotPassword);
router.post('/reset-password', 
  [...identifierValidation(), ...otpValidation()], 
  handleValidationErrors, 
  resetPassword
);
router.get('/trusted-devices', protect, getTrustedDevices);
router.delete('/trusted-devices/:deviceId', protect, removeTrustedDeviceRoute);
router.post('/cleanup-devices', protect, cleanupDevices);
router.post('/change-password', protect, changePassword);

// @desc    Update two-factor authentication setting
// @route   PUT /api/vendor/auth/two-factor
// @access  Private
const updateTwoFactorAuth = async (req, res) => {
  try {
    const { twoFactorEnabled } = req.body;
    
    if (typeof twoFactorEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'twoFactorEnabled must be a boolean value'
      });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.vendor.id,
      { twoFactorEnabled },
      { new: true, runValidators: true }
    ).select('-password');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `Two-factor authentication ${twoFactorEnabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        vendor
      }
    });
  } catch (error) {
    console.error('Update 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during 2FA update'
    });
  }
};

// @desc    Update FCM token for vendor
// @route   POST /api/vendor/auth/fcm-token
// @access  Private
const updateVendorFCMToken = async (req, res) => {
  try {
    const { fcmToken, deviceInfo } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const vendor = await Vendor.findById(req.user.id);
    
    await vendor.addFCMToken({
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
    console.error('Update vendor FCM token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FCM token'
    });
  }
};

// @desc    Remove FCM token for vendor
// @route   DELETE /api/vendor/auth/fcm-token
// @access  Private
const removeVendorFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const vendor = await Vendor.findById(req.user.id);
    await vendor.removeFCMToken(fcmToken);

    res.status(200).json({
      success: true,
      message: 'FCM token removed successfully'
    });
  } catch (error) {
    console.error('Remove vendor FCM token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove FCM token'
    });
  }
};

// @desc    Update vendor app preferences
// @route   PUT /api/vendor/auth/app-preferences
// @access  Private
const updateVendorAppPreferences = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    await vendor.updateAppPreferences(req.body);

    res.status(200).json({
      success: true,
      message: 'App preferences updated successfully',
      appPreferences: vendor.appPreferences
    });
  } catch (error) {
    console.error('Update vendor app preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update app preferences'
    });
  }
};

// @desc    Get vendor device sessions
// @route   GET /api/vendor/auth/sessions
// @access  Private
const getVendorDeviceSessions = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id);
    const sessions = vendor.getActiveSessions();

    res.status(200).json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Get vendor device sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get device sessions'
    });
  }
};

// @desc    End vendor device session
// @route   DELETE /api/vendor/auth/sessions/:deviceId
// @access  Private
const endVendorDeviceSession = async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const vendor = await Vendor.findById(req.user.id);
    await vendor.endDeviceSession(deviceId);

    res.status(200).json({
      success: true,
      message: 'Device session ended successfully'
    });
  } catch (error) {
    console.error('End vendor device session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end device session'
    });
  }
};

// @desc    Vendor logout (remove FCM token and end session)
// @route   POST /api/vendor/auth/logout-app
// @access  Private
const vendorLogoutApp = async (req, res) => {
  try {
    const { fcmToken, deviceId } = req.body;
    
    const vendor = await Vendor.findById(req.user.id);
    
    // Remove FCM token if provided
    if (fcmToken) {
      try {
        await vendor.removeFCMToken(fcmToken);
      } catch (fcmError) {
        console.error('Error removing FCM token during vendor logout:', fcmError);
      }
    }
    
    // End device session if provided
    if (deviceId) {
      try {
        await vendor.endDeviceSession(deviceId);
      } catch (sessionError) {
        console.error('Error ending session during vendor logout:', sessionError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Vendor logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

router.put('/two-factor', protect, updateTwoFactorAuth);

// FCM and App Routes for Vendors
router.post('/fcm-token', protect, updateVendorFCMToken);
router.delete('/fcm-token', protect, removeVendorFCMToken);
router.put('/app-preferences', protect, updateVendorAppPreferences);
router.get('/sessions', protect, getVendorDeviceSessions);
router.delete('/sessions/:deviceId', protect, endVendorDeviceSession);
router.post('/logout-app', protect, vendorLogoutApp);

module.exports = router;
