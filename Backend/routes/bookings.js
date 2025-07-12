const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const ChargingStation = require('../models/ChargingStation');
const BookingService = require('../services/BookingService');

// Helper function to get Nepal time consistently
const getNepalTime = () => {
  const now = new Date();
  // Convert to Nepal timezone (UTC+5:45)
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}));
};
const router = express.Router();
const { protect } = require('../middleware/auth');

// Simple test route first
router.get('/test', (req, res) => {
  res.json({ message: 'Bookings router is working!' });
});

// Quick booking route (simplified, working version)
router.post('/quick', async (req, res) => {
  try {
    const bookingId = `CHG${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const demoBooking = {
      id: bookingId,
      bookingId,
      station: 'Demo Station',
      address: 'Demo Address',
      date: req.body.date || getNepalTime().toISOString().split('T')[0],
      timeSlot: req.body.timeSlot || { display: '14:30', startTime: '14:30', endTime: '16:30' },
      port: { portNumber: 1, connectorType: 'CCS2', powerOutput: '50kW' },
      customerDetails: req.body.customerDetails || {},
      vehicleDetails: req.body.vehicleDetails || {},
      amount: 300,
      status: 'confirmed',
      createdAt: getNepalTime().toISOString(),
      isFlexible: false
    };

    res.status(201).json({
      success: true,
      data: demoBooking,
      message: 'Demo booking created successfully'
    });
  } catch (error) {
    console.error('Quick booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create demo booking'
    });
  }
});

// Enhanced endpoints using BookingService

// @desc    Get bulk slot counts for all ports across multiple dates (optimized)
// @route   GET /api/bookings/bulk-slot-counts/:stationId
// @access  Public
router.get('/bulk-slot-counts/:stationId', async (req, res) => {
  const startTime = Date.now()
  
  try {
    const { stationId } = req.params;
    const { dates } = req.query; // Comma-separated dates: "2025-06-23,2025-06-24,2025-06-25"
    
    if (!dates) {
      return res.status(400).json({
        success: false,
        message: 'Dates parameter is required (comma-separated list)'
      });
    }

    const station = await ChargingStation.findById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found'
      });
    }

    const dateList = dates.split(',').map(date => date.trim());
    const slotCounts = {};
    
    console.log(`🔄 Bulk slot counts request: Station ${stationId}, ${dateList.length} dates, ${station.chargingPorts.length} ports`);
    
    // Process all dates in parallel for better performance
    await Promise.all(dateList.map(async (date) => {
      slotCounts[date] = {};
      
      // Process all ports for this date in parallel
      await Promise.all(station.chargingPorts.map(async (port) => {
        try {
          const result = await BookingService.getSlotAvailability(stationId, date, port._id);
          
          if (result.success) {
            // Filter available slots based on current time for today
            const today = getNepalTime().toISOString().split('T')[0];
            const isToday = date === today;
            
            let availableSlots = result.data.slots.filter(slot => slot.isAvailable);
            
            // For today, filter out past time slots
            if (isToday) {
              const currentTime = getNepalTime();
              availableSlots = availableSlots.filter(slot => {
                const [hours, minutes] = slot.startTime.split(':').map(Number);
                const slotDateTime = new Date(currentTime);
                slotDateTime.setHours(hours, minutes, 0, 0);
                return slotDateTime >= currentTime;
              });
            }
            
            slotCounts[date][port._id] = availableSlots.length;
          } else {
            slotCounts[date][port._id] = 0;
          }
        } catch (error) {
          console.error(`Error loading slots for port ${port.portNumber} on ${date}:`, error);
          
          // Calculate fallback slot count
          if (date === getNepalTime().toISOString().split('T')[0]) {
            // For today, calculate remaining slots from current time
            const currentTime = getNepalTime();
            const currentHour = currentTime.getHours();
            const currentMinute = currentTime.getMinutes();
            const totalMinutesPassedToday = currentHour * 60 + currentMinute;
            const nextSlotMinute = Math.ceil(totalMinutesPassedToday / 30) * 30;
            const remainingSlots = Math.max(0, 48 - (nextSlotMinute / 30));
            slotCounts[date][port._id] = remainingSlots;
          } else {
            // For future dates, default to 48 slots (24 hours × 2 slots per hour)
            slotCounts[date][port._id] = 48;
          }
        }
      }));
    }));

    const endTime = Date.now();
    const duration = endTime - startTime;
    const totalSlotChecks = dateList.length * station.chargingPorts.length;
    
    console.log(`✅ Bulk slot counts completed: ${duration}ms for ${totalSlotChecks} slot checks (replaced ${totalSlotChecks} individual API calls)`);

    res.status(200).json({
      success: true,
      data: {
        slotCounts,
        stationId,
        dates: dateList,
        totalPorts: station.chargingPorts.length,
        generatedAt: getNepalTime().toISOString(),
        performance: {
          durationMs: duration,
          totalSlotChecks,
          avgTimePerCheck: Math.round(duration / totalSlotChecks * 100) / 100
        }
      }
    });
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`❌ Bulk slot counts failed after ${duration}ms:`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get bulk slot counts',
      performance: {
        durationMs: duration
      }
    });
  }
});

// @desc    Get 24/7 slot availability  
// @route   GET /api/bookings/slots/:stationId
// @access  Public
router.get('/slots/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { date, portId } = req.query;
    
    const result = await BookingService.getSlotAvailability(stationId, date, portId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Get slot availability error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get slot availability'
    });
  }
});

// @desc    Get port availability
// @route   GET /api/bookings/ports/:stationId  
// @access  Public
router.get('/ports/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { date } = req.query;
    
    const station = await ChargingStation.findById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found'
      });
    }

    // Return basic port information
    const portsWithAvailability = station.chargingPorts.map(port => ({
      ...port.toObject(),
      currentBookings: 0,
      isCurrentlyBooked: false
    }));

    res.status(200).json({
      success: true,
      data: {
        ports: portsWithAvailability,
        totalPorts: portsWithAvailability.length,
        availablePorts: portsWithAvailability.length,
        date: date || 'all',
        stationId: stationId
      }
    });
  } catch (error) {
    console.error('Get port availability error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get port availability'
    });
  }
});

// @desc    Create secure booking with conflict prevention
// @route   POST /api/bookings/secure
// @access  Public  
router.post('/secure', async (req, res) => {
  try {
    const result = await BookingService.createSecureBooking(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create secure booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create booking'
    });
  }
});

// @desc    Extend booking duration
// @route   POST /api/bookings/:bookingId/extend
// @access  Public
router.post('/:bookingId/extend', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { additionalDuration } = req.body;
    
    const result = await BookingService.extendBooking(bookingId, additionalDuration);
    res.status(200).json(result);
  } catch (error) {
    console.error('Extend booking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to extend booking'
    });
  }
});

// @desc    Complete booking early
// @route   POST /api/bookings/:bookingId/complete
// @access  Public
router.post('/:bookingId/complete', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const result = await BookingService.completeBookingEarly(bookingId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Complete booking early error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete booking'
    });
  }
});

// @desc    Check slot availability for a specific time slot
// @route   POST /api/bookings/check-slot-availability
// @access  Private
router.post('/check-slot-availability', protect, async (req, res) => {
  try {
    const { stationId, portId, startTime, duration } = req.body;

    // Validate input
    if (!stationId || !portId || !startTime || !duration) {
      return res.status(400).json({
        success: false,
        message: 'stationId, portId, startTime, and duration are required'
      });
    }

    // Validate station exists
    const station = await ChargingStation.findById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found'
      });
    }

    // Validate port exists
    const port = station.chargingPorts.id(portId);
    if (!port) {
      return res.status(404).json({
        success: false,
        message: 'Charging port not found'
      });
    }

    // Calculate end time
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

    // Check for conflicting bookings
    const conflictingBooking = await Booking.findOne({
      chargingStation: stationId,
      'chargingPort.portId': portId,
      status: { $in: ['confirmed', 'active'] },
      $or: [
        {
          'timeSlot.startTime': { $lt: endDateTime },
          'timeSlot.endTime': { $gt: startDateTime }
        }
      ]
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: 'Time slot is not available. There is a conflicting booking.',
        conflictingBooking: {
          startTime: conflictingBooking.timeSlot.startTime,
          endTime: conflictingBooking.timeSlot.endTime,
          bookingId: conflictingBooking.bookingId
        }
      });
    }

    // Check if the time is in the past
    if (startDateTime < getNepalTime()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book time slots in the past'
      });
    }

    // Check if station is operational
    if (!station.isActive || !port.isOperational) {
      return res.status(400).json({
        success: false,
        message: 'Station or charging port is not operational'
      });
    }

    res.json({
      success: true,
      message: 'Time slot is available',
      data: {
        stationId,
        portId,
        startTime: startDateTime,
        endTime: endDateTime,
        duration,
        isAvailable: true
      }
    });

  } catch (error) {
    console.error('Check slot availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check slot availability',
      error: error.message
    });
  }
});

// @desc    Get user bookings
// @route   GET /api/bookings/user
// @access  Public (in real app would be protected)
router.get('/user', async (req, res) => {
  try {
    const { phone, email } = req.query;
    
    // Debug logging
    console.log('User bookings request:');
    console.log('- Raw query:', req.query);
    console.log('- Phone:', phone);
    console.log('- Email:', email);
    
    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: 'Phone or email is required to fetch bookings'
      });
    }

    // Build query to find bookings by customer details
    const query = {};
    if (phone) {
      query['customerDetails.phoneNumber'] = phone;
    }
    if (email) {
      query['customerDetails.email'] = email;
    }

    console.log('- MongoDB query:', query);

    // Fetch bookings from database with population
    const bookings = await Booking.find(query)
      .populate({
        path: 'chargingStation',
        select: 'name address location description amenities operatingHours images chargingPorts'
      })
      .populate({
        path: 'vendor',
        select: 'name businessName email phoneNumber address rating'
      })
      .sort({ createdAt: -1 }) // Most recent first
      .lean(); // For better performance

    console.log('- Found bookings:', bookings.length);

    // Transform data for frontend with complete information
    const transformedBookings = bookings.map(booking => {
      const station = booking.chargingStation;
      const vendor = booking.vendor;
      
      // Format address
      const stationAddress = station?.address ? 
        `${station.address.street}, ${station.address.landmark ? station.address.landmark + ', ' : ''}${station.address.city}, ${station.address.state} ${station.address.pincode}` :
        'Address not available';

      // Find the specific charging port used
      const chargingPort = station?.chargingPorts?.find(port => 
        port._id.toString() === booking.chargingPort.portId.toString()
      ) || booking.chargingPort;

      // Format time slot with proper date handling
      const startTime = new Date(booking.timeSlot.startTime);
      const endTime = new Date(booking.timeSlot.endTime);
      const date = startTime.toISOString().split('T')[0]; // YYYY-MM-DD format

      return {
        id: booking._id,
        bookingId: booking.bookingId,
        
        // Station Information
        station: station?.name || 'Unknown Station',
        stationId: booking.chargingStation,
        address: stationAddress,
        
        // Location for navigation
        location: station?.location ? {
          type: 'Point',
          coordinates: station.location.coordinates, // [lng, lat]
          latitude: station.location.coordinates[1],
          longitude: station.location.coordinates[0]
        } : null,
        
        // Date and Time Information
        date: date,
        timeSlot: {
          startTime: booking.timeSlot.startTime,
          endTime: booking.timeSlot.endTime,
          duration: booking.timeSlot.duration,
          display: `${startTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
          })} - ${endTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
          })}`
        },
        
        // Charging Port Information
        port: {
          portId: booking.chargingPort.portId,
          portNumber: chargingPort?.portNumber || booking.chargingPort.portNumber,
          connectorType: chargingPort?.connectorType || booking.chargingPort.connectorType,
          powerOutput: `${chargingPort?.powerOutput || booking.chargingPort.powerOutput}kW`,
          chargingType: chargingPort?.chargingType || booking.chargingPort.chargingType
        },
        
        // Vehicle Information
        vehicle: {
          vehicleNumber: booking.vehicle?.vehicleNumber || 'Not specified',
          vehicleType: booking.vehicle?.vehicleType || 'car'
        },
        
        // Customer Details
        customerDetails: booking.customerDetails,
        
        // Vendor/Merchant Contact Information
        vendorContact: vendor ? {
          name: vendor.businessName || vendor.name,
          email: vendor.email,
          phone: vendor.phoneNumber,
          address: vendor.address ? 
            `${vendor.address.street}, ${vendor.address.city}, ${vendor.address.state} ${vendor.address.pincode}` :
            'Address not available',
          rating: vendor.rating
        } : null,
        
        // Station Details
        stationDetails: {
          description: station?.description,
          amenities: station?.amenities || [],
          operatingHours: station?.operatingHours,
          images: station?.images || []
        },
          // Pricing Information
        pricing: booking.pricing,
        amount: booking.pricing?.totalAmount || 0,
        merchantAmount: booking.pricing?.merchantAmount || 0,
        platformFee: booking.pricing?.platformFee || 5,
        
        // Status and Booking Info
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        
        // Enhanced Features
        isFlexible: Boolean(booking.isFlexible),
        flexibilityWindow: booking.flexibilityWindow,
        extensionDetails: booking.extensionDetails,
        completionDetails: booking.completionDetails,
        
        // Additional Info
        specialInstructions: booking.specialInstructions,
        qrCode: booking.qrCode,
        canBeCancelled: booking.canBeCancelled,
        
        // Usage Information
        actualUsage: booking.actualUsage
      };
    });

    res.status(200).json({
      success: true,
      data: transformedBookings,
      count: transformedBookings.length,
      message: `Found ${transformedBookings.length} bookings`
    });

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch bookings'
    });
  }
});

// @desc    Get booking by ID
// @route   GET /api/bookings/:bookingId
// @access  Public
router.get('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findOne({
      $or: [
        { _id: bookingId },
        { bookingId: bookingId }
      ]
    }).lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Transform data for frontend
    const transformedBooking = {
      id: booking._id,
      bookingId: booking.bookingId,
      station: booking.station,
      address: booking.address,
      date: booking.date,
      timeSlot: booking.timeSlot,
      port: booking.port,
      customerDetails: booking.customerDetails,
      vehicleDetails: booking.vehicleDetails,      pricing: booking.pricing,
      amount: booking.pricing?.totalAmount || booking.amount,
      merchantAmount: booking.pricing?.merchantAmount || 0,
      platformFee: booking.pricing?.platformFee || 5,
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      isFlexible: booking.isFlexible,
      flexibilityWindow: booking.flexibilityWindow,
      extensionDetails: booking.extensionDetails,
      completionDetails: booking.completionDetails
    };

    res.status(200).json({
      success: true,
      data: transformedBooking,
      message: 'Booking found'
    });

  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch booking'
    });
  }
});

// @desc    Get real-time booking conflicts and available windows
// @route   GET /api/bookings/realtime-availability/:stationId
// @access  Public
router.get('/realtime-availability/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { date, portId, realTime, includeConflicts } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD format'
      });
    }
    
    // Validate stationId format
    if (!mongoose.Types.ObjectId.isValid(stationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid station ID format'
      });
    }
    
    // Validate portId format if provided
    if (portId && !mongoose.Types.ObjectId.isValid(portId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid port ID format'
      });
    }

    const station = await ChargingStation.findById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found'
      });
    }

    // Get existing bookings for the date
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const query = {
      chargingStation: stationId,
      status: { $in: ['confirmed', 'active'] },
      'timeSlot.startTime': { $lt: endOfDay },
      'timeSlot.endTime': { $gt: startOfDay }
    };

    if (portId) {
      query['chargingPort.portId'] = portId;
    }

    const existingBookings = await Booking.find(query).lean();

    // Transform bookings for conflict analysis
    const conflicts = existingBookings.map(booking => ({
      bookingId: booking.bookingId,
      portId: booking.chargingPort.portId,
      startTime: new Date(booking.timeSlot.startTime).toTimeString().substring(0, 5), // HH:MM format
      endTime: new Date(booking.timeSlot.endTime).toTimeString().substring(0, 5),
      duration: booking.timeSlot.duration,
      vehicleNumber: booking.vehicle?.vehicleNumber || booking.customerDetails?.vehicleNumber
    }));

    // Calculate available windows for each port
    const portsWithAvailability = [];
    const targetPorts = portId ? [station.chargingPorts.id(portId)] : station.chargingPorts;

    for (const port of targetPorts) {
      if (!port || !port.isOperational) continue;

      const portConflicts = conflicts.filter(c => c.portId.toString() === port._id.toString());
      
      // Generate 5-minute slots for the day
      const slots = [];
      
      const nepalTime = getNepalTime();
      const isToday = date === nepalTime.toISOString().split('T')[0];
      const currentTime = nepalTime;
      
      console.log(`🔍 Generating slots for ${date}, isToday: ${isToday}, Nepal currentTime: ${currentTime.toLocaleTimeString()}`);
      console.log(`🇳🇵 Nepal Time Debug: Server time: ${new Date().toLocaleString()}, Nepal time: ${currentTime.toLocaleString()}`);
      
      // Calculate the buffer time for today (in Nepal time)
      const bufferTime = isToday ? new Date(currentTime.getTime() + 5 * 60 * 1000) : null;
      if (bufferTime) {
        console.log(`⏰ Buffer time: ${bufferTime.toLocaleTimeString()}`);
      }
      
      // Calculate starting hour and minute for today
      let startHour = 0;
      let startMinute = 0;
      
      if (isToday && bufferTime) {
        startHour = bufferTime.getHours();
        startMinute = bufferTime.getMinutes();
        // Round up to next 5-minute interval
        startMinute = Math.ceil(startMinute / 5) * 5;
        if (startMinute >= 60) {
          startHour += 1;
          startMinute = 0;
        }
        console.log(`🚀 Starting slot generation from ${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`);
        
        // For debugging: show what the exact buffer time would be
        const exactBufferTime = `${bufferTime.getHours().toString().padStart(2, '0')}:${bufferTime.getMinutes().toString().padStart(2, '0')}`;
        console.log(`🎯 Exact buffer time: ${exactBufferTime}`);
      }
      
      // Get operating hours for the selected date
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[new Date(date).getDay()];
      const operatingHours = station.operatingHours?.[dayOfWeek];
      
      // Calculate operating hours in minutes
      let stationOpenMinutes = 0;
      let stationCloseMinutes = 24 * 60; // Default to end of day
      
      if (operatingHours && !operatingHours.is24Hours && operatingHours.open && operatingHours.close) {
        const [openHour, openMin] = operatingHours.open.split(':').map(Number);
        const [closeHour, closeMin] = operatingHours.close.split(':').map(Number);
        
        stationOpenMinutes = openHour * 60 + openMin;
        stationCloseMinutes = closeHour * 60 + closeMin;
        
        // Handle next-day closing (e.g., open 22:00, close 06:00)
        if (stationCloseMinutes <= stationOpenMinutes) {
          stationCloseMinutes += 24 * 60; // Add 24 hours
        }
      }
      
      console.log(`🕒 Operating hours for ${dayOfWeek}: ${operatingHours?.is24Hours ? '24/7' : `${operatingHours?.open || '00:00'} - ${operatingHours?.close || '23:59'}`}`);
      console.log(`📊 Station open: ${Math.floor(stationOpenMinutes / 60)}:${(stationOpenMinutes % 60).toString().padStart(2, '0')}, close: ${Math.floor(stationCloseMinutes / 60)}:${(stationCloseMinutes % 60).toString().padStart(2, '0')}`);
      
      // Calculate actual start time considering operating hours and current time
      let actualStartHour = Math.floor(stationOpenMinutes / 60);
      let actualStartMinute = stationOpenMinutes % 60;
      
      if (isToday) {
        // For today: start from the later of (current time + buffer) or station opening
        const nextAvailableTime = new Date(currentTime.getTime() + 5 * 60 * 1000); // 5-minute buffer
        const nextHour = nextAvailableTime.getHours();
        const nextMinute = Math.ceil(nextAvailableTime.getMinutes() / 5) * 5;
        
        if (nextHour * 60 + nextMinute > stationOpenMinutes) {
          actualStartHour = nextHour;
          actualStartMinute = nextMinute;
        }
      }
      
      // Round start minute to 5-minute intervals
      actualStartMinute = Math.ceil(actualStartMinute / 5) * 5;
      if (actualStartMinute >= 60) {
        actualStartHour += 1;
        actualStartMinute = 0;
      }
      
      console.log(`🚀 Generating slots from ${actualStartHour.toString().padStart(2, '0')}:${actualStartMinute.toString().padStart(2, '0')} to ${Math.floor(stationCloseMinutes / 60)}:${(stationCloseMinutes % 60).toString().padStart(2, '0')}`);
      
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 5) {
          const slotMinutes = hour * 60 + minute;
          
          // Skip slots outside operating hours
          if (slotMinutes < stationOpenMinutes || slotMinutes >= stationCloseMinutes) {
            continue;
          }
          
          // Skip slots before the calculated start time for today
          if (isToday && (hour < actualStartHour || (hour === actualStartHour && minute < actualStartMinute))) {
            continue;
          }
          
          const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

          // Check for conflicts with existing bookings
          const hasConflict = portConflicts.some(conflict => {
            const conflictStart = conflict.startTime;
            const conflictEnd = conflict.endTime;
            return slotTime >= conflictStart && slotTime < conflictEnd;
          });

          slots.push({
            time: slotTime,
            isAvailable: !hasConflict,
            conflicts: hasConflict ? portConflicts.filter(c => 
              slotTime >= c.startTime && slotTime < c.endTime
            ) : []
          });
          
          // Log the first slot being added
          if (slots.length === 1) {
            console.log(`✅ First slot added: ${slotTime} (available: ${!hasConflict})`);
          }
        }
      }

      portsWithAvailability.push({
        portId: port._id,
        portNumber: port.portNumber,
        connectorType: port.connectorType,
        powerOutput: port.powerOutput,
        isOperational: port.isOperational,
        availableSlots: slots.filter(s => s.isAvailable).length,
        totalSlots: slots.length,
        conflicts: portConflicts,
        slots: includeConflicts === 'true' ? slots : slots.filter(s => s.isAvailable)
      });
    }

    res.status(200).json({
      success: true,
      data: {
        stationId,
        date,
        totalExistingBookings: existingBookings.length,
        ports: portsWithAvailability,
        generatedAt: getNepalTime().toISOString(),
        realTimeData: true
      }
    });

  } catch (error) {
    console.error('Get real-time availability error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get real-time availability'
    });
  }
});

// @desc    Get booking conflicts for a specific port and date range
// @route   GET /api/bookings/conflicts/:stationId
// @access  Public
router.get('/conflicts/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { portId, date, startTime, endTime } = req.query;
    
    if (!portId || !date) {
      return res.status(400).json({
        success: false,
        message: 'portId and date are required'
      });
    }

    // Build time range query
    let timeQuery = {};
    if (startTime && endTime) {
      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);
      
      timeQuery = {
        $or: [
          {
            'timeSlot.startTime': { $lt: endDateTime },
            'timeSlot.endTime': { $gt: startDateTime }
          }
        ]
      };
    } else {
      // Get all bookings for the date
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);
      
      timeQuery = {
        'timeSlot.startTime': { $lt: endOfDay },
        'timeSlot.endTime': { $gt: startOfDay }
      };
    }

    const conflicts = await Booking.find({
      chargingStation: stationId,
      'chargingPort.portId': portId,
      status: { $in: ['confirmed', 'active'] },
      ...timeQuery
    }).lean();

    const transformedConflicts = conflicts.map(booking => ({
      bookingId: booking.bookingId,
      startTime: new Date(booking.timeSlot.startTime).toTimeString().substring(0, 5),
      endTime: new Date(booking.timeSlot.endTime).toTimeString().substring(0, 5),
      duration: booking.timeSlot.duration,
      vehicleNumber: booking.vehicle?.vehicleNumber || booking.customerDetails?.vehicleNumber,
      customerPhone: booking.customerDetails?.phoneNumber,
      status: booking.status
    }));

    res.status(200).json({
      success: true,
      data: {
        stationId,
        portId,
        date,
        timeRange: startTime && endTime ? { startTime, endTime } : 'full_day',
        conflicts: transformedConflicts,
        conflictCount: transformedConflicts.length,
        hasConflicts: transformedConflicts.length > 0
      }
    });

  } catch (error) {
    console.error('Get booking conflicts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get booking conflicts'
    });
  }
});

// @desc    Get existing bookings for a specific date and port (for dynamic slot generation)
// @route   GET /api/bookings/existing/:stationId
// @access  Public
router.get('/existing/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { date, portId } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Get bookings for the specific date
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const query = {
      chargingStation: stationId,
      status: { $in: ['confirmed', 'active'] },
      'timeSlot.startTime': { $lt: endOfDay },
      'timeSlot.endTime': { $gt: startOfDay }
    };

    if (portId) {
      query['chargingPort.portId'] = portId;
    }

    const bookings = await Booking.find(query).lean();

    // Transform bookings for frontend dynamic slot generation
    const existingBookings = bookings.map(booking => {
      const startTime = new Date(booking.timeSlot.startTime);
      const endTime = new Date(booking.timeSlot.endTime);

      return {
        bookingId: booking.bookingId,
        portId: booking.chargingPort.portId,
        startTime: startTime.toTimeString().substring(0, 5), // HH:MM format
        endTime: endTime.toTimeString().substring(0, 5),
        duration: booking.timeSlot.duration,
        vehicleNumber: booking.vehicle?.vehicleNumber || booking.customerDetails?.vehicleNumber,
        isFlexible: booking.isFlexible,
        status: booking.status
      };
    });

    res.status(200).json({
      success: true,
      data: {
        stationId,
        date,
        portId: portId || 'all_ports',
        bookings: existingBookings,
        totalBookings: existingBookings.length,
        generatedAt: getNepalTime().toISOString()
      }
    });

  } catch (error) {
    console.error('Get existing bookings error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get existing bookings'
    });
  }
});

module.exports = router;
