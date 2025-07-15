const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chargingStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChargingStation',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  chargingPort: {
    portId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    portNumber: {
      type: String,
      required: true
    },
    connectorType: {
      type: String,
      required: true
    },
    powerOutput: {
      type: Number,
      required: true
    },
    chargingType: {
      type: String,
      required: true,
      enum: ['slow', 'fast', 'rapid']
    }
  },
  vehicle: {
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
    }
  },
  timeSlot: {
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    duration: {
      type: Number, // in minutes
      required: true,
      min: 15, // minimum 15 minutes
      max: 480 // maximum 8 hours
    }
  },  pricing: {
    pricePerUnit: {
      type: Number, // Price per kWh
      required: true
    },
    estimatedUnits: {
      type: Number, // Estimated kWh
      required: true
    },
    baseCost: {
      type: Number,
      required: true
    },
    taxes: {
      type: Number,
      default: 0
    },
    serviceCharges: {
      type: Number,
      default: 0
    },
    platformFee: {
      type: Number,
      default: 5 // Fixed ₹5 platform fee
    },
    foodOrderAmount: {
      type: Number,
      default: 0 // Amount for food order if any
    },
    restaurantAmount: {
      type: Number,
      default: 0 // Amount that goes to restaurant
    },
    merchantAmount: {
      type: Number,
      required: true // Amount that goes to merchant
    },
    totalAmount: {
      type: Number,
      required: true // Total amount paid by customer
    }
  },  actualUsage: {
    unitsConsumed: {
      type: Number,
      default: 0
    },
    actualStartTime: {
      type: Date
    },
    actualEndTime: {
      type: Date
    },
    finalAmount: {
      type: Number
    }
  },
  paymentAdjustments: [{
    type: {
      type: String,
      enum: ['additional_charge', 'refund'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    adjustedBy: {
      type: String,
      enum: ['vendor', 'employee'],
      required: true
    },
    adjustedById: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    adjustedByName: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending'
    },
    paymentRequestId: {
      type: String // For additional charges - payment gateway reference
    },
    refundMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'wallet'],
      default: 'cash' // Station manager gives cash refund
    },
    processedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: [
      'pending',      // Booking created, payment pending
      'confirmed',    // Payment successful, booking confirmed
      'active',       // Charging in progress
      'completed',    // Charging completed successfully
      'cancelled',    // Cancelled by user or system
      'expired',      // Booking expired (user didn't show up)
      'failed'        // Technical failure during charging
    ],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'refunded', 'partial_refund'],
    default: 'pending'
  },
  paymentDetails: {
    paymentId: String,
    paymentMethod: {
      type: String,
      enum: ['card', 'upi', 'wallet', 'netbanking']
    },
    transactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    paidAt: Date,
    refundId: String,
    refundAmount: Number,
    refundedAt: Date
  },
  notifications: {
    bookingConfirmation: {
      sms: { sent: { type: Boolean, default: false }, sentAt: Date },
      email: { sent: { type: Boolean, default: false }, sentAt: Date }
    },
    reminder: {
      sms: { sent: { type: Boolean, default: false }, sentAt: Date },
      email: { sent: { type: Boolean, default: false }, sentAt: Date }
    },
    completion: {
      sms: { sent: { type: Boolean, default: false }, sentAt: Date },
      email: { sent: { type: Boolean, default: false }, sentAt: Date }
    }
  },  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['user', 'vendor', 'system', 'admin']
    },
    cancellationReason: String,
    cancelledAt: Date,
    refundEligible: {
      type: Boolean,
      default: false
    },
    refundRequested: {
      type: Boolean,
      default: false
    },
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Refund'
    },
    hoursBeforeCharge: {
      type: Number,
      min: 0
    }
  },
  // Slot status tracking for monitoring and notifications
  slotStatus: {
    started: {
      type: Boolean,
      default: false
    },
    startedAt: Date,
    gracePeridActive: {
      type: Boolean,
      default: false
    },
    gracePeriodEndsAt: Date,
    expiredAt: Date,
    expiredReason: {
      type: String,
      enum: ['no_show_after_grace_period', 'user_cancelled', 'system_cancelled']
    },
    checkedInAt: Date,
    notificationsSent: {
      slotStart: {
        email: { sent: { type: Boolean, default: false }, sentAt: Date },
        sms: { sent: { type: Boolean, default: false }, sentAt: Date }
      },
      slotExpired: {
        email: { sent: { type: Boolean, default: false }, sentAt: Date },
        sms: { sent: { type: Boolean, default: false }, sentAt: Date }
      }
    }
  },
  // Settlement tracking
  settlementStatus: {
    type: String,
    enum: ['pending', 'included_in_settlement', 'settled'],
    default: 'pending'
  },
  settlementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Settlement'
  },
  settledAt: {
    type: Date
  },
  // Additional settlement tracking for better date management
  settlementRequestedAt: {
    type: Date // When the settlement was requested
  },
  settlementRequestedFor: {
    type: String // The date (YYYY-MM-DD) for which settlement was requested
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Special instructions cannot exceed 500 characters']
  },
  customerDetails: {
    name: String,
    phoneNumber: String,
    email: String,
    driverName: String
  },
  // Food order details if this booking includes food
  foodOrder: {
    type: {
      restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant'
      },
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false // Optional since it's set after order creation
      },
      items: [{
        menuItemId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        name: {
          type: String,
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          max: 10
        },
        price: {
          type: Number,
          required: true,
          min: 0
        }
      }],
      totalAmount: {
        type: Number,
        required: true,
        min: 0
      },
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
        default: 'pending'
      },
      orderedAt: {
        type: Date,
        default: Date.now
      },
      estimatedDeliveryTime: {
        type: Date
      },
      specialInstructions: {
        type: String,
        trim: true,
        maxlength: 300
      }
    },
    required: false // Make the entire foodOrder optional
  },
  isFlexible: {
    type: Boolean,
    default: false
  },  qrCode: {
    type: String // QR code for easy check-in at the station
  },
  // Station rating tracking (to prevent multiple ratings from same booking)
  stationRating: {
    hasRated: {
      type: Boolean,
      default: false
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      trim: true,
      maxlength: 500
    },
    ratedAt: {
      type: Date
    },
    ratingExpiredAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and conflict detection
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ chargingStation: 1, 'timeSlot.startTime': 1 });
bookingSchema.index({ vendor: 1, createdAt: -1 });
bookingSchema.index({ bookingId: 1 }, { unique: true });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentStatus: 1 });

