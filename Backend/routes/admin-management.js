const express = require('express');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const ChargingStation = require('../models/ChargingStation');
const Booking = require('../models/Booking');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const { protectAdmin, requirePermission } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const { optimizedUploadSingleToS3 } = require('../middleware/optimized-upload');
const { optimizedUploadService } = require('../config/optimized-upload');
const upload = optimizedUploadService.getOptimizedMulterConfig();
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');
const { getRedisClient, storeOTP, getOTP, deleteOTP } = require('../config/redis');

// Helper function to send comprehensive notifications (in-app, SMS, email)
const sendComprehensiveNotification = async (vendor, title, message, type = 'info', includeStationInfo = false) => {
  try {
    // Send in-app notification
    await Notification.createNotification({
      recipient: vendor._id,
      recipientModel: 'Vendor',
      title,
      message,
      type,
      priority: 'high'
    });

    // Prepare personalized messages
    const businessName = vendor.businessName || vendor.name || 'Vendor';
    const personalizedMessage = `Dear ${businessName},\n\n${message}`;

    // Send SMS notification
    if (vendor.phoneNumber) {
      try {
        await smsService.sendSMS(
          vendor.phoneNumber,
          `${title}\n\n${personalizedMessage}\n\nBest regards,\nDockIt Team`
        );
        console.log(`✅ SMS sent to vendor: ${vendor._id}`);
      } catch (smsError) {
        console.error('Error sending SMS:', smsError);
      }
    }

    // Send email notification
    if (vendor.email) {
      try {
        await emailService.sendEmail({
          to: vendor.email,
          subject: `${title} - DockIt`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">DockIt</h1>
                <p style="color: white; margin: 5px 0;">EV Charging Station Platform</p>
              </div>
              
              <div style="padding: 30px; background: white;">
                <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
                
                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  Dear ${businessName},
                </p>
                
                <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                  <p style="color: #555; line-height: 1.6; margin: 0;">
                    ${message.replace(/\n/g, '<br>')}
                  </p>
                </div>
                
                ${includeStationInfo ? `
                <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="color: #2d7a2d; margin: 0 0 10px 0;">📍 Station Status</h3>
                  <p style="color: #2d7a2d; margin: 0; font-size: 14px;">
                    Your stations are now live and ready to accept bookings. Customers can find and book your stations immediately.
                  </p>
                </div>
                ` : ''}
                
                <div style="margin: 30px 0; text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'https://dockit.app'}/merchant/dashboard" 
                     style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    View Dashboard
                  </a>
                </div>
                
                <p style="color: #555; line-height: 1.6;">
                  If you have any questions or need assistance, please don't hesitate to contact our support team.
                </p>
                
                <p style="color: #555; line-height: 1.6; margin-top: 30px;">
                  Best regards,<br>
                  <strong>The DockIt Team</strong>
                </p>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
                <p>This is an automated message from DockIt EV Charging Platform.</p>
                <p>For support, contact us at support@dockit.app</p>
              </div>
            </div>
          `
        });
        console.log(`✅ Email sent to vendor: ${vendor._id}`);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    console.log(`✅ Comprehensive notification sent to vendor: ${vendor._id}`);
  } catch (error) {
    console.error('Error sending comprehensive notification:', error);
  }
};

const router = express.Router();

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/admin/dashboard/stats
 * @access  Private (Admin)
 */
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalVendors,
      totalStations,
      totalBookings,
      totalAdmins,
      totalEmployees,
      activeBookings,
      recentUsers
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Vendor.countDocuments({ isActive: true }),
      ChargingStation.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Admin.countDocuments({ isActive: true }),
      Employee.countDocuments({ isActive: true }),
      Booking.countDocuments({ status: { $in: ['confirmed', 'active'] } }),
      User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name phoneNumber email createdAt')
    ]);

    // Get vendor verification stats
    const [pendingVendors, verifiedVendors, rejectedVendors] = await Promise.all([
      Vendor.countDocuments({ verificationStatus: 'pending' }),
      Vendor.countDocuments({ verificationStatus: 'verified' }),
      Vendor.countDocuments({ verificationStatus: 'rejected' })
    ]);

    // ============== PLATFORM REVENUE CALCULATIONS ==============
    // Get detailed platform revenue for all time periods
    const [
      totalPlatformRevenue,
      monthlyPlatformRevenue,
      weeklyPlatformRevenue,
      todayPlatformRevenue
    ] = await Promise.all([
      // Total platform revenue (all time)
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            totalPlatformFees: { $sum: '$pricing.platformFee' },
            totalBookings: { $sum: 1 },
            totalRevenue: { $sum: '$pricing.totalAmount' },
            totalMerchantAmount: { $sum: '$pricing.merchantAmount' }
          }
        }
      ]),
      // Monthly platform revenue
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            paymentStatus: 'paid',
            createdAt: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            monthlyPlatformFees: { $sum: '$pricing.platformFee' },
            monthlyBookings: { $sum: 1 },
            monthlyRevenue: { $sum: '$pricing.totalAmount' },
            monthlyMerchantAmount: { $sum: '$pricing.merchantAmount' }
          }
        }
      ]),
      // Weekly platform revenue
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            paymentStatus: 'paid',
            createdAt: { $gte: startOfWeek }
          }
        },
        {
          $group: {
            _id: null,
            weeklyPlatformFees: { $sum: '$pricing.platformFee' },
            weeklyBookings: { $sum: 1 },
            weeklyRevenue: { $sum: '$pricing.totalAmount' },
            weeklyMerchantAmount: { $sum: '$pricing.merchantAmount' }
          }
        }
      ]),
      // Today's platform revenue
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            paymentStatus: 'paid',
            createdAt: { $gte: startOfToday }
          }
        },
        {
          $group: {
            _id: null,
            todayPlatformFees: { $sum: '$pricing.platformFee' },
            todayBookings: { $sum: 1 },
            todayRevenue: { $sum: '$pricing.totalAmount' },
            todayMerchantAmount: { $sum: '$pricing.merchantAmount' }
          }
        }
      ])
    ]);

    // Get booking stats for current month and week
    const [monthlyBookings, weeklyBookings] = await Promise.all([
      Booking.countDocuments({ 
        createdAt: { $gte: startOfMonth },
        status: { $in: ['completed', 'active'] }
      }),
      Booking.countDocuments({ 
        createdAt: { $gte: startOfWeek },
        status: { $in: ['completed', 'active'] }
      })
    ]);

    // Get top performing stations and payment stats
    const [topStations, paymentStats] = await Promise.all([
      ChargingStation.aggregate([
        {
          $lookup: {
            from: 'bookings',
            localField: '_id',
            foreignField: 'chargingStation',
            as: 'bookings'
          }
        },
        {
          $addFields: {
            totalBookings: { $size: '$bookings' },
            completedBookings: {
              $size: {
                $filter: {
                  input: '$bookings',
                  cond: { $eq: ['$$this.status', 'completed'] }
                }
              }
            }
          }
        },
        {
          $sort: { totalBookings: -1 }
        },
        {
          $limit: 5
        },
        {
          $project: {
            name: 1,
            totalBookings: 1,
            completedBookings: 1,
            'address.city': 1,
            'address.state': 1,
            isActive: 1,
            isVerified: 1
          }
        }
      ]),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: last30Days }
          }
        },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$pricing.totalAmount' },
            platformFees: { $sum: '$pricing.platformFee' }
          }
        }
      ])
    ]);

    // Get monthly breakdown data for charts (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    
    const monthlyBreakdown = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          platformRevenue: { $sum: '$pricing.platformFee' },
          merchantRevenue: { $sum: '$pricing.merchantAmount' },
          completedPlatformRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                '$pricing.platformFee',
                0
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get daily platform revenue for the last 30 days
    const dailyPlatformRevenue = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: last30Days },
          status: 'completed',
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          dailyPlatformFees: { $sum: '$pricing.platformFee' },
          dailyBookings: { $sum: 1 },
          dailyTotalRevenue: { $sum: '$pricing.totalAmount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Calculate growth percentages (using historical data)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    const [currentMonthStats, lastMonthStats] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            bookings: { $sum: 1 },
            revenue: { $sum: '$pricing.totalAmount' },
            platformRevenue: { $sum: '$pricing.platformFee' }
          }
        }
      ]),
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            bookings: { $sum: 1 },
            revenue: { $sum: '$pricing.totalAmount' },
            platformRevenue: { $sum: '$pricing.platformFee' }
          }
        }
      ])
    ]);

    const currentStats = currentMonthStats[0] || { bookings: 0, revenue: 0, platformRevenue: 0 };
    const previousStats = lastMonthStats[0] || { bookings: 0, revenue: 0, platformRevenue: 0 };

    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    const growth = {
      users: calculateGrowth(totalUsers, totalUsers * 0.95), // Approximate
      bookings: calculateGrowth(currentStats.bookings, previousStats.bookings),
      revenue: calculateGrowth(currentStats.revenue, previousStats.revenue),
      platformRevenue: calculateGrowth(currentStats.platformRevenue, previousStats.platformRevenue),
      stations: calculateGrowth(totalStations, totalStations * 0.98) // Approximate
    };

    // Extract platform revenue data
    const totalPlatformData = totalPlatformRevenue[0] || {};
    const monthlyPlatformData = monthlyPlatformRevenue[0] || {};
    const weeklyPlatformData = weeklyPlatformRevenue[0] || {};
    const todayPlatformData = todayPlatformRevenue[0] || {};

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalVendors,
          totalStations,
          totalBookings,
          totalAdmins,
          totalEmployees,
          activeBookings
        },
        vendorStats: {
          pending: pendingVendors,
          verified: verifiedVendors,
          rejected: rejectedVendors
        },
        monthlyStats: {
          bookings: monthlyBookings,
          revenue: monthlyPlatformData.monthlyRevenue || 0,
          platformRevenue: monthlyPlatformData.monthlyPlatformFees || 0,
          merchantRevenue: monthlyPlatformData.monthlyMerchantAmount || 0
        },
        weeklyStats: {
          bookings: weeklyBookings,
          revenue: weeklyPlatformData.weeklyRevenue || 0,
          platformRevenue: weeklyPlatformData.weeklyPlatformFees || 0,
          merchantRevenue: weeklyPlatformData.weeklyMerchantAmount || 0
        },
        todayStats: {
          bookings: todayPlatformData.todayBookings || 0,
          revenue: todayPlatformData.todayRevenue || 0,
          platformRevenue: todayPlatformData.todayPlatformFees || 0,
          merchantRevenue: todayPlatformData.todayMerchantAmount || 0
        },
        totalStats: {
          totalPlatformRevenue: totalPlatformData.totalPlatformFees || 0,
          totalBookings: totalPlatformData.totalBookings || 0,
          totalRevenue: totalPlatformData.totalRevenue || 0,
          totalMerchantRevenue: totalPlatformData.totalMerchantAmount || 0
        },
        platformRevenue: {
          total: totalPlatformData.totalPlatformFees || 0,
          monthly: monthlyPlatformData.monthlyPlatformFees || 0,
          weekly: weeklyPlatformData.weeklyPlatformFees || 0,
          today: todayPlatformData.todayPlatformFees || 0,
          daily: dailyPlatformRevenue,
          avgPerBooking: totalPlatformData.totalBookings > 0 
            ? Math.round((totalPlatformData.totalPlatformFees / totalPlatformData.totalBookings) * 100) / 100 
            : 0
        },
        growth,
        recentUsers,
        topStations,
        monthlyBreakdown,
        paymentStats: paymentStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount || 0,
            platformFees: stat.platformFees || 0
          };
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

/**
 * @desc    Get all admins (SuperAdmin only)
 * @route   GET /api/admin/admins
 * @access  Private (SuperAdmin)
 */
const getAllAdmins = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';

    // Build filter
    const filter = { isActive: true };
    
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { adminId: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role && role !== 'all') {
      filter.role = role;
    }

    const [admins, total] = await Promise.all([
      Admin.find(filter)
        .populate('createdBy', 'fullName adminId role')
        .select('-deviceSessions')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit),
      Admin.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        admins,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins'
    });
  }
};

/**
 * @desc    Get all employees
 * @route   GET /api/admin/employees
 * @access  Private (Admin with permission)
 */
const getAllEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const department = req.query.department || '';

    // Build filter
    const filter = { isActive: true };
    
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (department && department !== 'all') {
      filter.department = department;
    }

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate('supervisor', 'fullName adminId')
        .populate('createdBy', 'fullName adminId')
        .select('-password -deviceSessions')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit),
      Employee.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees'
    });
  }
};

/**
 * @desc    Create new admin (SuperAdmin only)
 * @route   POST /api/admin/admins
 * @access  Private (SuperAdmin)
 */
const createAdmin = async (req, res) => {
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
      fullName,
      email,
      phoneNumber,
      dateOfBirth,
      role,
      permissions,
      notes
    } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { phoneNumber }],
      isActive: true
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email or phone number already exists'
      });
    }

    // Create new admin
    const admin = new Admin({
      fullName,
      email,
      phoneNumber,
      dateOfBirth: new Date(dateOfBirth),
      role: role || 'admin',
      createdBy: req.user.id,
      notes
    });

    // Set custom permissions if provided (only for regular admins)
    if (role !== 'superadmin' && permissions) {
      Object.keys(permissions).forEach(permission => {
        if (admin.permissions[permission] !== undefined) {
          admin.permissions[permission] = permissions[permission];
        }
      });
    }

    await admin.save();

    // Send welcome email with login instructions
    try {
      await emailService.sendAdminWelcomeEmail(admin.email, admin.fullName, admin.adminId);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Remove sensitive data from response
    const adminResponse = admin.toObject();
    delete adminResponse.deviceSessions;

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { admin: adminResponse }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin'
    });
  }
};

/**
 * @desc    Create new employee (Admin with permission)
 * @route   POST /api/admin/employees
 * @access  Private (Admin)
 */
const createEmployee = async (req, res) => {
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
      fullName,
      email,
      phoneNumber,
      dateOfBirth,
      department,
      position,
      password,
      permissions,
      workSchedule,
      contactPreferences,
      notes
    } = req.body;

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({
      $or: [{ email }, { phoneNumber }],
      isActive: true
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this email or phone number already exists'
      });
    }

    // Create new employee
    const employee = new Employee({
      fullName,
      email,
      phoneNumber,
      dateOfBirth: new Date(dateOfBirth),
      department,
      position,
      password,
      supervisor: req.user.id,
      createdBy: req.user.id,
      workSchedule,
      contactPreferences,
      notes
    });

    // Set custom permissions if provided
    if (permissions) {
      Object.keys(permissions).forEach(permission => {
        if (employee.permissions[permission] !== undefined) {
          employee.permissions[permission] = permissions[permission];
        }
      });
    }

    await employee.save();

    // Send welcome email with login credentials
    try {
      await emailService.sendEmployeeWelcomeEmail(
        employee.email, 
        employee.fullName, 
        employee.employeeId, 
        password
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Remove sensitive data from response
    const employeeResponse = employee.toObject();
    delete employeeResponse.password;
    delete employeeResponse.deviceSessions;

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: { employee: employeeResponse }
    });

  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create employee'
    });
  }
};

/**
 * @desc    Update admin (SuperAdmin only)
 * @route   PUT /api/admin/admins/:adminId
 * @access  Private (SuperAdmin)
 */
const updateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { fullName, permissions, isActive, notes } = req.body;

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent superadmin from deactivating themselves
    if (adminId === req.user.id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    // Update fields
    if (fullName) admin.fullName = fullName;
    if (typeof isActive === 'boolean') admin.isActive = isActive;
    if (notes !== undefined) admin.notes = notes;

    // Update permissions (only for regular admins)
    if (admin.role !== 'superadmin' && permissions) {
      Object.keys(permissions).forEach(permission => {
        if (admin.permissions[permission] !== undefined) {
          admin.permissions[permission] = permissions[permission];
        }
      });
    }

    await admin.save();

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: { admin }
    });

  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin'
    });
  }
};

/**
 * @desc    Upload profile picture
 * @route   POST /api/admin/upload-profile/:userType/:userId
 * @access  Private (Admin)
 */
const uploadProfilePicture = async (req, res) => {
  try {
    const { userType, userId } = req.params;
    
    if (!req.uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let user;
    if (userType === 'admin') {
      user = await Admin.findById(userId);
    } else if (userType === 'employee') {
      user = await Employee.findById(userId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `${userType} not found`
      });
    }

    // Update profile picture
    user.profilePicture = {
      url: req.uploadedFile.url,
      objectName: req.uploadedFile.objectName,
      originalName: req.uploadedFile.originalName,
      size: req.uploadedFile.size,
      uploadedAt: new Date()
    };

    await user.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: { profilePicture: user.profilePicture }
    });

  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture'
    });
  }
};

/**
 * @desc    Get all stations with vendor info for map
 * @route   GET /api/admin/stations/map
 * @access  Private (Admin)
 */
const getStationsForMap = async (req, res) => {
  try {
    const stations = await ChargingStation.find({ isActive: true })
      .populate('vendor', 'name businessName phoneNumber email verificationStatus')
      .select('name location address vendor amenities pricing chargingPorts isActive createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { stations }
    });

  } catch (error) {
    console.error('Get stations for map error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stations'
    });
  }
};

/**
 * @desc    Get all users for admin management
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    // Build filter
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -refreshTokens -otpAttempts')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit),
      User.countDocuments(filter)
    ]);

    // For each user, get totalBookings and totalSpent
    const userIds = users.map(u => u._id);
    const bookings = await Booking.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: {
        _id: '$user',
        totalBookings: { $sum: 1 },
        totalSpent: { $sum: { $ifNull: [ '$actualUsage.finalAmount', '$pricing.totalAmount' ] } }
      }}
    ]);
    const bookingMap = {};
    bookings.forEach(b => {
      bookingMap[b._id.toString()] = {
        totalBookings: b.totalBookings,
        totalSpent: b.totalSpent
      };
    });
    const usersWithStats = users.map(u => {
      const stats = bookingMap[u._id.toString()] || { totalBookings: 0, totalSpent: 0 };
      return {
        ...u.toObject(),
        totalBookings: stats.totalBookings,
        totalSpent: stats.totalSpent
      };
    });

    res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

/**
 * @desc    Get all vendors for admin management  
 * @route   GET /api/admin/vendors
 * @access  Private (Admin)
 */
const getAllVendors = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';

    // Build filter
    const filter = { isActive: true };
    
    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      filter.verificationStatus = status;
    }

    const [vendorsData, total] = await Promise.all([
      Vendor.find(filter)
        .select('-password -refreshTokens')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit),
      Vendor.countDocuments(filter)
    ]);

    // Get station counts and revenue for each vendor
    const vendorsWithStats = await Promise.all(
      vendorsData.map(async (vendor) => {
        const [stationCount, totalRevenue, bookingCount] = await Promise.all([
          ChargingStation.countDocuments({ vendor: vendor._id, isActive: true }),
          Booking.aggregate([
            { 
              $match: { 
                vendor: vendor._id, 
                status: 'completed',
                'paymentDetails.finalAmount': { $exists: true }
              } 
            },
            { $group: { _id: null, total: { $sum: '$paymentDetails.finalAmount' } } }
          ]),
          Booking.countDocuments({ vendor: vendor._id })
        ]);

        return {
          ...vendor.toObject(),
          stationCount,
          totalRevenue: totalRevenue[0]?.total || 0,
          bookingCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        vendors: vendorsWithStats,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors'
    });
  }
};

/**
 * @desc    Get all stations for admin management
 * @route   GET /api/admin/stations  
 * @access  Private (Admin)
 */
const getAllStations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';

    // Build filter
    const filter = {};
    // Only filter by isActive if explicitly requested
    if (req.query.onlyActive === 'true') {
      filter.isActive = true;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const [stations, total] = await Promise.all([
      ChargingStation.find(filter)
        .populate('vendor', 'businessName email phoneNumber')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit),
      ChargingStation.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        stations,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all stations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stations'
    });
  }
};

/**
 * @desc    Get all bookings for admin management
 * @route   GET /api/admin/bookings
 * @access  Private (Admin)
 */
const getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';

    // Build filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { bookingId: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('user', 'name email phoneNumber')
        .populate('chargingStation', 'name location address city')
        .populate('vendor', 'businessName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit),
      Booking.countDocuments(filter)
    ]);

    // Transform the data to match frontend expectations
    const transformedBookings = bookings.map(booking => ({
      ...booking.toObject(),
      station: booking.chargingStation, // Map chargingStation to station
      slotNumber: booking.chargingPort?.portNumber || 'N/A',
      duration: booking.timeSlot ? 
        Math.round((new Date(booking.timeSlot.endTime) - new Date(booking.timeSlot.startTime)) / (1000 * 60)) : 
        null,
      payment: {
        finalAmount: booking.paymentDetails?.finalAmount || booking.pricing?.totalAmount || 0
      }
    }));

    res.json({
      success: true,
      data: {
        bookings: transformedBookings,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

/**
 * @desc    Get all payments for admin management
 * @route   GET /api/admin/payments
 * @access  Private (Admin)
 */
const getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';

    // Build filter based on Payment model structure
    const filter = {};
    
    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { 'razorpayOrderId': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Since there's no Payment model, let's get payments from bookings
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('user', 'name email phoneNumber')
        .populate('chargingStation', 'name')
        .select('bookingId paymentDetails user chargingStation createdAt')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit),
      Booking.countDocuments(filter)
    ]);

    // Transform bookings to payment format
    const payments = bookings.map(booking => ({
      _id: booking._id,
      transactionId: booking.paymentDetails?.paymentId || booking.paymentDetails?.transactionId,
      gateway: booking.paymentDetails?.paymentMethod?.gateway || 'razorpay',
      method: booking.paymentDetails?.paymentMethod?.type || 'card',
      finalAmount: booking.paymentDetails?.finalAmount || 0,
      discountAmount: booking.paymentDetails?.discountAmount || 0,
      status: booking.paymentStatus || booking.status,
      booking: { bookingId: booking.bookingId },
      user: booking.user,
      station: booking.chargingStation,
      createdAt: booking.createdAt
    }));

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
};

/**
 * @desc    Get payment statistics
 * @route   GET /api/admin/payments/stats
 * @access  Private (Admin)
 */
const getPaymentStats = async (req, res) => {
  try {
    const [
      totalTransactions,
      successfulPayments,
      failedPayments,
      pendingPayments,
      totalRevenue
    ] = await Promise.all([
      Booking.countDocuments({ 'paymentDetails.transactionId': { $exists: true } }),
      Booking.countDocuments({ paymentStatus: 'completed' }),
      Booking.countDocuments({ paymentStatus: 'failed' }),
      Booking.countDocuments({ paymentStatus: 'pending' }),
      Booking.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$paymentDetails.finalAmount' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalTransactions,
        successfulPayments,
        failedPayments,
        pendingPayments
      }
    });

  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics'
    });
  }
};

/**
 * @desc    Get system logs (placeholder - would need actual logging system)
 * @route   GET /api/admin/logs
 * @access  Private (Admin)
 */
const getSystemLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Placeholder logs - in real system, you'd query from logging database
    const logs = [
      {
        _id: 'log1',
        level: 'info',
        message: 'User login successful',
        category: 'auth',
        user: { name: 'System' },
        createdAt: new Date(),
        action: 'login'
      },
      {
        _id: 'log2', 
        level: 'error',
        message: 'Payment processing failed',
        category: 'payment',
        user: { name: 'System' },
        createdAt: new Date(Date.now() - 3600000),
        action: 'payment'
      }
    ];

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          current: page,
          pages: 1,
          total: logs.length,
          hasNext: false,
          hasPrev: false
        }
      }
    });

  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system logs'
    });
  }
};

/**
 * @desc    Get stations map data for admin dashboard
 * @route   GET /api/admin/stations/map
 * @access  Private (Admin)
 */
const getStationsMapData = async (req, res) => {
  try {
    const stations = await ChargingStation.find({ 
      isActive: true 
    })
    .populate('vendor', 'businessName isVerified verificationStatus')
    .select('name location chargingPorts amenities isActive totalSlots availableSlots vendor rating')
    .sort({ createdAt: -1 });

    // Transform data for map component with enhanced categorization
    const mapStations = stations.map(station => {
      // Calculate station metrics for categorization
      const amenityCount = station.amenities?.length || 0;
      const avgRating = station.rating?.average || 0;
      const isVerifiedVendor = station.vendor?.verificationStatus === 'verified';
      const hasFastCharging = station.chargingPorts?.some(port => 
        port.chargingType === 'fast' || port.chargingType === 'rapid'
      );
      
      // Determine if station is "recommended" based on criteria
      const hasHighRating = avgRating >= 4.2;
      const hasGoodAvailability = (station.availableSlots / (station.totalSlots || 1)) >= 0.2;
      const hasAmenities = amenityCount >= 2;
      
      // A station is recommended if it meets at least 2 of these criteria OR is from verified vendor with fast charging
      const recommendationScore = [hasHighRating, hasGoodAvailability, hasAmenities].filter(Boolean).length;
      const dockitRecommended = recommendationScore >= 2 || (isVerifiedVendor && hasFastCharging);
      
      return {
        _id: station._id,
        name: station.name,
        location: station.location,
        vendor: {
          businessName: station.vendor?.businessName,
          isVerified: isVerifiedVendor
        },
        totalSlots: station.totalSlots || station.chargingPorts?.length || 0,
        availableSlots: station.availableSlots || 0,
        amenities: station.amenities || [],
        amenityCount,
        isActive: station.isActive,
        rating: station.rating,
        chargingPorts: station.chargingPorts,
        hasFastCharging,
        isVerifiedVendor,
        dockitRecommended, // This is the key field the map component looks for
        address: station.location || {} // For compatibility with map component
      };
    });

    res.json({
      success: true,
      data: {
        stations: mapStations,
        total: mapStations.length
      }
    });

  } catch (error) {
    console.error('Get stations map data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stations map data'
    });
  }
};

// Validation middleware
const createAdminValidation = [
  body('fullName').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('phoneNumber').matches(/^[0-9]{10}$/),
  body('dateOfBirth').isISO8601().toDate(),
  body('role').optional().isIn(['admin', 'superadmin']),
  body('notes').optional().isLength({ max: 1000 })
];

const createEmployeeValidation = [
  body('fullName').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('phoneNumber').matches(/^[0-9]{10}$/),
  body('dateOfBirth').isISO8601().toDate(),
  body('department').isIn(['customer_support', 'technical_support', 'content_management', 'marketing', 'finance', 'operations']),
  body('position').notEmpty().trim().isLength({ min: 2, max: 100 }),
  body('password').isLength({ min: 6, max: 50 }),
  body('notes').optional().isLength({ max: 1000 })
];

/**
 * @desc    Approve or reject a vendor document
 * @route   PATCH /api/admin/vendors/:vendorId/documents/:docType
 * @access  Private (Admin)
 */
const verifyVendorDocument = async (req, res) => {
  try {
    const { vendorId, docType } = req.params;
    const { status, rejectionReason, docIndex } = req.body; // docIndex for additionalDocuments
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    let docUpdated = false;
    if (docType === 'businessRegistrationCertificate' || docType === 'ownerCitizenshipCertificate') {
      if (!vendor.documents[docType]) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      vendor.documents[docType].status = status;
      vendor.documents[docType].rejectionReason = status === 'rejected' ? rejectionReason : undefined;
      docUpdated = true;
    } else if (docType === 'additionalDocuments') {
      // docIndex required
      if (typeof docIndex !== 'number' || !vendor.documents.additionalDocuments[docIndex]) {
        return res.status(404).json({ success: false, message: 'Additional document not found' });
      }
      vendor.documents.additionalDocuments[docIndex].status = status;
      vendor.documents.additionalDocuments[docIndex].rejectionReason = status === 'rejected' ? rejectionReason : undefined;
      docUpdated = true;
    }
    if (!docUpdated) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }
    await vendor.save();
    res.json({ success: true, message: 'Document status updated', data: vendor.documents });
  } catch (error) {
    console.error('Verify vendor document error:', error);
    res.status(500).json({ success: false, message: 'Failed to update document status' });
  }
};

/**
 * @desc    Verify a vendor (admin action)
 * @route   PATCH /api/admin/vendors/:id/verify
 * @access  Private (Admin)
 */
const verifyVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    if (vendor.verificationStatus === 'verified') {
      return res.status(400).json({ success: false, message: 'Vendor is already verified' });
    }
    // Check all required documents are approved
    const docs = vendor.documents;
    if (
      !docs.businessRegistrationCertificate || docs.businessRegistrationCertificate.status !== 'approved' ||
      !docs.ownerCitizenshipCertificate || docs.ownerCitizenshipCertificate.status !== 'approved' ||
      (Array.isArray(docs.additionalDocuments) && docs.additionalDocuments.some(doc => doc.status !== 'approved'))
    ) {
      return res.status(400).json({ success: false, message: 'All required documents must be approved before verifying vendor.' });
    }
    vendor.verificationStatus = 'verified';
    vendor.onboardingStep = 'completed';
    await vendor.save();
    // Notify vendor via email and SMS (reuse services, no duplicate code)
    try {
      // Email
      if (vendor.email) {
        await emailService.sendEmail({
          to: vendor.email,
          subject: 'Your Vendor Account is Verified!',
          htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #0ea5e9 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Congratulations, ${vendor.businessName || vendor.name}!</h1>
            </div>
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Your vendor account has been verified.</h2>
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 20px;">
                You can now access all features and manage your charging stations on the platform.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://chargingstation.com.np/merchant/login'}" style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Merchant Dashboard</a>
              </div>
              <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 30px;">
                Best regards,<br>Dockit Team
              </p>
            </div>
          </div>`
        });
      }
      // SMS
      if (vendor.phoneNumber) {
        await smsService.sendSMS(
          vendor.phoneNumber,
          `Congratulations! Your ChargingStation vendor account (${vendor.businessName || vendor.name}) is now verified. You can now manage your stations and bookings.`
        );
      }
    } catch (notifyErr) {
      console.error('Failed to send vendor verification notification:', notifyErr);
    }
    res.json({ success: true, message: 'Vendor verified and notified successfully', data: vendor });
  } catch (error) {
    console.error('Verify vendor error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify vendor' });
  }
};

