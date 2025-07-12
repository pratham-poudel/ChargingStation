const express = require('express');
const ChargingStation = require('../models/ChargingStation');
const { authorizeVendor } = require('../middleware/auth');
const { checkVendorSubscription, checkStationLimit } = require('../middleware/subscriptionCheck');
const { body, param, validationResult } = require('express-validator');
const ConcurrencySafeStationService = require('../services/ConcurrencySafeStationService');

// Import optimized upload service
const { optimizedUploadService } = require('../config/optimized-upload');

const router = express.Router();

// Use optimized multer configuration
const upload = optimizedUploadService.getOptimizedMulterConfig();

// Middleware to parse JSON fields from FormData
const parseFormDataJSON = (req, res, next) => {
  try {
    console.log('=== PARSING FORMDATA ===');
    console.log('Raw body before parsing:', req.body);
    
    // Parse JSON fields that come as strings in FormData
    if (req.body.address && typeof req.body.address === 'string') {
      console.log('Parsing address:', req.body.address);
      req.body.address = JSON.parse(req.body.address);
      console.log('Parsed address:', req.body.address);
    }
    if (req.body.location && typeof req.body.location === 'string') {
      console.log('Parsing location:', req.body.location);
      req.body.location = JSON.parse(req.body.location);
      console.log('Parsed location:', req.body.location);
    }
    if (req.body.stationMaster && typeof req.body.stationMaster === 'string') {
      console.log('Parsing stationMaster:', req.body.stationMaster);
      req.body.stationMaster = JSON.parse(req.body.stationMaster);
      console.log('Parsed stationMaster:', req.body.stationMaster);
    }
    if (req.body.operatingHours && typeof req.body.operatingHours === 'string') {
      console.log('Parsing operatingHours:', req.body.operatingHours);
      req.body.operatingHours = JSON.parse(req.body.operatingHours);
      console.log('Parsed operatingHours:', req.body.operatingHours);
    }
    if (req.body.chargingPorts && typeof req.body.chargingPorts === 'string') {
      console.log('Parsing chargingPorts:', req.body.chargingPorts);
      req.body.chargingPorts = JSON.parse(req.body.chargingPorts);
      console.log('Parsed chargingPorts:', req.body.chargingPorts);
    }
    if (req.body.amenities && typeof req.body.amenities === 'string') {
      console.log('Parsing amenities:', req.body.amenities);
      req.body.amenities = JSON.parse(req.body.amenities);
      console.log('Parsed amenities:', req.body.amenities);
    }
    
    console.log('Final parsed body:', JSON.stringify(req.body, null, 2));
    next();
  } catch (error) {
    console.error('JSON parsing error:', error);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request data',
      error: error.message
    });
  }
};

// Validation middleware
const stationValidation = [
  body('name')
    .notEmpty()
    .withMessage('Station name is required')
    .isLength({ max: 100 })
    .withMessage('Station name cannot exceed 100 characters'),
  body('address.street')
    .notEmpty()
    .withMessage('Street address is required'),
  body('address.city')
    .notEmpty()
    .withMessage('City is required'),
  body('address.state')
    .notEmpty()
    .withMessage('State is required'),
  body('address.pincode')
    .matches(/^[0-9]{6}$/)
    .withMessage('Please enter a valid 6-digit pincode'),  body('location.coordinates')
    .custom((coordinates) => {
      if (!Array.isArray(coordinates)) {
        throw new Error('Coordinates must be an array');
      }
      if (coordinates.length !== 2) {
        throw new Error('Coordinates must have exactly 2 elements [longitude, latitude]');
      }
      const [lng, lat] = coordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new Error('Longitude and latitude must be numbers');
      }
      if (lng < -180 || lng > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      if (lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      return true;
    }),
  body('stationMaster.name')
    .notEmpty()
    .withMessage('Station master name is required')
    .isLength({ max: 100 })
    .withMessage('Station master name cannot exceed 100 characters'),
  body('stationMaster.phoneNumber')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please enter a valid 10-digit phone number'),
];

const chargingPortValidation = [
  body('chargingPorts.*.portNumber')
    .notEmpty()
    .withMessage('Port number is required'),
  body('chargingPorts.*.connectorType')
    .isIn(['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Tesla', 'CCS2'])
    .withMessage('Invalid connector type'),
  body('chargingPorts.*.powerOutput')
    .isFloat({ min: 1 })
    .withMessage('Power output must be at least 1 kW'),
  body('chargingPorts.*.chargingType')
    .isIn(['slow', 'fast', 'rapid'])
    .withMessage('Invalid charging type'),
  body('chargingPorts.*.pricePerUnit')
    .isFloat({ min: 0 })
    .withMessage('Price per unit must be non-negative'),
];

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

// @desc    Get all stations for authenticated vendor
// @route   GET /api/vendor/stations
// @access  Private (Vendor)
router.get('/', authorizeVendor, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    
    let query = { vendor: req.vendor.id };
    
    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'verified') {
      query.isVerified = true;
    } else if (status === 'unverified') {
      query.isVerified = false;
    }

    const stations = await ChargingStation.find(query)
      .populate('vendor', 'name businessName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await ChargingStation.countDocuments(query);

    res.json({
      success: true,
      data: {
        stations,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get vendor stations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stations'
    });
  }
});

