const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const RestaurantEmployee = require('../models/RestaurantEmployee');
const Order = require('../models/Order');
const ChargingStation = require('../models/ChargingStation');
const Vendor = require('../models/Vendor');
const { protect } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');

const router = express.Router();

// Middleware to check if user is vendor
const isVendor = (req, res, next) => {
  if (req.user.type !== 'vendor') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Vendor access required.'
    });
  }
  next();
};

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('=== VALIDATION ERRORS ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// @desc    Get all restaurants for vendor
// @route   GET /api/vendor/restaurants
// @access  Private (Vendor)
router.get('/', [protect, isVendor], async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    const restaurants = await Restaurant.find({ vendor: vendorId })
      .populate('chargingStation', 'name address location isActive isVerified')
      .sort({ createdAt: -1 });
    
    // Get basic stats for each restaurant
    const restaurantsWithStats = await Promise.all(
      restaurants.map(async (restaurant) => {
        const stats = await Order.getDailySummary(restaurant._id);
        const employeeCount = await RestaurantEmployee.countDocuments({
          restaurant: restaurant._id,
          isActive: true
        });
        
        return {
          ...restaurant.toObject(),
          stats,
          employeeCount
        };
      })
    );
    
    res.json({
      success: true,
      data: restaurantsWithStats
    });
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurants'
    });
  }
});

// @desc    Get restaurant by ID with full details
// @route   GET /api/vendor/restaurants/:id
// @access  Private (Vendor)
router.get('/:id', [
  protect,
  isVendor,
  param('id').isMongoId()
], async (req, res) => {
  try {
    const vendorId = req.user.id;
    const restaurantId = req.params.id;
    
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      vendor: vendorId
    }).populate('chargingStation', 'name address location isActive isVerified');
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    // Get restaurant statistics
    const [dailyStats, employees, recentOrders] = await Promise.all([
      Order.getDailySummary(restaurantId),
      RestaurantEmployee.find({
        restaurant: restaurantId,
        isActive: true
      }).select('-password'),
      Order.findByRestaurant(restaurantId, { status: { $ne: 'completed' } })
        .limit(10)
        .populate('assignedTo.waiter assignedTo.chef assignedTo.cashier')
    ]);
    
    res.json({
      success: true,
      data: {
        restaurant,
        stats: dailyStats,
        employees,
        recentOrders
      }
    });
  } catch (error) {
    console.error('Get restaurant details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant details'
    });
  }
});