/**
 * @desc    Request vendor deletion verification code (admin)
 * @route   POST /api/admin/vendors/:id/request-delete-code
 * @access  Private (Admin)
 */
const requestVendorDeleteCode = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Store code in Redis, key by admin ID
    await storeOTP(admin.phoneNumber, code, 10); // 10 min expiry
    // Send code via SMS (correct parameter order)
    await smsService.sendSMS(
      admin.phoneNumber,
      `Your code to delete vendor is: ${code}. This code is valid for 10 minutes.`
    );
    res.json({ success: true, message: 'Verification code sent via SMS.' });
  } catch (error) {
    console.error('Request vendor delete code error:', error);
    res.status(500).json({ success: false, message: 'Failed to send verification code' });
  }
};

/**
 * @desc    Delete a vendor and all associated stations (admin, with code)
 * @route   DELETE /api/admin/vendors/:id
 * @access  Private (Admin)
 */
const deleteVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { verificationCode } = req.body;
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    // Check code from Redis
    const storedCode = await getOTP(admin.phoneNumber);
    if (!storedCode || storedCode !== verificationCode) {
      return res.status(400).json({ success: false, message: 'Verification code expired or not requested.' });
    }
    // Delete code after use
    await deleteOTP(admin.phoneNumber);
    // Delete vendor and all associated stations
    await ChargingStation.deleteMany({ vendor: vendorId });
    await Vendor.findByIdAndDelete(vendorId);
    res.json({ success: true, message: 'Vendor and all associated stations deleted.' });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete vendor' });
  }
};