// @desc    Get single station by ID for authenticated vendor
// @route   GET /api/vendor/stations/:id
// @access  Private (Vendor)
router.get('/:id', authorizeVendor, param('id').isMongoId(), async (req, res) => {
  try {
    const station = await ChargingStation.findOne({
      _id: req.params.id,
      vendor: req.vendor.id
    }).populate('vendor', 'name businessName email phoneNumber');

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    res.json({
      success: true,
      data: station
    });
  } catch (error) {
    console.error('Get station error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch station'
    });
  }
});

// @desc    Create new charging station
// @route   POST /api/vendor/stations
// @access  Private (Vendor)
router.post('/', 
  authorizeVendor,
  checkVendorSubscription,
  checkStationLimit,
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'stationMasterPhoto', maxCount: 1 }
  ]),
  parseFormDataJSON, // Parse JSON fields before validation
  [...stationValidation, ...chargingPortValidation],
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log('=== CREATE STATION DEBUG ===');
      console.log('Body keys:', Object.keys(req.body));
      console.log('Files:', req.files ? Object.keys(req.files) : 'No files');
      console.log('Parsed stationMaster:', req.body.stationMaster);
      
      const stationData = {
        ...req.body,
        vendor: req.vendor.id
      };      // Handle station images - Check for pre-uploaded images first
      if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
        console.log('📤 Using pre-uploaded station images:', req.body.images.length, 'images');
        console.log('📋 Pre-uploaded images data:', req.body.images.map(img => ({ 
          url: img?.url, 
          objectName: img?.objectName, 
          originalName: img?.originalName 
        })));
        
        // Images are already uploaded via optimized API, just use the URLs
        const images = req.body.images.map((img, index) => ({
          url: img?.url,
          objectName: img?.objectName,
          originalName: img?.originalName || img?.fileName,
          isPrimary: index === 0, // First image as primary
          isThumbnail: index === 0, // First image as thumbnail  
          uploadedAt: img?.uploadedAt ? new Date(img.uploadedAt) : new Date()
        }));
        
        stationData.images = images;
        console.log('✅ Set pre-uploaded station images in station data:', images.length, 'images');
        
      } else if (req.files && req.files.images && req.files.images.length > 0) {
        // Fallback: Handle station images via file upload (legacy approach)
        console.log('Uploading station images to MinIO via files...');
        const images = [];
        
        for (let i = 0; i < req.files.images.length; i++) {
          const file = req.files.images[i];
          try {
            // Use optimized streaming upload
            let fileStream;
            if (file.buffer) {
              fileStream = optimizedUploadService.bufferToStream(file.buffer);
            } else if (file.path) {
              fileStream = require('fs').createReadStream(file.path);
            }

            const uploadResult = await optimizedUploadService.uploadFileStream(
              fileStream,
              file.originalname,
              'Images',
              file.mimetype,
              file.size
            );
            
            images.push({
              url: uploadResult.url,
              objectName: uploadResult.objectName,
              originalName: uploadResult.originalName,
              isPrimary: i === 0, // First image as primary
              isThumbnail: i === 0, // First image as thumbnail
              uploadedAt: new Date()
            });
            
            console.log(`✅ Uploaded station image ${i + 1} via streaming:`, uploadResult.objectName);
          } catch (uploadError) {
            console.error(`❌ Error uploading station image ${i + 1}:`, uploadError);
            // Continue with other images
          }
        }
        
        if (images.length > 0) {
          stationData.images = images;
        }
      }

      // Handle station master photo
      if (req.files && req.files.stationMasterPhoto && req.files.stationMasterPhoto.length > 0) {
        console.log('Uploading station master photo to MinIO...');
        const photoFile = req.files.stationMasterPhoto[0];
        
        try {
          // Use optimized streaming upload for station master photo
          let fileStream;
          if (photoFile.buffer) {
            fileStream = optimizedUploadService.bufferToStream(photoFile.buffer);
          } else if (photoFile.path) {
            fileStream = require('fs').createReadStream(photoFile.path);
          }

          const uploadResult = await optimizedUploadService.uploadFileStream(
            fileStream,
            photoFile.originalname,
            'Profiles',
            photoFile.mimetype,
            photoFile.size
          );
          
          if (!stationData.stationMaster) {
            stationData.stationMaster = {};
          }
          stationData.stationMaster.photo = {
            url: uploadResult.url,
            objectName: uploadResult.objectName,
            originalName: uploadResult.originalName,
            uploadedAt: new Date()
          };
          
          console.log('✅ Uploaded station master photo:', uploadResult.objectName);
        } catch (uploadError) {
          console.error('❌ Error uploading station master photo:', uploadError);
          // Continue without photo
        }
      }

      // Handle station master photo URL (when photo is uploaded separately)
      if (req.body.stationMasterPhotoUrl && !req.files?.stationMasterPhoto) {
        console.log('Setting station master photo URL:', req.body.stationMasterPhotoUrl);
        
        if (!stationData.stationMaster) {
          stationData.stationMaster = {};
        }
        
        // Extract object name from URL for consistency
        const urlParts = req.body.stationMasterPhotoUrl.split('/');
        const objectName = urlParts.slice(-2).join('/'); // Get "Profiles/filename"
        
        stationData.stationMaster.photo = {
          url: req.body.stationMasterPhotoUrl,
          objectName: objectName,
          originalName: objectName.split('/').pop(), // Get just the filename
          uploadedAt: new Date()
        };
        
        console.log('✅ Set station master photo URL in station data');
      }

      // Create station using concurrency-safe service
      let station;
      
      if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
        // Use pre-uploaded images with atomic transaction
        console.log('🔄 Creating station with pre-uploaded images using atomic transaction...');
        station = await ConcurrencySafeStationService.handlePreUploadedImages(
          null, // null for new station
          stationData, 
          req.body.images, 
          req.vendor.id
        );
      } else {
        // Handle legacy file uploads or no images
        const images = stationData.images || [];
        station = await ConcurrencySafeStationService.createStationWithImages(
          stationData, 
          images, 
          req.vendor.id
        );
      }

      await station.populate('vendor', 'name businessName');

      res.status(201).json({
        success: true,
        message: 'Station created successfully',
        data: station
      });
    } catch (error) {
      console.error('Create station error:', error);
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create station'
      });
    }
  }
);

