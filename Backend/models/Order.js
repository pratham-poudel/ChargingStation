const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // Note: This will reference the menu item within the restaurant's menu array
  },
  menuItemSnapshot: {
    // Store menu item details at time of order for historical accuracy
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String } // Primary image URL
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Total price cannot be negative']
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [200, 'Special instructions cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'cancelled'],
    default: 'pending'
  },
  preparedAt: Date,
  servedAt: Date
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    index: true
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
  
  // Customer information
  customer: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Customer name cannot exceed 100 characters']
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
    // Optional: Link to User model if customer has an account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Order details
  items: [orderItemSchema],
  
  // Pricing
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  tax: {
    percentage: {
      type: Number,
      default: 5, // 5% GST
      min: 0,
      max: 100
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  serviceCharge: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  discounts: [{
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [100, 'Discount reason cannot exceed 100 characters']
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  
  // Order status and timing
  status: {
    type: String,
    enum: [
      'pending',           // Order placed, waiting for restaurant confirmation
      'confirmed',         // Restaurant confirmed the order
      'preparing',         // Food is being prepared
      'ready',            // Food is ready for pickup/service
      'served',           // Food has been served to customer
      'completed',        // Order fully completed
      'cancelled',        // Order cancelled
      'refunded'          // Order refunded
    ],
    default: 'pending',
    index: true
  },
  
  // Order type
  orderType: {
    type: String,
    enum: ['dine_in', 'takeaway', 'table_service'],
    default: 'dine_in'
  },
  
  // Table information for dine-in orders
  tableInfo: {
    tableNumber: {
      type: String,
      trim: true
    },
    seatCount: {
      type: Number,
      min: 1,
      max: 20
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Table location cannot exceed 100 characters']
    }
  },
  
  // Timing information
  estimatedPreparationTime: {
    type: Number, // in minutes
    default: 30
  },
  actualPreparationTime: {
    type: Number // in minutes
  },
  orderedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  scheduledServiceDate: {
    type: Date,
    required: false,
    index: true
  },
  scheduledServiceTime: {
    type: String, // HH:MM format
    required: false
  },
  confirmedAt: Date,
  preparationStartedAt: Date,
  readyAt: Date,
  servedAt: Date,
  completedAt: Date,
  
  // Payment information
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet', 'bank_transfer'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true
    },
    transactionId: {
      type: String,
      trim: true
    },
    paidAt: Date,
    refundedAt: Date,
    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Staff assignments
  assignedTo: {
    waiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantEmployee'
    },
    chef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantEmployee'
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantEmployee'
    }
  },
  
  // Special notes and instructions
  notes: {
    customer: {
      type: String,
      trim: true,
      maxlength: [500, 'Customer notes cannot exceed 500 characters']
    },
    restaurant: {
      type: String,
      trim: true,
      maxlength: [500, 'Restaurant notes cannot exceed 500 characters']
    },
    kitchen: {
      type: String,
      trim: true,
      maxlength: [500, 'Kitchen notes cannot exceed 500 characters']
    }
  },
  
  // Rating and feedback (after order completion)
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Feedback comment cannot exceed 1000 characters']
    },
    submittedAt: Date
  },
  
  // Cancellation details
  cancellation: {
    reason: {
      type: String,
      trim: true,
      maxlength: [200, 'Cancellation reason cannot exceed 200 characters']
    },
    cancelledBy: {
      type: String,
      enum: ['customer', 'restaurant', 'system'],
    },
    cancelledAt: Date,
    refundEligible: {
      type: Boolean,
      default: false
    }
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantEmployee' // Employee who created the order
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantEmployee'
  },
  version: {
    type: Number,
    default: 1
  },
  
  // Settlement tracking (for vendor payouts)
  settlementStatus: {
    type: String,
    enum: ['pending', 'included_in_settlement', 'settled'],
    default: 'pending'
  },
  settlementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Settlement'
  },
  settlementRequestedAt: Date,
  settlementRequestedFor: String // Date string for which this settlement was requested
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const today = new Date();
      const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      
      // Find the latest order number for today
      const latestOrder = await this.constructor.findOne(
        { orderNumber: new RegExp(`^ORD${datePrefix}`) },
        { orderNumber: 1 }
      ).sort({ orderNumber: -1 });

      let nextNumber = 1;
      if (latestOrder && latestOrder.orderNumber) {
        const currentNumber = parseInt(latestOrder.orderNumber.slice(-4));
        nextNumber = currentNumber + 1;
      }

      this.orderNumber = `ORD${datePrefix}${nextNumber.toString().padStart(4, '0')}`;
      console.log('Generated order number:', this.orderNumber);
    } catch (error) {
      console.error('Error generating order number:', error);
      return next(error);
    }
  }
  next();
});

