const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const ChargingStation = require('../models/ChargingStation');

const router = express.Router();

// @desc    Get rating status for a booking
// @route   GET /api/ratings/booking/:bookingId
// @access  Public
router.get('/booking/:bookingId', [
  param('bookingId').isMongoId().withMessage('Invalid booking ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID',
        errors: errors.array()
      });
    }

    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate('chargingStation', 'name address rating')
      .populate('user', 'name');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Rating is only available for completed bookings'
      });
    }

    // Check if already rated
    if (booking.stationRating.hasRated) {
      return res.status(200).json({
        success: false,
        message: 'You have already rated this station',
        data: {
          status: 'already_rated',
          rating: booking.stationRating.rating,
          review: booking.stationRating.review,
          ratedAt: booking.stationRating.ratedAt,
          station: booking.chargingStation
        }
      });
    }

    // Check if rating has expired
    const now = new Date();
    if (booking.stationRating.ratingExpiredAt && now > booking.stationRating.ratingExpiredAt) {
      return res.status(200).json({
        success: false,
        message: 'Rating period has expired',
        data: {
          status: 'expired',
          expiredAt: booking.stationRating.ratingExpiredAt,
          station: booking.chargingStation
        }
      });
    }

    // Rating is available
    res.json({
      success: true,
      data: {
        status: 'available',
        booking: {
          _id: booking._id,
          bookingId: booking.bookingId,
          timeSlot: booking.timeSlot,
          completedAt: booking.updatedAt
        },
        station: booking.chargingStation,
        user: booking.user,
        expiresAt: booking.stationRating.ratingExpiredAt
      }
    });

  } catch (error) {
    console.error('Get rating status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rating status'
    });
  }
});

// @desc    Submit station rating
// @route   POST /api/ratings/booking/:bookingId
// @access  Public
router.post('/booking/:bookingId', [
  param('bookingId').isMongoId().withMessage('Invalid booking ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { bookingId } = req.params;
    const { rating, review } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('chargingStation', 'name address rating')
      .populate('user', 'name');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Rating is only available for completed bookings'
      });
    }

    // Check if already rated
    if (booking.stationRating.hasRated) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this station'
      });
    }

    // Check if rating has expired
    const now = new Date();
    if (booking.stationRating.ratingExpiredAt && now > booking.stationRating.ratingExpiredAt) {
      return res.status(400).json({
        success: false,
        message: 'Rating period has expired'
      });
    }

    // Update booking with rating
    booking.stationRating.hasRated = true;
    booking.stationRating.rating = rating;
    booking.stationRating.review = review || '';
    booking.stationRating.ratedAt = new Date();

    await booking.save();

    // Update station rating
    const station = await ChargingStation.findById(booking.chargingStation._id);
    await station.updateRating(rating);

    // Get updated station data
    const updatedStation = await ChargingStation.findById(booking.chargingStation._id);

    res.json({
      success: true,
      message: 'Thank you for rating this charging station!',
      data: {
        rating: {
          rating,
          review,
          ratedAt: booking.stationRating.ratedAt
        },
        station: {
          name: updatedStation.name,
          newRating: {
            average: updatedStation.rating.average,
            count: updatedStation.rating.count
          }
        }
      }
    });

  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating'
    });
  }
});

// @desc    Get station reviews (for station details page)
// @route   GET /api/ratings/station/:stationId/reviews
// @access  Public
router.get('/station/:stationId/reviews', [
  param('stationId').isMongoId().withMessage('Invalid station ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid station ID',
        errors: errors.array()
      });
    }

    const { stationId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Get reviews from bookings
    const reviews = await Booking.find({
      chargingStation: stationId,
      'stationRating.hasRated': true,
      'stationRating.review': { $exists: true, $ne: '' }
    })
    .populate('user', 'name')
    .select('stationRating user createdAt')
    .sort({ 'stationRating.ratedAt': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const totalReviews = await Booking.countDocuments({
      chargingStation: stationId,
      'stationRating.hasRated': true,
      'stationRating.review': { $exists: true, $ne: '' }
    });

    const station = await ChargingStation.findById(stationId).select('name rating');

    res.json({
      success: true,
      data: {
        station: {
          name: station.name,
          rating: station.rating
        },
        reviews: reviews.map(booking => ({
          rating: booking.stationRating.rating,
          review: booking.stationRating.review,
          ratedAt: booking.stationRating.ratedAt,
          userName: booking.user?.name || 'Anonymous',
          bookingDate: booking.createdAt
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReviews / limit),
          totalReviews,
          hasNext: page < Math.ceil(totalReviews / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get station reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch station reviews'
    });
  }
});

module.exports = router; 