// @desc    Update charging station
// @route   PUT /api/vendor/stations/:id
// @access  Private (Vendor)
router.put('/:id',
  authorizeVendor,
  checkVendorSubscription,
  upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'stationMasterPhoto', maxCount: 1 }
  ]),
  parseFormDataJSON, // Parse JSON fields before validation
  param('id').isMongoId(),
  [...stationValidation, ...chargingPortValidation],
  handleValidationErrors,
  async (req, res) => {
    try {
      const station = await ChargingStation.findOne({
        _id: req.params.id,
        vendor: req.vendor.id
      });

      if (!station) {
        return res.status(404).json({
          success: false,
          message: 'Station not found'
        });
      }      // Since parseFormDataJSON middleware already parsed JSON fields, 
      // we can use the data directly
      const updateData = { ...req.body };
        // Convert string numbers to actual numbers
      if (updateData.totalSlots) updateData.totalSlots = parseInt(updateData.totalSlots);
      if (updateData.availableSlots) updateData.availableSlots = parseInt(updateData.availableSlots);
      if (updateData.pricePerHour) updateData.pricePerHour = parseFloat(updateData.pricePerHour);
      if (updateData.isActive) updateData.isActive = updateData.isActive === 'true';
      
      // Handle existingImages if it's still a JSON string
      if (updateData.existingImages && typeof updateData.existingImages === 'string') {
        try {
          updateData.existingImages = JSON.parse(updateData.existingImages);
        } catch (e) {
          console.log('Error parsing existingImages:', e);
          delete updateData.existingImages;
        }
      }

      // Update station data
      Object.assign(station, updateData);      // Handle existingImages - replace station.images with the filtered list
      if (updateData.existingImages && Array.isArray(updateData.existingImages)) {
        // Filter existing images to keep only those in the existingImages array
        station.images = station.images.filter(img => 
          updateData.existingImages.includes(img?.url)
        );
      }

      // Handle new images - Check for pre-uploaded images first
      if (updateData.newImages && Array.isArray(updateData.newImages) && updateData.newImages.length > 0) {
        console.log('Using pre-uploaded new station images:', updateData.newImages.length, 'images');
        
        // New images are already uploaded via optimized API, just add them to station
        const newImages = updateData.newImages.map((img, index) => ({
          url: img?.url,
          objectName: img?.objectName,
          originalName: img?.originalName || img?.fileName,
          isPrimary: station.images.length === 0 && index === 0, // First image as primary if no existing images
          isThumbnail: station.images.length === 0 && index === 0, // First image as thumbnail if no existing images
          uploadedAt: img?.uploadedAt ? new Date(img.uploadedAt) : new Date()
        }));
        
        station.images.push(...newImages);
        console.log('✅ Added pre-uploaded new station images');
        
      } else if (req.files && req.files.images && req.files.images.length > 0) {
        // Fallback: Handle new image uploads with actual MinIO upload (legacy approach)
        console.log('Uploading new station images to MinIO via files...');
        const newImages = [];
        
        for (let i = 0; i < req.files.images.length; i++) {
          const file = req.files.images[i];
          try {
            // Use optimized streaming upload
            let fileStream;
            if (file.buffer) {
              fileStream = optimizedUploadService.bufferToStream(file.buffer);
            } else if (file.path) {
              fileStream = require('fs').createReadStream(file.path);
            }

            const uploadResult = await optimizedUploadService.uploadFileStream(
              fileStream,
              file.originalname,
              'Images',
              file.mimetype,
              file.size
            );
            
            newImages.push({
              url: uploadResult.url,
              objectName: uploadResult.objectName,
              originalName: uploadResult.originalName,
              isPrimary: station.images.length === 0 && i === 0, // First image as primary if no existing images
              isThumbnail: station.images.length === 0 && i === 0, // First image as thumbnail if no existing images
              uploadedAt: new Date()
            });
            
            console.log(`✅ Uploaded station image ${i + 1} via streaming:`, uploadResult.objectName);
          } catch (uploadError) {
            console.error(`❌ Error uploading station image ${i + 1}:`, uploadError);
            // Continue with other images
          }
        }
        
        if (newImages.length > 0) {
          station.images.push(...newImages);
        }
      }

      // Handle station master photo update with actual MinIO upload
      if (req.files && req.files.stationMasterPhoto && req.files.stationMasterPhoto.length > 0) {
        console.log('Uploading station master photo to MinIO...');
        const photoFile = req.files.stationMasterPhoto[0];
        
        try {
          // Use optimized streaming upload for station master photo
          let fileStream;
          if (photoFile.buffer) {
            fileStream = optimizedUploadService.bufferToStream(photoFile.buffer);
          } else if (photoFile.path) {
            fileStream = require('fs').createReadStream(photoFile.path);
          }

          const uploadResult = await optimizedUploadService.uploadFileStream(
            fileStream,
            photoFile.originalname,
            'Profiles',
            photoFile.mimetype,
            photoFile.size
          );
          
          if (!station.stationMaster) {
            station.stationMaster = {};
          }
          station.stationMaster.photo = {
            url: uploadResult.url,
            objectName: uploadResult.objectName,
            originalName: uploadResult.originalName,
            uploadedAt: new Date()
          };
          
          console.log('✅ Uploaded station master photo:', uploadResult.objectName);
        } catch (uploadError) {
          console.error('❌ Error uploading station master photo:', uploadError);
          // Continue without photo update
        }
      }

      // Handle station master photo URL update (when photo is uploaded separately)
      if (req.body.stationMasterPhotoUrl && !req.files?.stationMasterPhoto) {
        console.log('Updating station master photo URL:', req.body.stationMasterPhotoUrl);
        
        if (!station.stationMaster) {
          station.stationMaster = {};
        }
        
        // Extract object name from URL for consistency
        const urlParts = req.body.stationMasterPhotoUrl.split('/');
        const objectName = urlParts.slice(-2).join('/'); // Get "Profiles/filename"
        
        station.stationMaster.photo = {
          url: req.body.stationMasterPhotoUrl,
          objectName: objectName,
          originalName: objectName.split('/').pop(), // Get just the filename
          uploadedAt: new Date()
        };
        
        console.log('✅ Updated station master photo URL in database');
      }

      await station.save();
      await station.populate('vendor', 'name businessName');

      res.json({
        success: true,
        message: 'Station updated successfully',
        data: station
      });
    } catch (error) {
      console.error('Update station error:', error);
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update station'
      });
    }
  }
);