// Calculate totals before saving
orderSchema.pre('save', function(next) {
  if (this.isModified('items') || this.isModified('tax') || this.isModified('serviceCharge') || this.isModified('discounts')) {
    // Calculate subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Calculate tax amount
    this.tax.amount = (this.subtotal * this.tax.percentage) / 100;
    
    // Calculate service charge amount
    this.serviceCharge.amount = (this.subtotal * this.serviceCharge.percentage) / 100;
    
    // Calculate total discount amount
    const totalDiscount = this.discounts.reduce((sum, discount) => sum + discount.amount, 0);
    
    // Calculate final total
    this.totalAmount = this.subtotal + this.tax.amount + this.serviceCharge.amount - totalDiscount;
    
    // Ensure total amount is not negative
    if (this.totalAmount < 0) {
      this.totalAmount = 0;
    }
  }
  next();
});

// Indexes for better performance
orderSchema.index({ restaurant: 1, status: 1 });
orderSchema.index({ chargingStation: 1, status: 1 });
orderSchema.index({ vendor: 1, orderedAt: -1 });
orderSchema.index({ 'customer.phoneNumber': 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderedAt: -1 });
orderSchema.index({ status: 1, orderedAt: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ scheduledServiceDate: 1 });
orderSchema.index({ restaurant: 1, scheduledServiceDate: 1 });
orderSchema.index({ status: 1, scheduledServiceDate: 1 });

// Virtual for order duration
orderSchema.virtual('orderDuration').get(function() {
  if (!this.orderedAt) return null;
  
  const endTime = this.completedAt || this.servedAt || new Date();
  return Math.round((endTime - this.orderedAt) / (1000 * 60)); // in minutes
});

// Virtual for preparation duration
orderSchema.virtual('preparationDuration').get(function() {
  if (!this.preparationStartedAt || !this.readyAt) return null;
  
  return Math.round((this.readyAt - this.preparationStartedAt) / (1000 * 60)); // in minutes
});

// Virtual for order summary
orderSchema.virtual('summary').get(function() {
  return {
    orderNumber: this.orderNumber,
    customerName: this.customer.name,
    itemCount: this.items.length,
    totalAmount: this.totalAmount,
    status: this.status,
    orderedAt: this.orderedAt,
    scheduledServiceDate: this.scheduledServiceDate,
    scheduledServiceTime: this.scheduledServiceTime
  };
});

// Instance method to update order status
orderSchema.methods.updateStatus = function(newStatus, updatedBy = null) {
  const now = new Date();
  
  this.status = newStatus;
  this.lastUpdatedBy = updatedBy;
  
  switch (newStatus) {
    case 'confirmed':
      this.confirmedAt = now;
      break;
    case 'preparing':
      this.preparationStartedAt = now;
      break;
    case 'ready':
      this.readyAt = now;
      if (this.preparationStartedAt) {
        this.actualPreparationTime = Math.round((now - this.preparationStartedAt) / (1000 * 60));
      }
      break;
    case 'served':
      this.servedAt = now;
      break;
    case 'completed':
      this.completedAt = now;
      break;
  }
  
  return this.save();
};

// Instance method to calculate estimated ready time
orderSchema.methods.getEstimatedReadyTime = function() {
  if (!this.confirmedAt) return null;
  
  const estimatedMinutes = this.estimatedPreparationTime || 30;
  return new Date(this.confirmedAt.getTime() + (estimatedMinutes * 60 * 1000));
};

// Instance method to add feedback
orderSchema.methods.addFeedback = function(rating, comment) {
  this.feedback = {
    rating,
    comment,
    submittedAt: new Date()
  };
  return this.save();
};

// Instance method to cancel order
orderSchema.methods.cancel = function(reason, cancelledBy, refundEligible = false) {
  this.status = 'cancelled';
  this.cancellation = {
    reason,
    cancelledBy,
    cancelledAt: new Date(),
    refundEligible
  };
  
  if (refundEligible && this.payment.status === 'paid') {
    this.payment.status = 'refunded';
    this.payment.refundedAt = new Date();
    this.payment.refundAmount = this.totalAmount;
  }
  
  return this.save();
};

// Static method to get orders by restaurant
orderSchema.statics.findByRestaurant = function(restaurantId, filters = {}) {
  const query = { restaurant: restaurantId, ...filters };
  return this.find(query)
    .populate('restaurant chargingStation vendor')
    .populate('assignedTo.waiter assignedTo.chef assignedTo.cashier')
    .sort({ orderedAt: -1 });
};

// Static method to get orders by date range
orderSchema.statics.findByDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    orderedAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    ...filters
  };
  
  return this.find(query).sort({ orderedAt: -1 });
};

// Static method to get daily sales summary
orderSchema.statics.getDailySummary = async function(restaurantId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const summary = await this.aggregate([
    {
      $match: {
        restaurant: new mongoose.Types.ObjectId(restaurantId),
        orderedAt: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        avgOrderValue: { $avg: '$totalAmount' },
        avgPreparationTime: { $avg: '$actualPreparationTime' }
      }
    }
  ]);
  
  return summary.length > 0 ? summary[0] : {
    totalOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    avgOrderValue: 0,
    avgPreparationTime: 0
  };
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