// @desc    Create new restaurant for charging station
// @route   POST /api/vendor/restaurants
// @access  Private (Vendor)
router.post('/', [
  protect,
  isVendor,
  body('name').notEmpty().trim().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('chargingStation').isMongoId(),
  body('cuisine').optional().isIn(['indian', 'chinese', 'continental', 'italian', 'mexican', 'thai', 'japanese', 'american', 'mediterranean', 'local']),
  body('phoneNumber').optional().matches(/^[0-9+\-\s()]{7,15}$/),
  body('licenseNumber').optional().isString(),
  body('operatingHours').optional().isObject()
], handleValidationErrors, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const {
      name,
      description,
      chargingStation,
      cuisine,
      phoneNumber,
      operatingHours,
      licenseNumber,
      licenseDocument,
      images,
      imageMetadata,
      licenseMetadata
    } = req.body;
    
    console.log('=== CREATING RESTAURANT ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Verify charging station ownership and that it's active and verified
    const station = await ChargingStation.findOne({
      _id: chargingStation,
      vendor: vendorId,
      isActive: true,
      isVerified: true
    });
    
    if (!station) {
      return res.status(400).json({
        success: false,
        message: 'Charging station not found or not eligible for restaurant. Station must be active and verified.'
      });
    }
    
    // Check if restaurant already exists for this station
    const existingRestaurant = await Restaurant.findOne({ chargingStation });
    if (existingRestaurant) {
      return res.status(400).json({
        success: false,
        message: 'A restaurant already exists for this charging station'
      });
    }
    
    // Process uploaded images from presigned upload
    let processedImages = [];
    if (images && Array.isArray(images)) {
      processedImages = images.map((url, index) => ({
        url: url,
        caption: `Restaurant image ${index + 1}`,
        isPrimary: index === 0,
        objectName: imageMetadata?.objectName || null,
        originalName: imageMetadata?.originalName || `image_${index + 1}`,
        uploadedAt: new Date()
      }));
    }
    
    // Process operating hours from frontend format to backend format
    let processedOperatingHours = {};
    if (operatingHours) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      days.forEach(day => {
        if (operatingHours[day]) {
          const dayData = operatingHours[day];
          
          // Convert frontend format to backend format
          if (dayData.isClosed) {
            // Day is closed
            processedOperatingHours[day] = {
              isOpen: false,
              open: '00:00',
              close: '00:00'
            };
          } else if (dayData.is24Hours) {
            // Day is 24 hours
            processedOperatingHours[day] = {
              isOpen: true,
              open: '00:00',
              close: '23:59'
            };
          } else {
            // Normal operating hours
            processedOperatingHours[day] = {
              isOpen: true,
              open: dayData.open || '09:00',
              close: dayData.close || '22:00'
            };
          }
        } else {
          // Default hours if not specified
          processedOperatingHours[day] = {
            isOpen: true,
            open: '09:00',
            close: '22:00'
          };
        }
      });
    } else {
      // Default operating hours
      processedOperatingHours = {
        monday: { isOpen: true, open: '09:00', close: '22:00' },
        tuesday: { isOpen: true, open: '09:00', close: '22:00' },
        wednesday: { isOpen: true, open: '09:00', close: '22:00' },
        thursday: { isOpen: true, open: '09:00', close: '22:00' },
        friday: { isOpen: true, open: '09:00', close: '22:00' },
        saturday: { isOpen: true, open: '09:00', close: '22:00' },
        sunday: { isOpen: true, open: '09:00', close: '22:00' }
      };
    }
    
    console.log('=== PROCESSED OPERATING HOURS ===');
    console.log('Original:', JSON.stringify(operatingHours, null, 2));
    console.log('Processed:', JSON.stringify(processedOperatingHours, null, 2));

    // Create restaurant
    const restaurant = new Restaurant({
      name,
      description,
      chargingStation,
      vendor: vendorId,
      cuisine: cuisine ? [cuisine] : [], // Convert single cuisine to array
      images: processedImages,
      contactInfo: {
        phoneNumber: phoneNumber || '',
        email: ''
      },
      operatingHours: processedOperatingHours,
      licenses: {
        licenseNumber: licenseNumber || '',
        documents: licenseDocument ? [{
          url: licenseDocument,
          type: 'business_license',
          objectName: licenseMetadata?.objectName || null,
          originalName: licenseMetadata?.originalName || 'license_document',
          uploadedAt: new Date()
        }] : []
      },
      createdBy: vendorId,
      verificationStatus: 'pending',
      isVerified: false,
      isActive: false
    });
    
    await restaurant.save();
    
    // Update charging station to mark it has a restaurant
    await ChargingStation.findByIdAndUpdate(chargingStation, { 
      hasRestaurant: true 
    });
    
    // Populate the restaurant data for response
    await restaurant.populate('chargingStation', 'name address location');
    
    console.log('Restaurant created successfully:', restaurant._id);
    
    res.status(201).json({
      success: true,
      message: 'Restaurant created successfully. It will be reviewed by admin for verification.',
      data: restaurant
    });
    
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create restaurant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update restaurant details
// @route   PUT /api/vendor/restaurants/:id
// @access  Private (Vendor)
router.put('/:id', [
  protect,
  isVendor,
  param('id').isMongoId(),
  body('name').optional().notEmpty().trim().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('cuisine').optional().isString(),
  body('phoneNumber').optional().matches(/^[0-9+\-\s()]{7,15}$/)
], handleValidationErrors, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const restaurantId = req.params.id;
    
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      vendor: vendorId
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    // Process new images if uploaded
    let newImages = [];
    if (req.files && req.files.images) {
      newImages = req.files.images.map((file, index) => ({
        url: file.location,
        caption: `Restaurant image ${index + 1}`,
        isPrimary: index === 0 && restaurant.images.length === 0,
        objectName: file.key,
        originalName: file.originalname,
        uploadedAt: new Date()
      }));
    }
    
    // Update restaurant fields
    const updateFields = [
      'name', 'description', 'cuisine', 'contactInfo', 
      'manager', 'licenses'
    ];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        restaurant[field] = req.body[field];
      }
    });
    
    // Handle operating hours separately with proper processing
    if (req.body.operatingHours !== undefined) {
      const operatingHours = req.body.operatingHours;
      let processedOperatingHours = {};
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      days.forEach(day => {
        if (operatingHours[day]) {
          const dayData = operatingHours[day];
          
          // Convert frontend format to backend format
          if (dayData.isClosed) {
            // Day is closed
            processedOperatingHours[day] = {
              isOpen: false,
              open: '00:00',
              close: '00:00'
            };
          } else if (dayData.is24Hours) {
            // Day is 24 hours
            processedOperatingHours[day] = {
              isOpen: true,
              open: '00:00',
              close: '23:59'
            };
          } else {
            // Normal operating hours
            processedOperatingHours[day] = {
              isOpen: true,
              open: dayData.open || '09:00',
              close: dayData.close || '22:00'
            };
          }
        } else {
          // Keep existing hours if not specified
          processedOperatingHours[day] = restaurant.operatingHours[day] || {
            isOpen: true,
            open: '09:00',
            close: '22:00'
          };
        }
      });
      
      restaurant.operatingHours = processedOperatingHours;
    }
    
    // Add new images to existing ones
    if (newImages.length > 0) {
      restaurant.images.push(...newImages);
    }
    
    // Update menu availability if provided
    if (req.body.acceptingOrders !== undefined) {
      restaurant.acceptingOrders = req.body.acceptingOrders;
    }
    
    await restaurant.save();
    await restaurant.populate('chargingStation', 'name address location');
    
    res.json({
      success: true,
      message: 'Restaurant updated successfully',
      data: restaurant
    });
    
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update restaurant'
    });
  }
});

