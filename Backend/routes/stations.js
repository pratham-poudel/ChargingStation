const express = require('express');
const axios = require('axios');
const ChargingStation = require('../models/ChargingStation');
const Booking = require('../models/Booking');
const BookingService = require('../services/BookingService');
const { 
  searchValidation,
  paginationValidation,
  mongoIdValidation,
  handleValidationErrors 
} = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');
const { cacheStationData } = require('../middleware/cache');

const router = express.Router();

// Galli Maps API configuration
const MAP_API_BASE_URL = 'https://route-init.gallimap.com/api/v1';
const ACCESS_TOKEN = '89a40903-b75a-46b6-822b-86eebad4fa36';

// Create axios instance for map API
const mapAPI = axios.create({
  baseURL: MAP_API_BASE_URL,
  timeout: 10000,
});

// Helper function to check if station has available slots for today
const checkTodaySlotAvailability = async (stationId, chargingPorts) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date();
    
    // Check if any port has available slots for today
    for (const port of chargingPorts) {
      try {
        const result = await BookingService.getSlotAvailability(stationId, today, port._id);
        
        if (result.success) {
          // Filter available slots that haven't passed yet (for today)
          const availableSlots = result.data.slots.filter(slot => {
            if (!slot.isAvailable) return false;
            
            const [hours, minutes] = slot.startTime.split(':').map(Number);
            const slotDateTime = new Date(currentTime);
            slotDateTime.setHours(hours, minutes, 0, 0);
            
            return slotDateTime >= currentTime;
          });
          
          if (availableSlots.length > 0) {
            return {
              hasAvailableSlots: true,
              availableSlotsCount: availableSlots.length,
              nextAvailableSlot: availableSlots[0]
            };
          }
        }
      } catch (portError) {
        console.error(`Error checking port ${port.portNumber} for station ${stationId}:`, portError.message);
        continue; // Try next port
      }
    }
    
    return {
      hasAvailableSlots: false,
      availableSlotsCount: 0,
      nextAvailableSlot: null
    };
  } catch (error) {
    console.error(`Error checking slot availability for station ${stationId}:`, error.message);
    // Return true by default to avoid filtering out stations due to errors
    return {
      hasAvailableSlots: true,
      availableSlotsCount: null,
      nextAvailableSlot: null,
      error: error.message
    };
  }
};

// Helper function to get real travel time from Galli Maps API
const getRealTravelTime = async (srcLat, srcLng, dstLat, dstLng) => {
  try {
    const response = await mapAPI.get('/routing/distance', {
      params: {
        accessToken: ACCESS_TOKEN,
        mode: 'driving',
        srcLat,
        srcLng,
        dstLat,
        dstLng
      }
    });

    if (response.data.success && response.data.data.data.length > 0) {
      const routeData = response.data.data.data[0];
      return {
        distance: routeData.distance, // in meters
        duration: Math.round(routeData.duration / 60), // convert to minutes
        isReal: true      };
    }
  } catch (error) {
    console.error('Real travel time API error:', error.message);
    throw new Error('Unable to calculate travel time');
  }
  
  throw new Error('No route data available from Galli Maps API');
};