// Compound index for conflict detection
bookingSchema.index({
  'chargingPort.portId': 1,
  'timeSlot.startTime': 1,
  'timeSlot.endTime': 1,
  status: 1
});

// Additional indexes for slot status monitoring
bookingSchema.index({ 'slotStatus.started': 1, 'timeSlot.startTime': 1 });
bookingSchema.index({ 'slotStatus.gracePeridActive': 1, 'slotStatus.gracePeriodEndsAt': 1 });
bookingSchema.index({ status: 1, 'timeSlot.startTime': 1 });

// Virtual for booking duration in hours
bookingSchema.virtual('durationHours').get(function() {
  return this.timeSlot.duration / 60;
});

// Virtual for time until booking starts
bookingSchema.virtual('timeUntilStart').get(function() {
  const now = new Date();
  const start = new Date(this.timeSlot.startTime);
  return Math.max(0, start - now);
});

// Virtual for whether booking can be cancelled
bookingSchema.virtual('canBeCancelled').get(function() {
  const now = new Date();
  const start = new Date(this.timeSlot.startTime);
  const hoursUntilStart = (start - now) / (1000 * 60 * 60);
  
  // Can only cancel if status is pending/confirmed and more than 6 hours before start
  return ['pending', 'confirmed'].includes(this.status) && hoursUntilStart > 6;
});

