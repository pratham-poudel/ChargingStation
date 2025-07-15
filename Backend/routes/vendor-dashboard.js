const express = require('express');
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const ChargingStation = require('../models/ChargingStation');
const Booking = require('../models/Booking');
const Settlement = require('../models/Settlement');
const Restaurant = require('../models/Restaurant');
const { protect } = require('../middleware/auth');
const { checkVendorSubscription } = require('../middleware/subscriptionCheck');
// Using optimized upload service for RAM-efficient uploads

// Import optimized upload service
const { optimizedUploadService } = require('../config/optimized-upload');

// Get optimized upload middleware
const upload = optimizedUploadService.getOptimizedMulterConfig();
const { optimizedUploadSingleToS3 } = require('../middleware/optimized-upload');

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

// @desc    Get vendor dashboard stats
// @route   GET /api/vendor/dashboard/stats
// @access  Private (Vendor)
const getDashboardStats = async (req, res) => {
  try {
    const vendorId = new mongoose.Types.ObjectId(req.user.id);
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get total stations
    const totalStations = await ChargingStation.countDocuments({ 
      vendor: vendorId,
      isActive: true 
    });    // Get active stations - stations that are active and verified
    const activeStations = await ChargingStation.countDocuments({ 
      vendor: vendorId,
      isActive: true,
      isVerified: true
    });

    // Get total bookings
    const totalBookings = await Booking.countDocuments({ 
      vendor: vendorId 
    });    // Get completed bookings
    const completedBookings = await Booking.countDocuments({ 
      vendor: vendorId,
      status: 'completed'
    });

    // Get confirmed bookings (paid but not yet started/completed)
    const confirmedBookings = await Booking.countDocuments({ 
      vendor: vendorId,
      status: 'confirmed'
    });

    // Get pending bookings (awaiting payment or confirmation)
    const pendingBookings = await Booking.countDocuments({ 
      vendor: vendorId,
      status: 'pending'
    });// Get total revenue (this month) - count all paid bookings
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    console.log('=== REVENUE DEBUG ===');
    console.log('Vendor ID:', vendorId);
    console.log('Current month start:', currentMonth);

    // First check all bookings for this vendor
    const allBookings = await Booking.find({ vendor: vendorId });    console.log('All bookings for vendor:', allBookings.length);
    allBookings.forEach((booking, index) => {
      console.log(`Booking ${index + 1}:`, {
        id: booking._id,
        vendor: booking.vendor,
        vendorId: vendorId,
        vendorMatch: booking.vendor.toString() === vendorId.toString(),
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalAmount: booking.pricing?.totalAmount,
        createdAt: booking.createdAt
      });    });

    // Helper function to calculate merchant revenue including payment adjustments
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

    // Check if we have any completed bookings for this vendor
    const completedBookingsCount = await Booking.countDocuments({
      vendor: vendorId,
      status: 'completed'
    });
    console.log('Completed bookings count for vendor:', completedBookingsCount);

    // Get completed bookings for this month with payment adjustments
    const monthlyCompletedBookings = await Booking.find({
      vendor: vendorId,
      status: 'completed',
      createdAt: { $gte: currentMonth }
    }).lean();

    const monthlyRevenue = monthlyCompletedBookings.reduce((total, booking) => {
      return total + calculateMerchantRevenue(booking);
    }, 0);

    // Get confirmed revenue (confirmed bookings that are paid)
    const confirmedRevenue = await Booking.aggregate([
      {
        $match: {
          vendor: vendorId,
          status: 'confirmed',
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalMerchantAmount: { $sum: '$pricing.merchantAmount' },
          totalAmountFallback: { $sum: '$pricing.totalAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $addFields: {
          merchantRevenue: {
            $cond: {
              if: { $gt: ['$totalMerchantAmount', 0] },
              then: '$totalMerchantAmount',
              else: { $subtract: ['$totalAmountFallback', { $multiply: ['$count', 5] }] }
            }
          }
        }
      }
    ]);

    // Get pending revenue (pending bookings that are paid)
    const pendingRevenue = await Booking.aggregate([
      {
        $match: {
          vendor: vendorId,
          status: 'pending',
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalMerchantAmount: { $sum: '$pricing.merchantAmount' },
          totalAmountFallback: { $sum: '$pricing.totalAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $addFields: {
          merchantRevenue: {
            $cond: {
              if: { $gt: ['$totalMerchantAmount', 0] },
              then: '$totalMerchantAmount',
              else: { $subtract: ['$totalAmountFallback', { $multiply: ['$count', 5] }] }
            }
          }
        }
      }    ]);

    // Get all completed bookings for total revenue calculation
    const allCompletedBookings = await Booking.find({
      vendor: vendorId,
      status: 'completed'
    }).lean();

    const totalRevenue = allCompletedBookings.reduce((total, booking) => {
      return total + calculateMerchantRevenue(booking);
    }, 0);

    console.log('Total revenue calculated with adjustments:', totalRevenue);// Get recent bookings
    const recentBookings = await Booking.find({ 
      vendor: vendorId 
    })
    .populate('user', 'name phoneNumber')
    .populate('chargingStation', 'name location')
    .sort({ createdAt: -1 })
    .limit(5);    // Get daily stats for chart (includes estimated revenue from all paid bookings) - last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Daily completed revenue
    const dailyStats = await Booking.aggregate([
      {
        $match: {
          vendor: vendorId,
          status: 'completed', // Only completed bookings contribute to actual revenue
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          merchantAmount: { $sum: '$pricing.merchantAmount' },
          totalAmountFallback: { $sum: '$pricing.totalAmount' },
          finalAmountFallback: { $sum: '$actualUsage.finalAmount' },
          totalBookings: { $sum: 1 } // Count all bookings for this stat
        }
      },
      {
        $addFields: {
          // Use merchantAmount if available, otherwise fallback to totalAmount - 5 for old bookings
          revenue: {
            $cond: {
              if: { $gt: ['$merchantAmount', 0] },
              then: '$merchantAmount',
              else: { $subtract: ['$totalAmountFallback', { $multiply: ['$totalBookings', 5] }] }
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Daily estimated revenue from all paid bookings (confirmed + pending + completed)
    const dailyEstimatedStats = await Booking.aggregate([
      {
        $match: {
          vendor: vendorId,
          paymentStatus: 'paid', // All paid bookings contribute to estimated revenue
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          estimatedMerchantAmount: { $sum: '$pricing.merchantAmount' },
          estimatedTotalAmount: { $sum: '$pricing.totalAmount' },
          totalPaidBookings: { $sum: 1 }
        }
      },
      {
        $addFields: {
          estimatedRevenue: {
            $cond: {
              if: { $gt: ['$estimatedMerchantAmount', 0] },
              then: '$estimatedMerchantAmount',
              else: { $subtract: ['$estimatedTotalAmount', { $multiply: ['$totalPaidBookings', 5] }] }
            }
          }
        }
      },      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Also get total bookings for daily stats (including all statuses)
    const dailyBookingStats = await Booking.aggregate([
      {
        $match: {
          vendor: vendorId,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalBookings: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Merge the booking counts with revenue stats and estimated revenue
    const mergedDailyStats = dailyStats.map(revenueStat => {
      const bookingStat = dailyBookingStats.find(
        b => b._id.year === revenueStat._id.year && b._id.month === revenueStat._id.month && b._id.day === revenueStat._id.day
      );
      const estimatedStat = dailyEstimatedStats.find(
        e => e._id.year === revenueStat._id.year && e._id.month === revenueStat._id.month && e._id.day === revenueStat._id.day
      );
      return {        ...revenueStat,
        totalBookings: bookingStat ? bookingStat.totalBookings : 0,
        // Estimated revenue should be from all paid bookings, actual revenue only from completed
        estimatedRevenue: estimatedStat ? estimatedStat.estimatedRevenue : revenueStat.revenue,
        // Include both for comparison
        actualRevenue: revenueStat.revenue
      };
    });

    // Add days with estimated revenue but no completed bookings
    dailyEstimatedStats.forEach(estimatedStat => {
      const hasRevenueStat = mergedDailyStats.find(
        r => r._id.year === estimatedStat._id.year && r._id.month === estimatedStat._id.month && r._id.day === estimatedStat._id.day
      );
      if (!hasRevenueStat) {
        const bookingStat = dailyBookingStats.find(
          b => b._id.year === estimatedStat._id.year && b._id.month === estimatedStat._id.month && b._id.day === estimatedStat._id.day
        );
        mergedDailyStats.push({
          _id: estimatedStat._id,
          revenue: 0, // No completed bookings
          actualRevenue: 0,
          totalBookings: bookingStat ? bookingStat.totalBookings : 0,
          estimatedRevenue: estimatedStat.estimatedRevenue
        });
      }
    });

    // Add days with bookings but no revenue (neither completed nor paid)
    dailyBookingStats.forEach(bookingStat => {
      const hasAnyStat = mergedDailyStats.find(
        r => r._id.year === bookingStat._id.year && r._id.month === bookingStat._id.month && r._id.day === bookingStat._id.day
      );
      if (!hasAnyStat) {
        mergedDailyStats.push({
          _id: bookingStat._id,
          revenue: 0,
          actualRevenue: 0,
          totalBookings: bookingStat.totalBookings,
          estimatedRevenue: 0
        });
      }
    });

    // Sort the merged stats
    mergedDailyStats.sort((a, b) => {
      if (a._id.year !== b._id.year) return a._id.year - b._id.year;
      if (a._id.month !== b._id.month) return a._id.month - b._id.month;
      return a._id.day - b._id.day;
    });

    res.json({
      success: true,      data: {        stats: {
          totalStations,
          activeStations,
          totalBookings,
          completedBookings,
          confirmedBookings,
          pendingBookings,
          monthlyRevenue: monthlyRevenue,
          totalRevenue: totalRevenue,
          confirmedRevenue: confirmedRevenue[0]?.merchantRevenue || 0,
          pendingRevenue: pendingRevenue[0]?.merchantRevenue || 0,
          estimatedRevenue: (confirmedRevenue[0]?.merchantRevenue || 0) + (pendingRevenue[0]?.merchantRevenue || 0),
          conversionRate: totalBookings > 0 ? (completedBookings / totalBookings * 100).toFixed(1) : 0        },
        recentBookings,
        dailyStats: mergedDailyStats,
        vendor: {
          name: vendor.name,
          businessName: vendor.businessName,
          verificationStatus: vendor.verificationStatus,
          onboardingStep: vendor.onboardingStep,
          rating: vendor.rating
        }
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats'
    });
  }
};

// @desc    Get vendor onboarding status
// @route   GET /api/vendor/dashboard/onboarding
// @access  Private (Vendor)
const getOnboardingStatus = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check document completion status
    const hasBusinessCert = vendor.documents?.businessRegistrationCertificate?.url;
    const hasCitizenshipCert = vendor.documents?.ownerCitizenshipCertificate?.url;
    const hasBankDetails = vendor.bankDetails?.accountNumber && vendor.bankDetails?.accountHolderName;

    const onboardingSteps = [
      {
        step: 'registration',
        title: 'Basic Information',
        description: 'Business details and contact information',
        completed: true,
        completedAt: vendor.createdAt
      },
      {
        step: 'documents',
        title: 'Document Upload',
        description: 'Upload business registration certificate and citizenship certificate',
        completed: hasBusinessCert && hasCitizenshipCert,
        completedAt: hasBusinessCert && hasCitizenshipCert ? vendor.documents.businessRegistrationCertificate.uploadedAt : null,
        required: true
      },
      {
        step: 'bank_details',
        title: 'Bank Details',
        description: 'Add bank account for payments',
        completed: hasBankDetails,
        completedAt: hasBankDetails ? vendor.updatedAt : null,
        required: true
      },
      {
        step: 'under_review',
        title: 'Under Review',
        description: 'Your application is being reviewed by our team',
        completed: vendor.verificationStatus === 'verified' || vendor.onboardingStep === 'completed',
        completedAt: vendor.verificationStatus === 'verified' ? vendor.updatedAt : null,
        required: true
      },
      {
        step: 'completed',
        title: 'Setup Complete',
        description: 'Your account is ready to use',
        completed: vendor.onboardingStep === 'completed' && vendor.verificationStatus === 'verified',
        completedAt: vendor.onboardingStep === 'completed' ? vendor.updatedAt : null,
        required: true
      }
    ];

    const completedSteps = onboardingSteps.filter(step => step.completed).length;
    const progressPercentage = (completedSteps / onboardingSteps.length) * 100;

    // Determine current status message
    let statusMessage = '';
    let showDashboard = false;

    if (vendor.onboardingStep === 'completed' && vendor.verificationStatus === 'verified') {
      statusMessage = 'Welcome! Your account is fully verified and ready to use.';
      showDashboard = true;
    } else if (vendor.verificationStatus === 'under_review' || vendor.onboardingStep === 'under_review') {
      statusMessage = 'Your application is under review. Our team will contact you within 1-2 business days.';
    } else if (vendor.verificationStatus === 'rejected') {
      statusMessage = 'Your application needs attention. Please review the feedback and resubmit required documents.';
    } else if (!hasBusinessCert || !hasCitizenshipCert) {
      statusMessage = 'Please upload your business registration certificate and citizenship certificate to continue.';
    } else if (!hasBankDetails) {
      statusMessage = 'Please add your bank details to complete the setup.';
    } else {
      statusMessage = 'Please complete all required steps to proceed.';
    }

    res.json({
      success: true,
      data: {
        currentStep: vendor.onboardingStep,
        steps: onboardingSteps,
        progressPercentage: Math.round(progressPercentage),
        completedSteps,
        totalSteps: onboardingSteps.length,
        verificationStatus: vendor.verificationStatus,
        verificationNotes: vendor.verificationNotes,
        statusMessage,
        showDashboard,
        documents: {
          businessRegistrationCertificate: vendor.documents?.businessRegistrationCertificate || null,
          ownerCitizenshipCertificate: vendor.documents?.ownerCitizenshipCertificate || null,
          additionalDocuments: vendor.documents?.additionalDocuments || []
        }
      }
    });

  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get onboarding status'
    });
  }
};

// @desc    Update vendor profile
// @route   PUT /api/vendor/dashboard/profile
// @access  Private (Vendor)
const updateProfile = async (req, res) => {  try {
    const {
      name,
      email,
      phoneNumber,
      businessName,
      gstNumber,
      businessRegistrationNumber,
      address,
      bankDetails
    } = req.body;

    const vendor = await Vendor.findById(req.user.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update allowed fields
    if (name) vendor.name = name;
    if (email) vendor.email = email;
    if (phoneNumber) vendor.phoneNumber = phoneNumber;
    if (businessName) vendor.businessName = businessName;
    if (gstNumber) vendor.gstNumber = gstNumber;
    if (businessRegistrationNumber) vendor.businessRegistrationNumber = businessRegistrationNumber;
    if (address) vendor.address = { ...vendor.address, ...address };
    if (bankDetails) vendor.bankDetails = { ...vendor.bankDetails, ...bankDetails };

    await vendor.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { vendor }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// @desc    Get vendor transactions
// @route   GET /api/vendor/dashboard/transactions
// @access  Private (Vendor)
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const vendorId = req.user.id;

    // Build query
    const query = { vendor: vendorId };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }    // Get transactions with pagination
    const transactions = await Booking.find(query)
      .populate('user', 'name phoneNumber')
      .populate('chargingStation', 'name location')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions'
    });
  }
};

// @desc    Get vendor stations
// @route   GET /api/vendor/dashboard/stations
// @access  Private (Vendor)
const getStations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const vendorId = req.user.id;

    // Build query
    const query = { vendor: vendorId };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get stations with pagination
    const stations = await ChargingStation.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ChargingStation.countDocuments(query);

    res.json({
      success: true,
      data: {
        stations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get stations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stations'
    });
  }
};

// @desc    Upload vendor document
// @route   POST /api/vendor/dashboard/upload-document
// @access  Private (Vendor)
const uploadDocument = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const { documentType } = req.body;

    if (!req.uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required'
      });
    }

    // Validate document type
    const allowedTypes = ['businessRegistrationCertificate', 'ownerCitizenshipCertificate', 'additionalDocument'];
    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    // Use the already uploaded file info from middleware
    const fileInfo = req.uploadedFile;

    // Prepare document object
    const documentData = {
      url: fileInfo.url,
      objectName: fileInfo.objectName,
      originalName: fileInfo.originalName,
      uploadedAt: new Date(),
      status: 'pending'
    };

    // Update vendor documents based on type
    if (documentType === 'additionalDocument') {
      if (!vendor.documents.additionalDocuments) {
        vendor.documents.additionalDocuments = [];
      }
      vendor.documents.additionalDocuments.push({
        ...documentData,
        documentType: req.body.additionalDocumentType || 'Other'
      });
    } else {
      vendor.documents[documentType] = documentData;
    }

    // Check if all required documents are uploaded
    const hasBusinessCert = vendor.documents.businessRegistrationCertificate?.url;
    const hasCitizenshipCert = vendor.documents.ownerCitizenshipCertificate?.url;

    if (hasBusinessCert && hasCitizenshipCert && vendor.onboardingStep === 'documents') {
      vendor.onboardingStep = 'under_review';
      vendor.verificationStatus = 'under_review';
    }

    await vendor.save();

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        document: documentData,
        vendor: vendor
      }
    });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update vendor document after presigned upload
// @route   POST /api/vendor/dashboard/update-document-after-upload
// @access  Private (Vendor)
const updateDocumentAfterUpload = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const { uploadResult, documentType, additionalDocumentType } = req.body;

    if (!uploadResult || !uploadResult.url) {
      return res.status(400).json({
        success: false,
        message: 'Upload result with URL is required'
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required'
      });
    }

    // Validate document type
    const allowedTypes = ['businessRegistrationCertificate', 'ownerCitizenshipCertificate', 'additionalDocument'];
    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    // Prepare document object from presigned upload result
    const documentData = {
      url: uploadResult.url,
      objectName: uploadResult.objectName,
      originalName: uploadResult.originalName,
      uploadedAt: uploadResult.uploadedAt || new Date(),
      status: 'pending'
    };

    // Update vendor documents based on type
    if (documentType === 'additionalDocument') {
      if (!vendor.documents.additionalDocuments) {
        vendor.documents.additionalDocuments = [];
      }
      vendor.documents.additionalDocuments.push({
        ...documentData,
        documentType: additionalDocumentType || 'Other'
      });
    } else {
      vendor.documents[documentType] = documentData;
    }

    // Check if all required documents are uploaded
    const hasBusinessCert = vendor.documents.businessRegistrationCertificate?.url;
    const hasCitizenshipCert = vendor.documents.ownerCitizenshipCertificate?.url;

    if (hasBusinessCert && hasCitizenshipCert && vendor.onboardingStep === 'documents') {
      vendor.onboardingStep = 'under_review';
      vendor.verificationStatus = 'under_review';
    }

    await vendor.save();

    res.json({
      success: true,
      message: 'Document updated in database successfully',
      data: {
        document: documentData,
        vendor: vendor
      }
    });

  } catch (error) {
    console.error('Update document after upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update document in database',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Delete vendor document
// @route   DELETE /api/vendor/dashboard/delete-document
// @access  Private (Vendor)
const deleteDocument = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const { documentType, documentId } = req.body;

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required'
      });
    }

    let objectName = null;

    // Delete from vendor documents
    if (documentType === 'additionalDocument' && documentId) {
      const docIndex = vendor.documents.additionalDocuments.findIndex(doc => doc._id.toString() === documentId);
      if (docIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      objectName = vendor.documents.additionalDocuments[docIndex].objectName;
      vendor.documents.additionalDocuments.splice(docIndex, 1);
    } else {
      const document = vendor.documents[documentType];
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      objectName = document.objectName;
      vendor.documents[documentType] = undefined;
    }

    // Delete from MinIO
    if (objectName) {
      const { deleteFile } = require('../config/minio');
      await deleteFile(objectName);
    }

    await vendor.save();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get vendor document URL
// @route   GET /api/vendor/dashboard/document-url/:documentType
// @access  Private (Vendor)
const getDocumentUrl = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const { documentType } = req.params;
    const { documentId } = req.query;

    let document = null;

    if (documentType === 'additionalDocument' && documentId) {
      document = vendor.documents.additionalDocuments.find(doc => doc._id.toString() === documentId);
    } else {
      document = vendor.documents[documentType];
    }

    if (!document || !document.objectName) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Generate presigned URL with 1 hour expiry
    const { getFileUrl } = require('../config/minio');
    const url = await getFileUrl(document.objectName, 3600);

    res.json({
      success: true,
      data: { 
        url,
        document: {
          originalName: document.originalName,
          uploadedAt: document.uploadedAt,
          status: document.status
        }
      }
    });

  } catch (error) {
    console.error('Get document URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document URL'
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/vendor/dashboard/notification-preferences
// @access  Private (Vendor)
const updateNotificationPreferences = async (req, res) => {
  try {
    const { emailNotifications, smsNotifications } = req.body;

    const vendor = await Vendor.findById(req.user.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update notification preferences
    if (emailNotifications) {
      vendor.notificationPreferences = {
        ...vendor.notificationPreferences,
        emailNotifications
      };
    }
    
    if (smsNotifications) {
      vendor.notificationPreferences = {
        ...vendor.notificationPreferences,
        smsNotifications
      };
    }

    await vendor.save();

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: { vendor }
    });

  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences'
    });
  }
};

