const Booking = require('../models/Booking');
const Refund = require('../models/Refund');
const Order = require('../models/Order');

class RefundService {
  
  /**
   * Calculate refund details for a booking
   * @param {String} bookingId - Booking ID
   * @param {String} userId - User ID making the request
   * @returns {Object} Refund calculation details
   */
  static async calculateRefund(bookingId, userId) {
    try {
      const booking = await Booking.findOne({
        _id: bookingId,
        user: userId
      });

      if (!booking) {
        throw new Error('Booking not found or unauthorized');
      }

      // Check if booking can be cancelled
      if (!['pending', 'confirmed'].includes(booking.status)) {
        throw new Error('Booking cannot be cancelled at this stage');
      }

      const now = new Date();
      const startTime = new Date(booking.timeSlot.startTime);
      const hoursBeforeCharge = (startTime - now) / (1000 * 60 * 60);

      // Use static method from Refund model to calculate
      const refundCalculation = Refund.calculateRefundAmount(
        booking.pricing.totalAmount,
        booking.pricing.platformFee,
        hoursBeforeCharge
      );

      return {
        success: true,
        data: {
          bookingId: booking._id,
          bookingRef: booking.bookingId,
          originalAmount: booking.pricing.totalAmount,
          platformFee: booking.pricing.platformFee,
          hoursBeforeCharge: Math.max(0, hoursBeforeCharge),
          ...refundCalculation,
          cancellationPolicy: {
            minimumHours: 6,
            slotOccupancyFeePercentage: 5,
            platformFeeNonRefundable: true
          }
        }
      };

    } catch (error) {
      throw new Error(`Failed to calculate refund: ${error.message}`);
    }
  }
  /**
   * Process booking cancellation with refund
   * @param {String} bookingId - Booking ID
   * @param {String} userId - User ID
   * @param {String} reason - Cancellation reason
   * @param {Object} securityData - IP, User Agent, etc.
   * @returns {Object} Cancellation and refund result
   */
  static async cancelBookingWithRefund(bookingId, userId, reason, securityData = {}) {
    try {
      // Get booking with validation
      const booking = await Booking.findOne({
        _id: bookingId,
        user: userId
      });

      if (!booking) {
        throw new Error('Booking not found or unauthorized');
      }

      // Security validation - check for suspicious patterns
      await this.validateCancellationRequest(booking, userId, securityData);

      // Check if booking can be cancelled
      if (!['pending', 'confirmed'].includes(booking.status)) {
        throw new Error('Booking cannot be cancelled at this stage');
      }

      // Check if already cancelled
      if (booking.status === 'cancelled') {
        throw new Error('Booking is already cancelled');
      }

      const now = new Date();
      const startTime = new Date(booking.timeSlot.startTime);
      const hoursBeforeCharge = (startTime - now) / (1000 * 60 * 60);

      // Calculate refund
      const refundCalculation = Refund.calculateRefundAmount(
        booking.pricing.totalAmount,
        booking.pricing.platformFee,
        hoursBeforeCharge
      );

      let refund = null;
        // Create refund record if eligible
      if (refundCalculation.isEligible && refundCalculation.finalRefundAmount > 0) {
        refund = new Refund({
          booking: booking._id,
          user: userId,
          vendor: booking.vendor,
          originalAmount: booking.pricing.totalAmount,
          platformFee: booking.pricing.platformFee,
          refundCalculation: {
            baseRefundAmount: refundCalculation.baseRefundAmount,
            slotOccupancyFee: refundCalculation.slotOccupancyFee,
            slotOccupancyFeePercentage: refundCalculation.slotOccupancyFeePercentage,
            platformFeeDeducted: refundCalculation.platformFeeDeducted,
            finalRefundAmount: refundCalculation.finalRefundAmount
          },
          cancellationDetails: {
            hoursBeforeCharge: Math.max(0, hoursBeforeCharge),
            cancellationReason: reason,
            cancelledAt: now,
            isEligibleForRefund: true
          },
          paymentDetails: {
            originalPaymentId: booking.paymentDetails?.paymentId,
            originalTransactionId: booking.paymentDetails?.transactionId
          }
        });

        // Generate refundId manually to ensure it's set
        if (!refund.refundId) {
          const timestamp = Date.now().toString(36);
          const random = Math.random().toString(36).substr(2, 5);
          refund.refundId = `RF${timestamp}${random}`.toUpperCase();
        }

        // Set security validation
        refund.securityValidation = {
          userIpAddress: securityData.ipAddress,
          userAgent: securityData.userAgent,
          requestSignature: this.generateRequestSignature({
            bookingId: booking._id,
            userId: userId,
            amount: booking.pricing.totalAmount,
            timestamp: Date.now()
          }),
          validatedAt: new Date(),
          validatedBy: 'system'
        };        await refund.save();
        
        // Add audit entry
        refund.auditTrail.push({
          action: 'created',
          performedBy: `user:${userId}`,
          details: `Refund request created for booking cancellation`,
          metadata: { 
            originalAmount: booking.pricing.totalAmount,
            refundAmount: refundCalculation.finalRefundAmount,
            hoursBeforeCharge: Math.max(0, hoursBeforeCharge)
          },
          performedAt: new Date()
        });
        
        await refund.save();

        // Link refund to booking after successful refund creation
        booking.cancellation.refundRequested = true;
        booking.cancellation.refundId = refund._id;
      }

      // Update booking status
      booking.status = 'cancelled';
      booking.cancellation = {
        ...booking.cancellation,
        cancelledBy: 'user',
        cancellationReason: reason,
        cancelledAt: now,
        refundEligible: refundCalculation.isEligible,
        hoursBeforeCharge: Math.max(0, hoursBeforeCharge)
      };

      // Cancel associated food order if exists
      let cancelledOrder = null;
      if (booking.foodOrder && booking.foodOrder.restaurantId) {
        try {
          console.log(`Looking for order associated with booking ${booking.bookingId}:`);
          console.log(`- Restaurant ID: ${booking.foodOrder.restaurantId}`);
          console.log(`- Order ID: ${booking.foodOrder.orderId}`);
          console.log(`- Customer Phone: ${booking.customerDetails.phoneNumber}`);
          
          let order = null;
          
          // First try to find by direct order ID reference (new approach)
          if (booking.foodOrder.orderId) {
            order = await Order.findOne({
              _id: booking.foodOrder.orderId,
              status: { $in: ['pending', 'confirmed', 'preparing'] } // Only cancel if not yet served
            });
            
            if (order) {
              console.log(`Found order via direct reference: ${order.orderNumber}`);
            }
          }
          
          // Fallback to search by customer details (old approach)
          if (!order) {
            console.log(`No direct order reference found, searching by customer details...`);
            
            order = await Order.findOne({
              restaurant: booking.foodOrder.restaurantId,
              'customer.phoneNumber': booking.customerDetails.phoneNumber,
              'customer.name': booking.customerDetails.name,
              // Match by order time (within a reasonable time window of booking creation)
              orderedAt: {
                $gte: new Date(booking.createdAt.getTime() - 5 * 60 * 1000), // 5 minutes before booking
                $lte: new Date(booking.createdAt.getTime() + 5 * 60 * 1000)  // 5 minutes after booking
              },
              status: { $in: ['pending', 'confirmed', 'preparing'] } // Only cancel if not yet served
            }).sort({ orderedAt: -1 }); // Get the most recent order
            
            if (order) {
              console.log(`Found order via customer search: ${order.orderNumber}`);
            }
          }

          if (order) {
            console.log(`Cancelling order ${order.orderNumber} with status: ${order.status}`);
            
            // Cancel the order
            await order.cancel(
              `Booking cancellation: ${reason}`,
              'system',
              refundCalculation.isEligible // Refund eligibility same as booking
            );
            
            cancelledOrder = {
              orderId: order._id,
              orderNumber: order.orderNumber,
              status: order.status,
              totalAmount: order.totalAmount
            };
            
            console.log(`Successfully cancelled associated order ${order.orderNumber} for booking ${booking.bookingId}`);
          } else {
            console.log(`No matching order found for booking ${booking.bookingId}`);
            
            // Try broader search - look for orders around the same time as the booking's foodOrder timestamp
            let alternativeOrder = null;
            if (booking.foodOrder.orderedAt) {
              const foodOrderTime = new Date(booking.foodOrder.orderedAt);
              alternativeOrder = await Order.findOne({
                restaurant: booking.foodOrder.restaurantId,
                'customer.phoneNumber': booking.customerDetails.phoneNumber,
                orderedAt: {
                  $gte: new Date(foodOrderTime.getTime() - 2 * 60 * 1000), // 2 minutes before
                  $lte: new Date(foodOrderTime.getTime() + 2 * 60 * 1000)  // 2 minutes after
                },
                status: { $in: ['pending', 'confirmed', 'preparing'] }
              }).sort({ orderedAt: -1 });
              
              if (alternativeOrder) {
                console.log(`Found order via foodOrder timestamp: ${alternativeOrder.orderNumber}`);
                
                await alternativeOrder.cancel(
                  `Booking cancellation: ${reason}`,
                  'system',
                  refundCalculation.isEligible
                );
                
                cancelledOrder = {
                  orderId: alternativeOrder._id,
                  orderNumber: alternativeOrder.orderNumber,
                  status: alternativeOrder.status,
                  totalAmount: alternativeOrder.totalAmount
                };
                
                console.log(`Successfully cancelled order ${alternativeOrder.orderNumber} via alternative search`);
              }
            }
            
            if (!alternativeOrder) {
              // Debug: Try to find any orders for this customer and restaurant
              const debugOrders = await Order.find({
                restaurant: booking.foodOrder.restaurantId,
                'customer.phoneNumber': booking.customerDetails.phoneNumber
              }).sort({ orderedAt: -1 }).limit(3);
              
              console.log(`Debug: Found ${debugOrders.length} orders for this customer and restaurant:`);
              debugOrders.forEach(debugOrder => {
                console.log(`- Order ${debugOrder.orderNumber}: ${debugOrder.status}, created: ${debugOrder.orderedAt}`);
              });
            }
          }
        } catch (orderError) {
          // Log error but don't fail the booking cancellation
          console.error('Error cancelling associated order:', orderError);
        }
      }

      await booking.save();

      return {
        success: true,
        data: {
          booking: {
            _id: booking._id,
            bookingId: booking.bookingId,
            status: booking.status,
            cancellation: booking.cancellation
          },
          refund: refund ? {
            refundId: refund.refundId,
            finalRefundAmount: refund.refundCalculation.finalRefundAmount,
            refundStatus: refund.refundStatus,
            processingTime: '3-5 business days'
          } : null,
          cancelledOrder: cancelledOrder, // Include cancelled order information
          refundCalculation
        },
        message: refundCalculation.isEligible 
          ? `Booking cancelled successfully. ${cancelledOrder ? 'Food order also cancelled. ' : ''}Refund of ₹${refundCalculation.finalRefundAmount} will be processed within 3-5 business days.`
          : `Booking cancelled successfully. ${cancelledOrder ? 'Food order also cancelled. ' : ''}No refund available due to cancellation policy.`
      };

    } catch (error) {
      // If refund was created but booking update failed, we might want to rollback
      // For now, we'll let it continue and handle cleanup separately
      throw error;
    }
  }
  /**
   * Generate request signature for security
   * @private
   */
  static generateRequestSignature(requestData) {
    const crypto = require('crypto');
    
    const signatureData = JSON.stringify({
      bookingId: requestData.bookingId,
      userId: requestData.userId,
      amount: requestData.amount,
      timestamp: requestData.timestamp
    });
    
    return crypto.createHash('sha256')
      .update(signatureData)
      .digest('hex');
  }

