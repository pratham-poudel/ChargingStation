const fs = require('fs');
const path = require('path');
const { optimizedUploadService } = require('../config/optimized-upload');

/**
 * Optimized upload middleware using streaming to reduce RAM usage
 */
const optimizedUploadToS3 = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const folder = req.params.folder || req.body.folder || 'Uploads';
    const uploadedFiles = [];
    const tempFilesToCleanup = [];

    // Process each file using streaming upload
    for (const file of req.files) {
      try {
        let fileStream;
        let fileSize = file.size;

        // If file is stored in memory (fallback), convert buffer to stream
        if (file.buffer) {
          fileStream = optimizedUploadService.bufferToStream(file.buffer);
        } 
        // If file is stored on disk (preferred), create read stream
        else if (file.path) {
          fileStream = fs.createReadStream(file.path);
          tempFilesToCleanup.push(file.path);
          
          // Get file size from disk
          const stats = fs.statSync(file.path);
          fileSize = stats.size;
        } else {
          throw new Error('No file data available');
        }

        // Upload using streaming approach
        const result = await optimizedUploadService.uploadFileStream(
          fileStream,
          file.originalname,
          folder,
          file.mimetype,
          fileSize
        );
        
        uploadedFiles.push({
          ...result,
          fieldName: file.fieldname,
          mimetype: file.mimetype
        });

      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        // Continue with other files, but log the error
      }
    }

    // Clean up temporary files
    for (const tempFile of tempFilesToCleanup) {
      await optimizedUploadService.cleanupTempFile(tempFile);
    }

    if (uploadedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload any files'
      });
    }

    // Attach uploaded files info to request for further processing
    req.uploadedFiles = uploadedFiles;
    next();
  } catch (error) {
    console.error('Optimized upload middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Optimized single file upload middleware
 */
const optimizedUploadSingleToS3 = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const folder = req.params.folder || req.body.folder || 'Uploads';
    let fileStream;
    let fileSize = req.file.size;
    let tempFileToCleanup = null;

    // Create appropriate stream based on storage type
    if (req.file.buffer) {
      fileStream = optimizedUploadService.bufferToStream(req.file.buffer);
    } else if (req.file.path) {
      fileStream = fs.createReadStream(req.file.path);
      tempFileToCleanup = req.file.path;
      
      const stats = fs.statSync(req.file.path);
      fileSize = stats.size;
    } else {
      throw new Error('No file data available');
    }

    // Upload using streaming approach
    const result = await optimizedUploadService.uploadFileStream(
      fileStream,
      req.file.originalname,
      folder,
      req.file.mimetype,
      fileSize
    );

    // Clean up temporary file if exists
    if (tempFileToCleanup) {
      await optimizedUploadService.cleanupTempFile(tempFileToCleanup);
    }

    // Attach uploaded file info to request
    req.uploadedFile = {
      ...result,
      fieldName: req.file.fieldname,
      mimetype: req.file.mimetype
    };

    next();
  } catch (error) {
    console.error('Optimized single upload middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Middleware to generate presigned URLs for direct client uploads
 * This completely bypasses server RAM usage
 */
const generatePresignedUploadUrl = async (req, res, next) => {
  try {
    const { fileName, folder, contentType } = req.body;
    
    if (!fileName || !folder || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'fileName, folder, and contentType are required'
      });
    }

    const result = await optimizedUploadService.generatePresignedUploadUrl(
      fileName,
      folder,
      contentType,
      req.body.expiresIn || 3600 // Default 1 hour
    );

    res.json({
      success: true,
      message: 'Presigned URL generated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate presigned URL',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Enhanced rate limiting middleware for uploads
 */
const uploadRateLimit = (maxUploads = 5, windowMs = 60000) => {
  const uploadCounts = new Map();
  
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean up old entries
    for (const [ip, data] of uploadCounts.entries()) {
      if (now - data.firstRequest > windowMs) {
        uploadCounts.delete(ip);
      }
    }
    
    // Check current client
    const clientData = uploadCounts.get(clientIP);
    
    if (!clientData) {
      uploadCounts.set(clientIP, { count: 1, firstRequest: now });
      next();
    } else if (clientData.count < maxUploads) {
      clientData.count++;
      next();
    } else {
      res.status(429).json({
        success: false,
        message: `Upload rate limit exceeded. Max ${maxUploads} uploads per ${windowMs/1000} seconds.`,
        retryAfter: Math.ceil((clientData.firstRequest + windowMs - now) / 1000)
      });
    }
  };
};

/**
 * Memory usage monitoring middleware
 */
const memoryMonitor = (req, res, next) => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  console.log(`📊 Memory Usage: RSS: ${memUsageMB.rss}MB, Heap: ${memUsageMB.heapUsed}/${memUsageMB.heapTotal}MB`);
  
  // Warning if memory usage is high
  if (memUsageMB.heapUsed > 500) { // 500MB threshold
    console.warn(`⚠️ High memory usage detected: ${memUsageMB.heapUsed}MB`);
  }
  
  req.memoryUsage = memUsageMB;
  next();
};

module.exports = {
  optimizedUploadToS3,
  optimizedUploadSingleToS3,
  generatePresignedUploadUrl,
  uploadRateLimit,
  memoryMonitor
};