// @desc    Upload vendor profile picture
// @route   POST /api/vendor/dashboard/upload-profile-picture
// @access  Private (Vendor)
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }    // Upload to MinIO Profiles folder using optimized streaming
    let fileStream;
    if (req.file.buffer) {
      fileStream = optimizedUploadService.bufferToStream(req.file.buffer);
    } else if (req.file.path) {
      fileStream = require('fs').createReadStream(req.file.path);
    }

    const fileInfo = await optimizedUploadService.uploadFileStream(
      fileStream,
      `${vendorId}_${Date.now()}_${req.file.originalname}`,
      'Profiles',
      req.file.mimetype,
      req.file.size
    );    // Update vendor profile picture
    vendor.profilePicture = {
      filename: req.file.originalname,
      fileUrl: fileInfo.url,
      objectName: fileInfo.objectName,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
      size: fileInfo.size
    };

    await vendor.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: { 
        vendor: vendor,
        profilePicture: vendor.profilePicture 
      }
    });

  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture',
      error: error.message
    });
  }
};

// Get platform revenue (for admin use)
router.get('/platform-revenue', async (req, res) => {
  try {
    // Get platform revenue from all completed bookings
    const platformRevenue = await Booking.aggregate([
      {
        $match: {
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalPlatformFees: { $sum: '$pricing.platformFee' },
          totalBookings: { $sum: 1 },
          totalCustomerAmount: { $sum: '$pricing.totalAmount' },
          totalMerchantAmount: { $sum: '$pricing.merchantAmount' }
        }
      }
    ]);

    // Get monthly platform revenue
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyPlatformRevenue = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: null,
          monthlyPlatformFees: { $sum: '$pricing.platformFee' },
          monthlyBookings: { $sum: 1 }
        }
      }
    ]);

    const stats = platformRevenue[0] || {};
    const monthlyStats = monthlyPlatformRevenue[0] || {};

    res.json({
      success: true,
      data: {
        totalPlatformRevenue: stats.totalPlatformFees || 0,
        totalBookings: stats.totalBookings || 0,
        totalCustomerPayments: stats.totalCustomerAmount || 0,
        totalMerchantPayouts: stats.totalMerchantAmount || 0,
        monthlyPlatformRevenue: monthlyStats.monthlyPlatformFees || 0,
        monthlyBookings: monthlyStats.monthlyBookings || 0
      }
    });
  } catch (error) {
    console.error('Platform revenue fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform revenue'
    });
  }
});


