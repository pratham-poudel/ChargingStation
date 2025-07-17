const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const ChargingStation = require('../models/ChargingStation');
const Order = require('../models/Order');
const { body, validationResult } = require('express-validator');
const smsService = require('../services/smsService');

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

// Helper function to calculate restaurant priority for recommendations
function calculateRestaurantPriority(restaurant, station, distance) {
  let score = 0;
  
  // Distance factor (closer is better)
  score += Math.max(0, 100 - distance * 2);
  
  // Rating factor
  if (restaurant.rating?.average) {
    score += restaurant.rating.average * 20;
  }
  
  // Dockit recommended bonus (highest priority)
  if (station?.dockitRecommended || restaurant.dockitRecommended) {
    score += 100; // Increased from 50 to 100 for higher priority
  }
  
  // Currently open bonus
  if (restaurant.isCurrentlyOpen && restaurant.isCurrentlyOpen()) {
    score += 30;
  }
  
  // Station active bonus
  if (station?.isActive) {
    score += 20;
  }
  
  // Menu availability bonus
  if (restaurant.menu && restaurant.menu.filter(item => item.isAvailable).length > 0) {
    score += 15;
  }
  
  // Order count factor (popularity)
  if (restaurant.totalOrders) {
    score += Math.min(restaurant.totalOrders / 10, 25);
  }
  
  return score;
}

