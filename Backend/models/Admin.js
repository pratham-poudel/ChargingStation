const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  adminId: {
    type: String,
    unique: true,
    index: true,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  dateOfBirth: {
    type: Date,
    required: true,
    validate: {
      validator: function(dob) {
        const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return age >= 18 && age <= 100;
      },
      message: 'Admin must be between 18 and 100 years old'
    }
  },
  profilePicture: {
    url: String,
    objectName: String,
    originalName: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  },
  documents: [{
    type: {
      type: String,
      enum: ['citizenship', 'passport', 'national_id', 'driving_license'],
      required: true
    },
    url: String,
    objectName: String,
    originalName: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }],
  role: {
    type: String,
    enum: ['superadmin', 'admin'],
    required: true,
    default: 'admin'
  },
  permissions: {
    // Dashboard & Analytics
    canViewDashboard: { type: Boolean, default: true },
    canViewAnalytics: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: true },
    canExportData: { type: Boolean, default: false },
    
    // User Management
    canViewUsers: { type: Boolean, default: true },
    canEditUsers: { type: Boolean, default: false },
    canDeleteUsers: { type: Boolean, default: false },
    canBanUsers: { type: Boolean, default: false },
    
    // Vendor Management
    canViewVendors: { type: Boolean, default: true },
    canEditVendors: { type: Boolean, default: false },
    canApproveVendors: { type: Boolean, default: false },
    canRejectVendors: { type: Boolean, default: false },
    canBanVendors: { type: Boolean, default: false },
    
    // Station Management
    canViewStations: { type: Boolean, default: true },
    canEditStations: { type: Boolean, default: false },
    canApproveStations: { type: Boolean, default: false },
    canRejectStations: { type: Boolean, default: false },
    canDeactivateStations: { type: Boolean, default: false },
    
    // Booking Management
    canViewBookings: { type: Boolean, default: true },
    canEditBookings: { type: Boolean, default: false },
    canCancelBookings: { type: Boolean, default: false },
    canRefundBookings: { type: Boolean, default: false },
    
    // Payment Management
    canViewPayments: { type: Boolean, default: true },
    canProcessRefunds: { type: Boolean, default: false },
    canViewSettlements: { type: Boolean, default: true },
    canProcessSettlements: { type: Boolean, default: false },
    
    // Admin Management (SuperAdmin only)
    canCreateAdmins: { type: Boolean, default: false },
    canEditAdmins: { type: Boolean, default: false },
    canDeleteAdmins: { type: Boolean, default: false },
    canCreateEmployees: { type: Boolean, default: false },
    canEditEmployees: { type: Boolean, default: false },
    canDeleteEmployees: { type: Boolean, default: false },
    
    // System Management
    canManageSettings: { type: Boolean, default: false },
    canViewLogs: { type: Boolean, default: false },
    canManageNotifications: { type: Boolean, default: false },
    canManageContent: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: true // Always enabled for admins by default
  },
  loginAttempts: {
    type: Number,
    default: 0,
    max: 5
  },
  lockUntil: Date,
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: function() {
      return this.role !== 'superadmin';
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
  appPreferences: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
    language: { type: String, default: 'en' },
    dashboardLayout: { type: String, enum: ['grid', 'list'], default: 'grid' },
    enableEmailNotifications: { type: Boolean, default: true },
    enableSMSNotifications: { type: Boolean, default: true },
    notificationCategories: {
      system: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
      users: { type: Boolean, default: true },
      vendors: { type: Boolean, default: true },
      bookings: { type: Boolean, default: false },
      payments: { type: Boolean, default: true }
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
adminSchema.index({ email: 1 }, { unique: true });
adminSchema.index({ phoneNumber: 1 }, { unique: true });
adminSchema.index({ adminId: 1 }, { unique: true });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ emailVerified: 1 });
adminSchema.index({ phoneVerified: 1 });

// Virtual for admin's full verification status
adminSchema.virtual('isFullyVerified').get(function() {
  return this.emailVerified && this.phoneVerified && this.documents.some(doc => doc.verified);
});

// Pre-save middleware to generate adminId
adminSchema.pre('save', async function(next) {
  if (!this.adminId) {
    const prefix = this.role === 'superadmin' ? 'SA' : 'AD';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    this.adminId = `${prefix}${timestamp}${random}`;
  }
  next();
});

// Pre-save middleware to set superadmin permissions
adminSchema.pre('save', function(next) {
  if (this.role === 'superadmin') {
    // SuperAdmin gets all permissions
    Object.keys(this.permissions.toObject()).forEach(permission => {
      this.permissions[permission] = true;
    });
  }
  next();
});

// Method to check if account is locked
adminSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 minutes
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Device Session Management
adminSchema.methods.addDeviceSession = function(sessionData) {
  // Remove existing session for same device
  this.deviceSessions = this.deviceSessions.filter(
    s => s.deviceId !== sessionData.deviceId
  );
  
  // Add new session
  this.deviceSessions.push({
    deviceId: sessionData.deviceId,
    platform: sessionData.platform || 'web',
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

adminSchema.methods.endDeviceSession = function(deviceId) {
  const session = this.deviceSessions.find(s => s.deviceId === deviceId);
  if (session) {
    session.isActive = false;
    return this.save();
  }
  return Promise.resolve(this);
};

adminSchema.methods.getActiveSessions = function() {
  return this.deviceSessions
    .filter(s => s.isActive)
    .sort((a, b) => b.lastActivity - a.lastActivity);
};

// Update app preferences
adminSchema.methods.updateAppPreferences = function(preferences) {
  if (preferences.theme && ['light', 'dark', 'auto'].includes(preferences.theme)) {
    this.appPreferences.theme = preferences.theme;
  }
  
  if (preferences.language) {
    this.appPreferences.language = preferences.language;
  }
  
  if (preferences.dashboardLayout && ['grid', 'list'].includes(preferences.dashboardLayout)) {
    this.appPreferences.dashboardLayout = preferences.dashboardLayout;
  }
  
  if (typeof preferences.enableEmailNotifications === 'boolean') {
    this.appPreferences.enableEmailNotifications = preferences.enableEmailNotifications;
  }
  
  if (typeof preferences.enableSMSNotifications === 'boolean') {
    this.appPreferences.enableSMSNotifications = preferences.enableSMSNotifications;
  }
  
  if (preferences.notificationCategories) {
    Object.keys(preferences.notificationCategories).forEach(category => {
      if (this.appPreferences.notificationCategories.hasOwnProperty(category)) {
        this.appPreferences.notificationCategories[category] = 
          preferences.notificationCategories[category];
      }
    });
  }
  
  return this.save();
};

// Static method to find by email or phone
adminSchema.statics.findByIdentifier = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier },
      { phoneNumber: identifier }
    ],
    isActive: true
  });
};

// Static method to count by role
adminSchema.statics.countByRole = function(role) {
  return this.countDocuments({ role, isActive: true });
};

module.exports = mongoose.model('Admin', adminSchema);