/**
 * @desc    Verify and activate a charging station (admin action)
 * @route   PATCH /api/admin/stations/:stationId/verify
 * @access  Private (Admin)
 */
const verifyStation = async (req, res) => {
  try {
    const station = await ChargingStation.findById(req.params.stationId).populate('vendor');
    if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
    if (station.isVerified) return res.status(400).json({ success: false, message: 'Already verified' });

    station.isVerified = true;
    station.isActive = true;
    station.verificationDate = new Date();
    await station.save();

    // Notify vendor
    if (station.vendor?.email) {
      await emailService.sendEmail({
        to: station.vendor.email,
        subject: 'Your Station Has Been Approved',
        htmlBody: `<p>Your station <b>${station.name}</b> has been verified and is now active.</p>`
      });
    }
    if (station.vendor?.phoneNumber) {
      await smsService.sendSMS(
        station.vendor.phoneNumber,
        `Your station "${station.name}" has been verified and is now active.`
      );
    }

    res.json({ success: true, message: 'Station verified and vendor notified.' });
  } catch (err) {
    console.error('Verify station error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify station' });
  }
};

/**
 * @desc    Toggle dockitRecommended for a charging station (admin action)
 * @route   PATCH /api/admin/stations/:stationId/dockit-recommended
 * @access  Private (Admin)
 */
const toggleDockitRecommended = async (req, res) => {
  try {
    const station = await ChargingStation.findById(req.params.stationId);
    if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
    if (typeof req.body.value !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Missing or invalid value' });
    }
    station.dockitRecommended = req.body.value;
    await station.save();
    res.json({ success: true, message: 'DockitRecommended updated', data: { dockitRecommended: station.dockitRecommended } });
  } catch (err) {
    console.error('Toggle dockitRecommended error:', err);
    res.status(500).json({ success: false, message: 'Failed to update dockitRecommended' });
  }
};

/**
 * @desc    Toggle active/inactive status for a charging station (admin action)
 * @route   PATCH /api/admin/stations/:stationId/status
 * @access  Private (Admin)
 */