// @desc    Get enum values for frontend synchronization
// @route   GET /api/restaurants/enums
// @access  Public
router.get('/enums', async (req, res) => {
  try {
    const enums = {
      cuisines: [
        'indian', 'chinese', 'continental', 'italian', 'mexican', 
        'thai', 'japanese', 'american', 'mediterranean', 'local'
      ],
      categories: ['appetizer', 'main_course', 'dessert', 'beverage', 'snack', 'breakfast', 'lunch', 'dinner'],
      allergens: ['nuts', 'dairy', 'gluten', 'shellfish', 'eggs', 'soy', 'fish'],
      sortBy: ['distance', 'rating', 'price', 'preparation_time']
    };

    res.json({
      success: true,
      data: enums
    });
  } catch (error) {
    console.error('Get restaurant enums error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get enum values'
    });
  }
});

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
    const { 
      query, 
      cuisine, 
      category,
      lat, 
      lng, 
      radius = 20,
      sortBy = 'distance',
      minRating,
      maxDistance
    } = req.query;
    
    let searchCriteria = {
      isActive: true,
      isVerified: true,
      acceptingOrders: true // Only show restaurants accepting orders
    };
    
    // Text search in name or description
    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { cuisine: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Cuisine filter
    if (cuisine) {
      searchCriteria.cuisine = { $in: [cuisine] };
    }
    
    // Rating filter
    if (minRating) {
      searchCriteria['rating.average'] = { $gte: parseFloat(minRating) };
    }
    
    let restaurants = await Restaurant.find(searchCriteria)
      .populate({
        path: 'chargingStation',
        select: 'name address location isActive dockitRecommended amenities chargingPorts',
        populate: {
          path: 'vendor',
          select: 'businessName'
        }
      })
      .select('-vendor -licenseDocument -licenseMetadata');
    
    // If location provided, filter by distance and calculate actual distance
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = maxDistance ? parseFloat(maxDistance) : parseFloat(radius);
      
      restaurants = restaurants
        .map(restaurant => {
          const station = restaurant.chargingStation;
          if (!station?.location?.coordinates) return null;
          
          const [stationLng, stationLat] = station.location.coordinates;
          const distance = calculateDistance(userLat, userLng, stationLat, stationLng);
          
          if (distance <= radiusKm) {
            return {
              ...restaurant.toObject(),
              distance: Math.round(distance * 100) / 100,
              chargingStation: {
                ...station.toObject(),
                distance: Math.round(distance * 100) / 100
              }
            };
          }
          return null;
        })
        .filter(restaurant => restaurant !== null);
      
      // Sort restaurants based on sortBy parameter
      switch (sortBy) {
        case 'distance':
          // First prioritize Dockit recommended, then by distance
          restaurants.sort((a, b) => {
            const aRecommended = a.chargingStation?.dockitRecommended || a.dockitRecommended || false;
            const bRecommended = b.chargingStation?.dockitRecommended || b.dockitRecommended || false;
            
            if (aRecommended && !bRecommended) return -1;
            if (!aRecommended && bRecommended) return 1;
            
            return a.distance - b.distance;
          });
          break;
        case 'rating':
          // First prioritize Dockit recommended, then by rating
          restaurants.sort((a, b) => {
            const aRecommended = a.chargingStation?.dockitRecommended || a.dockitRecommended || false;
            const bRecommended = b.chargingStation?.dockitRecommended || b.dockitRecommended || false;
            
            if (aRecommended && !bRecommended) return -1;
            if (!aRecommended && bRecommended) return 1;
            
            return (b.rating?.average || 0) - (a.rating?.average || 0);
          });
          break;
        case 'preparation_time':
          // First prioritize Dockit recommended, then by preparation time
          restaurants.sort((a, b) => {
            const aRecommended = a.chargingStation?.dockitRecommended || a.dockitRecommended || false;
            const bRecommended = b.chargingStation?.dockitRecommended || b.dockitRecommended || false;
            
            if (aRecommended && !bRecommended) return -1;
            if (!aRecommended && bRecommended) return 1;
            
            return (a.averagePreparationTime || 30) - (b.averagePreparationTime || 30);
          });
          break;
        case 'recommended':
          // Sort by priority score (Dockit recommended gets highest priority)
          restaurants.forEach(restaurant => {
            restaurant.priorityScore = calculateRestaurantPriority(restaurant, restaurant.chargingStation, restaurant.distance);
          });
          restaurants.sort((a, b) => b.priorityScore - a.priorityScore);
          break;
        default:
          // Default to distance with Dockit recommended priority
          restaurants.sort((a, b) => {
            const aRecommended = a.chargingStation?.dockitRecommended || a.dockitRecommended || false;
            const bRecommended = b.chargingStation?.dockitRecommended || b.dockitRecommended || false;
            
            if (aRecommended && !bRecommended) return -1;
            if (!aRecommended && bRecommended) return 1;
            
            return a.distance - b.distance;
          });
      }
    }
    
    // Add metadata about station status and restaurant availability
    const enhancedRestaurants = restaurants.map(restaurant => ({
      ...restaurant,
      isStationActive: restaurant.chargingStation?.isActive || false,
      isDockitRecommended: restaurant.chargingStation?.dockitRecommended || restaurant.dockitRecommended || false,
      hasAvailableMenu: restaurant.menu ? restaurant.menu.filter(item => item.isAvailable).length > 0 : false,
      isCurrentlyOpen: restaurant.isCurrentlyOpen ? restaurant.isCurrentlyOpen() : false
    }));
    
    res.status(200).json({
      success: true,
      data: enhancedRestaurants,
      count: enhancedRestaurants.length,
      filters: {
        cuisine,
        category,
        radius: maxDistance || radius,
        sortBy,
        minRating
      }
    });
  } catch (error) {
    console.error('Search restaurants error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search restaurants'
    });
  }
});

