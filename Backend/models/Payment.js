const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  chargingStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChargingStation',
    required: true
  },
  amount: {
    baseAmount: {
      type: Number,
      required: true
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'cash'],
      required: true
    },
    gateway: {
      type: String,
      enum: ['razorpay', 'payu', 'cashfree', 'stripe', 'manual'],
      default: 'razorpay'
    },
    cardType: {
      type: String,
      enum: ['credit', 'debit']
    },
    bankName: String,
    cardLast4: String
  },
  transactionDetails: {
    transactionId: {
      type: String,
      required: true
    },
    gatewayPaymentId: String,
    gatewayOrderId: String,
    gatewaySignature: String,
    refNumber: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  timestamps: {
    initiated: {
      type: Date,
      default: Date.now
    },
    processed: Date,
    completed: Date,
    failed: Date
  },
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    },
    processedAt: Date,
    refundReference: String
  }],
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceInfo: mongoose.Schema.Types.Mixed,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    }
  },
  notes: {
    adminNotes: String,
    vendorNotes: String,
    systemNotes: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ vendor: 1 });
paymentSchema.index({ chargingStation: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ 'transactionDetails.transactionId': 1 });
paymentSchema.index({ 'paymentMethod.type': 1 });
paymentSchema.index({ 'paymentMethod.gateway': 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for total refunded amount
paymentSchema.virtual('totalRefunded').get(function() {
  return this.refunds.reduce((total, refund) => {
    return refund.status === 'processed' ? total + refund.amount : total;
  }, 0);
});

// Virtual for net amount (final amount - refunds)
paymentSchema.virtual('netAmount').get(function() {
  return this.amount.finalAmount - this.totalRefunded;
});

// Method to check if payment can be refunded
paymentSchema.methods.canBeRefunded = function() {
  return this.status === 'completed' && this.netAmount > 0;
};

// Method to get payment summary
paymentSchema.methods.getSummary = function() {
  return {
    paymentId: this.paymentId,
    amount: this.amount.finalAmount,
    status: this.status,
    method: this.paymentMethod.type,
    gateway: this.paymentMethod.gateway,
    transactionId: this.transactionDetails.transactionId,
    createdAt: this.createdAt,
    totalRefunded: this.totalRefunded,
    netAmount: this.netAmount
  };
};

// Static method to get payment stats
paymentSchema.statics.getStats = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['completed', 'refunded', 'partially_refunded'] }
      }
    },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount.finalAmount' },
        totalRefunded: { $sum: '$totalRefunded' },
        avgPayment: { $avg: '$amount.finalAmount' }
      }
    }
  ];
  
  const [stats] = await this.aggregate(pipeline);
  return stats || {
    totalPayments: 0,
    totalAmount: 0,
    totalRefunded: 0,
    avgPayment: 0
  };
};

module.exports = mongoose.model('Payment', paymentSchema);