const toggleStationActive = async (req, res) => {
  try {
    const station = await ChargingStation.findById(req.params.stationId);
    if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
    if (!['active', 'inactive'].includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    station.isActive = req.body.status === 'active';
    await station.save();
    res.json({ success: true, message: 'Station status updated', data: { isActive: station.isActive } });
  } catch (err) {
    console.error('Toggle station active error:', err);
    res.status(500).json({ success: false, message: 'Failed to update station status' });
  }
};

/**
 * @desc    Get vendors with pending settlements by date
 * @route   GET /api/admin/settlements/vendors
 * @access  Private (Admin)
 */
const getVendorsWithPendingSettlements = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Parse the date to get start and end of day
    // Handle both 'YYYY-MM-DD' and date object formats
    const inputDate = new Date(date + 'T00:00:00.000Z'); // Force UTC interpretation
    const startDate = new Date(inputDate);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(inputDate);
    endDate.setUTCHours(23, 59, 59, 999);

    // ============== CHARGING STATION BOOKINGS ==============
    // Get all completed bookings for the specified date
    // Use actualEndTime when available, fallback to updatedAt
    const completedBookings = await Booking.find({
      status: 'completed',
      $or: [
        { 'actualUsage.actualEndTime': { $gte: startDate, $lte: endDate } },
        { 
          'actualUsage.actualEndTime': { $exists: false },
          updatedAt: { $gte: startDate, $lte: endDate }
        }
      ]
    })
    .populate('vendor', 'businessName name email phoneNumber')
    .lean();

    // ============== RESTAURANT ORDERS ==============
    // Get all completed restaurant orders for the specified date
    const completedOrders = await Order.find({
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    })
    .populate('restaurant', 'vendor')
    .populate({
      path: 'restaurant',
      populate: {
        path: 'vendor',
        select: 'businessName name email phoneNumber'
      }
    })
    .lean();

    // Group both bookings and orders by vendor and calculate settlement amounts
    const vendorSettlements = {};
    
    // Process charging station bookings
    completedBookings.forEach(booking => {
      const vendorId = booking.vendor._id.toString();
      
      if (!vendorSettlements[vendorId]) {
        vendorSettlements[vendorId] = {
          vendor: booking.vendor,
          totalToBeReceived: 0,
          paymentSettled: 0,
          inSettlementProcess: 0,
          pendingSettlement: 0,
          transactionCount: 0,
          bookings: [],
          orders: []
        };
      }

      // Calculate merchant revenue including payment adjustments
      const calculateMerchantRevenue = (booking) => {
        let baseAmount = 0;
        
        if (booking.pricing?.merchantAmount !== undefined) {
          baseAmount = booking.pricing.merchantAmount;
        } else {
          const totalAmount = booking.pricing?.totalAmount || 0;
          baseAmount = Math.max(0, totalAmount - 5);
        }
        
        const additionalCharges = booking.paymentAdjustments
          ?.filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
          ?.reduce((total, adj) => total + adj.amount, 0) || 0;
        
        const refunds = booking.paymentAdjustments
          ?.filter(adj => adj.type === 'refund' && adj.status === 'processed')
          ?.reduce((total, adj) => total + adj.amount, 0) || 0;
        
        return baseAmount + additionalCharges - refunds;
      };

      const merchantRevenue = calculateMerchantRevenue(booking);
      vendorSettlements[vendorId].totalToBeReceived += merchantRevenue;
      vendorSettlements[vendorId].transactionCount++;
      vendorSettlements[vendorId].bookings.push(booking);

      // Categorize based on settlement status
      if (booking.settlementStatus === 'settled') {
        vendorSettlements[vendorId].paymentSettled += merchantRevenue;
      } else if (booking.settlementStatus === 'included_in_settlement') {
        vendorSettlements[vendorId].inSettlementProcess += merchantRevenue;
      } else {
        vendorSettlements[vendorId].pendingSettlement += merchantRevenue;
      }
    });

    // Process restaurant orders (vendor gets 100% as per updated requirement)
    completedOrders.forEach(order => {
      // Skip orders with missing restaurant or vendor data
      if (!order.restaurant || !order.restaurant.vendor || !order.restaurant.vendor._id) {
        console.warn(`⚠️ Skipping order ${order._id} - missing restaurant or vendor data:`, {
          orderId: order._id,
          hasRestaurant: !!order.restaurant,
          hasVendor: !!(order.restaurant && order.restaurant.vendor),
          hasVendorId: !!(order.restaurant && order.restaurant.vendor && order.restaurant.vendor._id)
        });
        return;
      }
      
      const vendorId = order.restaurant.vendor._id.toString();
      
      if (!vendorSettlements[vendorId]) {
        vendorSettlements[vendorId] = {
          vendor: order.restaurant.vendor,
          totalToBeReceived: 0,
          paymentSettled: 0,
          inSettlementProcess: 0,
          pendingSettlement: 0,
          transactionCount: 0,
          bookings: [],
          orders: []
        };
      }

      const orderRevenue = order.totalAmount; // 100% to vendor (annual service charge model)
      
      // Debug logging to track settlement amounts
      console.log(`🍽️ Restaurant Settlement Debug (Pending):`, {
        orderNumber: order.orderNumber,
        originalTotalAmount: order.totalAmount,
        calculatedRevenue: orderRevenue,
        subtotal: order.subtotal,
        vendorId: vendorId,
        settlementStatus: order.settlementStatus
      });
      
      vendorSettlements[vendorId].totalToBeReceived += orderRevenue;
      vendorSettlements[vendorId].transactionCount++;
      vendorSettlements[vendorId].orders.push(order);

      // Categorize based on settlement status
      if (order.settlementStatus === 'settled') {
        vendorSettlements[vendorId].paymentSettled += orderRevenue;
      } else if (order.settlementStatus === 'included_in_settlement') {
        vendorSettlements[vendorId].inSettlementProcess += orderRevenue;
      } else {
        vendorSettlements[vendorId].pendingSettlement += orderRevenue;
      }
    });

    // Convert to array and filter vendors with pending settlements
    const vendorsWithPendingSettlements = Object.values(vendorSettlements)
      .filter(settlement => settlement.pendingSettlement > 0 || settlement.inSettlementProcess > 0)
      .sort((a, b) => b.pendingSettlement - a.pendingSettlement);

    res.json({
      success: true,
      data: {
        date,
        vendors: vendorsWithPendingSettlements,
        summary: {
          totalVendors: vendorsWithPendingSettlements.length,
          totalPendingAmount: vendorsWithPendingSettlements.reduce((sum, v) => sum + v.pendingSettlement, 0),
          totalInProcessAmount: vendorsWithPendingSettlements.reduce((sum, v) => sum + v.inSettlementProcess, 0)
        }
      }
    });

  } catch (error) {
    console.error('Get vendors with pending settlements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors with pending settlements'
    });
  }
};

/**
 * @desc    Get detailed settlement info for a vendor by date
 * @route   GET /api/admin/settlements/vendor/:vendorId
 * @access  Private (Admin)
 */
const getVendorSettlementDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Get vendor details
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Parse the date to get start and end of day
    // Handle both 'YYYY-MM-DD' and date object formats
    const inputDate = new Date(date + 'T00:00:00.000Z'); // Force UTC interpretation
    const startDate = new Date(inputDate);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(inputDate);
    endDate.setUTCHours(23, 59, 59, 999);

    // ============== CHARGING STATION BOOKINGS ==============
    // Get completed bookings for this vendor on the specified date
    // Use actualEndTime when available, fallback to updatedAt
    const completedBookings = await Booking.find({
      vendor: vendorId,
      status: 'completed',
      $or: [
        { 'actualUsage.actualEndTime': { $gte: startDate, $lte: endDate } },
        { 
          'actualUsage.actualEndTime': { $exists: false },
          updatedAt: { $gte: startDate, $lte: endDate }
        }
      ]
    })
    .populate('user', 'name phoneNumber')
    .populate('chargingStation', 'name location')
    .lean();

    // ============== RESTAURANT ORDERS ==============
    // Get vendor's restaurants
    const vendorRestaurants = await Restaurant.find({ vendor: vendorId }).select('_id');
    const restaurantIds = vendorRestaurants.map(r => r._id);

    // Get completed orders for this vendor's restaurants on the specified date
    const completedOrders = await Order.find({
      restaurant: { $in: restaurantIds },
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    })
    .populate('restaurant', 'name')
    .populate('chargingStation', 'name location')
    .lean();

    // Calculate settlement amounts for this date
    const calculateMerchantRevenue = (booking) => {
      let baseAmount = 0;
      
      if (booking.pricing?.merchantAmount !== undefined) {
        baseAmount = booking.pricing.merchantAmount;
      } else {
        const totalAmount = booking.pricing?.totalAmount || 0;
        baseAmount = Math.max(0, totalAmount - 5);
      }
      
      const additionalCharges = booking.paymentAdjustments
        ?.filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
        ?.reduce((total, adj) => total + adj.amount, 0) || 0;
      
      const refunds = booking.paymentAdjustments
        ?.filter(adj => adj.type === 'refund' && adj.status === 'processed')
        ?.reduce((total, adj) => total + adj.amount, 0) || 0;
      
      return baseAmount + additionalCharges - refunds;
    };

    let totalToBeReceived = 0;
    let paymentSettled = 0;
    let inSettlementProcess = 0;
    let pendingSettlement = 0;

    // Process charging station transactions
    const chargingTransactions = completedBookings.map(booking => {
      const merchantRevenue = calculateMerchantRevenue(booking);
      totalToBeReceived += merchantRevenue;

      if (booking.settlementStatus === 'settled') {
        paymentSettled += merchantRevenue;
      } else if (booking.settlementStatus === 'included_in_settlement') {
        inSettlementProcess += merchantRevenue;
      } else {
        pendingSettlement += merchantRevenue;
      }

      return {
        type: 'charging',
        bookingId: booking.bookingId,
        orderId: null,
        amount: merchantRevenue,
        customerName: booking.user?.name || 'Walk-in Customer',
        stationName: booking.chargingStation?.name || 'Unknown Station',
        restaurantName: null,
        completedAt: booking.actualUsage?.actualEndTime || booking.updatedAt,
        settlementStatus: booking.settlementStatus || 'pending',
        description: 'EV Charging Session'
      };
    });

    // Process restaurant order transactions (vendor gets 100%)
    const restaurantTransactions = completedOrders.map(order => {
      const orderRevenue = order.totalAmount; // 100% to vendor
      
      // Debug logging to track settlement amounts
      console.log(`🍽️ Restaurant Order Settlement Debug:`, {
        orderNumber: order.orderNumber,
        originalTotalAmount: order.totalAmount,
        calculatedRevenue: orderRevenue,
        subtotal: order.subtotal,
        settlementStatus: order.settlementStatus
      });
      
      totalToBeReceived += orderRevenue;

      if (order.settlementStatus === 'settled') {
        paymentSettled += orderRevenue;
      } else if (order.settlementStatus === 'included_in_settlement') {
        inSettlementProcess += orderRevenue;
      } else {
        pendingSettlement += orderRevenue;
      }

      return {
        type: 'restaurant',
        bookingId: null,
        orderId: order.orderNumber,
        amount: orderRevenue,
        customerName: order.customer.name,
        stationName: order.chargingStation?.name || 'Unknown Station',
        restaurantName: order.restaurant?.name || 'Unknown Restaurant',
        completedAt: order.completedAt,
        settlementStatus: order.settlementStatus || 'pending',
        description: `Restaurant Order (${order.items.length} items)`
      };
    });

    // Combine and sort transactions by completion date
    const transactions = [...chargingTransactions, ...restaurantTransactions]
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    // Get overall vendor stats (all time)
    const allCompletedEarnings = await Booking.find({
      vendor: vendorId,
      status: 'completed'
    }).lean();

    const totalChargingBalance = allCompletedEarnings.reduce((total, booking) => {
      return total + calculateMerchantRevenue(booking);
    }, 0);

    // Get all completed orders for total restaurant balance
    const allCompletedOrders = await Order.find({
      restaurant: { $in: restaurantIds },
      status: 'completed'
    }).lean();

    const totalRestaurantBalance = allCompletedOrders.reduce((total, order) => {
      return total + order.totalAmount; // 100% to vendor
    }, 0);

    const totalBalance = totalChargingBalance + totalRestaurantBalance;

    // Get total withdrawn from completed settlements
    const Settlement = require('../models/Settlement');
    const totalWithdrawnResult = await Settlement.aggregate([
      {
        $match: {
          vendor: new mongoose.Types.ObjectId(vendorId),
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    const totalWithdrawn = totalWithdrawnResult[0]?.totalAmount || 0;
    const pendingWithdrawal = totalBalance - totalWithdrawn;

    // Check for active settlement for this date
    const activeSettlement = await Settlement.findOne({
      vendor: vendorId,
      periodStart: { $lte: endDate },
      periodEnd: { $gte: startDate },
      status: { $in: ['pending', 'processing'] }
    });

    // Get settlement info including both bookings and orders
    const settlementInfo = activeSettlement ? {
      hasActiveSettlement: true,
      settlementRequests: [{
        id: activeSettlement.settlementId,
        requestedAt: activeSettlement.requestedAt,
        status: activeSettlement.status,
        amount: activeSettlement.amount,
        requestType: activeSettlement.requestType || 'regular'
      }]
    } : { hasActiveSettlement: false };

    res.json({
      success: true,
      data: {
        vendor: {
          _id: vendor._id,
          businessName: vendor.businessName,
          name: vendor.name,
          email: vendor.email,
          phoneNumber: vendor.phoneNumber,
          bankDetails: vendor.bankDetails
        },
        selectedDate: date,
        dailyStats: {
          totalToBeReceived,
          chargingStationRevenue: chargingTransactions.reduce((sum, t) => sum + t.amount, 0),
          restaurantRevenue: restaurantTransactions.reduce((sum, t) => sum + t.amount, 0),
          paymentSettled,
          inSettlementProcess,
          pendingSettlement
        },
        overallStats: {
          totalBalance,
          totalChargingStationBalance: totalChargingBalance,
          totalRestaurantBalance: totalRestaurantBalance,
          totalWithdrawn,
          pendingWithdrawal
        },
        transactions,
        settlementInfo,
        activeSettlement: activeSettlement ? {
          id: activeSettlement.settlementId,
          status: activeSettlement.status,
          amount: activeSettlement.amount,
          requestedAt: activeSettlement.requestedAt
        } : null
      }
    });

  } catch (error) {
    console.error('Get vendor settlement details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor settlement details'
    });
  }
};

/**
 * @desc    Initiate settlement process (mark as in settlement)
 * @route   POST /api/admin/settlements/initiate
 * @access  Private (Admin)
 */
const initiateSettlement = async (req, res) => {
  try {
    const { vendorId, date, amount } = req.body;

    if (!vendorId || !date || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID, date, and amount are required'
      });
    }

    // Get vendor details
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Parse the date
    const startDate = new Date(date + 'T00:00:00.000Z');
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(date + 'T23:59:59.999Z');
    endDate.setUTCHours(23, 59, 59, 999);

    // Check if there's already an active settlement
    const Settlement = require('../models/Settlement');
    const existingSettlement = await Settlement.findOne({
      vendor: vendorId,
      periodStart: { $lte: endDate },
      periodEnd: { $gte: startDate },
      status: { $in: ['pending', 'processing'] }
    });

    if (existingSettlement) {
      return res.status(400).json({
        success: false,
        message: 'There is already an active settlement for this date range'
      });
    }

    // ============== GET PENDING CHARGING STATION BOOKINGS ==============
    const completedBookings = await Booking.find({
      vendor: vendorId,
      status: 'completed',
      $or: [
        { settlementStatus: 'pending' },
        { settlementStatus: { $exists: false } },
        { settlementStatus: null }
      ],
      $and: [
        {
          $or: [
            { 'actualUsage.actualEndTime': { $gte: startDate, $lte: endDate } },
            { 
              'actualUsage.actualEndTime': { $exists: false },
              updatedAt: { $gte: startDate, $lte: endDate }
            }
          ]
        }
      ]
    }).lean();

    // ============== GET PENDING RESTAURANT ORDERS ==============
    // Get vendor's restaurants
    const vendorRestaurants = await Restaurant.find({ vendor: vendorId }).select('_id');
    const restaurantIds = vendorRestaurants.map(r => r._id);

    // Get completed orders that haven't been settled
    const completedOrders = await Order.find({
      restaurant: { $in: restaurantIds },
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
      $or: [
        { settlementStatus: 'pending' },
        { settlementStatus: { $exists: false } },
        { settlementStatus: null }
      ]
    }).lean();

    // ============== VALIDATE TRANSACTIONS ==============
    if (completedBookings.length === 0 && completedOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending transactions found for the selected date'
      });
    }

    // ============== CREATE SETTLEMENT REQUEST ==============
    const settlement = new Settlement({
      vendor: vendorId,
      amount: amount,
      settlementDate: new Date(date),
      transactionIds: completedBookings.map(booking => booking._id),
      orderIds: completedOrders.map(order => order._id), // Add order IDs
      status: 'processing',
      requestType: 'admin_initiated',
      bankDetails: {
        accountNumber: vendor.bankDetails?.accountNumber,
        accountHolderName: vendor.bankDetails?.accountHolderName,
        bankName: vendor.bankDetails?.bankName,
        ifscCode: vendor.bankDetails?.ifscCode
      },
      reason: 'Admin initiated settlement',
      periodStart: startDate,
      periodEnd: endDate,
      requestedAt: new Date(),
      metadata: {
        transactionDate: date,
        requestedDate: new Date().toISOString().split('T')[0],
        isAdminInitiated: true,
        bookingCount: completedBookings.length,
        orderCount: completedOrders.length
      }
    });

    await settlement.save();

    // ============== UPDATE BOOKING SETTLEMENT STATUS ==============
    if (completedBookings.length > 0) {
      await Booking.updateMany(
        { _id: { $in: completedBookings.map(b => b._id) } },
        { 
          settlementStatus: 'included_in_settlement',
          settlementId: settlement._id,
          settlementRequestedAt: new Date(),
          settlementRequestedFor: date
        }
      );
    }

    // ============== UPDATE ORDER SETTLEMENT STATUS ==============
    if (completedOrders.length > 0) {
      await Order.updateMany(
        { _id: { $in: completedOrders.map(o => o._id) } },
        { 
          settlementStatus: 'included_in_settlement',
          settlementId: settlement._id,
          settlementRequestedAt: new Date(),
          settlementRequestedFor: date
        }
      );
    }

    res.json({
      success: true,
      message: 'Settlement initiated successfully',
      data: {
        settlementId: settlement.settlementId,
        status: 'processing',
        amount: amount,
        transactionCount: completedBookings.length + completedOrders.length,
        bookingCount: completedBookings.length,
        orderCount: completedOrders.length
      }
    });

  } catch (error) {
    console.error('Initiate settlement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate settlement'
    });
  }
};