// @desc    Get nearby restaurants with enhanced search and filtering
// @route   GET /api/restaurants/nearby
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    const { 
      lat, 
      lng, 
      radius = 20,
      cuisine,
      category,
      sortBy = 'distance',
      minRating,
      query,
      limit = 50
    } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }
    
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    
    // Build search criteria
    let searchCriteria = {
      isActive: true,
      isVerified: true,
      acceptingOrders: true // Only show restaurants accepting orders
    };
    
    // Text search
    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { cuisine: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Cuisine filter
    if (cuisine) {
      searchCriteria.cuisine = { $in: [cuisine] };
    }
    
    // Rating filter
    if (minRating) {
      searchCriteria['rating.average'] = { $gte: parseFloat(minRating) };
    }
    
    // Get all restaurants that match criteria
    const restaurants = await Restaurant.find(searchCriteria)
      .populate({
        path: 'chargingStation',
        select: 'name address location isActive dockitRecommended amenities chargingPorts',
        match: { location: { $exists: true } }, // Only include stations with location data
        populate: {
          path: 'vendor',
          select: 'businessName'
        }
      })
      .select('-vendor -licenseDocument -licenseMetadata')
      .limit(parseInt(limit));
    
    // Filter restaurants that have charging stations with location data
    const restaurantsWithLocation = restaurants.filter(restaurant => 
      restaurant.chargingStation && restaurant.chargingStation.location?.coordinates
    );
    
    // Calculate distance and filter by radius
    const nearbyRestaurants = restaurantsWithLocation
      .map(restaurant => {
        const station = restaurant.chargingStation;
        const [stationLng, stationLat] = station.location.coordinates;
        const distance = calculateDistance(userLat, userLng, stationLat, stationLng);
        
        if (distance <= radiusKm) {
          return {
            ...restaurant.toObject(),
            distance: Math.round(distance * 100) / 100,
            chargingStation: {
              ...station.toObject(),
              distance: Math.round(distance * 100) / 100
            },
            // Add calculated fields for sorting and display
            isStationActive: station.isActive || false,
            isDockitRecommended: station.dockitRecommended || restaurant.dockitRecommended || false,
            hasAvailableMenu: restaurant.menu ? restaurant.menu.filter(item => item.isAvailable).length > 0 : false,
            isCurrentlyOpen: restaurant.isCurrentlyOpen ? restaurant.isCurrentlyOpen() : false,
            // Priority score for recommended sorting
            priorityScore: calculateRestaurantPriority(restaurant, station, distance)
          };
        }
        return null;
      })
      .filter(restaurant => restaurant !== null);
    
    // Sort restaurants based on sortBy parameter
    switch (sortBy) {
      case 'distance':
        nearbyRestaurants.sort((a, b) => a.distance - b.distance);
        break;
      case 'rating':
        nearbyRestaurants.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
        break;
      case 'preparation_time':
        nearbyRestaurants.sort((a, b) => (a.averagePreparationTime || 30) - (b.averagePreparationTime || 30));
        break;
      case 'recommended':
        nearbyRestaurants.sort((a, b) => b.priorityScore - a.priorityScore);
        break;
      default:
        nearbyRestaurants.sort((a, b) => a.distance - b.distance);
    }
    
    res.status(200).json({
      success: true,
      data: nearbyRestaurants,
      count: nearbyRestaurants.length,
      filters: {
        location: { lat: userLat, lng: userLng },
        radius: radiusKm,
        cuisine,
        category,
        sortBy,
        minRating,
        query
      }
    });
  } catch (error) {
    console.error('Get nearby restaurants error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get nearby restaurants'
    });
  }
});