// @desc    Get all charging stations with search and filters
// @route   GET /api/stations
// @access  Public
const getStations = async (req, res, next) => {try {
    const {
      latitude,
      longitude,
      maxDistance = 10, // in km
      chargingType,
      connectorType,
      amenities,
      minRating,
      sortBy = 'distance',
      page = 1,
      limit = 20,
      search // Add search parameter
    } = req.query;

    // Build query
    let query = {
      isActive: true,
      isVerified: true
    };

    // Add text search if search parameter is provided
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { 'address.city': { $regex: search.trim(), $options: 'i' } },
        { 'address.state': { $regex: search.trim(), $options: 'i' } },
        { 'address.street': { $regex: search.trim(), $options: 'i' } },
        { 'address.landmark': { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }// Add charging type filter
    if (chargingType) {
      query['chargingPorts.chargingType'] = chargingType;
    }

    // Add connector type filter
    if (connectorType) {
      query['chargingPorts.connectorType'] = connectorType;
    }

    // Add amenities filter
    if (amenities) {
      let amenitiesArray;
      if (Array.isArray(amenities)) {
        amenitiesArray = amenities;
      } else if (typeof amenities === 'string') {
        amenitiesArray = amenities.split(',');
      } else {
        amenitiesArray = [amenities];
      }
      query.amenities = { $in: amenitiesArray };
    }

    // Add rating filter
    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    let stations;    if (latitude && longitude && !search) {
      // Location-based search with strict distance filtering
      const maxDistanceMeters = parseInt(maxDistance) * 1000; // Ensure integer conversion
      
      stations = await ChargingStation.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            distanceField: 'distance',
            maxDistance: maxDistanceMeters,
            spherical: true,
            query: query
          }
        },
        {
          // Add additional filter to ensure exact distance limit
          $match: {
            distance: { $lte: maxDistanceMeters }
          }
        },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendor',
            foreignField: '_id',
            as: 'vendorInfo'
          }
        },
        {
          $addFields: {
            distanceKm: { $divide: ['$distance', 1000] },            estimatedTravelTime: {
              $round: {
                $max: [
                  { $multiply: [{ $divide: ['$distance', 1000] }, 2] }, // 2 minutes per km (more realistic)
                  5 // minimum 5 minutes
                ]
              }
            },
            availablePorts: {
              $size: {
                $filter: {
                  input: '$chargingPorts',
                  cond: {
                    $and: [
                      { $eq: ['$$this.isOperational', true] },
                      { $eq: ['$$this.currentStatus', 'available'] }
                    ]
                  }
                }
              }
            }
          }
        },        {
          $addFields: {
            // Calculate premium score based on both legacy and new premium subscription
            premiumScore: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$premiumSubscription.isActive', true] },
                    { $gt: ['$premiumSubscription.endDate', new Date()] }
                  ]
                },
                3, // Highest priority for active premium subscription
                {
                  $cond: [
                    { $eq: ['$dockitRecommended', true] },
                    2, // Medium priority for legacy recommended stations
                    1  // Regular priority for standard stations
                  ]
                }
              ]
            }
          }
        },
        {
          $sort: sortBy === 'distance' ? { premiumScore: -1, distance: 1 } : 
                 sortBy === 'rating' ? { premiumScore: -1, 'rating.average': -1 } :
                 sortBy === 'price' ? { premiumScore: -1, 'chargingPorts.pricePerUnit': 1 } :
                 { premiumScore: -1, distance: 1 }
        },
        {
          $skip: (page - 1) * limit
        },
        {
          $limit: parseInt(limit)
        },        {          $project: {
            name: 1,
            location: 1,
            address: 1,
            description: 1,
            amenities: 1,
            operatingHours: 1,
            images: 1,
            chargingPorts: 1,
            totalPorts: 1,
            availablePorts: 1,
            rating: 1,
            dockitRecommended: 1,
            premiumSubscription: 1,
            premiumScore: 1,
            distanceKm: 1,
            estimatedTravelTime: 1,
            stationMaster: 1, // Include stationMaster field
            vendor: { $arrayElemAt: ['$vendorInfo', 0] }, // Include full vendor object
            vendorInfo: { $arrayElemAt: ['$vendorInfo.businessName', 0] },
            formattedAddress: {
              $concat: [
                '$address.street',
                { $cond: ['$address.landmark', { $concat: [', ', '$address.landmark'] }, ''] },
                ', ',
                '$address.city',
                ', ',
                '$address.state',
                ' - ',
                '$address.pincode'
              ]            },
            // Add premium status for frontend display
            isPremium: {
              $and: [
                { $eq: ['$premiumSubscription.isActive', true] },
                { $gt: ['$premiumSubscription.endDate', new Date()] }
              ]
            }
          }
        }
      ]);

      // Get real travel times for the nearest 3 stations to improve accuracy
      if (stations.length > 0) {
        const nearestStations = stations.slice(0, 3);
        const stationsWithRealTimes = [];
        
        for (const station of nearestStations) {
          try {
            const realTime = await getRealTravelTime(
              latitude,
              longitude,
              station.location.coordinates[1], // lat
              station.location.coordinates[0]  // lng
            );
            stationsWithRealTimes.push({
              ...station,
              estimatedTravelTime: realTime.duration,
              isRealTravelTime: realTime.isReal
            });
          } catch (error) {
            console.error(`Error getting real travel time for station ${station._id}:`, error.message);
            stationsWithRealTimes.push(station);
          }
        }
        
        // Combine stations with real times and remaining stations
        stations = [...stationsWithRealTimes, ...stations.slice(3)];
      }    } else if (search && search.trim()) {
      // Universal search without location restrictions
      const skip = (page - 1) * limit;
      
      stations = await ChargingStation.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendor',
            foreignField: '_id',
            as: 'vendorInfo'
          }
        },
        {
          $addFields: {
            // Calculate premium score for universal search
            premiumScore: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$premiumSubscription.isActive', true] },
                    { $gt: ['$premiumSubscription.endDate', new Date()] }
                  ]
                },
                3, // Highest priority for active premium subscription
                {
                  $cond: [
                    { $eq: ['$dockitRecommended', true] },
                    2, // Medium priority for legacy recommended stations
                    1  // Regular priority for standard stations
                  ]
                }
              ]
            },
            availablePorts: {
              $size: {
                $filter: {
                  input: '$chargingPorts',
                  cond: {
                    $and: [
                      { $eq: ['$$this.isOperational', true] },
                      { $eq: ['$$this.currentStatus', 'available'] }
                    ]
                  }
                }
              }
            }
          }
        },
        {
          $sort: 
            sortBy === 'rating' ? { premiumScore: -1, 'rating.average': -1 } :
            sortBy === 'price' ? { premiumScore: -1, 'chargingPorts.pricePerUnit': 1 } :
            { premiumScore: -1, createdAt: -1 }
        },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $project: {
            name: 1,
            location: 1,
            address: 1,
            description: 1,
            amenities: 1,
            operatingHours: 1,
            images: 1,
            chargingPorts: 1,
            totalPorts: 1,
            availablePorts: 1,
            rating: 1,
            dockitRecommended: 1,
            premiumSubscription: 1,
            premiumScore: 1,
            stationMaster: 1,
            vendor: { $arrayElemAt: ['$vendorInfo', 0] },
            vendorInfo: { $arrayElemAt: ['$vendorInfo.businessName', 0] },
            formattedAddress: {
              $concat: [
                '$address.street',
                { $cond: ['$address.landmark', { $concat: [', ', '$address.landmark'] }, ''] },
                ', ',
                '$address.city',
                ', ',
                '$address.state',
                ' - ',
                '$address.pincode'
              ]
            },
            isPremium: {
              $and: [
                { $eq: ['$premiumSubscription.isActive', true] },
                { $gt: ['$premiumSubscription.endDate', new Date()] }
              ]
            }
          }
        }
      ]);    } else {
      // Regular search without location or search query
      const skip = (page - 1) * limit;
      
      stations = await ChargingStation.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendor',
            foreignField: '_id',
            as: 'vendorInfo'
          }
        },
        {
          $addFields: {
            // Calculate premium score for regular search
            premiumScore: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$premiumSubscription.isActive', true] },
                    { $gt: ['$premiumSubscription.endDate', new Date()] }
                  ]
                },
                3, // Highest priority for active premium subscription
                {
                  $cond: [
                    { $eq: ['$dockitRecommended', true] },
                    2, // Medium priority for legacy recommended stations
                    1  // Regular priority for standard stations
                  ]
                }
              ]
            },
            availablePorts: {
              $size: {
                $filter: {
                  input: '$chargingPorts',
                  cond: {
                    $and: [
                      { $eq: ['$$this.isOperational', true] },
                      { $eq: ['$$this.currentStatus', 'available'] }
                    ]
                  }
                }
              }
            }
          }
        },
        {
          $sort: 
            sortBy === 'rating' ? { premiumScore: -1, 'rating.average': -1 } :
            sortBy === 'price' ? { premiumScore: -1, 'chargingPorts.pricePerUnit': 1 } :
            { premiumScore: -1, createdAt: -1 }
        },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $project: {
            name: 1,
            location: 1,
            address: 1,
            description: 1,
            amenities: 1,
            operatingHours: 1,
            images: 1,
            chargingPorts: 1,
            totalPorts: 1,
            availablePorts: 1,
            rating: 1,
            dockitRecommended: 1,
            premiumSubscription: 1,
            premiumScore: 1,
            stationMaster: 1,
            vendor: { $arrayElemAt: ['$vendorInfo', 0] },
            vendorInfo: { $arrayElemAt: ['$vendorInfo.businessName', 0] },
            formattedAddress: {
              $concat: [
                '$address.street',
                { $cond: ['$address.landmark', { $concat: [', ', '$address.landmark'] }, ''] },
                ', ',
                '$address.city',
                ', ',
                '$address.state',
                ' - ',
                '$address.pincode'
              ]
            },
            isPremium: {
              $and: [
                { $eq: ['$premiumSubscription.isActive', true] },
                { $gt: ['$premiumSubscription.endDate', new Date()] }
              ]
            }
          }
        }
      ]);    }    // 🚀 Enhanced Feature: Validate today's slot availability for all stations
    console.log(`🔍 Validating today's slot availability for ${stations.length} stations...`);
    const slotValidationStartTime = Date.now();
    
    const stationsWithSlotValidation = await Promise.all(
      stations.map(async (station) => {
        const slotAvailability = await checkTodaySlotAvailability(station._id, station.chargingPorts);
        
        return {
          ...station,
          // Ensure vendor information is preserved correctly
          vendor: station.vendor, // Keep the full vendor object
          vendorInfo: station.vendor?.businessName || station.vendorInfo,
          managedBy: station.stationMaster?.name || 'Station Master',
          ownedBy: station.vendor?.businessName || station.vendorInfo,
          todayAvailability: {
            hasAvailableSlots: slotAvailability.hasAvailableSlots,
            availableSlotsCount: slotAvailability.availableSlotsCount,
            nextAvailableSlot: slotAvailability.nextAvailableSlot,
            validationError: slotAvailability.error || null
          },
          // Add booking urgency indicator
          bookingUrgency: slotAvailability.availableSlotsCount !== null ? 
            (slotAvailability.availableSlotsCount <= 5 ? 'high' : 
             slotAvailability.availableSlotsCount <= 15 ? 'medium' : 'low') : 'unknown'
        };
      })
    );

    // Filter out stations with no available slots for today (optional - based on query parameter)
    const { includeUnavailable = 'true' } = req.query;
    const finalStations = includeUnavailable === 'false' ? 
      stationsWithSlotValidation.filter(station => station.todayAvailability.hasAvailableSlots) :
      stationsWithSlotValidation;

    const slotValidationEndTime = Date.now();
    const validationDuration = slotValidationEndTime - slotValidationStartTime;
    
    console.log(`✅ Slot validation completed: ${validationDuration}ms for ${stations.length} stations (${finalStations.length} available)`);

    // Get total count for pagination
    const totalStations = await ChargingStation.countDocuments(query);
    const totalPages = Math.ceil(totalStations / limit);

    res.status(200).json({
      success: true,
      count: finalStations.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalStations,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        includeUnavailable: includeUnavailable,
        originalCount: stations.length,
        availableToday: finalStations.filter(s => s.todayAvailability.hasAvailableSlots).length,
        unavailableToday: finalStations.filter(s => !s.todayAvailability.hasAvailableSlots).length
      },
      performance: {
        slotValidationDuration: `${validationDuration}ms`,
        averageValidationPerStation: `${Math.round(validationDuration / stations.length)}ms`
      },
      data: finalStations
    });
  } catch (error) {
    console.error('Get stations error:', error);
    next(error);
  }
};

