const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const ChargingStation = require('../models/ChargingStation');

// @desc    Get restaurant by charging station ID
// @route   GET /api/restaurants/station/:stationId
// @access  Public
router.get('/station/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    
    // Find the station first to ensure it exists
    const station = await ChargingStation.findById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Charging station not found'
      });
    }
    
    // Find restaurant associated with this station
    const restaurant = await Restaurant.findOne({ 
      chargingStation: stationId,
      isActive: true,
      isVerified: true
    }).populate('vendor', 'name email phoneNumber');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'No restaurant found for this charging station'
      });
    }
    
    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Get restaurant by station error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get restaurant'
    });
  }
});

// @desc    Get restaurant menu items
// @route   GET /api/restaurants/:restaurantId/menu
// @access  Public
router.get('/:restaurantId/menu', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    // Filter only available menu items
    const availableMenuItems = restaurant.menu.filter(item => 
      item.isAvailable && restaurant.isActive
    );
    
    res.status(200).json({
      success: true,
      data: availableMenuItems
    });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get menu items'
    });
  }
});

// @desc    Get public restaurant details
// @route   GET /api/restaurants/public/:restaurantId
// @access  Public
router.get('/public/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const restaurant = await Restaurant.findById(restaurantId)
      .select('-vendor -licenseDocument -licenseMetadata -createdAt -updatedAt')
      .populate('chargingStation', 'name address');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    if (restaurant.isActive !== true || !restaurant.isVerified) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not available'
      });
    }
    
    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error('Get public restaurant error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get restaurant'
    });
  }
});

// @desc    Search restaurants by location or name
// @route   GET /api/restaurants/search
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { query, category, lat, lng, radius = 10 } = req.query;
    
    let searchCriteria = {
      isActive: true,
      isVerified: true
    };
    
    // Text search in name or description
    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { cuisine: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Category filter
    if (category) {
      searchCriteria.cuisine = { $regex: category, $options: 'i' };
    }
    
    let restaurants = await Restaurant.find(searchCriteria)
      .populate('chargingStation', 'name address location')
      .select('-vendor -licenseDocument -licenseMetadata');
    
    // If location provided, filter by distance
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(radius);
      
      restaurants = restaurants.filter(restaurant => {
        const station = restaurant.chargingStation;
        if (!station?.location?.coordinates) return false;
        
        const [stationLng, stationLat] = station.location.coordinates;
        const distance = calculateDistance(userLat, userLng, stationLat, stationLng);
        
        return distance <= radiusKm;
      });
    }
    
    res.status(200).json({
      success: true,
      data: restaurants,
      count: restaurants.length
    });
  } catch (error) {
    console.error('Search restaurants error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search restaurants'
    });
  }
});

// @desc    Get nearby restaurants
// @route   GET /api/restaurants/nearby
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    
    // Get all active restaurants with their charging station locations
    const restaurants = await Restaurant.find({
      isActive: true,
      isVerified: true
    })
    .populate('chargingStation', 'name address location')
    .select('-vendor -licenseDocument -licenseMetadata');
    
    // Filter by distance and add distance field
    const nearbyRestaurants = restaurants
      .map(restaurant => {
        const station = restaurant.chargingStation;
        if (!station?.location?.coordinates) return null;
        
        const [stationLng, stationLat] = station.location.coordinates;
        const distance = calculateDistance(userLat, userLng, stationLat, stationLng);
        
        if (distance <= radiusKm) {
          return {
            ...restaurant.toObject(),
            distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
          };
        }
        return null;
      })
      .filter(restaurant => restaurant !== null)
      .sort((a, b) => a.distance - b.distance); // Sort by distance
    
    res.status(200).json({
      success: true,
      data: nearbyRestaurants,
      count: nearbyRestaurants.length
    });
  } catch (error) {
    console.error('Get nearby restaurants error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get nearby restaurants'
    });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

module.exports = router;