// @desc    Create a new order (Public endpoint for EV charging customers)
// @route   POST /api/restaurants/orders
// @access  Public
router.post('/orders', [
  body('restaurant').isMongoId().withMessage('Valid restaurant ID is required'),
  body('customer.name').notEmpty().withMessage('Customer name is required'),
  body('customer.phoneNumber').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('customer.email').optional().isEmail().withMessage('Valid email is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menuItem').isMongoId().withMessage('Valid menu item ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('orderType').isIn(['takeaway', 'dine_in']).withMessage('Order type must be takeaway or dine_in'),
  body('payment.method').isIn(['cash', 'card', 'upi', 'wallet']).withMessage('Valid payment method is required')
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

    const { restaurant: restaurantId, customer, items, orderType, payment, notes } = req.body;

    // Find the restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    if (!restaurant.isActive || !restaurant.isVerified || !restaurant.acceptingOrders) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant is currently not accepting orders'
      });
    }

    // Validate and calculate order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const menuItem = restaurant.menu.id(item.menuItem);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item ${item.menuItem} not found`
        });
      }

      if (!menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Menu item "${menuItem.name}" is currently unavailable`
        });
      }

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItem: item.menuItem,
        menuItemSnapshot: {
          name: menuItem.name,
          description: menuItem.description,
          price: menuItem.price,
          category: menuItem.category,
          image: menuItem.images?.[0] || ''
        },
        quantity: item.quantity,
        unitPrice: menuItem.price,
        totalPrice: itemTotal,
        specialInstructions: item.specialInstructions || ''
      });
    }

    // Calculate taxes and service charges
    const taxPercentage = restaurant.tax?.percentage || 0;
    const taxAmount = (subtotal * taxPercentage) / 100;
    
    const serviceChargePercentage = restaurant.serviceCharge?.percentage || 0;
    const serviceChargeAmount = (subtotal * serviceChargePercentage) / 100;
    
    const totalAmount = subtotal + taxAmount + serviceChargeAmount;

    // Create the order
    const newOrder = new Order({
      restaurant: restaurant._id,
      chargingStation: restaurant.chargingStation,
      vendor: restaurant.vendor,
      customer: {
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        email: customer.email || null
      },
      items: orderItems,
      subtotal,
      tax: {
        percentage: taxPercentage,
        amount: taxAmount
      },
      serviceCharge: {
        percentage: serviceChargePercentage,
        amount: serviceChargeAmount
      },
      totalAmount,
      orderType,
      payment: {
        method: payment.method,
        status: 'pending'
      },
      notes: {
        customer: notes?.customer || '',
        restaurant: '',
        kitchen: ''
      },
      status: 'pending',
      estimatedPreparationTime: Math.max(...orderItems.map(item => {
        const menuItem = restaurant.menu.id(item.menuItem);
        return menuItem.preparationTime || 15;
      }))
    });

    await newOrder.save();

    // Populate the order for response
    await newOrder.populate([
      { path: 'restaurant', select: 'name contactInfo' },
      { path: 'chargingStation', select: 'name address' }
    ]);

    console.log(`✅ New public order created: ${newOrder.orderNumber} for ${customer.name}`);

    // Send SMS notification to customer
    try {
      // Create item names list for SMS
      const itemNames = orderItems.map(item => item.menuItemSnapshot.name).join(', ');
      
      // Get restaurant and station names safely
      const restaurantName = newOrder.restaurant?.name || restaurant.name;
      const stationName = newOrder.chargingStation?.name || 'the charging station';
      
      // Format the SMS message (keep it under 160 chars for single SMS)
      let smsMessage;
      if (itemNames.length > 60) {
        // If items list is too long, use a shorter format
        const itemCount = orderItems.length;
        smsMessage = `🍽️ Order Confirmed! ${restaurantName} - #${newOrder.orderNumber}. ${itemCount} item${itemCount > 1 ? 's' : ''} ordered. Total: Rs.${totalAmount}. You'll be called when ready at ${stationName}. Thanks!`;
      } else {
        smsMessage = `🍽️ Order Confirmed! ${restaurantName} - #${newOrder.orderNumber}. Items: ${itemNames}. Total: Rs.${totalAmount}. You'll be called when ready at ${stationName}. Thanks!`;
      }
      
      await smsService.sendSMS(customer.phoneNumber, smsMessage);
      console.log(`📱 SMS confirmation sent to ${customer.phoneNumber} for order: ${newOrder.orderNumber}`);
    } catch (smsError) {
      console.error('SMS notification error:', smsError);
      // Don't fail the order creation if SMS fails
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: newOrder,
        estimatedReadyTime: new Date(Date.now() + (newOrder.estimatedPreparationTime * 60 * 1000))
      }
    });

  } catch (error) {
    console.error('Create public order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
});