// @desc    Get single charging station
// @route   GET /api/stations/:id
// @access  Public
const getStation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.query;
    
    const station = await ChargingStation.findById(req.params.id)
      .populate('vendor', 'businessName email phoneNumber rating')
      .lean();

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found'
      });
    }

    if (!station.isActive || !station.isVerified) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not available'
      });
    }

    // Add computed fields
    let stationData = {
      ...station,
      formattedAddress: `${station.address.street}${station.address.landmark ? ', ' + station.address.landmark : ''}, ${station.address.city}, ${station.address.state} - ${station.address.pincode}`,
      availablePorts: station.chargingPorts.filter(port => 
        port.isOperational && port.currentStatus === 'available'
      ).length
    };

    // Add distance and travel time if user location provided
    if (latitude && longitude) {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        station.location.coordinates[1], // latitude
        station.location.coordinates[0]  // longitude
      );
        stationData.distanceKm = Math.round(distance * 100) / 100;
      stationData.estimatedTravelTime = estimateTravelTime(distance);
    }

    // 🚀 Enhanced Feature: Add today's slot availability validation
    console.log(`🔍 Validating today's slot availability for station ${station._id}...`);
    const slotAvailability = await checkTodaySlotAvailability(station._id, station.chargingPorts);
    
    stationData.todayAvailability = {
      hasAvailableSlots: slotAvailability.hasAvailableSlots,
      availableSlotsCount: slotAvailability.availableSlotsCount,
      nextAvailableSlot: slotAvailability.nextAvailableSlot,
      validationError: slotAvailability.error || null
    };

    // Add booking urgency and recommendations
    stationData.bookingRecommendation = {
      urgency: slotAvailability.availableSlotsCount !== null ? 
        (slotAvailability.availableSlotsCount <= 5 ? 'high' : 
         slotAvailability.availableSlotsCount <= 15 ? 'medium' : 'low') : 'unknown',
      message: slotAvailability.availableSlotsCount !== null ? 
        (slotAvailability.availableSlotsCount === 0 ? 'No slots available today' :
         slotAvailability.availableSlotsCount <= 5 ? 'Limited slots available - Book now!' :
         slotAvailability.availableSlotsCount <= 15 ? 'Good availability' : 'Plenty of slots available') : 
        'Availability check in progress',
      canBookToday: slotAvailability.hasAvailableSlots
    };

    res.status(200).json({
      success: true,
      data: stationData
    });
  } catch (error) {
    console.error('Get station error:', error);
    next(error);
  }
};

