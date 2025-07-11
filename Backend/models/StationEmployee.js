const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const stationEmployeeSchema = new mongoose.Schema({  assignmentNumber: {
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
    enum: ['station_manager', 'technician', 'customer_service'],
    default: 'station_manager'
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
    canViewBookings: { type: Boolean, default: true },
    canUpdateBookings: { type: Boolean, default: true },
    canManageStation: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: true }
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
stationEmployeeSchema.pre('save', async function(next) {
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
stationEmployeeSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate assignment number
stationEmployeeSchema.pre('save', async function(next) {
  console.log('Pre-save hook running. Current assignmentNumber:', this.assignmentNumber);
  
  if (!this.assignmentNumber) {
    try {
      const StationEmployee = this.constructor;
      
      // Count existing employees to determine the next number
      const count = await StationEmployee.countDocuments();
      console.log('Current employee count:', count);
      
      let nextNumber = 1001 + count;
      
      // Check if this assignment number already exists
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!isUnique && attempts < maxAttempts) {
        const assignmentNum = `EMP${nextNumber.toString().padStart(4, '0')}`.toUpperCase();
        console.log('Checking assignment number:', assignmentNum);
        
        const existingEmployee = await StationEmployee.findOne({
          assignmentNumber: assignmentNum
        });
        
        if (!existingEmployee) {
          this.assignmentNumber = assignmentNum;
          console.log('Generated assignment number:', this.assignmentNumber);
          isUnique = true;
        } else {
          console.log('Assignment number exists, trying next...');
          nextNumber++;
          attempts++;
        }
      }
      
      if (!isUnique) {
        // Fallback to timestamp-based if we can't find a unique number
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        this.assignmentNumber = `EMP${timestamp}${random}`.toUpperCase();
        console.log('Used fallback assignment number:', this.assignmentNumber);
      }
      
    } catch (error) {
      console.error('Error generating assignment number:', error);
      // Ultimate fallback - use timestamp + random
      const timestamp = Date.now().toString().slice(-3);
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      this.assignmentNumber = `EMP${timestamp}${random}`.toUpperCase();
      console.log('Used ultimate fallback assignment number:', this.assignmentNumber);
    }
  }
  
  console.log('Pre-save hook complete. Final assignmentNumber:', this.assignmentNumber);
  next();
});

// Indexes for performance
stationEmployeeSchema.index({ chargingStation: 1, isActive: 1 });
stationEmployeeSchema.index({ vendor: 1, isActive: 1 });
stationEmployeeSchema.index({ assignmentNumber: 1 });
stationEmployeeSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model('StationEmployee', stationEmployeeSchema);