/**
 * @desc    Complete settlement process (mark as completed with payment details)
 * @route   POST /api/admin/settlements/complete
 * @access  Private (Admin)
 */
const completeSettlement = async (req, res) => {
  try {
    const { settlementId, vendorId, date, paymentReference, processingNotes } = req.body;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    console.log('🔍 Complete settlement request:', { settlementId, vendorId, date, paymentReference });

    // Get settlement details - try multiple approaches
    const Settlement = require('../models/Settlement');
    let settlement = null;

    // First try to find by settlementId if it's not "PENDING"
    if (settlementId && settlementId !== 'PENDING') {
      settlement = await Settlement.findOne({ 
        settlementId: settlementId 
      }).populate('vendor');
      console.log('📋 Found settlement by ID:', settlement?._id);
    }

    // If no settlement found by ID, try to find by vendor and date
    if (!settlement && vendorId && date) {
      const startDate = new Date(date + 'T00:00:00.000Z');
      const endDate = new Date(date + 'T23:59:59.999Z');
      
      settlement = await Settlement.findOne({
        vendor: vendorId,
        status: { $in: ['pending', 'processing'] },
        $or: [
          { settlementDate: { $gte: startDate, $lte: endDate } },
          { periodStart: { $lte: endDate }, periodEnd: { $gte: startDate } }
        ]
      }).populate('vendor');
      
      console.log('📋 Found settlement by vendor/date:', settlement?._id);
    }

    // If still no settlement, try to find any processing settlement for this vendor
    if (!settlement && vendorId) {
      settlement = await Settlement.findOne({
        vendor: vendorId,
        status: { $in: ['pending', 'processing'] }
      }).populate('vendor').sort({ createdAt: -1 });
      
      console.log('📋 Found any processing settlement:', settlement?._id);
    }

    // If no settlement record found, check for transactions in settlement process
    if (!settlement && vendorId && date) {
      const startDate = new Date(date + 'T00:00:00.000Z');
      const endDate = new Date(date + 'T23:59:59.999Z');
      
      // Find bookings that are in settlement process for this date
      const bookingsInProcess = await Booking.find({
        vendor: vendorId,
        settlementStatus: 'included_in_settlement',
        $or: [
          { 'actualUsage.actualEndTime': { $gte: startDate, $lte: endDate } },
          { 
            'actualUsage.actualEndTime': { $exists: false },
            updatedAt: { $gte: startDate, $lte: endDate }
          }
        ]
      });

      // Find restaurant orders that are in settlement process for this date
      const vendorRestaurants = await Restaurant.find({ vendor: vendorId }).select('_id');
      const restaurantIds = vendorRestaurants.map(r => r._id);
      
      const ordersInProcess = await Order.find({
        restaurant: { $in: restaurantIds },
        settlementStatus: 'included_in_settlement',
        completedAt: { $gte: startDate, $lte: endDate }
      });

      console.log('📋 Found transactions in process without settlement record:', {
        bookings: bookingsInProcess.length,
        orders: ordersInProcess.length
      });

      if (bookingsInProcess.length > 0 || ordersInProcess.length > 0) {
        // Calculate total amount from both sources
        const chargingAmount = bookingsInProcess.reduce((total, booking) => {
          const calculateMerchantRevenue = (booking) => {
            let baseAmount = 0;
            if (booking.pricing?.merchantAmount !== undefined) {
              baseAmount = booking.pricing.merchantAmount;
            } else {
              const totalAmount = booking.pricing?.totalAmount || 0;
              baseAmount = Math.max(0, totalAmount - 5);
            }
            const additionalCharges = booking.paymentAdjustments
              ?.filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
              ?.reduce((total, adj) => total + adj.amount, 0) || 0;
            const refunds = booking.paymentAdjustments
              ?.filter(adj => adj.type === 'refund' && adj.status === 'processed')
              ?.reduce((total, adj) => total + adj.amount, 0) || 0;
            return baseAmount + additionalCharges - refunds;
          };
          return total + calculateMerchantRevenue(booking);
        }, 0);

        const restaurantAmount = ordersInProcess.reduce((total, order) => {
          return total + order.totalAmount; // 100% to vendor
        }, 0);

        const totalAmount = chargingAmount + restaurantAmount;

        // Update bookings directly to settled
        if (bookingsInProcess.length > 0) {
          await Booking.updateMany(
            { _id: { $in: bookingsInProcess.map(b => b._id) } },
            { 
              settlementStatus: 'settled',
              settledAt: new Date(),
              paymentReference: paymentReference
            }
          );
        }

        // Update orders directly to settled
        if (ordersInProcess.length > 0) {
          await Order.updateMany(
            { _id: { $in: ordersInProcess.map(o => o._id) } },
            { 
              settlementStatus: 'settled',
              settledAt: new Date(),
              paymentReference: paymentReference
            }
          );
        }

        // Get vendor details for notification
        const vendor = await require('../models/Vendor').findById(vendorId);

        console.log('✅ Direct settlement completed for', {
          bookings: bookingsInProcess.length,
          orders: ordersInProcess.length,
          totalAmount
        });

        // Send success response for direct settlement
        return res.json({
          success: true,
          message: 'Payment marked as completed successfully',
          data: {
            settlementId: 'DIRECT_' + Date.now(),
            status: 'completed',
            amount: totalAmount,
            paymentReference: paymentReference,
            processedAt: new Date(),
            transactionCount: bookingsInProcess.length + ordersInProcess.length,
            bookingCount: bookingsInProcess.length,
            orderCount: ordersInProcess.length
          }
        });
      }
    }

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'No active settlement or pending transactions found for this vendor and date.'
      });
    }

    if (settlement.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Settlement has already been completed'
      });
    }

    // Update settlement status
    settlement.status = 'completed';
    settlement.paymentReference = paymentReference;
    settlement.processingNotes = processingNotes;
    settlement.processedAt = new Date();

    await settlement.save();

    // Update booking settlement status to settled
    if (settlement.transactionIds && settlement.transactionIds.length > 0) {
      await Booking.updateMany(
        { _id: { $in: settlement.transactionIds } },
        { 
          settlementStatus: 'settled',
          settledAt: new Date()
        }
      );
    }

    // Update order settlement status to settled
    if (settlement.orderIds && settlement.orderIds.length > 0) {
      await Order.updateMany(
        { _id: { $in: settlement.orderIds } },
        { 
          settlementStatus: 'settled',
          settledAt: new Date()
        }
      );
    }

    const vendor = settlement.vendor;
    const formattedAmount = settlement.amount.toLocaleString();
    const formattedDate = settlement.settlementDate.toLocaleDateString();

    // Send notifications to vendor
    try {
      // Send SMS notification
      if (vendor.phoneNumber) {
        await smsService.sendSMS(
          vendor.phoneNumber,
          `Payment settled! ₹${formattedAmount} for ${formattedDate} has been transferred to your account ${vendor.bankDetails?.accountNumber || ''}. Ref: ${paymentReference}. Check your dashboard for details.`
        );
      }

      // Send email notification
      if (vendor.email) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Payment Settled</h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Your settlement has been processed</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 30px; background-color: white; margin: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Settlement Receipt</h2>
              
              <!-- Settlement Details -->
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #6b7280; font-weight: 500;">Settlement ID:</span>
                  <span style="color: #1f2937; font-weight: bold;">${settlement.settlementId}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #6b7280; font-weight: 500;">Transaction Date:</span>
                  <span style="color: #1f2937;">${formattedDate}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #6b7280; font-weight: 500;">Settlement Date:</span>
                  <span style="color: #1f2937;">${new Date().toLocaleDateString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #6b7280; font-weight: 500;">Payment Reference:</span>
                  <span style="color: #1f2937; font-weight: bold;">${paymentReference}</span>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-weight: 500; font-size: 18px;">Amount Settled:</span>
                  <span style="color: #10b981; font-weight: bold; font-size: 24px;">₹${formattedAmount}</span>
                </div>
              </div>
              
              <!-- Bank Details -->
              <div style="background-color: #fef3cd; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Payment made to:</h3>
                <p style="color: #92400e; margin: 5px 0;">Account: ${vendor.bankDetails?.accountNumber || 'N/A'}</p>
                <p style="color: #92400e; margin: 5px 0;">Account Holder: ${vendor.bankDetails?.accountHolderName || 'N/A'}</p>
                <p style="color: #92400e; margin: 5px 0;">Bank: ${vendor.bankDetails?.bankName || 'N/A'}</p>
              </div>
              
              <!-- Transaction Summary -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <p style="color: #6b7280; margin-bottom: 10px;">This settlement covers ${settlement.transactionIds.length} completed transaction(s) from ${formattedDate}.</p>
                <p style="color: #6b7280; margin-bottom: 20px;">Please allow 1-2 business days for the amount to reflect in your bank account.</p>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://chargingstation.com.np'}/merchant/analytics" 
                   style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View Dashboard
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 14px;">
              <p style="margin: 0;">Dockit</p>
              <p style="margin: 5px 0 0 0;">This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        `;

        await emailService.sendEmail({
          to: vendor.email,
          subject: `Payment Settled - ₹${formattedAmount} | ${settlement.settlementId}`,
          htmlBody: emailHtml
        });
      }
    } catch (notificationError) {
      console.error('Failed to send settlement notification:', notificationError);
      // Don't fail the settlement completion if notification fails
    }

    res.json({
      success: true,
      message: 'Settlement completed successfully and vendor notified',
      data: {
        settlementId: settlement.settlementId,
        status: 'completed',
        amount: settlement.amount,
        paymentReference: paymentReference,
        processedAt: settlement.processedAt
      }
    });

  } catch (error) {
    console.error('Complete settlement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete settlement'
    });
  }
};

/**
 * @desc    Get all refunds for admin management
 * @route   GET /api/admin/refunds
 * @access  Private (Admin)
 */
const getAllRefunds = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || 'pending';

    // Build filter
    const filter = {};
    
    if (status && status !== 'all') {
      filter.refundStatus = status;
    }

    // For pending refunds, sort by FIFO (oldest first)
    const sortOrder = status === 'pending' ? { createdAt: 1 } : { createdAt: -1 };

    const [refunds, total] = await Promise.all([
      require('../models/Refund').find(filter)
        .populate('user', 'name email phoneNumber')
        .populate('booking', 'bookingId timeSlot')
        .populate({
          path: 'booking',
          populate: {
            path: 'chargingStation',
            select: 'name location'
          }
        })
        .sort(sortOrder)
        .limit(limit * 1)
        .skip((page - 1) * limit),
      require('../models/Refund').countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        refunds,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all refunds error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch refunds'
    });
  }
};

/**
 * @desc    Process refund payment (Admin action)
 * @route   POST /api/admin/refunds/:refundId/process
 * @access  Private (Admin)
 */
const processRefundPayment = async (req, res) => {
  try {
    const { refundId } = req.params;
    const { transactionId, remarks } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const Refund = require('../models/Refund');
    const refund = await Refund.findById(refundId)
      .populate('user', 'name email phoneNumber')
      .populate('booking', 'bookingId')
      .populate('vendor', 'businessName name');

    if (!refund) {
      return res.status(404).json({
        success: false,
        message: 'Refund not found'
      });
    }

    if (refund.refundStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Refund has already been processed or is not eligible for processing'
      });
    }

    // Update refund status and payment details
    refund.refundStatus = 'completed';
    refund.processedAt = new Date();
    refund.processedBy = 'admin';
    refund.paymentDetails.refundTransactionId = transactionId;
    refund.paymentDetails.refundMethod = 'original_payment_method';

    // Add to audit trail
    refund.auditTrail.push({
      action: 'completed',
      performedBy: req.user.adminId || req.user.id,
      performedAt: new Date(),
      details: `Refund processed by admin with transaction ID: ${transactionId}`,
      metadata: {
        transactionId,
        remarks,
        adminId: req.user.adminId || req.user.id
      }
    });

    await refund.save();

    // Send notifications to user
    const user = refund.user;
    const formattedAmount = refund.refundCalculation.finalRefundAmount.toLocaleString();

    try {
      // Send SMS notification
      if (user.phoneNumber) {
        await smsService.sendSMS(
          user.phoneNumber,
          `Refund Processed! ₹${formattedAmount} for booking ${refund.booking.bookingId} has been refunded to your original payment method. Transaction ID: ${transactionId}. Amount will reflect in 2-3 business days.`
        );
      }

      // Send email notification
      if (user.email) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Refund Processed</h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Your refund has been successfully processed</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 30px; background-color: white; margin: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Refund Details</h2>
              
              <!-- Refund Summary -->
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #6b7280; font-weight: 500;">Refund ID:</span>
                  <span style="color: #1f2937; font-weight: bold;">${refund.refundId}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #6b7280; font-weight: 500;">Booking ID:</span>
                  <span style="color: #1f2937;">${refund.booking.bookingId}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #6b7280; font-weight: 500;">Transaction ID:</span>
                  <span style="color: #1f2937; font-weight: bold; font-family: monospace;">${transactionId}</span>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #6b7280; font-weight: 500; font-size: 18px;">Refund Amount:</span>
                  <span style="color: #10b981; font-weight: bold; font-size: 24px;">₹${formattedAmount}</span>
                </div>
              </div>
              
              <!-- Important Info */}
              <div style="background-color: #fef3cd; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Important Information:</h3>
                <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                  <li>The refund amount will be credited back to your original payment method</li>
                  <li>It may take 2-3 business days for the amount to reflect in your account</li>
                  <li>Please save this transaction ID for your records</li>
                </ul>
              </div>
              
              ${remarks ? `
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">Additional Notes:</h3>
                <p style="color: #6b7280; margin: 0;">${remarks}</p>
              </div>
              ` : ''}
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 14px;">
              <p style="margin: 0;">Dockit</p>
              <p style="margin: 5px 0 0 0;">Thank you for using our service!</p>
            </div>
          </div>
        `;

        await emailService.sendEmail({
          to: user.email,
          subject: `Refund Processed - ₹${formattedAmount} | ${refund.refundId}`,
          htmlBody: emailHtml
        });
      }
    } catch (notificationError) {
      console.error('Failed to send refund notification:', notificationError);
      // Don't fail the refund processing if notification fails
    }

    res.json({
      success: true,
      message: 'Refund processed successfully and user notified',
      data: {
        refundId: refund.refundId,
        status: 'completed',
        amount: refund.refundCalculation.finalRefundAmount,
        transactionId: transactionId,
        processedAt: refund.processedAt
      }
    });

  } catch (error) {
    console.error('Process refund payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund payment'
    });
  }
};