// Virtual for whether booking is eligible for refund
bookingSchema.virtual('canGetRefund').get(function() {
  const now = new Date();
  const start = new Date(this.timeSlot.startTime);
  const hoursUntilStart = (start - now) / (1000 * 60 * 60);
  
  return this.status === 'cancelled' && hoursUntilStart > 6;
});

// Virtual for whether booking is in grace period
bookingSchema.virtual('isInGracePeriod').get(function() {
  if (!this.slotStatus?.gracePeridActive) return false;
  const now = new Date();
  const gracePeriodEnd = new Date(this.slotStatus.gracePeriodEndsAt);
  return now < gracePeriodEnd;
});

// Virtual for whether booking is overdue for check-in
bookingSchema.virtual('isOverdueForCheckIn').get(function() {
  if (this.status !== 'confirmed') return false;
  const now = new Date();
  const start = new Date(this.timeSlot.startTime);
  return now > start && !this.slotStatus?.checkedInAt;
});

// Virtual for time remaining in grace period
bookingSchema.virtual('graceTimeRemaining').get(function() {
  if (!this.isInGracePeriod) return 0;
  const now = new Date();
  const gracePeriodEnd = new Date(this.slotStatus.gracePeriodEndsAt);
  return Math.max(0, gracePeriodEnd - now);
});

// Pre-save middleware to generate booking ID and set rating expiration
bookingSchema.pre('save', function(next) {
  if (!this.bookingId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.bookingId = `BK${timestamp}${random}`.toUpperCase();
  }
  
  // Set rating expiration when booking is completed (7 days from completion)
  if (this.isModified('status') && this.status === 'completed' && !this.stationRating.ratingExpiredAt) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // 7 days to rate
    this.stationRating.ratingExpiredAt = expirationDate;
  }
  
  next();
});

// Static method to check for conflicts
bookingSchema.statics.checkConflict = async function(portId, startTime, endTime, excludeBookingId = null) {
  const query = {
    'chargingPort.portId': portId,
    status: { $in: ['confirmed', 'active'] },
    $or: [
      // New booking starts during existing booking
      {
        'timeSlot.startTime': { $lte: startTime },
        'timeSlot.endTime': { $gt: startTime }
      },
      // New booking ends during existing booking
      {
        'timeSlot.startTime': { $lt: endTime },
        'timeSlot.endTime': { $gte: endTime }
      },
      // New booking completely contains existing booking
      {
        'timeSlot.startTime': { $gte: startTime },
        'timeSlot.endTime': { $lte: endTime }
      },
      // Existing booking completely contains new booking
      {
        'timeSlot.startTime': { $lte: startTime },
        'timeSlot.endTime': { $gte: endTime }
      }
    ]
  };
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  const conflictingBooking = await this.findOne(query);
  return conflictingBooking;
};

// Static method to find available time slots for a port
bookingSchema.statics.getAvailableSlots = async function(portId, date, duration = 60) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const existingBookings = await this.find({
    'chargingPort.portId': portId,
    status: { $in: ['confirmed', 'active'] },
    'timeSlot.startTime': { $gte: startOfDay, $lte: endOfDay }
  }).sort({ 'timeSlot.startTime': 1 });
  
  const availableSlots = [];
  const slotDuration = duration; // in minutes
  let currentTime = new Date(startOfDay);
  currentTime.setHours(6, 0, 0, 0); // Start from 6 AM
  
  const endTime = new Date(endOfDay);
  endTime.setHours(22, 0, 0, 0); // End at 10 PM
  
  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + (slotDuration * 60 * 1000));
    
    // Check if this slot conflicts with any existing booking
    const hasConflict = existingBookings.some(booking => {
      const bookingStart = new Date(booking.timeSlot.startTime);
      const bookingEnd = new Date(booking.timeSlot.endTime);
      
      return (currentTime < bookingEnd && slotEnd > bookingStart);
    });
    
    if (!hasConflict) {
      availableSlots.push({
        startTime: new Date(currentTime),
        endTime: new Date(slotEnd)
      });
    }
    
    // Move to next slot (30-minute intervals)
    currentTime = new Date(currentTime.getTime() + (30 * 60 * 1000));
  }
  
  return availableSlots;
};