// Helper function to calculate merchant revenue including payment adjustments
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

// @desc    Get all bookings with pagination
// @route   GET /api/vendor/bookings
// @access  Private (Vendor)
const getAllBookings = async (req, res) => {
  try {
    const vendorId = new mongoose.Types.ObjectId(req.user.id);
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      dateFrom,
      dateTo
    } = req.query;

    // Build query
    const query = { vendor: vendorId };
    
    if (status) {
      query.status = status;
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get bookings with populated fields
    const bookings = await Booking.find(query)
      .populate('user', 'name phoneNumber')
      .populate('chargingStation', 'name location')
      .populate('chargingPort', 'portNumber')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalBookings = await Booking.countDocuments(query);
    const totalPages = Math.ceil(totalBookings / parseInt(limit));

    // Add calculated merchant revenue to each booking
    const bookingsWithRevenue = bookings.map(booking => {
      const bookingObj = booking.toObject();
      bookingObj.calculatedMerchantRevenue = calculateMerchantRevenue(bookingObj);
      return bookingObj;
    });

    res.json({
      success: true,
      data: {
        bookings: bookingsWithRevenue,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalBookings,
          limit: parseInt(limit),
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching vendor bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
};

// @desc    Get vendor transaction analytics by date
// @route   GET /api/vendor/dashboard/transaction-analytics
// @access  Private (Vendor)
const getTransactionAnalytics = async (req, res) => {
  try {
    const vendorId = new mongoose.Types.ObjectId(req.user.id);
    const { date } = req.query;

    let startDate, endDate;
    
    if (date) {
      // If specific date is provided, get analytics for that day
      // Handle both 'YYYY-MM-DD' and date object formats with UTC
      const inputDate = new Date(date + 'T00:00:00.000Z'); // Force UTC interpretation
      startDate = new Date(inputDate);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(inputDate);
      endDate.setUTCHours(23, 59, 59, 999);
    } else {
      // If no date, get current month analytics
      startDate = new Date();
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
    }

    // ============== CHARGING STATION REVENUE ==============
    // Get completed bookings for the date range with populated fields
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

    // Calculate charging station revenue for selected date
    const chargingStationRevenue = completedBookings.reduce((total, booking) => {
      return total + calculateMerchantRevenue(booking);
    }, 0);

    // ============== RESTAURANT ORDER REVENUE ==============
    // Import the Order model
    const Order = require('../models/Order');
    
    // Get completed orders for the vendor's restaurants on the selected date
    const vendorRestaurants = await Restaurant.find({ vendor: vendorId }).select('_id');
    const restaurantIds = vendorRestaurants.map(r => r._id);

    const completedOrders = await Order.find({
      restaurant: { $in: restaurantIds },
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    })
    .populate('restaurant', 'name')
    .populate('chargingStation', 'name location')
    .lean();

    // Calculate restaurant revenue (vendor gets 100% since they pay annual service charge)
    const restaurantRevenue = completedOrders.reduce((total, order) => {
      return total + order.totalAmount; // 100% to vendor (they pay annual service charge)
    }, 0);

    // ============== COMBINED ANALYTICS ==============
    const totalToBeReceived = chargingStationRevenue + restaurantRevenue;

    // For settlements, we need to check if they were requested for this specific date
    // regardless of when the settlement was actually requested
    const settlementsForThisDate = await Settlement.find({
      vendor: vendorId,
      periodStart: { $lte: endDate },
      periodEnd: { $gte: startDate },
      status: { $in: ['pending', 'processing'] }
    }).lean();

    // Calculate amounts based on settlement status, but always tied to the transaction date
    let settledAmountForDate = 0;
    let inSettlementAmountForDate = 0;
    let pendingSettlementForDate = 0;

    // Process charging station bookings for settlement status
    completedBookings.forEach(booking => {
      const merchantRevenue = calculateMerchantRevenue(booking);
      
      if (booking.settlementStatus === 'settled') {
        settledAmountForDate += merchantRevenue;
      } else if (booking.settlementStatus === 'included_in_settlement') {
        // Check if this booking is part of an active settlement for this date range
        const isInActiveSettlement = settlementsForThisDate.some(settlement => 
          settlement.transactionIds.some(id => id.toString() === booking._id.toString())
        );
        
        if (isInActiveSettlement) {
          inSettlementAmountForDate += merchantRevenue;
        } else {
          settledAmountForDate += merchantRevenue;
        }
      } else {
        // Truly pending (not yet included in any settlement)
        pendingSettlementForDate += merchantRevenue;
      }
    });

    // Process restaurant orders for settlement status (orders use different settlement tracking)
    completedOrders.forEach(order => {
      const vendorShare = order.totalAmount; // 100% to vendor (annual service charge model)
      
      // Check if order is in settlement (orders might have different settlement field structure)
      if (order.settlementStatus === 'settled') {
        settledAmountForDate += vendorShare;
      } else if (order.settlementStatus === 'included_in_settlement') {
        const isInActiveSettlement = settlementsForThisDate.some(settlement => 
          settlement.orderIds && settlement.orderIds.some(id => id.toString() === order._id.toString())
        );
        
        if (isInActiveSettlement) {
          inSettlementAmountForDate += vendorShare;
        } else {
          settledAmountForDate += vendorShare;
        }
      } else {
        pendingSettlementForDate += vendorShare;
      }
    });

    // ============== OVERALL STATS (across all time) ==============
    // Charging station earnings
    const allCompletedBookings = await Booking.find({
      vendor: vendorId,
      status: 'completed'
    }).lean();

    const totalChargingStationBalance = allCompletedBookings.reduce((total, booking) => {
      return total + calculateMerchantRevenue(booking);
    }, 0);

    // Restaurant earnings (all time)
    const allCompletedOrders = await Order.find({
      restaurant: { $in: restaurantIds },
      status: 'completed'
    }).lean();

    const totalRestaurantBalance = allCompletedOrders.reduce((total, order) => {
      return total + order.totalAmount; // 100% to vendor (annual service charge model)
    }, 0);

    const totalBalance = totalChargingStationBalance + totalRestaurantBalance;

    // Total Withdrawn = Sum of all completed settlements (covers both bookings and orders)
    const totalWithdrawnResult = await Settlement.aggregate([
      {
        $match: {
          vendor: vendorId,
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

    // Check if settlement is needed for the selected date
    const needsSettlement = date && pendingSettlementForDate > 0;

    // Get settlement info for this date range to show settlement request details
    const settlementInfo = settlementsForThisDate.length > 0 ? {
      hasActiveSettlement: true,
      settlementRequests: settlementsForThisDate.map(settlement => ({
        id: settlement.settlementId,
        requestedAt: settlement.requestedAt,
        status: settlement.status,
        amount: settlement.amount,
        requestType: settlement.requestType
      }))
    } : { hasActiveSettlement: false };

    res.json({
      success: true,
      data: {
        selectedDate: date || new Date().toISOString().split('T')[0],
        dailyStats: {
          totalToBeReceived, // Combined earnings from both sources for the selected date
          chargingStationRevenue, // Breakdown: charging station revenue
          restaurantRevenue, // Breakdown: restaurant revenue
          paymentSettled: settledAmountForDate, // How much from selected date is already settled
          inSettlementProcess: inSettlementAmountForDate, // How much is currently in settlement process
          pendingSettlement: pendingSettlementForDate, // How much from selected date is truly pending
          needsSettlement
        },
        overallStats: {
          totalBalance, // Sum of all completed earnings (charging + restaurant)
          totalChargingStationBalance, // Breakdown: charging station balance
          totalRestaurantBalance, // Breakdown: restaurant balance
          totalWithdrawn, // Money actually transferred to bank account
          pendingWithdrawal // Total Balance - Total Withdrawn
        },
        settlementInfo, // Information about active settlements for this date
        transactions: [
          // Charging station transactions
          ...completedBookings.map(booking => {
            // Determine display settlement status
            let displayStatus = booking.settlementStatus || 'pending';
            if (displayStatus === 'included_in_settlement') {
              const isInActiveSettlement = settlementsForThisDate.some(settlement => 
                settlement.transactionIds.some(id => id.toString() === booking._id.toString())
              );
              if (!isInActiveSettlement) {
                displayStatus = 'settled'; // Settlement was completed
              }
            }

            return {
              type: 'charging',
              bookingId: booking.bookingId,
              orderId: null,
              amount: calculateMerchantRevenue(booking),
              customerName: booking.user?.name || 'Walk-in Customer',
              stationName: booking.chargingStation?.name || 'Unknown Station',
              restaurantName: null,
              completedAt: booking.actualUsage?.actualEndTime || booking.updatedAt,
              status: 'completed',
              settlementStatus: displayStatus,
              transactionDate: booking.updatedAt,
              description: 'EV Charging Session'
            }
          }),
          // Restaurant order transactions
          ...completedOrders.map(order => {
            // Determine display settlement status for orders
            let displayStatus = order.settlementStatus || 'pending';
            if (displayStatus === 'included_in_settlement') {
              const isInActiveSettlement = settlementsForThisDate.some(settlement => 
                settlement.orderIds && settlement.orderIds.some(id => id.toString() === order._id.toString())
              );
              if (!isInActiveSettlement) {
                displayStatus = 'settled';
              }
            }

            return {
              type: 'restaurant',
              bookingId: null,
              orderId: order.orderNumber,
              amount: order.totalAmount, // Vendor's 100% share (annual service charge model)
              customerName: order.customer.name,
              stationName: order.chargingStation?.name || 'Unknown Station',
              restaurantName: order.restaurant?.name || 'Unknown Restaurant',
              completedAt: order.completedAt,
              status: 'completed',
              settlementStatus: displayStatus,
              transactionDate: order.completedAt,
              description: `Restaurant Order (${order.items.length} items)`
            }
          })
        ].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)) // Sort by completion date
      }
    });

  } catch (error) {
    console.error('Transaction analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction analytics',
      error: error.message
    });
  }
};

// @desc    Request urgent settlement
// @route   POST /api/vendor/dashboard/request-settlement
// @access  Private (Vendor)
const requestUrgentSettlement = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { date, amount, reason } = req.body;

    if (!date || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Date and amount are required'
      });
    }

    // Verify the vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check if vendor has bank details
    if (!vendor.bankDetails?.accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please add your bank details before requesting settlement'
      });
    }

    // Verify there are actually unsettled transactions for this date
    // Handle both 'YYYY-MM-DD' and date object formats with UTC
    const inputDate = new Date(date + 'T00:00:00.000Z'); // Force UTC interpretation
    const startDate = new Date(inputDate);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(inputDate);
    endDate.setUTCHours(23, 59, 59, 999);

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

    const chargingStationAmount = completedBookings.reduce((total, booking) => {
      return total + calculateMerchantRevenue(booking);
    }, 0);

    // ============== GET PENDING RESTAURANT ORDERS ==============
    const Order = require('../models/Order');
    
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

    const restaurantAmount = completedOrders.reduce((total, order) => {
      return total + order.totalAmount; // 100% to vendor (annual service charge model)
    }, 0);

    // ============== VALIDATE TOTAL AMOUNT ==============
    const totalCalculatedAmount = chargingStationAmount + restaurantAmount;

    if (completedBookings.length === 0 && completedOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No pending transactions found for the selected date'
      });
    }

    if (Math.abs(totalCalculatedAmount - amount) > 0.01) { // Allow for small floating point differences
      return res.status(400).json({
        success: false,
        message: 'Amount mismatch. Please refresh and try again.',
        details: {
          calculated: totalCalculatedAmount,
          provided: amount,
          breakdown: {
            chargingStation: chargingStationAmount,
            restaurant: restaurantAmount
          }
        }
      });
    }

    // Check if there's already an active settlement for this date range
    const existingSettlement = await Settlement.findOne({
      vendor: vendorId,
      periodStart: { $lte: endDate },
      periodEnd: { $gte: startDate },
      status: { $in: ['pending', 'processing'] }
    });

    if (existingSettlement) {
      return res.status(400).json({
        success: false,
        message: 'There is already an active settlement request for this date range'
      });
    }

    // Create settlement request with clear date tracking
    const settlement = new Settlement({
      vendor: vendorId,
      amount: totalCalculatedAmount,
      settlementDate: new Date(date), // The date for which transactions are being settled
      transactionIds: completedBookings.map(booking => booking._id),
      orderIds: completedOrders.map(order => order._id), // Add order IDs for restaurant orders
      status: 'pending',
      requestType: 'urgent',
      bankDetails: {
        accountNumber: vendor.bankDetails.accountNumber,
        accountHolderName: vendor.bankDetails.accountHolderName,
        bankName: vendor.bankDetails.bankName,
        ifscCode: vendor.bankDetails.ifscCode
      },
      reason: reason || 'Urgent settlement request',
      periodStart: startDate, // Start of transaction period
      periodEnd: endDate, // End of transaction period
      requestedAt: new Date(), // When the settlement was actually requested (today)
      // Add metadata for better tracking
      metadata: {
        transactionDate: date, // The original transaction date
        requestedDate: new Date().toISOString().split('T')[0], // Today's date when request was made
        isUrgentForPastDate: date !== new Date().toISOString().split('T')[0], // Flag if this is for a past date
        breakdown: {
          chargingStationAmount,
          restaurantAmount,
          chargingStationTransactions: completedBookings.length,
          restaurantOrders: completedOrders.length
        }
      }
    });

    await settlement.save();

    // Update booking settlement status with additional tracking
    if (completedBookings.length > 0) {
      await Booking.updateMany(
        { _id: { $in: completedBookings.map(b => b._id) } },
        { 
          settlementStatus: 'included_in_settlement',
          settlementId: settlement._id,
          // Add settlement request tracking
          settlementRequestedAt: new Date(),
          settlementRequestedFor: date // Track which date this settlement was requested for
        }
      );
    }

    // Update order settlement status with additional tracking
    if (completedOrders.length > 0) {
      await Order.updateMany(
        { _id: { $in: completedOrders.map(o => o._id) } },
        { 
          settlementStatus: 'included_in_settlement',
          settlementId: settlement._id,
          // Add settlement request tracking
          settlementRequestedAt: new Date(),
          settlementRequestedFor: date // Track which date this settlement was requested for
        }
      );
    }

    res.json({
      success: true,
      message: 'Settlement request submitted successfully. You will be contacted within 24 hours.',
      data: {
        requestId: settlement.settlementId,
        status: 'pending',
        estimatedProcessingTime: '24 hours',
        amount: totalCalculatedAmount,
        transactionCount: completedBookings.length,
        orderCount: completedOrders.length,
        breakdown: {
          chargingStationRevenue: chargingStationAmount,
          restaurantRevenue: restaurantAmount
        },
        settlementInfo: {
          transactionDate: date,
          requestedOn: new Date().toISOString().split('T')[0],
          isForPastDate: date !== new Date().toISOString().split('T')[0]
        }
      }
    });

  } catch (error) {
    console.error('Settlement request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit settlement request'
    });
  }
};