// @desc    Delete charging station image
// @route   DELETE /api/vendor/stations/:id/images/:imageId
// @access  Private (Vendor)
router.delete('/:id/images/:imageId', authorizeVendor, async (req, res) => {
  try {
    const station = await ChargingStation.findOne({
      _id: req.params.id,
      vendor: req.vendor.id
    });

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    const imageIndex = station.images.findIndex(
      img => img._id.toString() === req.params.imageId
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const image = station.images[imageIndex];    // Delete from storage (simplified for now)
    if (image.objectName) {
      try {
        console.log('Would delete image from storage:', image.objectName);
        // Actual deletion would go here when MinIO is properly integrated
      } catch (deleteError) {
        console.error('Failed to delete image from storage:', deleteError);
      }
    }

    // Remove from array
    station.images.splice(imageIndex, 1);
    await station.save();

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image'
    });
  }
});

// @desc    Update image properties (primary, thumbnail, caption)
// @route   PATCH /api/vendor/stations/:id/images/:imageId
// @access  Private (Vendor)
router.patch('/:id/images/:imageId', authorizeVendor, async (req, res) => {
  try {
    const { isPrimary, isThumbnail, caption } = req.body;
    
    const station = await ChargingStation.findOne({
      _id: req.params.id,
      vendor: req.vendor.id
    });

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    const image = station.images.find(
      img => img._id.toString() === req.params.imageId
    );

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Update image properties
    if (isPrimary !== undefined) {
      if (isPrimary) {
        // Remove primary flag from other images
        station.images.forEach(img => {
          img.isPrimary = img._id.toString() === req.params.imageId;
        });
      } else {
        image.isPrimary = false;
      }
    }

    if (isThumbnail !== undefined) {
      if (isThumbnail) {
        // Remove thumbnail flag from other images
        station.images.forEach(img => {
          img.isThumbnail = img._id.toString() === req.params.imageId;
        });
      } else {
        image.isThumbnail = false;
      }
    }

    if (caption !== undefined) {
      image.caption = caption;
    }

    await station.save();

    res.json({
      success: true,
      message: 'Image updated successfully',
      data: image
    });
  } catch (error) {
    console.error('Update image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update image'
    });
  }
});