// @desc    Get available time slots for a charging port
// @route   GET /api/stations/:stationId/ports/:portId/slots
// @access  Public
const getAvailableSlots = async (req, res, next) => {
  try {
    const { stationId, portId } = req.params;
    const { date, duration = 60 } = req.query;

    // Validate station and port
    const station = await ChargingStation.findById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found'
      });
    }

    const port = station.chargingPorts.id(portId);
    if (!port) {
      return res.status(404).json({
        success: false,
        message: 'Charging port not found'
      });
    }

    if (!port.isOperational || port.currentStatus !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Charging port is not available'
      });
    }

    // Get available slots
    const targetDate = date ? new Date(date) : new Date();
    const availableSlots = await Booking.getAvailableSlots(portId, targetDate, parseInt(duration));

    // Filter slots based on station operating hours
    const filteredSlots = availableSlots.filter(slot => {
      return station.isOpenAt(slot.startTime) && station.isOpenAt(slot.endTime);
    });

    res.status(200).json({
      success: true,
      data: {
        date: targetDate.toISOString().split('T')[0],
        duration: parseInt(duration),
        port: {
          id: port._id,
          portNumber: port.portNumber,
          connectorType: port.connectorType,
          powerOutput: port.powerOutput,
          chargingType: port.chargingType,
          pricePerUnit: port.pricePerUnit
        },
        availableSlots: filteredSlots
      }
    });
  } catch (error) {
    console.error('Get available slots error:', error);
    next(error);
  }
};