// @desc    Get settlement history
// @route   GET /api/vendor/dashboard/settlement-history
// @access  Private (Vendor)
const getSettlementHistory = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = { vendor: vendorId };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get settlements with pagination
    const settlements = await Settlement.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Settlement.countDocuments(query);

    res.json({
      success: true,
      data: {
        settlements: settlements.map(settlement => ({
          id: settlement.settlementId,
          date: settlement.settlementDate,
          amount: settlement.amount,
          status: settlement.status,
          requestType: settlement.requestType,
          processedAt: settlement.processedAt,
          requestedAt: settlement.requestedAt,
          reason: settlement.reason,
          transactionCount: settlement.transactionIds?.length || 0,
          paymentReference: settlement.paymentReference
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Settlement history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settlement history'
    });
  }
};

// @desc    Get slot monitoring data
// @route   GET /api/vendor/dashboard/slot-monitoring
// @access  Private (Vendor)
const getSlotMonitoring = async (req, res) => {
  try {
    const vendorId = new mongoose.Types.ObjectId(req.user.id);
    const { status, stationId, timeRange = '24h' } = req.query;

    // Calculate time range
    const now = new Date();
    let startTime;
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build query
    const query = {
      vendor: vendorId,
      'timeSlot.startTime': { $gte: startTime, $lte: now }
    };

    if (status) {
      query.status = status;
    }

    if (stationId) {
      query.chargingStation = new mongoose.Types.ObjectId(stationId);
    }

    // Get bookings with populated data
    const bookings = await Booking.find(query)
      .populate('user', 'name email phoneNumber')
      .populate('chargingStation', 'name address')
      .sort({ 'timeSlot.startTime': -1 })
      .limit(100);

    // Calculate statistics
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const activeBookings = bookings.filter(b => b.status === 'active');
    const expiredBookings = bookings.filter(b => b.status === 'expired');
    const completedBookings = bookings.filter(b => b.status === 'completed');
    
    // Grace period statistics
    const inGracePeriod = confirmedBookings.filter(b => b.isInGracePeriod).length;
    const overdueForCheckin = confirmedBookings.filter(b => b.isOverdueForCheckIn).length;
    const shouldBeExpired = confirmedBookings.filter(b => b.shouldBeExpired).length;

    // No-show rate calculation
    const noShowRate = totalBookings > 0 ? (expiredBookings.length / totalBookings * 100).toFixed(2) : 0;

    // Group by station for station-wise analytics
    const stationStats = {};
    bookings.forEach(booking => {
      const stationId = booking.chargingStation._id.toString();
      const stationName = booking.chargingStation.name;
      
      if (!stationStats[stationId]) {
        stationStats[stationId] = {
          stationName,
          totalBookings: 0,
          expiredBookings: 0,
          completedBookings: 0,
          noShowRate: 0
        };
      }
      
      stationStats[stationId].totalBookings++;
      if (booking.status === 'expired') stationStats[stationId].expiredBookings++;
      if (booking.status === 'completed') stationStats[stationId].completedBookings++;
    });

    // Calculate no-show rate for each station
    Object.keys(stationStats).forEach(stationId => {
      const stats = stationStats[stationId];
      stats.noShowRate = stats.totalBookings > 0 ? 
        (stats.expiredBookings / stats.totalBookings * 100).toFixed(2) : 0;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalBookings,
          confirmedBookings: confirmedBookings.length,
          activeBookings: activeBookings.length,
          expiredBookings: expiredBookings.length,
          completedBookings: completedBookings.length,
          noShowRate: parseFloat(noShowRate),
          timeRange,
          generatedAt: now
        },
        realTimeStatus: {
          inGracePeriod,
          overdueForCheckin,
          shouldBeExpired
        },
        stationStats: Object.values(stationStats),
        recentBookings: bookings.slice(0, 20).map(booking => ({
          bookingId: booking.bookingId,
          status: booking.status,
          user: {
            name: booking.user.name,
            phoneNumber: booking.user.phoneNumber
          },
          station: {
            name: booking.chargingStation.name,
            address: booking.chargingStation.address
          },
          timeSlot: booking.timeSlot,
          slotStatus: booking.slotStatus,
          isInGracePeriod: booking.isInGracePeriod,
          isOverdueForCheckIn: booking.isOverdueForCheckIn,
          graceTimeRemaining: booking.graceTimeRemaining
        }))
      }
    });

  } catch (error) {
    console.error('Slot monitoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get slot monitoring data'
    });
  }
}

