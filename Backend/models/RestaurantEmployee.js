const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const restaurantEmployeeSchema = new mongoose.Schema({
  assignmentNumber: {
    type: String,
    unique: true,
    index: true,
    validate: {
      validator: function(v) {
        // This will be checked after pre-save hooks run
        return v && v.length > 0;
      },
      message: 'Assignment number is required and must be generated'
    }
  },
  employeeName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Employee name cannot exceed 100 characters']
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters']
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  chargingStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChargingStation',
    required: true,
    index: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['restaurant_manager', 'chef', 'waiter', 'cashier', 'general_staff'],
    default: 'restaurant_manager'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastLogin: {
    type: Date
  },
  permissions: {
    canViewOrders: { type: Boolean, default: true },
    canUpdateOrders: { type: Boolean, default: true },
    canManageMenu: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: true },
    canManageInventory: { type: Boolean, default: false },
    canAccessPOS: { type: Boolean, default: true }
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  workSchedule: {
    type: String,
    enum: ['full_time', 'part_time', 'shift_based'],
    default: 'full_time'
  },
  salary: {
    amount: {
      type: Number,
      min: [0, 'Salary cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR'
    },
    paymentFrequency: {
      type: String,
      enum: ['monthly', 'weekly', 'daily'],
      default: 'monthly'
    }
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
restaurantEmployeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
restaurantEmployeeSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate assignment number
restaurantEmployeeSchema.pre('save', async function(next) {
  if (this.isNew && !this.assignmentNumber) {
    try {
      // Find the latest assignment number for restaurant employees
      const latestEmployee = await this.constructor.findOne(
        { assignmentNumber: /^REMP\d+$/ },
        { assignmentNumber: 1 }
      ).sort({ assignmentNumber: -1 });

      let nextNumber = 1001;
      if (latestEmployee && latestEmployee.assignmentNumber) {
        const currentNumber = parseInt(latestEmployee.assignmentNumber.replace('REMP', ''));
        nextNumber = currentNumber + 1;
      }

      this.assignmentNumber = `REMP${nextNumber}`;
      console.log('Generated restaurant employee assignment number:', this.assignmentNumber);
    } catch (error) {
      console.error('Error generating restaurant employee assignment number:', error);
      return next(error);
    }
  }
  next();
});

// Indexes for better performance
restaurantEmployeeSchema.index({ assignmentNumber: 1 });
restaurantEmployeeSchema.index({ restaurant: 1, isActive: 1 });
restaurantEmployeeSchema.index({ vendor: 1, isActive: 1 });
restaurantEmployeeSchema.index({ chargingStation: 1 });
restaurantEmployeeSchema.index({ phoneNumber: 1 });
restaurantEmployeeSchema.index({ createdAt: -1 });

// Virtual for employee status
restaurantEmployeeSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  
  const now = new Date();
  const daysSinceLastLogin = this.lastLogin 
    ? Math.floor((now - this.lastLogin) / (1000 * 60 * 60 * 24))
    : null;
  
  if (!this.lastLogin) return 'never_logged_in';
  if (daysSinceLastLogin <= 1) return 'active';
  if (daysSinceLastLogin <= 7) return 'recent';
  return 'inactive';
});

// Virtual for display name
restaurantEmployeeSchema.virtual('displayName').get(function() {
  return `${this.employeeName} (${this.assignmentNumber})`;
});

// Method to check if employee has specific permission
restaurantEmployeeSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true;
};

// Method to update last login
restaurantEmployeeSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find active employees by restaurant
restaurantEmployeeSchema.statics.findActiveByRestaurant = function(restaurantId) {
  return this.find({
    restaurant: restaurantId,
    isActive: true
  }).populate('restaurant vendor chargingStation');
};

// Static method to find employees by vendor
restaurantEmployeeSchema.statics.findByVendor = function(vendorId, includeInactive = false) {
  const query = { vendor: vendorId };
  if (!includeInactive) {
    query.isActive = true;
  }
  return this.find(query).populate('restaurant chargingStation');
};

// Static method to generate unique assignment number (alternative implementation)
restaurantEmployeeSchema.statics.generateAssignmentNumber = async function() {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    try {
      // Find the latest assignment number
      const latestEmployee = await this.findOne(
        { assignmentNumber: /^REMP\d+$/ },
        { assignmentNumber: 1 }
      ).sort({ assignmentNumber: -1 });

      let nextNumber = 1001;
      if (latestEmployee && latestEmployee.assignmentNumber) {
        const currentNumber = parseInt(latestEmployee.assignmentNumber.replace('REMP', ''));
        nextNumber = currentNumber + 1;
      }

      const assignmentNumber = `REMP${nextNumber}`;
      
      // Check if this number already exists (race condition protection)
      const existing = await this.findOne({ assignmentNumber });
      if (!existing) {
        return assignmentNumber;
      }
      
      attempts++;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique assignment number after multiple attempts');
      }
    }
  }
  
  throw new Error('Failed to generate unique assignment number');
};

// Pre-remove middleware to clean up related data
restaurantEmployeeSchema.pre('remove', async function(next) {
  try {
    // Here you can add cleanup logic for related data
    // For example, reassign orders, update logs, etc.
    console.log(`Cleaning up data for restaurant employee: ${this.assignmentNumber}`);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to get employee summary
restaurantEmployeeSchema.methods.getSummary = function() {
  return {
    id: this._id,
    assignmentNumber: this.assignmentNumber,
    name: this.employeeName,
    role: this.role,
    status: this.status,
    restaurant: this.restaurant?.name || 'Unknown',
    station: this.chargingStation?.name || 'Unknown',
    lastLogin: this.lastLogin,
    isActive: this.isActive,
    permissions: this.permissions
  };
};

const RestaurantEmployee = mongoose.model('RestaurantEmployee', restaurantEmployeeSchema);

module.exports = RestaurantEmployee;
