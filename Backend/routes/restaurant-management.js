const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const RestaurantEmployee = require('../models/RestaurantEmployee');
const Order = require('../models/Order');
const ChargingStation = require('../models/ChargingStation');
const Vendor = require('../models/Vendor');
const Notification = require('../models/Notification');
const { body, param, validationResult } = require('express-validator');
const { optimizedUpload } = require('../config/optimized-upload');
const emailService = require('../services/emailService');
const emailTemplates = require('../templates/emailTemplates');
const smsService = require('../services/smsService');
const { storeOTP, getOTP, deleteOTP } = require('../config/redis');

const router = express.Router();

// Custom middleware to authenticate restaurant employee or merchant owner
const protectRestaurantAccess = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const restaurantId = req.params.restaurantId;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify JWT token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // First try to authenticate as merchant (vendor)
    if (decoded.type === 'vendor') {
      const vendor = await Vendor.findById(decoded.id);
      
      if (!vendor || !vendor.isActive || vendor.verificationStatus !== 'verified') {
        return res.status(401).json({
          success: false,
          message: 'Invalid vendor token or inactive vendor'
        });
      }

      // Check if vendor owns the restaurant
      const restaurant = await Restaurant.findOne({ 
        _id: restaurantId, 
        vendor: vendor._id 
      });

      if (!restaurant) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - restaurant not found or not owned by vendor'
        });
      }

      // Check if restaurant is active and verified
      if (!restaurant.isActive || !restaurant.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Restaurant is not active or verified'
        });
      }

      req.user = {
        ...vendor.toObject(),
        type: 'vendor',
        role: 'Owner'
      };
      req.restaurant = restaurant;
      req.authType = 'merchant';
      return next();
    }

    // If not vendor, try to authenticate as restaurant employee
    const employee = await RestaurantEmployee.findById(decoded.id)
      .populate('restaurant')
      .populate('vendor');

    if (!employee || !employee.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or inactive employee'
      });
    }

    // Check if employee belongs to the requested restaurant
    if (employee.restaurant._id.toString() !== restaurantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this restaurant'
      });
    }

    // Check if restaurant is active and verified
    if (!employee.restaurant.isActive || !employee.restaurant.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Restaurant is not active or verified'
      });
    }

    req.user = employee;
    req.restaurant = employee.restaurant;
    req.authType = 'employee';
    next();
  } catch (error) {
    console.error('Restaurant access authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Middleware to check specific permissions
const requireRestaurantPermission = (permissions) => {
  return (req, res, next) => {
    // If user is merchant owner (vendor), allow all permissions
    if (req.authType === 'merchant') {
      return next();
    }

    // For employees, check specific permissions
    const userPermissions = req.user.permissions || {};
    
    // Map permission strings to database permission fields
    const permissionMap = {
      'view_orders': 'canViewOrders',
      'update_orders': 'canUpdateOrders',
      'manage_orders': 'canUpdateOrders', // Use canUpdateOrders for managing orders
      'manage_menu': 'canManageMenu',
      'view_reports': 'canViewReports',
      'manage_inventory': 'canManageInventory',
      'access_pos': 'canAccessPOS',
      'manage_employees': 'canManageMenu', // For now, link to menu management (can be refined)
      'manage_restaurant': 'canManageMenu', // For now, link to menu management (can be refined)
      'all': 'all' // Special case for full access
    };

    const hasPermission = permissions.some(permission => {
      if (permission === 'all') {
        // For 'all' permission, we'll allow it for now (can be refined later)
        return true;
      }
      
      const dbPermissionField = permissionMap[permission];
      return dbPermissionField && userPermissions[dbPermissionField] === true;
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permissions: ${permissions.join(' or ')}`
      });
    }

    next();
  };
};

// @desc    Restaurant employee login
// @route   POST /api/restaurant-management/:restaurantId/login
// @access  Public
router.post('/:restaurantId/login', [
  param('restaurantId').isMongoId(),
  body('employeeId').notEmpty(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    const restaurantId = req.params.restaurantId;

    // Find restaurant employee
    const employee = await RestaurantEmployee.findOne({
      $or: [
        { employeeId },
        { assignmentNumber: employeeId }
      ],
      restaurant: restaurantId
    }).populate('restaurant').populate('vendor');

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'Invalid employee credentials'
      });
    }

    // Check password
    const isMatch = await employee.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid employee credentials'
      });
    }

    if (!employee.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Employee account is inactive'
      });
    }

    // Check restaurant status
    if (!employee.restaurant.isActive || !employee.restaurant.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Restaurant is not active or verified'
      });
    }

    // Update last login
    employee.lastLogin = new Date();
    await employee.save();

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: employee._id, 
        role: 'restaurant_employee',
        restaurant: restaurantId,
        permissions: employee.permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        employee: {
          id: employee._id,
          name: employee.name,
          role: employee.role,
          permissions: employee.permissions,
          assignmentNumber: employee.assignmentNumber,
          restaurant: {
            id: employee.restaurant._id,
            name: employee.restaurant.name,
            isActive: employee.restaurant.isActive,
            acceptingOrders: employee.restaurant.acceptingOrders
          }
        }
      }
    });

  } catch (error) {
    console.error('Restaurant employee login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// @desc    Get restaurant dashboard data
// @route   GET /api/restaurant-management/:restaurantId/dashboard
// @access  Private (Restaurant Employee or Merchant Owner)
router.get('/:restaurantId/dashboard', protectRestaurantAccess, async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Get dashboard statistics
    const [
      totalOrders,
      pendingOrders,
      activeOrders,
      completedOrders,
      dailyRevenue,
      recentOrders,
      popularItems,
      employeeCount
    ] = await Promise.all([
      Order.countDocuments({ restaurant: restaurantId }),
      Order.countDocuments({ restaurant: restaurantId, status: 'pending' }),
      Order.countDocuments({ 
        restaurant: restaurantId, 
        status: { $in: ['confirmed', 'preparing', 'ready'] }
      }),
      Order.countDocuments({ 
        restaurant: restaurantId, 
        status: 'completed',
        orderedAt: { $gte: startOfDay }
      }),
      Order.aggregate([
        {
          $match: {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            status: 'completed',
            orderedAt: { $gte: startOfDay }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]),
      Order.find({ restaurant: restaurantId })
        .sort({ orderedAt: -1 })
        .limit(10)
        .populate('assignedTo.waiter assignedTo.chef assignedTo.cashier', 'name'),
      Order.aggregate([
        {
          $match: {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            status: 'completed',
            orderedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            totalOrdered: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        { $sort: { totalOrdered: -1 } },
        { $limit: 5 }
      ]),
      RestaurantEmployee.countDocuments({ restaurant: restaurantId, isActive: true })
    ]);

    // Get hourly order distribution for today
    const hourlyOrders = await Order.aggregate([
      {
        $match: {
          restaurant: new mongoose.Types.ObjectId(restaurantId),
          orderedAt: { $gte: startOfDay }
        }
      },
      {
        $group: {
          _id: { $hour: '$orderedAt' },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders,
          pendingOrders,
          activeOrders,
          completedOrders: completedOrders,
          dailyRevenue: dailyRevenue[0]?.total || 0,
          employeeCount
        },
        recentOrders,
        popularItems,
        hourlyOrders,
        restaurant: req.restaurant
      }
    });

  } catch (error) {
    console.error('Get restaurant dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// @desc    Get all orders for restaurant
// @route   GET /api/restaurant-management/:restaurantId/orders
// @access  Private (Restaurant Employee)
router.get('/:restaurantId/orders', protectRestaurantAccess, async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;
    const {
      page = 1,
      limit = 20,
      status = '',
      date = '',
      search = ''
    } = req.query;

    // Build query
    let query = { restaurant: restaurantId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (date) {
      const searchDate = new Date(date);
      const startOfDay = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      query.orderedAt = { $gte: startOfDay, $lt: endOfDay };
    }

    if (search) {
      query.orderNumber = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get orders
    const orders = await Order.find(query)
      .populate('assignedTo.waiter assignedTo.chef assignedTo.cashier', 'name role')
      .sort({ orderedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalOrders,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get restaurant orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// @desc    Update order status
// @route   PATCH /api/restaurant-management/:restaurantId/orders/:orderId/status
// @access  Private (Restaurant Employee with order management permission)
router.patch('/:restaurantId/orders/:orderId/status', [
  protectRestaurantAccess,
  requireRestaurantPermission(['manage_orders', 'all']),
  param('restaurantId').isMongoId(),
  param('orderId').isMongoId(),
  body('status').isIn(['confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
  body('notes').optional().isLength({ max: 200 })
], async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    const employeeId = req.user._id;

    const order = await Order.findById(orderId)
      .populate('restaurant', 'name')
      .populate('customer.userId', 'name phoneNumber');

    if (!order || order.restaurant._id.toString() !== req.params.restaurantId) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status using the model method
    await order.updateStatus(status, employeeId, notes);

    // Send SMS notifications for specific status changes
    try {
      if (status === 'ready') {
        // Create item names list
        const itemNames = order.items.map(item => item.menuItemSnapshot.name).join(', ');
        
        // Send SMS notification when order is ready
        if (order.customer.phoneNumber) {
          const message = `🍽️ Great news! Your order ${itemNames} is ready for pickup/serving at ${order.restaurant.name}. Order #${order.orderNumber}`;
          
          await smsService.sendSMS(order.customer.phoneNumber, message);
          console.log(`📱 SMS sent to ${order.customer.phoneNumber} for order ready: ${order.orderNumber}`);
        }
      } else if (status === 'completed') {
        // Send SMS notification when order is completed
        if (order.customer.phoneNumber) {
          const message = `✅ Order #${order.orderNumber} was successfully completed! Thank you for choosing ${order.restaurant.name}. Keep shining! 🌟`;
          
          await smsService.sendSMS(order.customer.phoneNumber, message);
          console.log(`📱 SMS sent to ${order.customer.phoneNumber} for order completed: ${order.orderNumber}`);
        }
      }
    } catch (smsError) {
      // Log SMS error but don't fail the status update
      console.error('SMS notification error:', smsError);
    }

    // Populate the updated order
    await order.populate('assignedTo.waiter assignedTo.chef assignedTo.cashier', 'name role');

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// @desc    Assign order to employees
// @route   PATCH /api/restaurant-management/:restaurantId/orders/:orderId/assign
// @access  Private (Restaurant Employee with order management permission)
router.patch('/:restaurantId/orders/:orderId/assign', [
  protectRestaurantAccess,
  requireRestaurantPermission(['manage_orders', 'all']),
  param('restaurantId').isMongoId(),
  param('orderId').isMongoId(),
  body('waiter').optional().isMongoId(),
  body('chef').optional().isMongoId(),
  body('cashier').optional().isMongoId()
], async (req, res) => {
  try {
    const { orderId } = req.params;
    const { waiter, chef, cashier } = req.body;

    const order = await Order.findById(orderId);

    if (!order || order.restaurant.toString() !== req.params.restaurantId) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify that assigned employees belong to this restaurant
    const employeesToVerify = [waiter, chef, cashier].filter(Boolean);
    if (employeesToVerify.length > 0) {
      const validEmployees = await RestaurantEmployee.find({
        _id: { $in: employeesToVerify },
        restaurant: req.params.restaurantId,
        isActive: true
      });

      if (validEmployees.length !== employeesToVerify.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more assigned employees are invalid'
        });
      }
    }

    // Update assignments
    if (waiter) order.assignedTo.waiter = waiter;
    if (chef) order.assignedTo.chef = chef;
    if (cashier) order.assignedTo.cashier = cashier;
    
    order.assignedAt = new Date();
    await order.save();

    // Populate the updated order
    await order.populate('assignedTo.waiter assignedTo.chef assignedTo.cashier', 'name role');

    res.json({
      success: true,
      message: 'Order assignment updated successfully',
      data: order
    });

  } catch (error) {
    console.error('Assign order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign order'
    });
  }
});

