const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const ChargingStation = require('../models/ChargingStation');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { 
  mongoIdValidation,
  handleValidationErrors 
} = require('../middleware/validation');

const router = express.Router();

// Mock payment gateway integration (replace with actual payment gateway)
const processPayment = async (paymentData) => {
  // This is a mock implementation
  // Replace with actual payment gateway integration (Razorpay, Stripe, etc.)
  
  const { amount, currency, paymentMethod, cardDetails, upiId } = paymentData;
  
  // Simulate payment processing
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock success response
      const isSuccess = Math.random() > 0.1; // 90% success rate for demo
      
      if (isSuccess) {
        resolve({
          success: true,
          transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          paymentId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount,
          currency,
          status: 'captured',
          method: paymentMethod,
          fee: Math.round(amount * 0.024), // 2.4% gateway fee
          tax: Math.round(amount * 0.18), // 18% GST on fee
          created_at: new Date().toISOString()
        });
      } else {
        resolve({
          success: false,
          error: {
            code: 'PAYMENT_FAILED',
            description: 'Payment failed due to insufficient funds',
            reason: 'INSUFFICIENT_FUNDS'
          }
        });
      }
    }, 2000); // Simulate network delay
  });
};

// Helper function to send notification
const sendPaymentNotification = async (user, booking, type) => {
  try {
    let message = '';
    
    switch (type) {
      case 'success':
        message = `Payment successful! Your booking ${booking.bookingId} is confirmed. Amount: ₹${booking.pricing.totalAmount}`;
        break;
      case 'failed':
        message = `Payment failed for booking ${booking.bookingId}. Please try again.`;
        break;
      case 'refund':
        message = `Refund processed for booking ${booking.bookingId}. Amount: ₹${booking.paymentDetails.refundAmount}`;
        break;
    }

    // Send SMS and Email (implement actual sending)
    console.log(`📱 Payment notification to ${user.phoneNumber}: ${message}`);
    if (user.email) {
      console.log(`📧 Payment notification to ${user.email}: ${message}`);
    }
  } catch (error) {
    console.error('Payment notification error:', error);
  }
};

// @desc    Create payment intent for booking
// @route   POST /api/payments/create-intent
// @access  Private
const createPaymentIntent = async (req, res, next) => {
  try {
    const { bookingId, paymentMethod } = req.body;

    // Validate booking
    const booking = await Booking.findById(bookingId)
      .populate('chargingStation', 'name address')
      .populate('user', 'name phoneNumber email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (booking.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to make payment for this booking'
      });
    }

    // Check if booking is in correct status
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Booking is not in pending status'
      });
    }

    // Check if payment is already processed
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this booking'
      });
    }

    // Create payment intent (this would be actual payment gateway call)
    const paymentIntent = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: booking.pricing.totalAmount * 100, // Convert to paisa for payment gateway
      currency: 'INR',
      status: 'requires_payment_method',
      booking_id: booking._id,
      metadata: {
        booking_id: booking._id.toString(),
        user_id: req.user.id,
        station_name: booking.chargingStation.name
      }
    };

    // Update booking with payment intent
    booking.paymentStatus = 'processing';
    booking.paymentDetails.paymentMethod = paymentMethod;
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        paymentIntent,
        booking: {
          id: booking._id,
          bookingId: booking.bookingId,
          amount: booking.pricing.totalAmount,
          station: booking.chargingStation.name,
          timeSlot: booking.timeSlot
        }
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    next(error);
  }
};