// @desc    Get nearby charging stations
// @route   GET /api/stations/nearby
// @access  Public
const getNearbyStations = async (req, res, next) => {
  try {
    const { latitude, longitude, maxDistance = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const stations = await ChargingStation.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      maxDistance * 1000 // Convert km to meters
    );

    // Add distance and travel time
    const stationsWithDistance = stations.map(station => {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        station.location.coordinates[1], // latitude
        station.location.coordinates[0]  // longitude
      );

      return {
        ...station.toObject(),
        distanceKm: Math.round(distance * 100) / 100,
        estimatedTravelTime: estimateTravelTime(distance),
        formattedAddress: station.formattedAddress,
        availablePorts: station.currentlyAvailable
      };
    });

    // Sort by distance
    stationsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    res.status(200).json({
      success: true,
      count: stationsWithDistance.length,
      data: stationsWithDistance
    });
  } catch (error) {
    console.error('Get nearby stations error:', error);
    next(error);
  }
};

// @desc    Search charging stations
// @route   GET /api/stations/search
// @access  Public
const searchStations = async (req, res, next) => {
  try {
    const { 
      q, 
      city, 
      state, 
      pincode,
      page = 1, 
      limit = 20 
    } = req.query;

    let query = {
      isActive: true,
      isVerified: true
    };

    // Text search
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'address.street': { $regex: q, $options: 'i' } },
        { 'address.landmark': { $regex: q, $options: 'i' } }
      ];
    }

    // Location filters
    if (city) {
      query['address.city'] = { $regex: city, $options: 'i' };
    }
    if (state) {
      query['address.state'] = { $regex: state, $options: 'i' };
    }
    if (pincode) {
      query['address.pincode'] = pincode;
    }

    const skip = (page - 1) * limit;
    
    const stations = await ChargingStation.find(query)
      .populate('vendor', 'businessName')
      .select('-__v')
      .sort({ 'rating.average': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Add computed fields
    const stationsWithData = stations.map(station => ({
      ...station,
      formattedAddress: `${station.address.street}${station.address.landmark ? ', ' + station.address.landmark : ''}, ${station.address.city}, ${station.address.state} - ${station.address.pincode}`,
      availablePorts: station.chargingPorts.filter(port => 
        port.isOperational && port.currentStatus === 'available'
      ).length,
      vendorInfo: station.vendor?.businessName
    }));

    const totalStations = await ChargingStation.countDocuments(query);
    const totalPages = Math.ceil(totalStations / limit);

    res.status(200).json({
      success: true,
      count: stationsWithData.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalStations,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      data: stationsWithData
    });
  } catch (error) {
    console.error('Search stations error:', error);
    next(error);
  }
};