// @desc    Get restaurant menu for editing
// @route   GET /api/restaurant-management/:restaurantId/menu
// @access  Private (Restaurant Employee)
router.get('/:restaurantId/menu', protectRestaurantAccess, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    res.json({
      success: true,
      data: {
        menu: restaurant.menu,
        categories: [...new Set(restaurant.menu.map(item => item.category))],
        totalItems: restaurant.menu.length,
        availableItems: restaurant.menu.filter(item => item.isAvailable).length
      }
    });

  } catch (error) {
    console.error('Get restaurant menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu'
    });
  }
});

// @desc    Update menu item availability
// @route   PATCH /api/restaurant-management/:restaurantId/menu/:itemId/availability
// @access  Private (Restaurant Employee with order management permission)
router.patch('/:restaurantId/menu/:itemId/availability', [
  protectRestaurantAccess,
  requireRestaurantPermission(['update_orders', 'all']),
  param('restaurantId').isMongoId(),
  param('itemId').isMongoId(),
  body('isAvailable').isBoolean()
], async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;
    const { isAvailable } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);

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

    menuItem.isAvailable = isAvailable;
    await restaurant.save();

    res.json({
      success: true,
      message: `Menu item ${isAvailable ? 'enabled' : 'disabled'} successfully`,
      data: menuItem
    });

  } catch (error) {
    console.error('Update menu item availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu item availability'
    });
  }
});