// Routes
router.use(protect);
router.use(isVendor);

// Basic routes that don't require subscription check
router.get('/stats', getDashboardStats);
router.get('/onboarding', getOnboardingStatus);
router.put('/profile', updateProfile);
router.post('/upload-profile-picture', upload.single('profilePicture'), optimizedUploadSingleToS3, uploadProfilePicture);
router.put('/notification-preferences', updateNotificationPreferences);
router.get('/transactions', getTransactions);
router.get('/document-url/:documentType', getDocumentUrl);

// Routes that require subscription validation
router.get('/bookings', checkVendorSubscription, getAllBookings);
router.get('/transaction-analytics', checkVendorSubscription, getTransactionAnalytics);
router.post('/request-settlement', checkVendorSubscription, requestUrgentSettlement);
router.get('/settlement-history', checkVendorSubscription, getSettlementHistory);
router.get('/slot-monitoring', checkVendorSubscription, getSlotMonitoring);
router.get('/stations', checkVendorSubscription, getStations);
router.post('/upload-document', checkVendorSubscription, upload.single('document'), (req, res, next) => {
  req.body.folder = 'Documents'; // Ensure documents go to Documents folder
  next();
}, optimizedUploadSingleToS3, uploadDocument);
router.post('/update-document-after-upload', checkVendorSubscription, updateDocumentAfterUpload);
router.delete('/delete-document', checkVendorSubscription, deleteDocument);

module.exports = router;