/**
 * @desc    Extend vendor subscription
 * @route   POST /api/admin/vendors/:vendorId/subscription/extend
 * @access  Private (Admin)
 */
const extendVendorSubscription = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { days, months, years, reason } = req.body;

    if (!days && !months && !years) {
      return res.status(400).json({
        success: false,
        message: 'At least one time period (days, months, or years) must be specified'
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Calculate extension time
    let extensionMilliseconds = 0;
    if (days) extensionMilliseconds += days * 24 * 60 * 60 * 1000;
    if (months) extensionMilliseconds += months * 30 * 24 * 60 * 60 * 1000; // Approximate
    if (years) extensionMilliseconds += years * 365 * 24 * 60 * 60 * 1000;

    const currentEndDate = new Date(vendor.subscription?.endDate || new Date());
    const newEndDate = new Date(currentEndDate.getTime() + extensionMilliseconds);

    // Update subscription
    if (!vendor.subscription) {
      vendor.subscription = {
        type: 'yearly',
        status: 'active',
        startDate: new Date(),
        endDate: newEndDate,
        autoRenew: false,
        paymentHistory: []
      };
    } else {
      vendor.subscription.endDate = newEndDate;
      vendor.subscription.status = 'active';
    }

    // Ensure license info exists and is active
    if (!vendor.licenseInfo) {
      vendor.licenseInfo = {
        isActive: true,
        maxStations: vendor.subscription.type === 'yearly' ? 50 : 5,
        featuresEnabled: {
          basicDashboard: true,
          advancedAnalytics: vendor.subscription.type === 'yearly',
          prioritySupport: vendor.subscription.type === 'yearly',
          customBranding: vendor.subscription.type === 'yearly',
          apiAccess: vendor.subscription.type === 'yearly'
        }
      };
    } else {
      vendor.licenseInfo.isActive = true;
    }

    // Add extension record to payment history
    vendor.subscription.paymentHistory.push({
      transactionId: `admin_ext_${Date.now()}`,
      amount: 0,
      currency: 'NPR',
      paymentDate: new Date(),
      paymentMethod: 'admin_extension',
      status: 'completed',
      type: 'renewal', // Use valid enum value for extensions
      notes: reason || 'Extended by admin',
      adminId: req.user.adminId || req.user.id
    });

    await vendor.save();

    // Reactivate vendor stations if they were deactivated
    try {
      const ChargingStation = require('../models/ChargingStation');
      const reactivatedStations = await ChargingStation.updateMany(
        { 
          vendor: vendorId, 
          isActive: false,
          deactivationReason: { 
            $in: ['Vendor subscription expired', 'Vendor subscription expired/suspended'] 
          }
        },
        { 
          isActive: true,
          $unset: { deactivationReason: 1, deactivatedAt: 1 }
        }
      );

      console.log(`Reactivated ${reactivatedStations.modifiedCount} stations for vendor ${vendorId}`);
      
      // Enhanced notification with station reactivation info
      const stationMessage = reactivatedStations.modifiedCount > 0 
        ? ` ${reactivatedStations.modifiedCount} station${reactivatedStations.modifiedCount > 1 ? 's have' : ' has'} been automatically reactivated and ${reactivatedStations.modifiedCount > 1 ? 'are' : 'is'} now live for bookings.`
        : '';

      // Send comprehensive notification (in-app, SMS, email) to vendor
      const notificationMessage = `Your subscription has been extended by admin until ${newEndDate.toLocaleDateString()}. All services are now active.${stationMessage}`;
      
      await sendComprehensiveNotification(
        vendor,
        'Subscription Extended by Admin 🎉',
        notificationMessage,
        'success',
        reactivatedStations.modifiedCount > 0 // Include station info if stations were reactivated
      );
    } catch (error) {
      console.error('Error reactivating stations:', error);
    }

    // Send separate notification on error
    try {
      if (!reactivatedStations) {
        await sendComprehensiveNotification(
          vendor,
          'Subscription Extended by Admin 🎉',
          `Your subscription has been extended by admin until ${newEndDate.toLocaleDateString()}. All services are now active.`,
          'success',
          false // No station info since reactivation failed
        );
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Vendor subscription extended successfully',
      data: {
        vendorId,
        previousEndDate: currentEndDate,
        newEndDate,
        extensionDays: Math.ceil(extensionMilliseconds / (24 * 60 * 60 * 1000)),
        subscriptionStatus: vendor.subscription.status,
        licenseActive: vendor.licenseInfo.isActive
      }
    });

  } catch (error) {
    console.error('Extend vendor subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend vendor subscription'
    });
  }
};

