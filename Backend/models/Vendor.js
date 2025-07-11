const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Vendor name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: function() {
      return this.verificationStatus === 'verified';
    },
    minlength: [6, 'Password must be at least 6 characters']
  },  trustedDevices: [{
    deviceId: { 
      type: String, 
      required: true,
      index: true 
    },
    deviceName: { 
      type: String, 
      required: true,
      maxlength: [100, 'Device name cannot exceed 100 characters']
    },
    lastUsed: { 
      type: Date, 
      default: Date.now,
      index: true 
    },
    isActive: { 
      type: Boolean, 
      default: true,
      index: true 
    },
    userAgent: {
      type: String,
      maxlength: [500, 'User agent cannot exceed 500 characters']
    },
    ipAddress: {
      type: String,
      maxlength: [45, 'IP address cannot exceed 45 characters'] // IPv6 max length
    },
    fingerprint: {
      type: String,
      maxlength: [1000, 'Device fingerprint cannot exceed 1000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [150, 'Business name cannot exceed 150 characters']
  },
  businessRegistrationNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  address: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },    pincode: { 
      type: String, 
      required: true, 
      match: [/^[0-9]{5}$/, 'Please enter a valid 5-digit pincode']
    },
    country: { type: String, default: 'Nepal', trim: true }
  },  bankDetails: {
    accountNumber: { type: String },
    accountHolderName: { type: String },
    bankName: { type: String }
  },documents: {
    businessRegistrationCertificate: {
      url: { type: String },
      objectName: { type: String },
      originalName: { type: String },
      uploadedAt: { type: Date },
      status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
      },
      rejectionReason: { type: String }
    },
    ownerCitizenshipCertificate: {
      url: { type: String },
      objectName: { type: String },
      originalName: { type: String },
      uploadedAt: { type: Date },
      status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
      },
      rejectionReason: { type: String }
    },
    additionalDocuments: [{
      url: { type: String },
      objectName: { type: String },
      originalName: { type: String },
      documentType: { type: String },
      uploadedAt: { type: Date },
      status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
      },
      rejectionReason: { type: String }    }]
  },
  profilePicture: {
    filename: { type: String },
    fileUrl: { type: String },
    objectName: { type: String },    mimeType: { type: String },
    uploadedAt: { type: Date },
    size: { type: Number }
  },
  // FCM and App-related fields for Vendors
  fcmTokens: [{
    token: {
      type: String,
      required: true,
      index: true
    },
    deviceInfo: {
      platform: { type: String, enum: ['ios', 'android', 'web'], default: 'web' },
      deviceId: String,
      deviceName: String,
      appVersion: String,
      osVersion: String
    },
    isActive: { type: Boolean, default: true },
    lastUsed: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
  }],
  appPreferences: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'NPR' },
    enableBiometric: { type: Boolean, default: false },
    autoLogin: { type: Boolean, default: false },
    dashboardLayout: { type: String, enum: ['grid', 'list'], default: 'grid' },
    notificationCategories: {
      bookings: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      maintenance: { type: Boolean, default: true },
      analytics: { type: Boolean, default: false },
      system: { type: Boolean, default: true },
      promotional: { type: Boolean, default: false }
    }
  },
  deviceSessions: [{
    deviceId: { type: String, required: true, index: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], default: 'web' },
    loginAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    isActive: { type: Boolean, default: true }
  }],
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationNotes: {
    type: String,
    trim: true
  },
  commissionRate: {
    type: Number,
    default: 10, // Percentage
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginAttempts: {
    type: Number,
    default: 0,
    max: 5
  },
  lockUntil: Date,  onboardingStep: {
    type: String,
    enum: ['registration', 'verification', 'documents', 'bank_details', 'under_review', 'completed'],
    default: 'registration'
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  // Licensing and Subscription fields
  subscription: {
    type: {
      type: String,
      enum: ['trial', 'yearly'],
      default: 'trial'
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: function() {
        // Default to 30 days trial
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    },
    lastPaymentDate: {
      type: Date
    },
    nextPaymentDate: {
      type: Date
    },
    autoRenew: {
      type: Boolean,
      default: false
    },
    paymentHistory: [{
      transactionId: { type: String },
      amount: { type: Number },
      currency: { type: String, default: 'NPR' },
      paymentDate: { type: Date, default: Date.now },
      paymentMethod: { type: String },
      status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
      type: { type: String, enum: ['subscription', 'renewal'], default: 'subscription' }
    }]
  },
  licenseInfo: {
    isActive: { type: Boolean, default: true },
    maxStations: { type: Number, default: 5 }, // Trial limit
    featuresEnabled: {
      basicDashboard: { type: Boolean, default: true },
      advancedAnalytics: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
vendorSchema.index({ email: 1 }, { unique: true });
vendorSchema.index({ phoneNumber: 1 }, { unique: true });
vendorSchema.index({ businessRegistrationNumber: 1 }, { unique: true });
vendorSchema.index({ verificationStatus: 1 });
vendorSchema.index({ isActive: 1 });
vendorSchema.index({ onboardingStep: 1 });

// Pre-save middleware to hash password
vendorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
vendorSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
vendorSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
vendorSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 }; // 15 minutes
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
vendorSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to check if device is trusted
vendorSchema.methods.isTrustedDevice = function(deviceId) {
  if (!deviceId) return false;
  
  const device = this.trustedDevices.find(
    device => device.deviceId === deviceId && device.isActive
  );
  
  // Check if device exists and hasn't expired (optional: add expiry logic)
  if (!device) return false;
  
  // Optional: Check if device was used recently (e.g., within last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  if (device.lastUsed < ninetyDaysAgo) {
    // Mark device as inactive if not used for 90 days
    device.isActive = false;
    return false;
  }
  
  return true;
};

// Method to add or update trusted device
vendorSchema.methods.addTrustedDevice = async function(deviceData) {
  try {
    const { deviceId, deviceName, userAgent, ipAddress, fingerprint } = deviceData;
    
    if (!deviceId) {
      throw new Error('Device ID is required');
    }
    
    // Check if device already exists
    const existingDeviceIndex = this.trustedDevices.findIndex(
      device => device.deviceId === deviceId
    );
    
    if (existingDeviceIndex !== -1) {
      // Update existing device
      this.trustedDevices[existingDeviceIndex] = {
        ...this.trustedDevices[existingDeviceIndex].toObject(),
        lastUsed: new Date(),
        isActive: true,
        userAgent: userAgent || this.trustedDevices[existingDeviceIndex].userAgent,
        ipAddress: ipAddress || this.trustedDevices[existingDeviceIndex].ipAddress,
        fingerprint: fingerprint || this.trustedDevices[existingDeviceIndex].fingerprint,
        deviceName: deviceName || this.trustedDevices[existingDeviceIndex].deviceName
      };
    } else {
      // Add new device
      this.trustedDevices.push({
        deviceId,
        deviceName: deviceName || 'Unknown Device',
        userAgent: userAgent || 'Unknown',
        ipAddress: ipAddress || 'Unknown',
        fingerprint: fingerprint || '',
        lastUsed: new Date(),
        isActive: true,
        createdAt: new Date()
      });
      
      // Keep only last 10 devices to prevent unlimited growth
      if (this.trustedDevices.length > 10) {
        // Sort by lastUsed and remove oldest inactive devices first
        this.trustedDevices.sort((a, b) => {
          // Prioritize keeping active devices
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          // Then sort by lastUsed date
          return b.lastUsed - a.lastUsed;
        });
        this.trustedDevices = this.trustedDevices.slice(0, 10);
      }
    }
    
    await this.save();
    return this;
  } catch (error) {
    console.error('Error adding trusted device:', error);
    throw error;
  }
};

// Method to remove trusted device
vendorSchema.methods.removeTrustedDevice = async function(deviceId) {
  try {
    if (!deviceId) {
      throw new Error('Device ID is required');
    }
    
    const initialLength = this.trustedDevices.length;
    this.trustedDevices = this.trustedDevices.filter(
      device => device.deviceId !== deviceId
    );
    
    // Check if any device was actually removed
    if (this.trustedDevices.length === initialLength) {
      throw new Error('Device not found');
    }
    
    await this.save();
    return this;
  } catch (error) {
    console.error('Error removing trusted device:', error);
    throw error;
  }
};

// Method to get trusted devices list
vendorSchema.methods.getTrustedDevices = function() {
  return this.trustedDevices
    .filter(device => device.isActive)
    .map(device => ({
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      lastUsed: device.lastUsed,
      createdAt: device.createdAt,
      userAgent: device.userAgent
    }))
    .sort((a, b) => b.lastUsed - a.lastUsed);
};

// Method to cleanup old devices
vendorSchema.methods.cleanupOldDevices = async function() {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    let hasChanges = false;
    
    this.trustedDevices.forEach(device => {
      if (device.lastUsed < ninetyDaysAgo && device.isActive) {
        device.isActive = false;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      await this.save();
    }
    
    return this;
  } catch (error) {
    console.error('Error cleaning up old devices:', error);
    throw error;
  }
};

// Virtual for vendor's stations count
vendorSchema.virtual('stationsCount', {
  ref: 'ChargingStation',
  localField: '_id',
  foreignField: 'vendor',
  count: true
});

// Virtual for vendor's total revenue (you'll need to implement this based on your payment model)
vendorSchema.virtual('totalRevenue', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'vendor',
  match: { status: 'completed' },
  // This would need aggregation to sum amounts
});

// Instance method to update rating
vendorSchema.methods.updateRating = function(newRating) {
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

// Static method to find verified vendors
vendorSchema.statics.findVerified = function() {
  return this.find({ 
    verificationStatus: 'verified', 
    isActive: true 
  });
};

// FCM Token Management Methods
vendorSchema.methods.addFCMToken = async function(tokenData) {
  try {
    if (!tokenData || !tokenData.token) {
      throw new Error('FCM token is required');
    }

    // Validate and normalize platform value
    const validPlatforms = ['ios', 'android', 'web'];
    let platform = 'web'; // default
    
    if (tokenData.platform && validPlatforms.includes(tokenData.platform.toLowerCase())) {
      platform = tokenData.platform.toLowerCase();
    } else if (tokenData.platform) {
      // Log invalid platform for debugging, but continue with default
      console.warn(`Invalid platform value received in FCM token: ${tokenData.platform}, using 'web' as default`);
    }

    // Remove any existing token with the same value
    this.fcmTokens = this.fcmTokens.filter(t => t.token !== tokenData.token);

    // Add the new token
    this.fcmTokens.push({
      token: tokenData.token,
      deviceInfo: {
        platform: platform,
        deviceId: tokenData.deviceId,
        deviceName: tokenData.deviceName,
        appVersion: tokenData.appVersion,
        osVersion: tokenData.osVersion
      },
      isActive: true,
      lastUsed: new Date(),
      createdAt: new Date()
    });

    // Keep only the last 10 tokens
    if (this.fcmTokens.length > 10) {
      this.fcmTokens.sort((a, b) => b.lastUsed - a.lastUsed);
      this.fcmTokens = this.fcmTokens.slice(0, 10);
    }

    await this.save();
    return this;
  } catch (error) {
    console.error('Error adding FCM token:', error);
    throw error;
  }
};

vendorSchema.methods.removeFCMToken = async function(token) {
  try {
    if (!token) {
      throw new Error('FCM token is required');
    }

    const initialLength = this.fcmTokens.length;
    this.fcmTokens = this.fcmTokens.filter(t => t.token !== token);

    if (this.fcmTokens.length === initialLength) {
      throw new Error('FCM token not found');
    }

    await this.save();
    return this;
  } catch (error) {
    console.error('Error removing FCM token:', error);
    throw error;
  }
};

vendorSchema.methods.updateFCMTokenActivity = async function(token) {
  try {
    const fcmToken = this.fcmTokens.find(t => t.token === token);
    if (fcmToken) {
      fcmToken.lastUsed = new Date();
      fcmToken.isActive = true;
      await this.save();
    }
    return this;
  } catch (error) {
    console.error('Error updating FCM token activity:', error);
    throw error;
  }
};

vendorSchema.methods.getActiveFCMTokens = function() {
  return this.fcmTokens
    .filter(token => token.isActive)
    .map(token => token.token);
};

vendorSchema.methods.deactivateFCMToken = async function(token) {
  try {
    const fcmToken = this.fcmTokens.find(t => t.token === token);
    if (fcmToken) {
      fcmToken.isActive = false;
      await this.save();
    }
    return this;
  } catch (error) {
    console.error('Error deactivating FCM token:', error);
    throw error;
  }
};

vendorSchema.methods.cleanupExpiredFCMTokens = async function() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let hasChanges = false;

    this.fcmTokens.forEach(token => {
      if (token.lastUsed < thirtyDaysAgo && token.isActive) {
        token.isActive = false;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      await this.save();
    }

    return this;
  } catch (error) {
    console.error('Error cleaning up expired FCM tokens:', error);
    throw error;
  }
};

// Device Session Management Methods
vendorSchema.methods.addDeviceSession = async function(sessionData) {
  try {
    if (!sessionData || !sessionData.deviceId) {
      throw new Error('Device ID is required');
    }

    // Validate and normalize platform value
    const validPlatforms = ['ios', 'android', 'web'];
    let platform = 'web'; // default
    
    if (sessionData.platform && validPlatforms.includes(sessionData.platform.toLowerCase())) {
      platform = sessionData.platform.toLowerCase();
    } else if (sessionData.platform) {
      // Log invalid platform for debugging, but continue with default
      console.warn(`Invalid platform value received: ${sessionData.platform}, using 'web' as default`);
    }

    // Deactivate any existing session for this device
    this.deviceSessions.forEach(session => {
      if (session.deviceId === sessionData.deviceId && session.isActive) {
        session.isActive = false;
      }
    });

    // Add new session
    this.deviceSessions.push({
      deviceId: sessionData.deviceId,
      platform: platform,
      loginAt: new Date(),
      lastActivity: new Date(),
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
      location: sessionData.location,
      isActive: true
    });

    // Keep only the last 20 sessions
    if (this.deviceSessions.length > 20) {
      this.deviceSessions.sort((a, b) => b.loginAt - a.loginAt);
      this.deviceSessions = this.deviceSessions.slice(0, 20);
    }

    await this.save();
    return this;
  } catch (error) {
    console.error('Error adding device session:', error);
    throw error;
  }
};

vendorSchema.methods.updateSessionActivity = async function(deviceId) {
  try {
    const session = this.deviceSessions.find(s => 
      s.deviceId === deviceId && s.isActive
    );
    
    if (session) {
      session.lastActivity = new Date();
      await this.save();
    }
    
    return this;
  } catch (error) {
    console.error('Error updating session activity:', error);
    throw error;
  }
};

vendorSchema.methods.endDeviceSession = async function(deviceId) {
  try {
    const session = this.deviceSessions.find(s => 
      s.deviceId === deviceId && s.isActive
    );
    
    if (session) {
      session.isActive = false;
      await this.save();
    }
    
    return this;
  } catch (error) {
    console.error('Error ending device session:', error);
    throw error;
  }
};

vendorSchema.methods.getActiveSessions = function() {
  return this.deviceSessions
    .filter(session => session.isActive)
    .map(session => ({
      deviceId: session.deviceId,
      platform: session.platform,
      loginAt: session.loginAt,
      lastActivity: session.lastActivity,
      location: session.location
    }))
    .sort((a, b) => b.lastActivity - a.lastActivity);
};

// App Preferences Management
vendorSchema.methods.updateAppPreferences = async function(preferences) {
  try {
    if (preferences.theme && ['light', 'dark', 'auto'].includes(preferences.theme)) {
      this.appPreferences.theme = preferences.theme;
    }
    
    if (preferences.language) {
      this.appPreferences.language = preferences.language;
    }
    
    if (preferences.currency) {
      this.appPreferences.currency = preferences.currency;
    }
    
    if (typeof preferences.enableBiometric === 'boolean') {
      this.appPreferences.enableBiometric = preferences.enableBiometric;
    }
    
    if (typeof preferences.autoLogin === 'boolean') {
      this.appPreferences.autoLogin = preferences.autoLogin;
    }
    
    if (preferences.dashboardLayout && ['grid', 'list'].includes(preferences.dashboardLayout)) {
      this.appPreferences.dashboardLayout = preferences.dashboardLayout;
    }
    
    if (preferences.notificationCategories) {
      Object.keys(preferences.notificationCategories).forEach(category => {
        if (this.appPreferences.notificationCategories.hasOwnProperty(category)) {
          this.appPreferences.notificationCategories[category] = 
            preferences.notificationCategories[category];
        }
      });
    }
    
    await this.save();
    return this;
  } catch (error) {
    console.error('Error updating app preferences:', error);
    throw error;
  }
};

// Static method to find by business registration number
vendorSchema.statics.findByRegistrationNumber = function(regNumber) {
  return this.findOne({ 
    businessRegistrationNumber: regNumber, 
    isActive: true 
  });
};

// Instance method to check if subscription is active
vendorSchema.methods.isSubscriptionActive = function() {
  try {
    // Check if subscription object exists
    if (!this.subscription) {
      console.warn(`Vendor ${this._id} has no subscription object`);
      return false;
    }

    // Check if license info exists
    if (!this.licenseInfo) {
      console.warn(`Vendor ${this._id} has no licenseInfo object`);
      return false;
    }

    const now = new Date();
    const endDate = new Date(this.subscription.endDate);
    
    // Validate end date
    if (isNaN(endDate.getTime())) {
      console.warn(`Vendor ${this._id} has invalid endDate: ${this.subscription.endDate}`);
      return false;
    }

    return this.subscription.status === 'active' && 
           endDate > now &&
           this.licenseInfo.isActive;
  } catch (error) {
    console.error(`Error checking subscription active for vendor ${this._id}:`, error);
    return false;
  }
};

// Instance method to check if subscription is expired
vendorSchema.methods.isSubscriptionExpired = function() {
  try {
    // If no subscription, consider it expired
    if (!this.subscription) {
      return true;
    }

    const now = new Date();
    const endDate = new Date(this.subscription.endDate);
    
    // If invalid date, consider expired
    if (isNaN(endDate.getTime())) {
      return true;
    }

    return this.subscription.status === 'expired' || endDate <= now;
  } catch (error) {
    console.error(`Error checking subscription expired for vendor ${this._id}:`, error);
    return true; // Default to expired on error
  }
};

// Instance method to get days until expiration
vendorSchema.methods.getDaysUntilExpiration = function() {
  try {
    if (!this.subscription || !this.subscription.endDate) {
      return 0;
    }

    const now = new Date();
    const endDate = new Date(this.subscription.endDate);
    
    // If invalid date or already expired
    if (isNaN(endDate.getTime()) || endDate <= now) {
      return 0;
    }

    const timeDiff = endDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  } catch (error) {
    console.error(`Error calculating days until expiration for vendor ${this._id}:`, error);
    return 0;
  }
};

// Instance method to get time until expiration (for countdown)
vendorSchema.methods.getTimeUntilExpiration = function() {
  try {
    if (!this.subscription || !this.subscription.endDate) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const now = new Date();
    const endDate = new Date(this.subscription.endDate);
    
    // If invalid date or already expired
    if (isNaN(endDate.getTime()) || endDate <= now) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    
    const timeDiff = endDate.getTime() - now.getTime();
    const days = Math.floor(timeDiff / (1000 * 3600 * 24));
    const hours = Math.floor((timeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
    const minutes = Math.floor((timeDiff % (1000 * 3600)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
  } catch (error) {
    console.error(`Error calculating time until expiration for vendor ${this._id}:`, error);
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
};

// Instance method to upgrade subscription to yearly
vendorSchema.methods.upgradeToYearly = async function(transactionId = null) {
  try {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    this.subscription.type = 'yearly';
    this.subscription.status = 'active';
    this.subscription.endDate = oneYearFromNow;
    this.subscription.lastPaymentDate = new Date();
    this.subscription.nextPaymentDate = oneYearFromNow;
    this.licenseInfo.maxStations = 50; // Increased limit for yearly
    this.licenseInfo.featuresEnabled = {
      basicDashboard: true,
      advancedAnalytics: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true
    };
    
    // Add payment history record
    this.subscription.paymentHistory.push({
      transactionId: transactionId || `txn_${Date.now()}`,
      amount: 12000,
      currency: 'NPR',
      paymentDate: new Date(),
      paymentMethod: 'dummy',
      status: 'completed',
      type: 'subscription'
    });

    // Reactivate all vendor stations that were deactivated due to subscription expiry
    try {
      const ChargingStation = require('./ChargingStation');
      await ChargingStation.updateMany(
        { 
          vendor: this._id, 
          isActive: false,
          deactivationReason: { 
            $in: ['Vendor subscription expired', 'Vendor subscription expired/suspended'] 
          }
        },
        { 
          isActive: true,
          $unset: { deactivationReason: 1, deactivatedAt: 1 }
        }
      );
      console.log(`Reactivated stations for renewed vendor: ${this._id}`);
    } catch (stationError) {
      console.error('Error reactivating vendor stations:', stationError);
    }
    
    await this.save();
    return this;
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    throw error;
  }
};

// Instance method to reactivate stations when subscription is renewed
vendorSchema.methods.reactivateStations = async function() {
  try {
    const ChargingStation = require('./ChargingStation');
    
    const result = await ChargingStation.updateMany(
      { 
        vendor: this._id, 
        isActive: false,
        deactivationReason: { 
          $in: ['Vendor subscription expired', 'Vendor subscription expired/suspended'] 
        }
      },
      { 
        isActive: true,
        $unset: { deactivationReason: 1, deactivatedAt: 1 }
      }
    );
    console.log(`Reactivated ${result.modifiedCount} stations for vendor: ${this._id}`);
    return result;
  } catch (error) {
    console.error('Error reactivating vendor stations:', error);
    throw error;
  }
};

module.exports = mongoose.model('Vendor', vendorSchema);