// @desc    Get user orders by phone number or userId
// @route   GET /api/restaurants/orders/user/:identifier
// @access  Public
router.get('/orders/user/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { page = 1, limit = 10, status, sortBy = 'orderedAt', sortOrder = 'desc' } = req.query;
    
    // Build query to find orders by customer phone number or userId
    let query = {};
    
    // Try to find by phone number first, then by userId
    if (identifier.match(/^[0-9]{10}$/)) {
      // It's a phone number
      query['customer.phoneNumber'] = identifier;
    } else {
      // Try as userId (ObjectId)
      try {
        query['customer.userId'] = identifier;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid identifier format'
        });
      }
    }
    
    // Add status filter if provided
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get orders with populated restaurant and charging station info
    const orders = await Order.find(query)
      .populate('restaurant', 'name contactInfo images cuisine')
      .populate('chargingStation', 'name address location')
      .populate('vendor', 'businessName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));
    
    // Get order statistics
    const stats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    const orderStats = {
      total: totalOrders,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      confirmed: stats.find(s => s._id === 'confirmed')?.count || 0,
      preparing: stats.find(s => s._id === 'preparing')?.count || 0,
      ready: stats.find(s => s._id === 'ready')?.count || 0,
      completed: stats.find(s => s._id === 'completed')?.count || 0,
      cancelled: stats.find(s => s._id === 'cancelled')?.count || 0,
      totalSpent: stats.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
    };
    
    console.log(`Found ${orders.length} orders for identifier: ${identifier}`);
    
    res.status(200).json({
      success: true,
      data: orders,
      count: orders.length,
      stats: orderStats,
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total: totalOrders,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
        limit: parseInt(limit)
      },
      message: `Found ${orders.length} orders`
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user orders'
    });
  }
});

// @desc    Get user orders with multiple identifiers (phone + userId)
// @route   GET /api/restaurants/orders/my-orders
// @access  Public
router.get('/orders/my-orders', async (req, res) => {
  try {
    const { phone, userId, page = 1, limit = 10, status, sortBy = 'orderedAt', sortOrder = 'desc' } = req.query;
    
    if (!phone && !userId) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or userId is required'
      });
    }
    
    // Build query to find orders by customer phone number or userId
    let query = {};
    if (phone && userId) {
      // Find by either phone or userId
      query.$or = [
        { 'customer.phoneNumber': phone },
        { 'customer.userId': userId }
      ];
    } else if (phone) {
      query['customer.phoneNumber'] = phone;
    } else if (userId) {
      query['customer.userId'] = userId;
    }
    
    // Add status filter if provided
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get orders with populated restaurant and charging station info
    const orders = await Order.find(query)
      .populate('restaurant', 'name contactInfo images cuisine')
      .populate('chargingStation', 'name address location')
      .populate('vendor', 'businessName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));
    
    // Get order statistics
    const stats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    const orderStats = {
      total: totalOrders,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      confirmed: stats.find(s => s._id === 'confirmed')?.count || 0,
      preparing: stats.find(s => s._id === 'preparing')?.count || 0,
      ready: stats.find(s => s._id === 'ready')?.count || 0,
      completed: stats.find(s => s._id === 'completed')?.count || 0,
      cancelled: stats.find(s => s._id === 'cancelled')?.count || 0,
      totalSpent: stats.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
    };
    
    console.log(`Found ${orders.length} orders for phone: ${phone}, userId: ${userId}`);
    
    res.status(200).json({
      success: true,
      data: orders,
      count: orders.length,
      stats: orderStats,
      pagination: {
        current: parseInt(page),
        pages: totalPages,
        total: totalOrders,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
        limit: parseInt(limit)
      },
      message: `Found ${orders.length} orders`
    });

  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders'
    });
  }
});

// @desc    Get single order by ID
// @route   GET /api/restaurants/orders/:id
// @access  Public
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the order by ID with populated fields
    const order = await Order.findById(id)
      .populate('restaurant', 'name contactInfo images cuisine description address operatingHours')
      .populate('chargingStation', 'name address location contactInfo')
      .populate('vendor', 'businessName contactInfo')
      .lean();
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    console.log(`Found order ${order.orderNumber} (${id})`);
    
    res.status(200).json({
      success: true,
      data: order,
      message: 'Order details retrieved successfully'
    });

  } catch (error) {
    console.error('Get order by ID error:', error);
    
    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order details'
    });
  }
});

module.exports = router;