// @desc    Get nearest station info for location selector
// @route   GET /api/stations/nearest-info
// @access  Public
const getNearestStationInfo = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude'
      });
    }    // Get all stations (remove status filter to debug)
    const allStations = await ChargingStation.find({});

    console.log('Total stations found:', allStations.length);
    if (allStations.length > 0) {
      console.log('Sample station:', allStations[0]);
    }

    if (!allStations || allStations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No charging stations found in the database'
      });
    }

    // Calculate distance to each station and find the nearest one
    let nearestStation = null;
    let nearestDistance = Infinity;

    for (const station of allStations) {
      if (station.location && station.location.coordinates) {
        const stationLng = station.location.coordinates[0];
        const stationLat = station.location.coordinates[1];
        
        // Calculate straight-line distance using Haversine formula
        const R = 6371; // Earth's radius in kilometers
        const dLat = (stationLat - lat) * Math.PI / 180;
        const dLng = (stationLng - lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat * Math.PI / 180) * Math.cos(stationLat * Math.PI / 180) * 
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestStation = station;
        }
      }
    }

    if (!nearestStation) {
      return res.status(404).json({
        success: false,
        message: 'No valid charging stations found with location data'
      });
    }

    // Get real travel time using Galli Maps API
    const travelInfo = await getRealTravelTime(
      lat,
      lng,
      nearestStation.location.coordinates[1], // latitude
      nearestStation.location.coordinates[0]  // longitude
    );    res.json({
      success: true,
      data: {
        station: {
          id: nearestStation._id,
          name: nearestStation.name,
          address: nearestStation.address
        },
        distance: Math.round(nearestDistance * 1000), // Convert to meters and round to match MongoDB geoNear
        duration: travelInfo.duration,
        isRealTime: travelInfo.isReal
      }
    });

  } catch (error) {
    console.error('Get nearest station info error:', error);
    next(error);
  }
};

// Get enum values for frontend synchronization
router.get('/enums', async (req, res) => {
  try {
    const enums = {
      amenities: [
        'parking', 'restroom', 'cafe', 'wifi', 'atm', 
        'restaurant', 'shopping', 'waiting_area', 'cctv', 
        'security', 'car_wash', 'air_pump'
      ],
      connectorTypes: ['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Tesla', 'CCS2'],
      chargingTypes: ['slow', 'fast', 'rapid'],
      currentStatus: ['available', 'occupied', 'maintenance', 'out_of_order']
    };

    res.json({
      success: true,
      data: enums
    });
  } catch (error) {
    console.error('Get enums error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get enum values'
    });
  }
});

// Routes
router.get('/nearest-info', getNearestStationInfo);
router.get('/', 
  [...searchValidation(), ...paginationValidation()], 
  handleValidationErrors, 
  optionalAuth, 
  getStations
);

router.get('/nearby', 
  searchValidation(), 
  handleValidationErrors, 
  getNearbyStations
);

router.get('/search', 
  paginationValidation(), 
  handleValidationErrors, 
  searchStations
);

router.get('/:id', 
  mongoIdValidation('id'), 
  handleValidationErrors,
  cacheStationData(), // Add caching middleware
  getStation
);

router.get('/:stationId/ports/:portId/slots', 
  mongoIdValidation('stationId'), 
  mongoIdValidation('portId'), 
  handleValidationErrors, 
  getAvailableSlots
);

module.exports = router;