// @desc    Add menu item
// @route   POST /api/restaurant-management/:restaurantId/menu
// @access  Private (Restaurant Employee or Vendor)
router.post('/:restaurantId/menu', [
  protectRestaurantAccess,
  requireRestaurantPermission(['manage_menu', 'all']),
  body('name').notEmpty().withMessage('Menu item name is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('description').optional().isString(),
  body('preparationTime').optional().isNumeric(),
  body('isVeg').optional().isBoolean(),
  body('isSpicy').optional().isBoolean(),
  body('allergens').optional().isArray(),
  body('images').optional().isArray()
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

    const { name, description, price, category, preparationTime, isVeg, isSpicy, allergens, images } = req.body;
    const restaurant = req.restaurant;

    const newMenuItem = {
      name,
      description,
      price: parseFloat(price),
      category,
      preparationTime: preparationTime || 15,
      isVegetarian: isVeg || false, // Map isVeg to isVegetarian
      isSpicy: isSpicy || false, // Now we include isSpicy
      allergens: allergens || [],
      images: images || [],
      isAvailable: true
    };

    restaurant.menu.push(newMenuItem);
    await restaurant.save();

    res.status(201).json({
      success: true,
      message: 'Menu item added successfully',
      data: restaurant.menu[restaurant.menu.length - 1]
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
// @route   PUT /api/restaurant-management/:restaurantId/menu/:itemId
// @access  Private (Restaurant Employee or Vendor)
router.put('/:restaurantId/menu/:itemId', [
  protectRestaurantAccess,
  requireRestaurantPermission(['manage_menu', 'all']),
  param('itemId').isMongoId().withMessage('Invalid menu item ID'),
  body('name').optional().notEmpty().withMessage('Menu item name cannot be empty'),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('category').optional().notEmpty().withMessage('Category cannot be empty'),
  body('description').optional().isString(),
  body('preparationTime').optional().isNumeric(),
  body('isVeg').optional().isBoolean(),
  body('isSpicy').optional().isBoolean(),
  body('allergens').optional().isArray(),
  body('images').optional().isArray()
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

    const { itemId } = req.params;
    const restaurant = req.restaurant;

    const menuItem = restaurant.menu.id(itemId);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Update fields if provided
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        if (key === 'price') {
          menuItem[key] = parseFloat(req.body[key]);
        } else if (key === 'isVeg') {
          // Map isVeg to isVegetarian for model compatibility
          menuItem.isVegetarian = req.body[key];
        } else {
          menuItem[key] = req.body[key];
        }
      }
    });

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

// @desc    Delete menu item
// @route   DELETE /api/restaurant-management/:restaurantId/menu/:itemId
// @access  Private (Restaurant Employee or Vendor)
router.delete('/:restaurantId/menu/:itemId', [
  protectRestaurantAccess,
  requireRestaurantPermission(['manage_menu', 'all']),
  param('itemId').isMongoId().withMessage('Invalid menu item ID')
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

    const { itemId } = req.params;
    const restaurant = req.restaurant;

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

// @desc    Get restaurant employees
// @route   GET /api/restaurant-management/:restaurantId/employees
// @access  Private (Restaurant Employee with employee management permission)
router.get('/:restaurantId/employees', [
  protectRestaurantAccess,
  requireRestaurantPermission(['manage_employees', 'all'])
], async (req, res) => {
  try {
    const employees = await RestaurantEmployee.find({ 
      restaurant: req.params.restaurantId 
    })
    .populate('assignedBy', 'name')
    .select('-password')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: employees
    });

  } catch (error) {
    console.error('Get restaurant employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees'
    });
  }
});

// @desc    Get restaurant analytics
// @route   GET /api/restaurant-management/:restaurantId/analytics
// @access  Private (Restaurant Employee)
router.get('/:restaurantId/analytics', protectRestaurantAccess, async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;
    const { period = '30' } = req.query; // days
    const daysBack = parseInt(period);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Get analytics data
    const [dailyStats, menuStats, employeeStats] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            orderedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$orderedAt' }
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      Order.aggregate([
        {
          $match: {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            status: 'completed',
            orderedAt: { $gte: startDate }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            totalOrdered: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        { $sort: { totalOrdered: -1 } }
      ]),
      Order.aggregate([
        {
          $match: {
            restaurant: new mongoose.Types.ObjectId(restaurantId),
            orderedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$assignedTo.waiter',
            orders: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        {
          $lookup: {
            from: 'restaurantemployees',
            localField: '_id',
            foreignField: '_id',
            as: 'employee'
          }
        },
        { $sort: { orders: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        dailyStats,
        menuStats,
        employeeStats,
        period: daysBack
      }
    });

  } catch (error) {
    console.error('Get restaurant analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
});

// @desc    Toggle restaurant accepting orders status
// @route   PATCH /api/restaurant-management/:restaurantId/accepting-orders
// @access  Private (Restaurant Employee with management permission)
router.patch('/:restaurantId/accepting-orders', [
  protectRestaurantAccess,
  requireRestaurantPermission(['manage_restaurant', 'all']),
  body('acceptingOrders').isBoolean()
], async (req, res) => {
  try {
    const { acceptingOrders } = req.body;

    const restaurant = await Restaurant.findById(req.params.restaurantId);
    restaurant.acceptingOrders = acceptingOrders;
    await restaurant.save();

    res.json({
      success: true,
      message: `Restaurant is now ${acceptingOrders ? 'accepting' : 'not accepting'} orders`,
      data: { acceptingOrders }
    });

  } catch (error) {
    console.error('Toggle accepting orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update accepting orders status'
    });
  }
});

// @desc    Add new menu item
// @route   POST /api/restaurant-management/:restaurantId/menu
// @access  Private (Restaurant Employee with menu management permission)
router.post('/:restaurantId/menu', [
  protectRestaurantAccess,
  requireRestaurantPermission(['manage_menu', 'all']),
  body('name').notEmpty().withMessage('Menu item name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').notEmpty().withMessage('Category is required')
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

    const { name, description, price, category, preparationTime, isVeg, isSpicy, allergens } = req.body;
    const restaurant = req.restaurant;

    // Create new menu item
    const newMenuItem = {
      name: name.trim(),
      description: description?.trim() || '',
      price: parseFloat(price),
      category: category.trim(),
      preparationTime: preparationTime || 15,
      isVeg: isVeg || false,
      isSpicy: isSpicy || false,
      allergens: allergens || [],
      isAvailable: true,
      addedBy: req.user._id,
      addedAt: new Date()
    };

    restaurant.menu.push(newMenuItem);
    await restaurant.save();

    res.status(201).json({
      success: true,
      message: 'Menu item added successfully',
      data: restaurant.menu[restaurant.menu.length - 1]
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
// @route   PUT /api/restaurant-management/:restaurantId/menu/:itemId
// @access  Private (Restaurant Employee with menu management permission)
router.put('/:restaurantId/menu/:itemId', [
  protectRestaurantAccess,
  requireRestaurantPermission(['manage_menu', 'all']),
  param('itemId').isMongoId(),
  body('name').optional().notEmpty().withMessage('Menu item name cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').optional().notEmpty().withMessage('Category cannot be empty')
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

    const { itemId } = req.params;
    const restaurant = req.restaurant;

    const menuItem = restaurant.menu.id(itemId);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Update menu item fields
    const updateFields = ['name', 'description', 'price', 'category', 'preparationTime', 'isVeg', 'isSpicy', 'allergens'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'price') {
          menuItem[field] = parseFloat(req.body[field]);
        } else if (field === 'name' || field === 'description' || field === 'category') {
          menuItem[field] = req.body[field].trim();
        } else {
          menuItem[field] = req.body[field];
        }
      }
    });

    menuItem.updatedBy = req.user._id;
    menuItem.updatedAt = new Date();

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

// @desc    Delete menu item
// @route   DELETE /api/restaurant-management/:restaurantId/menu/:itemId
// @access  Private (Restaurant Employee with menu management permission)
router.delete('/:restaurantId/menu/:itemId', [
  protectRestaurantAccess,
  requireRestaurantPermission(['manage_menu', 'all']),
  param('itemId').isMongoId()
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

    const { itemId } = req.params;
    const restaurant = req.restaurant;

    const menuItem = restaurant.menu.id(itemId);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Remove the menu item
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

// @desc    Assign employee to restaurant
// @route   POST /api/restaurant-management/:restaurantId/assign-employee
// @access  Private (Vendor only)
router.post('/:restaurantId/assign-employee', [
  protectRestaurantAccess,
  requireRestaurantPermission(['all']), // Only vendors (owners) can assign employees
  body('employeeName').notEmpty().withMessage('Employee name is required'),
  body('phoneNumber').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('role').isIn(['restaurant_manager', 'chef', 'waiter', 'cashier', 'general_staff']).withMessage('Valid role is required')
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

    const { employeeName, phoneNumber, password, email, role, notes } = req.body;
    const restaurant = req.restaurant;
    const vendor = req.user; // This should be the vendor from auth middleware

    // Check if employee with this phone number already exists for this restaurant
    const existingEmployee = await RestaurantEmployee.findOne({
      restaurant: restaurant._id,
      phoneNumber: phoneNumber
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this phone number already exists for this restaurant'
      });
    }

    // Get restaurant's charging station
    const chargingStation = await require('../models/ChargingStation').findById(restaurant.chargingStation);
    if (!chargingStation) {
      return res.status(400).json({
        success: false,
        message: 'Associated charging station not found'
      });
    }

    // Create new restaurant employee
    const newEmployee = new RestaurantEmployee({
      employeeName,
      phoneNumber,
      password, // Will be hashed by the model's pre-save hook
      email,
      restaurant: restaurant._id,
      chargingStation: chargingStation._id,
      vendor: vendor._id,
      role,
      notes,
      assignedBy: vendor._id,
      permissions: {
        canViewOrders: true,
        canUpdateOrders: role !== 'general_staff',
        canManageMenu: role === 'restaurant_manager' || role === 'chef',
        canViewReports: role === 'restaurant_manager',
        canManageInventory: role === 'restaurant_manager' || role === 'chef',
        canAccessPOS: role === 'cashier' || role === 'restaurant_manager'
      }
    });

    await newEmployee.save();

    // Populate the response
    await newEmployee.populate([
      { path: 'restaurant', select: 'name' },
      { path: 'chargingStation', select: 'name location' },
      { path: 'assignedBy', select: 'businessName name' }
    ]);

    // Send notifications to the employee
    try {
      // Prepare notification data
      const notificationData = {
        employeeName: newEmployee.employeeName,
        employeeId: newEmployee.assignmentNumber,
        password: password, // Original password before hashing
        role: role,
        restaurantName: newEmployee.restaurant.name,
        stationName: newEmployee.chargingStation.name,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/restaurant/${restaurant._id}/login`
      };

      // Send SMS notification
      const smsResult = await smsService.sendEmployeeAssignment(
        phoneNumber,
        newEmployee.employeeName,
        notificationData.employeeId,
        notificationData.password,
        notificationData.restaurantName,
        role,
        notificationData.loginUrl
      );
      console.log('Employee assignment SMS result:', smsResult);

      // Send email notification if email is provided
      if (email && email.trim() !== '') {
        const emailResult = await emailService.sendEmail({
          to: email,
          template: 'employee-assignment',
          data: notificationData
        });
        console.log('Employee assignment email result:', emailResult);
      }

      // SMS and email notifications sent successfully
      console.log('Employee assignment notifications sent successfully');

    } catch (notificationError) {
      console.error('Error sending employee assignment notifications:', notificationError);
      // Don't fail the entire request if notifications fail
    }

    res.status(201).json({
      success: true,
      message: 'Employee assigned successfully and notifications sent',
      data: {
        employee: {
          _id: newEmployee._id,
          assignmentNumber: newEmployee.assignmentNumber,
          employeeName: newEmployee.employeeName,
          phoneNumber: newEmployee.phoneNumber,
          email: newEmployee.email,
          role: newEmployee.role,
          isActive: newEmployee.isActive,
          permissions: newEmployee.permissions,
          restaurant: newEmployee.restaurant,
          chargingStation: newEmployee.chargingStation,
          assignedBy: newEmployee.assignedBy,
          assignedAt: newEmployee.assignedAt,
          notes: newEmployee.notes
        }
      }
    });

  } catch (error) {
    console.error('Assign restaurant employee error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this phone number already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to assign employee'
    });
  }
});

// @desc    Delete restaurant employee
// @route   DELETE /api/restaurant-management/:restaurantId/employees/:employeeId
// @access  Private (Vendor only)
router.delete('/:restaurantId/employees/:employeeId', [
  protectRestaurantAccess,
  requireRestaurantPermission(['all']), // Only vendors (owners) can delete employees
  param('restaurantId').isMongoId().withMessage('Invalid restaurant ID'),
  param('employeeId').isMongoId().withMessage('Invalid employee ID')
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

    const { employeeId } = req.params;

    // Find and verify the employee
    const employee = await RestaurantEmployee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Verify employee belongs to this restaurant
    if (employee.restaurant.toString() !== req.params.restaurantId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Employee does not belong to this restaurant'
      });
    }

    // Delete the employee
    await RestaurantEmployee.findByIdAndDelete(employeeId);

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });

  } catch (error) {
    console.error('Delete restaurant employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete employee'
    });
  }
});

// @desc    Delete restaurant employee
// @route   DELETE /api/restaurant-management/:restaurantId/employees/:employeeId
// @access  Private (Vendor only)
router.delete('/:restaurantId/employees/:employeeId', [
  protectRestaurantAccess,
  requireRestaurantPermission(['all']), // Only vendors (owners) can delete employees
  param('restaurantId').isMongoId(),
  param('employeeId').isMongoId()
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

    const { employeeId } = req.params;

    // Find and verify the employee belongs to this restaurant
    const employee = await RestaurantEmployee.findOne({
      _id: employeeId,
      restaurant: req.params.restaurantId
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Delete the employee
    await RestaurantEmployee.findByIdAndDelete(employeeId);

    console.log(`Employee deleted: ${employee.employeeName} (ID: ${employeeId}) from restaurant ${req.restaurant.name}`);

    // Create notification for successful deletion
    const notification = new Notification({
      recipientType: 'vendor',
      recipientId: req.user._id,
      title: 'Employee Deleted',
      message: `Employee ${employee.employeeName} has been successfully deleted from ${req.restaurant.name}.`,
      type: 'employee_management',
      metadata: {
        restaurantId: req.params.restaurantId,
        deletedEmployeeId: employeeId,
        deletedEmployeeName: employee.employeeName
      }
    });
    await notification.save();

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });

  } catch (error) {
    console.error('Delete restaurant employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete employee'
    });
  }
});

// @desc    Request password change OTP
// @route   POST /api/restaurant-management/:restaurantId/employees/:employeeId/change-password-request
// @access  Private (Vendor only)
router.post('/:restaurantId/employees/:employeeId/change-password-request', [
  protectRestaurantAccess,
  requireRestaurantPermission(['all']), // Only vendors (owners) can change employee passwords
  param('restaurantId').isMongoId(),
  param('employeeId').isMongoId(),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

    const { employeeId } = req.params;
    const { newPassword } = req.body;

    // Find and verify the employee belongs to this restaurant
    const employee = await RestaurantEmployee.findOne({
      _id: employeeId,
      restaurant: req.params.restaurantId
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get vendor details for OTP sending
    const vendor = await Vendor.findById(req.user._id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis with 10-minute expiration
    const otpKey = `password_change:${vendor._id}:${employeeId}`;
    await storeOTP(otpKey, JSON.stringify({
      otp,
      newPassword,
      employeeId,
      vendorId: vendor._id,
      employeeName: employee.employeeName
    }), 10);

    // Send OTP to vendor's phone number
    await smsService.sendPasswordChangeOTP(vendor.phoneNumber, employee.employeeName, otp);

    res.json({
      success: true,
      message: 'OTP sent to your registered phone number',
      data: {
        otpSent: true,
        expiresIn: 10 // minutes
      }
    });

  } catch (error) {
    console.error('Request password change OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

// @desc    Verify OTP and change employee password
// @route   POST /api/restaurant-management/:restaurantId/employees/:employeeId/change-password-verify
// @access  Private (Vendor only)
router.post('/:restaurantId/employees/:employeeId/change-password-verify', [
  protectRestaurantAccess,
  requireRestaurantPermission(['all']), // Only vendors (owners) can change employee passwords
  param('restaurantId').isMongoId(),
  param('employeeId').isMongoId(),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
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

    const { employeeId } = req.params;
    const { newPassword, otp } = req.body;

    // Find and verify the employee belongs to this restaurant
    const employee = await RestaurantEmployee.findOne({
      _id: employeeId,
      restaurant: req.params.restaurantId
    }).populate('restaurant');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get stored OTP data from Redis
    const otpKey = `password_change:${req.user._id}:${employeeId}`;
    const storedData = await getOTP(otpKey);

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new OTP.'
      });
    }

    const otpData = JSON.parse(storedData);

    // Verify OTP
    if (otpData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Verify password matches the one from the request
    if (otpData.newPassword !== newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password mismatch'
      });
    }

    // Update employee password
    employee.password = newPassword; // Will be hashed by pre-save hook
    await employee.save();

    // Delete the OTP from Redis
    await deleteOTP(otpKey);

    // Send SMS notification to employee
    try {
      await smsService.sendPasswordChangeNotification(employee.phoneNumber, employee.employeeName, newPassword);
    } catch (smsError) {
      console.error('Error sending password change SMS to employee:', smsError);
      // Don't fail the entire request if SMS fails
    }

    // Send email notification to employee if email is provided
    if (employee.email && employee.email.trim() !== '') {
      try {
        const vendor = await Vendor.findById(req.user._id);
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/restaurant/${req.params.restaurantId}`;
        
        const emailTemplate = emailTemplates['password-change'];
        const emailHtml = emailTemplate.html
          .replace(/{{employeeName}}/g, employee.employeeName)
          .replace(/{{employeeId}}/g, employee.assignmentNumber)
          .replace(/{{newPassword}}/g, newPassword)
          .replace(/{{restaurantName}}/g, employee.restaurant?.name || 'Restaurant')
          .replace(/{{changedBy}}/g, vendor?.businessName || vendor?.name || 'Restaurant Owner')
          .replace(/{{changedAt}}/g, new Date().toLocaleString())
          .replace(/{{loginUrl}}/g, loginUrl);

        await emailService.sendEmail({
          to: employee.email,
          subject: emailTemplate.subject.replace(/{{restaurantName}}/g, employee.restaurant?.name || 'Restaurant'),
          htmlBody: emailHtml
        });

        console.log('Password change notification email sent successfully to:', employee.email);
      } catch (emailError) {
        console.error('Error sending password change email to employee:', emailError);
        // Don't fail the entire request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: {
        employeeName: employee.employeeName,
        employeeId: employee.assignmentNumber
      }
    });

  } catch (error) {
    console.error('Verify password change OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// @desc    Create offline order (for walk-in customers)
// @route   POST /api/restaurant-management/:restaurantId/create-order
// @access  Private (Restaurant Employee with order management permission)
router.post('/:restaurantId/create-order', [
  protectRestaurantAccess,
  requireRestaurantPermission(['manage_orders', 'all']),
  body('customer.name').notEmpty().withMessage('Customer name is required'),
  body('customer.phoneNumber').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menuItemId').isMongoId().withMessage('Valid menu item ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('orderType').isIn(['dine_in', 'takeaway']).withMessage('Valid order type is required'),
  body('payment.method').isIn(['cash', 'card', 'upi', 'wallet']).withMessage('Valid payment method is required'),
  body('tableInfo.tableNumber').optional().isString(),
  body('notes.customer').optional().isString().isLength({ max: 500 }),
  body('notes.restaurant').optional().isString().isLength({ max: 500 })
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

    const {
      customer,
      items,
      orderType,
      payment,
      tableInfo,
      notes
    } = req.body;

    const restaurant = req.restaurant;
    const employee = req.user;

    // Validate menu items and get their details
    const menuItems = [];
    let subtotal = 0;

    for (const item of items) {
      const menuItem = restaurant.menu.id(item.menuItemId);
      
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item with ID ${item.menuItemId} not found`
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

      menuItems.push({
        menuItem: item.menuItemId,
        menuItemSnapshot: {
          name: menuItem.name,
          description: menuItem.description,
          price: menuItem.price,
          category: menuItem.category,
          image: menuItem.images && menuItem.images.length > 0 ? menuItem.images[0].url : null
        },
        quantity: item.quantity,
        unitPrice: menuItem.price,
        totalPrice: itemTotal,
        specialInstructions: item.specialInstructions || ''
      });
    }

    // Calculate service charge (no tax for offline orders)
    const serviceChargeAmount = (subtotal * restaurant.serviceCharge?.percentage || 0) / 100;
    const totalAmount = subtotal + serviceChargeAmount;

    // Create the order
    const Order = require('../models/Order');
    const newOrder = new Order({
      restaurant: restaurant._id,
      chargingStation: restaurant.chargingStation,
      vendor: restaurant.vendor,
      customer: {
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        email: customer.email || null
      },
      items: menuItems,
      subtotal,
      tax: {
        percentage: 0,
        amount: 0
      },
      serviceCharge: {
        percentage: restaurant.serviceCharge?.percentage || 0,
        amount: serviceChargeAmount
      },
      totalAmount,
      orderType,
      tableInfo: tableInfo || null,
      payment: {
        method: payment.method,
        status: 'paid', // For offline orders, assume paid immediately
        paidAt: new Date()
      },
      notes: notes || {},
      status: 'confirmed', // Start as confirmed since it's an offline order
      confirmedAt: new Date(),
      createdBy: employee._id,
      lastUpdatedBy: employee._id,
      estimatedPreparationTime: Math.max(...menuItems.map(item => 
        restaurant.menu.id(item.menuItem).preparationTime || 15
      ))
    });

    await newOrder.save();

    // Populate the order for response
    await newOrder.populate([
      { path: 'restaurant', select: 'name' },
      { path: 'chargingStation', select: 'name address' },
      { path: 'createdBy', select: 'employeeName' }
    ]);

    // Send SMS notification to customer
    try {
      const itemNames = menuItems.map(item => item.menuItemSnapshot.name).join(', ');
      const message = `🍽️ Thank you for your order at ${restaurant.name}! Order #${newOrder.orderNumber} - ${itemNames} - Total: ₹${totalAmount}. Your order is being prepared.`;
      
      await smsService.sendSMS(customer.phoneNumber, message);
      console.log(`📱 SMS sent to ${customer.phoneNumber} for offline order: ${newOrder.orderNumber}`);
    } catch (smsError) {
      console.error('SMS notification error:', smsError);
      // Don't fail the order creation if SMS fails
    }

    res.status(201).json({
      success: true,
      message: 'Offline order created successfully',
      data: {
        order: newOrder,
        printData: {
          orderNumber: newOrder.orderNumber,
          customerName: customer.name,
          customerPhone: customer.phoneNumber,
          items: menuItems,
          subtotal,
          taxAmount: 0,
          serviceChargeAmount,
          totalAmount,
          orderType,
          tableNumber: tableInfo?.tableNumber,
          createdAt: newOrder.orderedAt,
          restaurantName: restaurant.name,
          restaurantAddress: newOrder.chargingStation.address,
          restaurantPhone: restaurant.contactInfo?.phoneNumber || ''
        }
      }
    });

  } catch (error) {
    console.error('Create offline order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create offline order'
    });
  }
});

module.exports = router;
