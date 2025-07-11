const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  employeeId: {
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
        return age >= 18 && age <= 70;
      },
      message: 'Employee must be between 18 and 70 years old'
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
  department: {
    type: String,
    enum: ['customer_support', 'technical_support', 'content_management', 'marketing', 'finance', 'operations'],
    required: true
  },
  position: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  permissions: {
    // Customer Support
    canViewUserProfiles: { type: Boolean, default: false },
    canAssistUsers: { type: Boolean, default: false },
    canViewBookings: { type: Boolean, default: false },
    canAssistWithBookings: { type: Boolean, default: false },
    
    // Technical Support
    canViewTechnicalReports: { type: Boolean, default: false },
    canUpdateStationStatus: { type: Boolean, default: false },
    canViewSystemLogs: { type: Boolean, default: false },
    
    // Content Management
    canManageContent: { type: Boolean, default: false },
    canManageNotifications: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: false },
    
    // General
    canViewDashboard: { type: Boolean, default: true },
    canGenerateReports: { type: Boolean, default: false }
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
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters']
  },
  loginAttempts: {
    type: Number,
    default: 0,
    max: 3
  },
  lockUntil: Date,
  lastLogin: {
    type: Date
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  workSchedule: {
    type: {
      type: String,
      enum: ['full_time', 'part_time', 'contract'],
      default: 'full_time'
    },
    hoursPerWeek: {
      type: Number,
      default: 40,
      min: 10,
      max: 60
    },
    workDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  contactPreferences: {
    preferredMethod: {
      type: String,
      enum: ['email', 'phone', 'both'],
      default: 'email'
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phoneNumber: String
    }
  },
  deviceSessions: [{
    deviceId: { type: String, required: true, index: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], default: 'web' },
    loginAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    ipAddress: String,
    userAgent: String,
    isActive: { type: Boolean, default: true }
  }],
  appPreferences: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
    language: { type: String, default: 'en' },
    notificationsEnabled: { type: Boolean, default: true }
  },
  performanceMetrics: {
    ticketsResolved: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }, // in minutes
    customerSatisfactionRating: { type: Number, default: 0, min: 0, max: 5 },
    tasksCompleted: { type: Number, default: 0 }
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
employeeSchema.index({ email: 1 }, { unique: true });
employeeSchema.index({ phoneNumber: 1 }, { unique: true });
employeeSchema.index({ employeeId: 1 }, { unique: true });
employeeSchema.index({ department: 1 });
employeeSchema.index({ isActive: 1 });
employeeSchema.index({ supervisor: 1 });

// Virtual for employee's verification status
employeeSchema.virtual('isVerified').get(function() {
  return this.emailVerified && this.phoneVerified && this.documents.some(doc => doc.verified);
});

// Pre-save middleware to generate employeeId
employeeSchema.pre('save', async function(next) {
  if (!this.employeeId) {
    const departmentCode = {
      'customer_support': 'CS',
      'technical_support': 'TS',
      'content_management': 'CM',
      'marketing': 'MK',
      'finance': 'FN',
      'operations': 'OP'
    };
    
    const prefix = 'EMP';
    const dept = departmentCode[this.department] || 'GN';
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substr(2, 2).toUpperCase();
    this.employeeId = `${prefix}${dept}${timestamp}${random}`;
  }
  next();
});

// Pre-save middleware to hash password
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
employeeSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
employeeSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 3 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 }; // 15 minutes
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
employeeSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Device Session Management
employeeSchema.methods.addDeviceSession = function(sessionData) {
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
    isActive: true
  });
  
  // Keep only last 5 sessions
  if (this.deviceSessions.length > 5) {
    this.deviceSessions = this.deviceSessions
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, 5);
  }
  
  return this.save();
};

employeeSchema.methods.endDeviceSession = function(deviceId) {
  const session = this.deviceSessions.find(s => s.deviceId === deviceId);
  if (session) {
    session.isActive = false;
    return this.save();
  }
  return Promise.resolve(this);
};

employeeSchema.methods.getActiveSessions = function() {
  return this.deviceSessions
    .filter(s => s.isActive)
    .sort((a, b) => b.lastActivity - a.lastActivity);
};

// Update performance metrics
employeeSchema.methods.updatePerformanceMetrics = function(metrics) {
  if (typeof metrics.ticketsResolved === 'number') {
    this.performanceMetrics.ticketsResolved = metrics.ticketsResolved;
  }
  
  if (typeof metrics.averageResponseTime === 'number') {
    this.performanceMetrics.averageResponseTime = metrics.averageResponseTime;
  }
  
  if (typeof metrics.customerSatisfactionRating === 'number') {
    this.performanceMetrics.customerSatisfactionRating = metrics.customerSatisfactionRating;
  }
  
  if (typeof metrics.tasksCompleted === 'number') {
    this.performanceMetrics.tasksCompleted = metrics.tasksCompleted;
  }
  
  return this.save();
};

// Static method to find by department
employeeSchema.statics.findByDepartment = function(department) {
  return this.find({ department, isActive: true });
};

// Static method to count by department
employeeSchema.statics.countByDepartment = function(department) {
  return this.countDocuments({ department, isActive: true });
};

module.exports = mongoose.model('Employee', employeeSchema);