// @desc    Get restaurant menu
// @route   GET /api/vendor/restaurants/:id/menu
// @access  Private (Vendor)
router.get('/:id/menu', [
  protect,
  isVendor,
  param('id').isMongoId()
], async (req, res) => {
  try {
    const vendorId = req.user.id;
    const restaurantId = req.params.id;
    const { category } = req.query;
    
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      vendor: vendorId
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    let menu = restaurant.menu;
    
    // Filter by category if specified
    if (category && category !== 'all') {
      menu = menu.filter(item => item.category === category);
    }
    
    // Sort by display order, then by name
    menu.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      }
      return a.name.localeCompare(b.name);
    });
    
    // Group by category for better organization
    const menuByCategory = menu.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        menu: menu,
        menuByCategory: menuByCategory,
        totalItems: menu.length,
        availableItems: menu.filter(item => item.isAvailable).length
      }
    });
    
  } catch (error) {
    console.error('Get restaurant menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch restaurant menu'
    });
  }
});

// @desc    Add menu item
// @route   POST /api/vendor/restaurants/:id/menu
// @access  Private (Vendor)
router.post('/:id/menu', [
  protect,
  isVendor,
  param('id').isMongoId(),
  body('name').notEmpty().trim().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('price').isFloat({ min: 0 }),
  body('category').isIn(['appetizer', 'main_course', 'dessert', 'beverage', 'snack', 'breakfast', 'lunch', 'dinner']),
  body('preparationTime').optional().isInt({ min: 1 }),
  body('isVegetarian').optional().isBoolean(),
  body('isVegan').optional().isBoolean(),
  body('allergens').optional().isArray()
], handleValidationErrors, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const restaurantId = req.params.id;
    
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      vendor: vendorId
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    // Process uploaded images
    let itemImages = [];
    if (req.files && req.files.images) {
      itemImages = req.files.images.map((file, index) => ({
        url: file.location,
        caption: `${req.body.name} image ${index + 1}`,
        objectName: file.key,
        originalName: file.originalname,
        uploadedAt: new Date()
      }));
    }
    
    // Create new menu item
    const menuItem = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category,
      images: itemImages,
      preparationTime: req.body.preparationTime || 15,
      allergens: req.body.allergens || [],
      isVegetarian: req.body.isVegetarian || false,
      isVegan: req.body.isVegan || false,
      isAvailable: true,
      displayOrder: restaurant.menu.length // Add to end by default
    };
    
    restaurant.menu.push(menuItem);
    await restaurant.save();
    
    res.status(201).json({
      success: true,
      message: 'Menu item added successfully',
      data: menuItem
    });
    
  } catch (error) {
    console.error('Add menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add menu item'
    });
  }
});