/**
 * @desc    Modify vendor subscription
 * @route   PUT /api/admin/vendors/:vendorId/subscription
 * @access  Private (Admin)
 */
const modifyVendorSubscription = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { 
      type, 
      status, 
      endDate, 
      startDate,
      maxStations,
      features,
      reason 
    } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const originalSubscription = { ...vendor.subscription };

    // Initialize subscription if it doesn't exist
    if (!vendor.subscription) {
      vendor.subscription = {
        type: 'trial',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: false,
        paymentHistory: []
      };
    }

    // Update subscription fields
    if (type && ['trial', 'yearly'].includes(type)) {
      vendor.subscription.type = type;
    }

    if (status && ['active', 'expired', 'suspended'].includes(status)) {
      vendor.subscription.status = status;
    }

    if (startDate) {
      vendor.subscription.startDate = new Date(startDate);
    }

    if (endDate) {
      vendor.subscription.endDate = new Date(endDate);
    }

    // Initialize license info if it doesn't exist
    if (!vendor.licenseInfo) {
      vendor.licenseInfo = {
        isActive: true,
        maxStations: 5,
        featuresEnabled: {
          basicDashboard: true,
          advancedAnalytics: false,
          prioritySupport: false,
          customBranding: false,
          apiAccess: false
        }
      };
    }

    // Update license info based on subscription type
    vendor.licenseInfo.isActive = vendor.subscription.status === 'active';
    
    if (maxStations !== undefined) {
      vendor.licenseInfo.maxStations = maxStations;
    } else {
      // Set default based on subscription type
      vendor.licenseInfo.maxStations = vendor.subscription.type === 'yearly' ? 50 : 5;
    }

    if (features) {
      vendor.licenseInfo.featuresEnabled = {
        ...vendor.licenseInfo.featuresEnabled,
        ...features
      };
    } else {
      // Set default features based on subscription type
      if (vendor.subscription.type === 'yearly') {
        vendor.licenseInfo.featuresEnabled = {
          basicDashboard: true,
          advancedAnalytics: true,
          prioritySupport: true,
          customBranding: true,
          apiAccess: true
        };
      } else {
        vendor.licenseInfo.featuresEnabled = {
          basicDashboard: true,
          advancedAnalytics: false,
          prioritySupport: false,
          customBranding: false,
          apiAccess: false
        };
      }
    }

    // Add modification record to payment history
    vendor.subscription.paymentHistory.push({
      transactionId: `admin_mod_${Date.now()}`,
      amount: 0,
      currency: 'NPR',
      paymentDate: new Date(),
      paymentMethod: 'admin_modification',
      status: 'completed',
      type: 'subscription', // Use valid enum value
      notes: reason || 'Modified by admin',
      adminId: req.user.adminId || req.user.id,
      originalData: originalSubscription
    });

    await vendor.save();

    // Handle station activation/deactivation based on status
    try {
      const ChargingStation = require('../models/ChargingStation');
      
      let stationAction = '';
      if (vendor.subscription.status === 'active') {
        // Reactivate stations
        const reactivatedStations = await ChargingStation.updateMany(
          { 
            vendor: vendorId, 
            isActive: false,
            deactivationReason: { 
              $in: ['Vendor subscription expired', 'Vendor subscription expired/suspended'] 
            }
          },
          { 
            isActive: true,
            $unset: { deactivationReason: 1, deactivatedAt: 1 }
          }
        );
        console.log(`Reactivated ${reactivatedStations.modifiedCount} stations for vendor ${vendorId}`);
        if (reactivatedStations.modifiedCount > 0) {
          stationAction = ` ${reactivatedStations.modifiedCount} station${reactivatedStations.modifiedCount > 1 ? 's have' : ' has'} been reactivated and ${reactivatedStations.modifiedCount > 1 ? 'are' : 'is'} now live for bookings.`;
        }
      } else {
        // Deactivate stations
        const deactivatedStations = await ChargingStation.updateMany(
          { vendor: vendorId, isActive: true },
          { 
            isActive: false,
            deactivationReason: 'Vendor subscription expired/suspended',
            deactivatedAt: new Date()
          }
        );
        console.log(`Deactivated ${deactivatedStations.modifiedCount} stations for vendor ${vendorId}`);
        if (deactivatedStations.modifiedCount > 0) {
          stationAction = ` ${deactivatedStations.modifiedCount} station${deactivatedStations.modifiedCount > 1 ? 's have' : ' has'} been deactivated.`;
        }
      }
    } catch (error) {
      console.error('Error managing station status:', error);
    }

    // Send comprehensive notification (in-app, SMS, email) to vendor
    try {
      const notificationMessage = vendor.subscription.status === 'active' 
        ? `Your subscription has been updated by admin. Type: ${vendor.subscription.type}, Valid until: ${vendor.subscription.endDate.toLocaleDateString()}.${stationAction}`
        : `Your subscription status has been changed to ${vendor.subscription.status} by admin.${stationAction} Please contact support for assistance.`;

      await sendComprehensiveNotification(
        vendor,
        'Subscription Updated by Admin 🔄',
        notificationMessage,
        vendor.subscription.status === 'active' ? 'success' : 'warning',
        vendor.subscription.status === 'active' && stationAction // Include station info only if active and stations affected
      );
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    res.json({
      success: true,
      message: 'Vendor subscription modified successfully',
      data: {
        vendorId,
        subscription: {
          type: vendor.subscription.type,
          status: vendor.subscription.status,
          startDate: vendor.subscription.startDate,
          endDate: vendor.subscription.endDate
        },
        licenseInfo: {
          isActive: vendor.licenseInfo.isActive,
          maxStations: vendor.licenseInfo.maxStations,
          featuresEnabled: vendor.licenseInfo.featuresEnabled
        }
      }
    });

  } catch (error) {
    console.error('Modify vendor subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to modify vendor subscription'
    });
  }
};

/**
 * @desc    Upgrade trial to yearly subscription
 * @route   POST /api/admin/vendors/:vendorId/subscription/upgrade-to-yearly
 * @access  Private (Admin)
 */
const upgradeTrialToYearly = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason, customEndDate } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (vendor.subscription?.type === 'yearly') {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already on yearly subscription'
      });
    }

    const originalSubscription = { ...vendor.subscription };

    // Upgrade to yearly
    const oneYearFromNow = customEndDate ? new Date(customEndDate) : new Date();
    if (!customEndDate) {
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    }

    if (!vendor.subscription) {
      vendor.subscription = {
        type: 'yearly',
        status: 'active',
        startDate: new Date(),
        endDate: oneYearFromNow,
        autoRenew: false,
        paymentHistory: []
      };
    } else {
      vendor.subscription.type = 'yearly';
      vendor.subscription.status = 'active';
      vendor.subscription.endDate = oneYearFromNow;
    }

    // Update license info for yearly features
    if (!vendor.licenseInfo) {
      vendor.licenseInfo = {
        isActive: true,
        maxStations: 50,
        featuresEnabled: {
          basicDashboard: true,
          advancedAnalytics: true,
          prioritySupport: true,
          customBranding: true,
          apiAccess: true
        }
      };
    } else {
      vendor.licenseInfo.isActive = true;
      vendor.licenseInfo.maxStations = 50;
      vendor.licenseInfo.featuresEnabled = {
        basicDashboard: true,
        advancedAnalytics: true,
        prioritySupport: true,
        customBranding: true,
        apiAccess: true
      };
    }

    // Add upgrade record to payment history
    vendor.subscription.paymentHistory.push({
      transactionId: `admin_upgrade_${Date.now()}`,
      amount: 0,
      currency: 'NPR',
      paymentDate: new Date(),
      paymentMethod: 'admin_upgrade',
      status: 'completed',
      type: 'subscription', // Use valid enum value
      notes: reason || 'Upgraded to yearly by admin',
      adminId: req.user.adminId || req.user.id,
      originalSubscription
    });

    await vendor.save();

    // Reactivate all vendor stations
    let reactivatedCount = 0;
    try {
      const ChargingStation = require('../models/ChargingStation');
      const reactivatedStations = await ChargingStation.updateMany(
        { 
          vendor: vendorId, 
          isActive: false,
          deactivationReason: { 
            $in: ['Vendor subscription expired', 'Vendor subscription expired/suspended'] 
          }
        },
        { 
          isActive: true,
          $unset: { deactivationReason: 1, deactivatedAt: 1 }
        }
      );
      reactivatedCount = reactivatedStations.modifiedCount;
      console.log(`Reactivated ${reactivatedCount} stations for upgraded vendor ${vendorId}`);
    } catch (error) {
      console.error('Error reactivating stations:', error);
    }

    // Send comprehensive notification (in-app, SMS, email) to vendor
    try {
      const stationMessage = reactivatedCount > 0 
        ? ` ${reactivatedCount} station${reactivatedCount > 1 ? 's have' : ' has'} been automatically reactivated and ${reactivatedCount > 1 ? 'are' : 'is'} now live for bookings.`
        : '';

      const notificationMessage = `Your account has been upgraded to yearly subscription by admin! You now have access to all premium features including advanced analytics, priority support, and can manage up to 50 stations.\n\nValid until ${oneYearFromNow.toLocaleDateString()}.${stationMessage}`;

      await sendComprehensiveNotification(
        vendor,
        'Congratulations! Upgraded to Yearly Plan by Admin 🎉',
        notificationMessage,
        'success',
        reactivatedCount > 0 // Include station info if stations were reactivated
      );
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    res.json({
      success: true,
      message: 'Vendor successfully upgraded to yearly subscription',
      data: {
        vendorId,
        previousType: originalSubscription?.type || 'trial',
        newType: 'yearly',
        endDate: oneYearFromNow,
        features: vendor.licenseInfo.featuresEnabled,
        maxStations: 50
      }
    });

  } catch (error) {
    console.error('Upgrade trial to yearly error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade vendor to yearly subscription'
    });
  }
};

/**
 * @desc    Get vendor subscription details
 * @route   GET /api/admin/vendors/:vendorId/subscription
 * @access  Private (Admin)
 */
const getVendorSubscriptionDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId).select('subscription licenseInfo businessName name email');
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Calculate subscription metrics
    const now = new Date();
    const endDate = vendor.subscription?.endDate ? new Date(vendor.subscription.endDate) : null;
    
    let daysUntilExpiration = 0;
    let isExpired = true;
    let isExpiringSoon = false;

    if (endDate && !isNaN(endDate.getTime())) {
      isExpired = endDate <= now;
      if (!isExpired) {
        const timeDiff = endDate.getTime() - now.getTime();
        daysUntilExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24));
        isExpiringSoon = daysUntilExpiration <= 7;
      }
    }

    // Get station count
    const ChargingStation = require('../models/ChargingStation');
    const stationCount = await ChargingStation.countDocuments({ vendor: vendorId });
    const activeStationCount = await ChargingStation.countDocuments({ vendor: vendorId, isActive: true });

    res.json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          businessName: vendor.businessName,
          name: vendor.name,
          email: vendor.email
        },
        subscription: vendor.subscription || {
          type: 'trial',
          status: 'expired',
          startDate: null,
          endDate: null,
          autoRenew: false,
          paymentHistory: []
        },
        licenseInfo: vendor.licenseInfo || {
          isActive: false,
          maxStations: 5,
          featuresEnabled: {
            basicDashboard: true,
            advancedAnalytics: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false
          }
        },
        metrics: {
          daysUntilExpiration,
          isExpired,
          isExpiringSoon,
          stationCount,
          activeStationCount,
          stationLimitUsage: stationCount / (vendor.licenseInfo?.maxStations || 5) * 100
        }
      }
    });

  } catch (error) {
    console.error('Get vendor subscription details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vendor subscription details'
    });
  }
};

