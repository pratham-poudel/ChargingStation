const express = require('express');
const { generateFreshUrl, fileExists, getFileStream } = require('../config/minio');
const ChargingStation = require('../models/ChargingStation');

const router = express.Router();

// @desc    Migrate existing URLs to new format (Admin only)
// @route   POST /api/files/migrate-urls
// @access  Private (Admin)
router.post('/migrate-urls', async (req, res) => {
  try {
    // Check for admin authentication - either admin key or JWT token
    const { adminKey } = req.body;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    let isAuthorized = false;
    
    // Method 1: Check admin key
    if (adminKey && adminKey === process.env.ADMIN_MIGRATION_KEY) {
      isAuthorized = true;
    }
    
    // Method 2: Check JWT token for admin
    if (!isAuthorized && token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type === 'admin') {
          isAuthorized = true;
        }
      } catch (jwtError) {
        console.log('JWT verification failed:', jwtError.message);
      }
    }
    
    // Method 3: Check if adminKey is actually a JWT token
    if (!isAuthorized && adminKey) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(adminKey, process.env.JWT_SECRET);
        if (decoded.type === 'admin') {
          isAuthorized = true;
        }
      } catch (jwtError) {
        console.log('AdminKey JWT verification failed:', jwtError.message);
      }
    }
    
    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Admin access required'
      });
    }

    const stations = await ChargingStation.find({});
    let updated = 0;
    let errors = 0;

    for (const station of stations) {
      try {
        let stationUpdated = false;

        // Update station images URLs
        for (const image of station.images) {
          if (image.objectName && image.url && image.url.includes('X-Amz-Signature')) {
            // This is an old presigned URL, update it
            const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
            image.url = `${backendUrl}/api/files/${image.objectName}`;
            stationUpdated = true;
          }
        }

        // Update station master photo URL
        if (station.stationMaster && station.stationMaster.photo && 
            station.stationMaster.photo.objectName && 
            station.stationMaster.photo.url && 
            station.stationMaster.photo.url.includes('X-Amz-Signature')) {
          const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
          station.stationMaster.photo.url = `${backendUrl}/api/files/${station.stationMaster.photo.objectName}`;
          stationUpdated = true;
        }

        if (stationUpdated) {
          await station.save();
          updated++;
        }
      } catch (stationError) {
        console.error(`Error updating station ${station._id}:`, stationError);
        errors++;
      }
    }

    res.json({
      success: true,
      message: 'URL migration completed',
      data: {
        totalStations: stations.length,
        stationsUpdated: updated,
        errors: errors
      }
    });

  } catch (error) {
    console.error('URL migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to migrate URLs'
    });
  }
});

// @desc    Get file metadata
// @route   GET /api/files/info/*
// @access  Public
router.get('/info/*', async (req, res) => {
  try {
    const objectName = req.params[0]; // This captures everything after /api/files/info/
    
    if (!objectName) {
      return res.status(400).json({
        success: false,
        message: 'Object name is required'
      });
    }

    // Check if file exists and get metadata
    const exists = await fileExists(objectName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Get file metadata
    const { getFileMetadata } = require('../config/minio');
    const metadata = await getFileMetadata(objectName);
    
    res.json({
      success: true,
      data: {
        objectName,
        ...metadata,
        // Generate a fresh URL for immediate use
        url: await generateFreshUrl(objectName, 3600)
      }
    });
    
  } catch (error) {
    console.error('File metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file information'
    });
  }
});

// @desc    Check if specific files exist
// @route   GET /api/files/check/:objectName
// @access  Public
router.get('/check/:objectName(*)', async (req, res) => {
  try {
    const objectName = req.params.objectName;
    
    const exists = await fileExists(objectName);
    const metadata = exists ? await getFileMetadata(objectName) : null;
    
    res.json({
      success: true,
      exists,
      objectName,
      metadata: metadata ? {
        size: metadata.size,
        contentType: metadata.contentType,
        lastModified: metadata.lastModified
      } : null
    });
  } catch (error) {
    console.error('File check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check file',
      error: error.message
    });
  }
});

// @desc    Handle CORS preflight for file requests
// @route   OPTIONS /api/files/*
// @access  Public
router.options('/*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'Access-Control-Max-Age': '86400' // 24 hours
  });
  res.status(200).end();
});

// @desc    Serve file by proxying content (avoiding CORS issues)
// @route   GET /api/files/*
// @access  Public (but requires valid object name)
router.get('/*', async (req, res) => {
  // Set CORS headers first, before any processing
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  });

  try {
    // Extract object name from URL path
    const objectName = req.params[0]; // This captures everything after /api/files/
    
    if (!objectName) {
      return res.status(400).json({
        success: false,
        message: 'Object name is required'
      });
    }

    // Check if file exists
    const exists = await fileExists(objectName);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Get file metadata for proper headers
    const { getFileMetadata } = require('../config/minio');
    const metadata = await getFileMetadata(objectName);
    
    // Get the file stream using AWS S3 SDK
    const fileStream = await getFileStream(objectName);
    
    // Set appropriate headers
    res.set({
      'Content-Type': metadata.contentType || 'application/octet-stream',
      'Content-Length': metadata.size,
      'Cache-Control': 'public, max-age=31536000', // 1 year cache
      'Last-Modified': metadata.lastModified,
      'ETag': metadata.etag
    });

    // Stream the file to response
    if (fileStream.pipe) {
      // If it's a readable stream, pipe it directly
      fileStream.pipe(res);
    } else {
      // If it's a ReadableStream (from AWS SDK v3), convert to buffer
      const chunks = [];
      const reader = fileStream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const fileBuffer = Buffer.concat(chunks);
        res.send(fileBuffer);
      } finally {
        reader.releaseLock();
      }
    }
    
  } catch (error) {
    console.error('File serving error:', error);
    
    if (error.code === 'NotFound' || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to serve file'
      });
    }
  }
});

module.exports = router; 