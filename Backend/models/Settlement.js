const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({  settlementId: {
    type: String,
    unique: true,
    required: false // Auto-generated in pre-save middleware
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  settlementDate: {
    type: Date,
    required: true
  },
  transactionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  orderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  requestType: {
    type: String,
    enum: ['regular', 'urgent', 'admin_initiated'],
    default: 'regular'
  },
  bankDetails: {
    accountNumber: String,
    accountHolderName: String,
    bankName: String,
    ifscCode: String
  },
  processedAt: {
    type: Date
  },
  processingNotes: {
    type: String,
    maxlength: 1000
  },
  reason: {
    type: String,
    maxlength: 500
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  // For tracking payment reference from bank/payment gateway
  paymentReference: {
    type: String
  },
  // Settlement period - which bookings are included
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  // Additional metadata for better tracking
  metadata: {
    transactionDate: String, // The original transaction date (YYYY-MM-DD format)
    requestedDate: String, // The date when settlement was requested (YYYY-MM-DD format)
    isUrgentForPastDate: { type: Boolean, default: false }, // Flag if this is urgent settlement for past date
    originalTransactionPeriod: {
      start: Date,
      end: Date
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
settlementSchema.index({ vendor: 1, settlementDate: -1 });
settlementSchema.index({ status: 1 });
settlementSchema.index({ settlementId: 1 });
settlementSchema.index({ vendor: 1, periodStart: 1, periodEnd: 1 });

// Generate settlement ID
settlementSchema.pre('save', function(next) {
  if (!this.settlementId) {
    this.settlementId = `STL${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Settlement', settlementSchema);