/**
 * @desc    Get station premium subscription details
 * @route   GET /api/admin/stations/:stationId/premium
 * @access  Private (Admin)
 */
const getStationPremiumDetails = async (req, res) => {
  try {
    const { stationId } = req.params;

    const station = await ChargingStation.findById(stationId).populate('vendor', 'businessName email');
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    const premiumDetails = {
      stationId: station._id,
      stationName: station.name,
      vendor: station.vendor,
      premiumSubscription: station.premiumSubscription || {
        isActive: false,
        type: 'monthly',
        startDate: null,
        endDate: null,
        features: {
          priorityInSearch: false,
          specialBadge: false,
          advancedAnalytics: false,
          prioritySupport: false,
          customMapIcon: false,
          tripAIPriority: false
        }
      },
      isRecommended: station.dockitRecommended || false,
      metrics: {
        isPremiumActive: station.isPremiumActive ? station.isPremiumActive() : false,
        timeUntilExpiration: station.getPremiumTimeUntilExpiration ? station.getPremiumTimeUntilExpiration() : null
      }
    };

    res.json({
      success: true,
      data: premiumDetails
    });

  } catch (error) {
    console.error('Get station premium details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get station premium details'
    });
  }
};

/**
 * @desc    Activate station premium subscription
 * @route   POST /api/admin/stations/:stationId/premium/activate
 * @access  Private (Admin)
 */
const activateStationPremium = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { subscriptionType, customEndDate, reason } = req.body;

    if (!['monthly', 'yearly'].includes(subscriptionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription type. Must be monthly or yearly'
      });
    }

    const station = await ChargingStation.findById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    // Activate premium using the model method
    await station.activatePremium(subscriptionType, `admin_activation_${Date.now()}`);

    // Override end date if custom date provided
    if (customEndDate) {
      station.premiumSubscription.endDate = new Date(customEndDate);
      await station.save();
    }

    // Create notification for vendor
    try {
      await Notification.createNotification({
        recipient: station.vendor,
        recipientModel: 'Vendor',
        title: 'Station Premium Activated',
        message: `Your station "${station.name}" has been upgraded to premium by admin. All premium features are now active.`,
        type: 'success',
        priority: 'high'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    res.json({
      success: true,
      message: 'Station premium subscription activated successfully',
      data: {
        stationId,
        stationName: station.name,
        premiumSubscription: station.premiumSubscription,
        isRecommended: station.dockitRecommended
      }
    });

  } catch (error) {
    console.error('Activate station premium error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate station premium subscription'
    });
  }
};

/**
 * @desc    Deactivate station premium subscription
 * @route   POST /api/admin/stations/:stationId/premium/deactivate
 * @access  Private (Admin)
 */
const deactivateStationPremium = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { reason } = req.body;

    const station = await ChargingStation.findById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    // Deactivate premium using the model method
    await station.deactivatePremium();

    // Create notification for vendor
    try {
      await Notification.createNotification({
        recipient: station.vendor,
        recipientModel: 'Vendor',
        title: 'Station Premium Deactivated',
        message: `Your station "${station.name}" premium subscription has been deactivated by admin.`,
        type: 'warning',
        priority: 'high'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    res.json({
      success: true,
      message: 'Station premium subscription deactivated successfully',
      data: {
        stationId,
        stationName: station.name,
        premiumSubscription: station.premiumSubscription,
        isRecommended: station.dockitRecommended
      }
    });

  } catch (error) {
    console.error('Deactivate station premium error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate station premium subscription'
    });
  }
};

/**
 * @desc    Extend station premium subscription
 * @route   POST /api/admin/stations/:stationId/premium/extend
 * @access  Private (Admin)
 */
const extendStationPremium = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { days, months, years, reason } = req.body;

    if (!days && !months && !years) {
      return res.status(400).json({
        success: false,
        message: 'At least one time period (days, months, or years) must be specified'
      });
    }

    const station = await ChargingStation.findById(stationId);
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    // Calculate extension time
    let extensionMilliseconds = 0;
    if (days) extensionMilliseconds += days * 24 * 60 * 60 * 1000;
    if (months) extensionMilliseconds += months * 30 * 24 * 60 * 60 * 1000;
    if (years) extensionMilliseconds += years * 365 * 24 * 60 * 60 * 1000;

    const currentEndDate = station.premiumSubscription?.endDate || new Date();
    const newEndDate = new Date(Math.max(currentEndDate.getTime(), new Date().getTime()) + extensionMilliseconds);

    // Initialize premium subscription if it doesn't exist
    if (!station.premiumSubscription) {
      await station.activatePremium('monthly', `admin_ext_${Date.now()}`);
    }

    // Extend the subscription
    station.premiumSubscription.endDate = newEndDate;
    station.premiumSubscription.isActive = true;
    station.dockitRecommended = true;

    await station.save();

    // Create notification for vendor
    try {
      await Notification.createNotification({
        recipient: station.vendor,
        recipientModel: 'Vendor',
        title: 'Station Premium Extended',
        message: `Your station "${station.name}" premium subscription has been extended until ${newEndDate.toLocaleDateString()}.`,
        type: 'success',
        priority: 'high'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    res.json({
      success: true,
      message: 'Station premium subscription extended successfully',
      data: {
        stationId,
        stationName: station.name,
        previousEndDate: currentEndDate,
        newEndDate,
        extensionDays: Math.ceil(extensionMilliseconds / (24 * 60 * 60 * 1000)),
        premiumSubscription: station.premiumSubscription
      }
    });

  } catch (error) {
    console.error('Extend station premium error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend station premium subscription'
    });
  }
};

/**
 * @desc    Bulk manage station premium subscriptions
 * @route   POST /api/admin/stations/premium/bulk-action
 * @access  Private (Admin)
 */
const bulkManageStationPremium = async (req, res) => {
  try {
    const { stationIds, action, subscriptionType, days, months, years, reason } = req.body;

    if (!stationIds || !Array.isArray(stationIds) || stationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Station IDs are required'
      });
    }

    if (!['activate', 'deactivate', 'extend'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be activate, deactivate, or extend'
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const stationId of stationIds) {
      try {
        const station = await ChargingStation.findById(stationId);
        if (!station) {
          results.failed.push({ stationId, error: 'Station not found' });
          continue;
        }

        if (action === 'activate') {
          await station.activatePremium(subscriptionType || 'monthly', `bulk_${Date.now()}`);
        } else if (action === 'deactivate') {
          await station.deactivatePremium();
        } else if (action === 'extend') {
          let extensionMilliseconds = 0;
          if (days) extensionMilliseconds += days * 24 * 60 * 60 * 1000;
          if (months) extensionMilliseconds += months * 30 * 24 * 60 * 60 * 1000;
          if (years) extensionMilliseconds += years * 365 * 24 * 60 * 60 * 1000;

          const currentEndDate = station.premiumSubscription?.endDate || new Date();
          const newEndDate = new Date(Math.max(currentEndDate.getTime(), new Date().getTime()) + extensionMilliseconds);
          
          if (!station.premiumSubscription) {
            await station.activatePremium('monthly', `bulk_ext_${Date.now()}`);
          }
          
          station.premiumSubscription.endDate = newEndDate;
          station.premiumSubscription.isActive = true;
        }

        await station.save();
        results.successful.push({ 
          stationId, 
          stationName: station.name,
          action: action 
        });

      } catch (error) {
        results.failed.push({ 
          stationId, 
          error: error.message 
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      data: {
        totalProcessed: stationIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        results
      }
    });

  } catch (error) {
    console.error('Bulk manage station premium error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action'
    });
  }
};

// Routes
router.get('/dashboard/stats', protectAdmin, requirePermission('canViewDashboard'), getDashboardStats);
router.get('/admins', protectAdmin, requirePermission('canCreateAdmins'), getAllAdmins);
router.get('/employees', protectAdmin, requirePermission('canCreateEmployees'), getAllEmployees);
router.get('/users', protectAdmin, requirePermission('canViewUsers'), getAllUsers);
router.get('/vendors', protectAdmin, requirePermission('canViewVendors'), getAllVendors);
router.get('/stations', protectAdmin, requirePermission('canViewStations'), getAllStations);
router.get('/bookings', protectAdmin, requirePermission('canViewBookings'), getAllBookings);
router.get('/payments', protectAdmin, requirePermission('canViewPayments'), getAllPayments);
router.get('/payments/stats', protectAdmin, requirePermission('canViewPayments'), getPaymentStats);
router.get('/logs', protectAdmin, requirePermission('canViewLogs'), getSystemLogs);
router.post('/admins', protectAdmin, requirePermission('canCreateAdmins'), createAdminValidation, createAdmin);
router.post('/employees', protectAdmin, requirePermission('canCreateEmployees'), createEmployeeValidation, createEmployee);
router.put('/admins/:adminId', protectAdmin, requirePermission('canEditAdmins'), updateAdmin);
router.get('/stations/map', protectAdmin, requirePermission('canViewStations'), getStationsMapData);
router.patch('/vendors/:id/verify', protectAdmin, requirePermission('canEditVendors'), verifyVendor);
// Add new route for document verification
router.patch('/vendors/:vendorId/documents/:docType', protectAdmin, requirePermission('canEditVendors'), verifyVendorDocument);
router.post('/vendors/:id/request-delete-code', protectAdmin, requirePermission('canEditVendors'), requestVendorDeleteCode);
router.delete('/vendors/:id', protectAdmin, requirePermission('canEditVendors'), deleteVendor);
router.patch('/stations/:stationId/verify', protectAdmin, requirePermission('canEditStations'), verifyStation);
router.patch('/stations/:stationId/dockit-recommended', protectAdmin, requirePermission('canEditStations'), toggleDockitRecommended);
router.patch('/stations/:stationId/status', protectAdmin, requirePermission('canEditStations'), toggleStationActive);

// Station premium subscription management routes
router.get('/stations/:stationId/premium', protectAdmin, requirePermission('canViewStations'), getStationPremiumDetails);
router.post('/stations/:stationId/premium/activate', protectAdmin, requirePermission('canEditStations'), activateStationPremium);
router.post('/stations/:stationId/premium/deactivate', protectAdmin, requirePermission('canEditStations'), deactivateStationPremium);
router.post('/stations/:stationId/premium/extend', protectAdmin, requirePermission('canEditStations'), extendStationPremium);
router.post('/stations/premium/bulk-action', protectAdmin, requirePermission('canEditStations'), bulkManageStationPremium);

// Settlement management routes
router.get('/settlements/vendors', protectAdmin, requirePermission('canViewPayments'), getVendorsWithPendingSettlements);
router.get('/settlements/vendor/:vendorId', protectAdmin, requirePermission('canViewPayments'), getVendorSettlementDetails);
router.post('/settlements/initiate', protectAdmin, requirePermission('canEditPayments'), initiateSettlement);
router.post('/settlements/complete', protectAdmin, requirePermission('canEditPayments'), completeSettlement);

// Refund management routes
router.get('/refunds', protectAdmin, requirePermission('canViewPayments'), getAllRefunds);
router.post('/refunds/:refundId/process', protectAdmin, requirePermission('canEditPayments'), processRefundPayment);

// Vendor subscription management routes
router.get('/vendors/:vendorId/subscription', protectAdmin, requirePermission('canViewVendors'), getVendorSubscriptionDetails);
router.post('/vendors/:vendorId/subscription/extend', protectAdmin, requirePermission('canEditVendors'), extendVendorSubscription);
router.put('/vendors/:vendorId/subscription', protectAdmin, requirePermission('canEditVendors'), modifyVendorSubscription);
router.post('/vendors/:vendorId/subscription/upgrade-to-yearly', protectAdmin, requirePermission('canEditVendors'), upgradeTrialToYearly);

// File upload routes
router.post('/upload-profile/:userType/:userId',
  protectAdmin,
  upload.single('profile'),
  optimizedUploadSingleToS3,
  uploadProfilePicture
);

module.exports = router;