  /**
   * Validate cancellation request for security
   * @private
   */
  static async validateCancellationRequest(booking, userId, securityData) {
    // Check for rapid successive cancellation attempts
    const recentCancellations = await Booking.countDocuments({
      user: userId,
      status: 'cancelled',
      'cancellation.cancelledAt': {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    });

    if (recentCancellations >= 5) {
      throw new Error('Too many cancellations in the last 24 hours. Please contact support.');
    }

    // Check for refund amount manipulation attempts
    if (securityData.requestedAmount && securityData.requestedAmount !== booking.pricing.totalAmount) {
      throw new Error('Invalid refund amount requested. Security violation detected.');
    }

    return true;
  }

  /**
   * Get refund status
   * @param {String} refundId - Refund ID
   * @param {String} userId - User ID
   * @returns {Object} Refund details
   */
  static async getRefundStatus(refundId, userId) {
    try {
      const refund = await Refund.findOne({
        $or: [
          { _id: refundId },
          { refundId: refundId }
        ],
        user: userId
      }).populate({
        path: 'booking',
        select: 'bookingId chargingStation timeSlot'
      });

      if (!refund) {
        throw new Error('Refund not found');
      }

      return {
        success: true,
        data: refund
      };

    } catch (error) {
      throw new Error(`Failed to get refund status: ${error.message}`);
    }
  }

  /**
   * Get user's refund history
   * @param {String} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Object} Refund history
   */
  static async getUserRefunds(userId, filters = {}) {
    try {
      const query = { user: userId };
      
      if (filters.status) {
        query.refundStatus = filters.status;
      }

      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
        if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
      }

      const refunds = await Refund.find(query)
        .populate({
          path: 'booking',
          select: 'bookingId chargingStation timeSlot'
        })
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: refunds,
        count: refunds.length
      };

    } catch (error) {
      throw new Error(`Failed to get refund history: ${error.message}`);
    }
  }
}

module.exports = RefundService;