// @desc    Update menu item
// @route   PUT /api/vendor/restaurants/:id/menu/:itemId
// @access  Private (Vendor)
router.put('/:id/menu/:itemId', [
  protect,
  isVendor,
  param('id').isMongoId(),
  param('itemId').isMongoId(),
  body('name').optional().notEmpty().trim().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().isIn(['appetizer', 'main_course', 'dessert', 'beverage', 'snack', 'breakfast', 'lunch', 'dinner']),
  body('preparationTime').optional().isInt({ min: 1 }),
  body('isVegetarian').optional().isBoolean(),
  body('isVegan').optional().isBoolean(),
  body('isAvailable').optional().isBoolean(),
  body('allergens').optional().isArray()
], handleValidationErrors, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const restaurantId = req.params.id;
    const itemId = req.params.itemId;
    
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      vendor: vendorId
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    const menuItem = restaurant.menu.id(itemId);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    // Process new images if uploaded
    let newImages = [];
    if (req.files && req.files.images) {
      newImages = req.files.images.map((file, index) => ({
        url: file.location,
        caption: `${req.body.name || menuItem.name} image ${index + 1}`,
        objectName: file.key,
        originalName: file.originalname,
        uploadedAt: new Date()
      }));
    }
    
    // Update menu item fields
    const updateFields = [
      'name', 'description', 'price', 'category', 'preparationTime',
      'allergens', 'isVegetarian', 'isVegan', 'isAvailable', 'displayOrder'
    ];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        menuItem[field] = req.body[field];
      }
    });
    
    // Add new images to existing ones
    if (newImages.length > 0) {
      menuItem.images.push(...newImages);
    }
    
    await restaurant.save();
    
    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem
    });
    
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu item'
    });
  }
});

// @desc    Toggle menu item availability
// @route   PATCH /api/vendor/restaurants/:id/menu/:itemId/availability
// @access  Private (Vendor)
router.patch('/:id/menu/:itemId/availability', [
  protect,
  isVendor,
  param('id').isMongoId(),
  param('itemId').isMongoId(),
  body('isAvailable').isBoolean()
], handleValidationErrors, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const restaurantId = req.params.id;
    const itemId = req.params.itemId;
    const { isAvailable } = req.body;
    
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      vendor: vendorId
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    const success = restaurant.updateMenuItemAvailability(itemId, isAvailable);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    await restaurant.save();
    
    res.json({
      success: true,
      message: `Menu item ${isAvailable ? 'enabled' : 'disabled'} successfully`
    });
    
  } catch (error) {
    console.error('Toggle menu item availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu item availability'
    });
  }
});

// @desc    Delete menu item
// @route   DELETE /api/vendor/restaurants/:id/menu/:itemId
// @access  Private (Vendor)
router.delete('/:id/menu/:itemId', [
  protect,
  isVendor,
  param('id').isMongoId(),
  param('itemId').isMongoId()
], async (req, res) => {
  try {
    const vendorId = req.user.id;
    const restaurantId = req.params.id;
    const itemId = req.params.itemId;
    
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      vendor: vendorId
    });
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    const menuItem = restaurant.menu.id(itemId);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    restaurant.menu.pull(itemId);
    await restaurant.save();
    
    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu item'
    });
  }
});

module.exports = router;