// @desc    Process payment for booking
// @route   POST /api/payments/process
// @access  Private
const processBookingPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      bookingId,
      paymentMethod,
      paymentDetails
    } = req.body;

    // Validate booking
    const booking = await Booking.findById(bookingId).session(session);

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user.id) {
      throw new Error('Not authorized to make payment for this booking');
    }

    // Check if booking is in correct status
    if (booking.status !== 'pending') {
      throw new Error('Booking is not in pending status');
    }

    // Check if payment is already processed
    if (booking.paymentStatus === 'paid') {
      throw new Error('Payment already completed for this booking');
    }

    // Process payment
    const paymentResult = await processPayment({
      amount: booking.pricing.totalAmount,
      currency: 'INR',
      paymentMethod,
      ...paymentDetails
    });

    if (!paymentResult.success) {
      // Payment failed
      booking.paymentStatus = 'failed';
      booking.paymentDetails.gatewayResponse = paymentResult.error;
      await booking.save({ session });

      await session.commitTransaction();

      return res.status(400).json({
        success: false,
        message: 'Payment failed',
        error: paymentResult.error
      });
    }

    // Payment successful - update booking
    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.paymentDetails = {
      ...booking.paymentDetails,
      paymentId: paymentResult.paymentId,
      transactionId: paymentResult.transactionId,
      paymentMethod,
      gatewayResponse: paymentResult,
      paidAt: new Date()
    };

    await booking.save({ session });

    // Update charging port status (keep as occupied until user arrives)
    const station = await ChargingStation.findById(booking.chargingStation).session(session);
    const port = station.chargingPorts.id(booking.chargingPort.portId);
    if (port) {
      port.currentStatus = 'occupied';
      await station.save({ session });
    }

    await session.commitTransaction();

    // Send confirmation notifications
    const user = await User.findById(booking.user);
    await sendPaymentNotification(user, booking, 'success');

    // Populate booking for response
    await booking.populate([
      {
        path: 'chargingStation',
        select: 'name address location images operatingHours'
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        booking,
        transaction: {
          transactionId: paymentResult.transactionId,
          paymentId: paymentResult.paymentId,
          amount: paymentResult.amount,
          status: paymentResult.status,
          paidAt: booking.paymentDetails.paidAt
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Process payment error:', error);
    
    if (error.message.includes('not found') || 
        error.message.includes('Not authorized') ||
        error.message.includes('not in pending') ||
        error.message.includes('already completed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get payment status
// @route   GET /api/payments/status/:bookingId
// @access  Private
const getPaymentStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .select('paymentStatus paymentDetails pricing status')
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        bookingId,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.status,
        amount: booking.pricing.totalAmount,
        paymentDetails: {
          paymentId: booking.paymentDetails.paymentId,
          transactionId: booking.paymentDetails.transactionId,
          paymentMethod: booking.paymentDetails.paymentMethod,
          paidAt: booking.paymentDetails.paidAt
        }
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    next(error);
  }
};

// @desc    Process refund for cancelled booking
// @route   POST /api/payments/refund
// @access  Private
const processRefund = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { bookingId, refundReason } = req.body;

    // Validate booking
    const booking = await Booking.findById(bookingId).session(session);

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user.id) {
      throw new Error('Not authorized to request refund for this booking');
    }

    // Check if booking is cancelled and eligible for refund
    if (booking.status !== 'cancelled' || !booking.cancellation.refundEligible) {
      throw new Error('Booking is not eligible for refund');
    }

    // Check if refund is already processed
    if (booking.paymentStatus === 'refunded') {
      throw new Error('Refund already processed for this booking');
    }

    // Calculate refund amount
    const refundAmount = booking.calculateRefundAmount();

    if (refundAmount <= 0) {
      throw new Error('No refund amount available');
    }

    // Process refund (mock implementation)
    const refundResult = await new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          refundId: `RFD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount: refundAmount,
          status: 'processed',
          processingTime: '3-5 business days',
          refundedAt: new Date().toISOString()
        });
      }, 1000);
    });

    // Update booking with refund details
    booking.paymentStatus = 'refunded';
    booking.paymentDetails.refundId = refundResult.refundId;
    booking.paymentDetails.refundAmount = refundAmount;
    booking.paymentDetails.refundedAt = new Date();

    await booking.save({ session });

    await session.commitTransaction();

    // Send refund notification
    const user = await User.findById(booking.user);
    await sendPaymentNotification(user, booking, 'refund');

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        bookingId: booking.bookingId,
        refundAmount,
        refundId: refundResult.refundId,
        processingTime: refundResult.processingTime,
        refundedAt: booking.paymentDetails.refundedAt
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Process refund error:', error);
    
    if (error.message.includes('not found') || 
        error.message.includes('Not authorized') ||
        error.message.includes('not eligible') ||
        error.message.includes('already processed') ||
        error.message.includes('No refund amount')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get user's payment history
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    let query = { 
      user: req.user.id,
      paymentStatus: { $in: ['paid', 'refunded', 'partial_refund'] }
    };

    if (status) {
      query.paymentStatus = status;
    }

    const skip = (page - 1) * limit;

    const payments = await Booking.find(query)
      .populate('chargingStation', 'name address')
      .select('bookingId status paymentStatus paymentDetails pricing timeSlot createdAt')
      .sort({ 'paymentDetails.paidAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPayments = await Booking.countDocuments(query);
    const totalPages = Math.ceil(totalPayments / limit);

    // Format payment history
    const formattedPayments = payments.map(payment => ({
      bookingId: payment.bookingId,
      stationName: payment.chargingStation.name,
      amount: payment.pricing.totalAmount,
      paymentStatus: payment.paymentStatus,
      paymentMethod: payment.paymentDetails.paymentMethod,
      transactionId: payment.paymentDetails.transactionId,
      paidAt: payment.paymentDetails.paidAt,
      refundAmount: payment.paymentDetails.refundAmount,
      refundedAt: payment.paymentDetails.refundedAt,
      timeSlot: payment.timeSlot,
      bookingStatus: payment.status
    }));

    res.status(200).json({
      success: true,
      count: formattedPayments.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPayments,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      data: formattedPayments
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    next(error);
  }
};

// @desc    Webhook endpoint for payment gateway notifications
// @route   POST /api/payments/webhook
// @access  Public (but verified with signature)
const handlePaymentWebhook = async (req, res, next) => {
  try {
    // Verify webhook signature (implement based on your payment gateway)
    const signature = req.headers['x-webhook-signature'];
    const event = req.body;

    // Process webhook event
    switch (event.type) {
      case 'payment.captured':
        // Handle successful payment
        const paymentId = event.data.payment.id;
        const booking = await Booking.findOne({
          'paymentDetails.paymentId': paymentId
        });
        
        if (booking) {
          booking.status = 'confirmed';
          booking.paymentStatus = 'paid';
          await booking.save();
        }
        break;

      case 'payment.failed':
        // Handle failed payment
        const failedPaymentId = event.data.payment.id;
        const failedBooking = await Booking.findOne({
          'paymentDetails.paymentId': failedPaymentId
        });
        
        if (failedBooking) {
          failedBooking.paymentStatus = 'failed';
          await failedBooking.save();
        }
        break;

      case 'refund.processed':
        // Handle refund processed
        const refundId = event.data.refund.id;
        const refundBooking = await Booking.findOne({
          'paymentDetails.refundId': refundId
        });
        
        if (refundBooking) {
          refundBooking.paymentStatus = 'refunded';
          await refundBooking.save();
        }
        break;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false });
  }
};

// Routes
router.post('/create-intent', protect, createPaymentIntent);
router.post('/process', protect, processBookingPayment);
router.get('/status/:bookingId', 
  mongoIdValidation('bookingId'), 
  handleValidationErrors, 
  protect, 
  getPaymentStatus
);
router.post('/refund', protect, processRefund);
router.get('/history', protect, getPaymentHistory);
router.post('/webhook', handlePaymentWebhook);

module.exports = router;