// Instance method to calculate refund amount
bookingSchema.methods.calculateRefundAmount = function() {
  const now = new Date();
  const start = new Date(this.timeSlot.startTime);
  const hoursUntilStart = (start - now) / (1000 * 60 * 60);
  
  let refundPercentage = 0;
  
  if (hoursUntilStart > 24) {
    refundPercentage = 100; // Full refund if cancelled 24+ hours before
  } else if (hoursUntilStart > 4) {
    refundPercentage = 75; // 75% refund if cancelled 4-24 hours before
  } else if (hoursUntilStart > 1) {
    refundPercentage = 50; // 50% refund if cancelled 1-4 hours before
  }
  // No refund if cancelled less than 1 hour before
  
  return (this.pricing.totalAmount * refundPercentage) / 100;
};

// Instance method to get total additional charges
bookingSchema.methods.getTotalAdditionalCharges = function() {
  return this.paymentAdjustments
    .filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
    .reduce((total, adj) => total + adj.amount, 0);
};

// Instance method to get total refunds given
bookingSchema.methods.getTotalRefunds = function() {
  return this.paymentAdjustments
    .filter(adj => adj.type === 'refund' && adj.status === 'processed')
    .reduce((total, adj) => total + adj.amount, 0);
};

// Instance method to get net amount after adjustments
bookingSchema.methods.getNetAmount = function() {
  const originalAmount = this.actualUsage?.finalAmount || this.pricing.totalAmount;
  const additionalCharges = this.getTotalAdditionalCharges();
  const refunds = this.getTotalRefunds();
  
  return originalAmount + additionalCharges - refunds;
};

// Instance method to get merchant net amount after adjustments
bookingSchema.methods.getMerchantNetAmount = function() {
  const originalMerchantAmount = this.pricing.merchantAmount;
  const additionalCharges = this.getTotalAdditionalCharges();
  const refunds = this.getTotalRefunds();
  
  // Platform fee is only on the original amount, not on adjustments
  return originalMerchantAmount + additionalCharges - refunds;
};

// Instance method to mark as expired
bookingSchema.methods.markAsExpired = function() {
  this.status = 'expired';
  this.cancellation = {
    cancelledBy: 'system',
    cancellationReason: 'User did not show up for the booking',
    cancelledAt: new Date(),
    refundEligible: false
  };
  return this.save();
};

// Instance method to check in user
bookingSchema.methods.checkIn = function(method = 'manual') {
  const now = new Date();
  
  if (this.status !== 'confirmed') {
    throw new Error('Booking must be confirmed to check in');
  }
  
  // Check if within valid time window (30 minutes before to 30 minutes after start)
  const startTime = new Date(this.timeSlot.startTime);
  const validCheckInStart = new Date(startTime.getTime() - 30 * 60 * 1000); // 30 min before
  const validCheckInEnd = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 min after
  
  if (now < validCheckInStart || now > validCheckInEnd) {
    throw new Error('Check-in is only allowed 30 minutes before to 30 minutes after slot start time');
  }
  
  this.status = 'active';
  this.slotStatus = {
    ...this.slotStatus,
    checkedInAt: now,
    checkInMethod: method,
    gracePeridActive: false
  };
  
  this.actualUsage = {
    ...this.actualUsage,
    actualStartTime: now
  };
  
  return this.save();
};

// Virtual to check if booking should be expired (based on grace period)
bookingSchema.virtual('shouldBeExpired').get(function() {
  if (this.status !== 'confirmed') return false;
  
  const now = new Date();
  const startTime = new Date(this.timeSlot.startTime);
  const graceEndTime = new Date(startTime.getTime() + 30 * 60 * 1000);
  
  return now > graceEndTime && !this.slotStatus?.checkedInAt;
});

module.exports = mongoose.model('Booking', bookingSchema);
