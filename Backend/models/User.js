const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  vehicles: [{
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    vehicleType: {
      type: String,
      enum: ['car', 'bike', 'truck', 'bus'],
      default: 'car'
    },
    batteryCapacity: {
      type: Number, // in kWh
      min: 1
    },
    isDefault: {
      type: Boolean,
      default: false
    }  }],
  preferences: {
    preferredChargingType: {
      type: String,
      enum: ['slow', 'fast', 'rapid'],
      default: 'fast'
    },
    maxDistance: {
      type: Number,
      default: 10 // in kilometers
    },
    notifications: {
      sms: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  },
  // FCM and App-related fields
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
    locationPermission: { type: Boolean, default: false },
    notificationCategories: {
      booking: { type: Boolean, default: true },
      payment: { type: Boolean, default: true },
      promotional: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
      nearby: { type: Boolean, default: false }
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
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ phoneNumber: 1 }, { unique: true });
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });

// Virtual for user's booking count
userSchema.virtual('bookingCount', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'user',
  count: true
});

// Virtual for default vehicle
userSchema.virtual('defaultVehicle').get(function() {
  if (!this.vehicles || !Array.isArray(this.vehicles) || this.vehicles.length === 0) {
    return null;
  }
  return this.vehicles.find(vehicle => vehicle.isDefault) || this.vehicles[0] || null;
});

// Instance method to add vehicle
userSchema.methods.addVehicle = function(vehicleData) {
  // Initialize vehicles array if it doesn't exist
  if (!this.vehicles || !Array.isArray(this.vehicles)) {
    this.vehicles = [];
  }
  
  // If this is the first vehicle or explicitly set as default, make it default
  if (this.vehicles.length === 0 || vehicleData.isDefault) {
    this.vehicles.forEach(vehicle => vehicle.isDefault = false);
    vehicleData.isDefault = true;
  }
  
  this.vehicles.push(vehicleData);
  return this.save();
};

// Instance method to get default vehicle
userSchema.methods.getDefaultVehicle = function() {
  if (!this.vehicles || !Array.isArray(this.vehicles) || this.vehicles.length === 0) {
    return null;
  }
  return this.vehicles.find(vehicle => vehicle.isDefault) || this.vehicles[0];
};

// FCM Token Management Methods
userSchema.methods.addFCMToken = function(tokenData) {
  // Validate and normalize platform value for device info
  const validPlatforms = ['ios', 'android', 'web'];
  let platform = 'web'; // default
  
  if (tokenData.deviceInfo?.platform && validPlatforms.includes(tokenData.deviceInfo.platform.toLowerCase())) {
    platform = tokenData.deviceInfo.platform.toLowerCase();
  } else if (tokenData.platform && validPlatforms.includes(tokenData.platform.toLowerCase())) {
    platform = tokenData.platform.toLowerCase();
  } else if (tokenData.deviceInfo?.platform || tokenData.platform) {
    // Log invalid platform for debugging, but continue with default
    console.warn(`Invalid platform value received in FCM token: ${tokenData.deviceInfo?.platform || tokenData.platform}, using 'web' as default`);
  }

  // Remove existing token if it exists
  this.fcmTokens = this.fcmTokens.filter(t => t.token !== tokenData.token);
  
  // Add new token
  this.fcmTokens.push({
    token: tokenData.token,
    deviceInfo: {
      platform: platform,
      deviceId: tokenData.deviceInfo?.deviceId || tokenData.deviceId,
      deviceName: tokenData.deviceInfo?.deviceName || tokenData.deviceName,
      appVersion: tokenData.deviceInfo?.appVersion || tokenData.appVersion,
      osVersion: tokenData.deviceInfo?.osVersion || tokenData.osVersion
    },
    isActive: true,
    lastUsed: new Date(),
    createdAt: new Date()
  });
  
  // Keep only last 5 tokens per user
  if (this.fcmTokens.length > 5) {
    this.fcmTokens = this.fcmTokens
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 5);
  }
  
  return this.save();
};

userSchema.methods.removeFCMToken = function(token) {
  this.fcmTokens = this.fcmTokens.filter(t => t.token !== token);
  return this.save();
};

userSchema.methods.getActiveFCMTokens = function() {
  return this.fcmTokens
    .filter(t => t.isActive)
    .map(t => t.token);
};

userSchema.methods.updateFCMTokenActivity = function(token) {
  const tokenObj = this.fcmTokens.find(t => t.token === token);
  if (tokenObj) {
    tokenObj.lastUsed = new Date();
    tokenObj.isActive = true;
    return this.save();
  }
  return Promise.resolve(this);
};

// Device Session Management
userSchema.methods.addDeviceSession = function(sessionData) {
  // Validate and normalize platform value
  const validPlatforms = ['ios', 'android', 'web'];
  let platform = 'web'; // default
  
  if (sessionData.platform && validPlatforms.includes(sessionData.platform.toLowerCase())) {
    platform = sessionData.platform.toLowerCase();
  } else if (sessionData.platform) {
    // Log invalid platform for debugging, but continue with default
    console.warn(`Invalid platform value received: ${sessionData.platform}, using 'web' as default`);
  }

  // Remove existing session for same device
  this.deviceSessions = this.deviceSessions.filter(
    s => s.deviceId !== sessionData.deviceId
  );
  
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
  
  // Keep only last 10 sessions
  if (this.deviceSessions.length > 10) {
    this.deviceSessions = this.deviceSessions
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, 10);
  }
  
  return this.save();
};

userSchema.methods.updateDeviceActivity = function(deviceId) {
  const session = this.deviceSessions.find(s => s.deviceId === deviceId);
  if (session) {
    session.lastActivity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to find by phone number
userSchema.statics.findByPhoneNumber = function(phoneNumber) {
  return this.findOne({ phoneNumber, isActive: true });
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Ensure only one default vehicle
  if (this.vehicles && Array.isArray(this.vehicles) && this.vehicles.length > 0) {
    const defaultVehicles = this.vehicles.filter(vehicle => vehicle.isDefault);
    if (defaultVehicles.length > 1) {
      this.vehicles.forEach((vehicle, index) => {
        vehicle.isDefault = index === 0;
      });
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