// @desc    Toggle station active status
// @route   PATCH /api/vendor/stations/:id/status
// @access  Private (Vendor)
router.patch('/:id/status', authorizeVendor, async (req, res) => {
  try {
    const station = await ChargingStation.findOne({
      _id: req.params.id,
      vendor: req.vendor.id
    });

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    station.isActive = !station.isActive;
    await station.save();

    res.json({
      success: true,
      message: `Station ${station.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: station.isActive }
    });
  } catch (error) {
    console.error('Toggle station status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update station status'
    });
  }
});

// @desc    Get station analytics
// @route   GET /api/vendor/stations/:id/analytics
// @access  Private (Vendor)
router.get('/:id/analytics', authorizeVendor, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const station = await ChargingStation.findOne({
      _id: req.params.id,
      vendor: req.vendor.id
    });

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    // Calculate date range based on period
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get bookings for this station
    const Booking = require('../models/Booking');
    const bookings = await Booking.find({
      station: req.params.id,
      createdAt: { $gte: startDate }
    });

    // Calculate analytics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const totalRevenue = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    const averageSessionTime = bookings
      .filter(b => b.status === 'completed' && b.actualEndTime && b.actualStartTime)
      .reduce((sum, b, _, arr) => {
        const duration = (new Date(b.actualEndTime) - new Date(b.actualStartTime)) / (1000 * 60); // minutes
        return sum + duration / arr.length;
      }, 0);

    res.json({
      success: true,
      data: {
        period,
        totalBookings,
        completedBookings,
        totalRevenue,
        averageSessionTime: Math.round(averageSessionTime),
        conversionRate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
        station: {
          name: station.name,
          totalPorts: station.totalPorts,
          availablePorts: station.availablePorts,
          rating: station.rating
        }
      }
    });
  } catch (error) {
    console.error('Get station analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch station analytics'
    });
  }
});

module.exports = router;
