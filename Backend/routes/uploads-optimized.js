const express = require('express');
const router = express.Router();
const { optimizedUploadService } = require('../config/optimized-upload');
const { 
  optimizedUploadToS3, 
  optimizedUploadSingleToS3,
  generatePresignedUploadUrl,
  uploadRateLimit,
  memoryMonitor
} = require('../middleware/optimized-upload');
const { protect } = require('../middleware/auth');

// Get optimized multer configuration
const upload = optimizedUploadService.getOptimizedMulterConfig();

/**
 * @route   POST /api/uploads-optimized/presigned
 * @desc    Generate presigned URL for direct client upload (NO SERVER RAM USAGE)
 * @access  Private
 */
router.post('/presigned',
  protect,
  uploadRateLimit(10, 60000), // 10 requests per minute
  generatePresignedUploadUrl
);

/**
 * @route   POST /api/uploads-optimized/:folder/single-stream
 * @desc    Upload single file using streaming (REDUCED RAM USAGE)
 * @access  Private
 */
router.post('/:folder/single-stream', 
  protect,
  memoryMonitor,
  uploadRateLimit(5, 60000), // 5 uploads per minute
  upload.single('file'),
  optimizedUploadSingleToS3,
  (req, res) => {
    try {
      res.json({
        success: true,
        message: 'File uploaded successfully using streaming',
        file: req.uploadedFile,
        memoryUsage: req.memoryUsage
      });
    } catch (error) {
      console.error('Error in optimized single upload route:', error);
      res.status(500).json({
        success: false,
        message: 'Upload failed'
      });
    }
  }
);

/**
 * @route   POST /api/uploads-optimized/:folder/multiple-stream
 * @desc    Upload multiple files using streaming (REDUCED RAM USAGE)
 * @access  Private
 */
router.post('/:folder/multiple-stream',
  protect,
  memoryMonitor,
  uploadRateLimit(3, 60000), // 3 multi-uploads per minute
  upload.array('files', 10), // Maximum 10 files
  optimizedUploadToS3,
  (req, res) => {
    try {
      res.json({
        success: true,
        message: `${req.uploadedFiles.length} files uploaded successfully using streaming`,
        files: req.uploadedFiles,
        memoryUsage: req.memoryUsage
      });
    } catch (error) {
      console.error('Error in optimized multiple upload route:', error);
      res.status(500).json({
        success: false,
        message: 'Upload failed'
      });
    }
  }
);

/**
 * @route   POST /api/uploads-optimized/profile-stream
 * @desc    Upload profile picture using streaming
 * @access  Private
 */
router.post('/profile-stream',
  protect,
  memoryMonitor,
  uploadRateLimit(5, 60000),
  upload.single('profile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No profile image uploaded'
        });
      }

      let fileStream;
      let tempFileToCleanup = null;

      if (req.file.buffer) {
        fileStream = optimizedUploadService.bufferToStream(req.file.buffer);
      } else if (req.file.path) {
        fileStream = require('fs').createReadStream(req.file.path);
        tempFileToCleanup = req.file.path;
      }

      const result = await optimizedUploadService.uploadFileStream(
        fileStream,
        req.file.originalname,
        'Profiles',
        req.file.mimetype,
        req.file.size
      );

      if (tempFileToCleanup) {
        await optimizedUploadService.cleanupTempFile(tempFileToCleanup);
      }

      res.json({
        success: true,
        message: 'Profile image uploaded successfully using streaming',
        file: {
          ...result,
          fieldName: req.file.fieldname,
          mimetype: req.file.mimetype
        },
        memoryUsage: req.memoryUsage
      });
    } catch (error) {
      console.error('Error uploading profile image with streaming:', error);
      res.status(500).json({
        success: false,
        message: 'Profile image upload failed'
      });
    }
  }
);

/**
 * @route   POST /api/uploads-optimized/station-images-stream
 * @desc    Upload multiple station images using streaming
 * @access  Private
 */
router.post('/station-images-stream',
  protect,
  memoryMonitor,
  uploadRateLimit(2, 60000), // 2 station image uploads per minute
  upload.array('images', 15), // Maximum 15 images with streaming
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No images uploaded'
        });
      }

      const uploadedImages = [];
      const tempFilesToCleanup = [];

      for (const file of req.files) {
        try {
          let fileStream;
          
          if (file.buffer) {
            fileStream = optimizedUploadService.bufferToStream(file.buffer);
          } else if (file.path) {
            fileStream = require('fs').createReadStream(file.path);
            tempFilesToCleanup.push(file.path);
          }

          const result = await optimizedUploadService.uploadFileStream(
            fileStream,
            file.originalname,
            'Images',
            file.mimetype,
            file.size
          );
          
          uploadedImages.push({
            ...result,
            fieldName: file.fieldname,
            mimetype: file.mimetype
          });
        } catch (uploadError) {
          console.error('Error uploading station image:', uploadError);
        }
      }

      // Clean up temp files
      for (const tempFile of tempFilesToCleanup) {
        await optimizedUploadService.cleanupTempFile(tempFile);
      }

      if (uploadedImages.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload any images'
        });
      }

      res.json({
        success: true,
        message: `${uploadedImages.length} images uploaded successfully using streaming`,
        images: uploadedImages,
        memoryUsage: req.memoryUsage
      });
    } catch (error) {
      console.error('Error uploading station images with streaming:', error);
      res.status(500).json({
        success: false,
        message: 'Station images upload failed'
      });
    }
  }
);

/**
 * @route   GET /api/uploads-optimized/memory-status
 * @desc    Get current server memory usage
 * @access  Private (Admin)
 */
router.get('/memory-status',
  protect,
  memoryMonitor,
  (req, res) => {
    try {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      res.json({
        success: true,
        data: {
          memoryUsage: req.memoryUsage,
          rawMemoryUsage: memUsage,
          uptime: {
            seconds: uptime,
            formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
          },
          nodeVersion: process.version,
          platform: process.platform
        }
      });
    } catch (error) {
      console.error('Error getting memory status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get memory status'
      });
    }
  }
);

/**
 * @route   POST /api/uploads-optimized/documents-stream
 * @desc    Upload legal documents using streaming
 * @access  Private
 */
router.post('/documents-stream',
  protect,
  memoryMonitor,
  uploadRateLimit(3, 60000),
  upload.array('documents', 8), // Maximum 8 documents
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No documents uploaded'
        });
      }

      const uploadedDocs = [];
      const tempFilesToCleanup = [];

      for (const file of req.files) {
        try {
          let fileStream;
          
          if (file.buffer) {
            fileStream = optimizedUploadService.bufferToStream(file.buffer);
          } else if (file.path) {
            fileStream = require('fs').createReadStream(file.path);
            tempFilesToCleanup.push(file.path);
          }

          const result = await optimizedUploadService.uploadFileStream(
            fileStream,
            file.originalname,
            'Documents',
            file.mimetype,
            file.size
          );
          
          uploadedDocs.push({
            ...result,
            fieldName: file.fieldname,
            mimetype: file.mimetype
          });
        } catch (uploadError) {
          console.error('Error uploading document:', uploadError);
        }
      }

      // Clean up temp files
      for (const tempFile of tempFilesToCleanup) {
        await optimizedUploadService.cleanupTempFile(tempFile);
      }

      if (uploadedDocs.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload any documents'
        });
      }

      res.json({
        success: true,
        message: `${uploadedDocs.length} documents uploaded successfully using streaming`,
        documents: uploadedDocs,
        memoryUsage: req.memoryUsage
      });
    } catch (error) {
      console.error('Error uploading documents with streaming:', error);
      res.status(500).json({
        success: false,
        message: 'Documents upload failed'
      });
    }
  }
);

/**
 * @route   POST /api/uploads-optimized/document-stream
 * @desc    Upload single document using streaming
 * @access  Private
 */
router.post('/document-stream',
  protect,
  memoryMonitor,
  uploadRateLimit(1, 30000), // 1 document upload per 30 seconds
  upload.single('document'), // Single document upload
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No document uploaded'
        });
      }

      let fileStream;
      const tempFilesToCleanup = [];
      
      if (req.file.buffer) {
        fileStream = optimizedUploadService.bufferToStream(req.file.buffer);
      } else if (req.file.path) {
        fileStream = require('fs').createReadStream(req.file.path);
        tempFilesToCleanup.push(req.file.path);
      }

      const result = await optimizedUploadService.uploadFileStream(
        fileStream,
        req.file.originalname,
        'Documents',
        req.file.mimetype,
        req.file.size
      );
      
      // Clean up temp file
      for (const tempFile of tempFilesToCleanup) {
        await optimizedUploadService.cleanupTempFile(tempFile);
      }

      res.json({
        success: true,
        message: 'Document uploaded successfully using streaming',
        file: {
          ...result,
          fieldName: req.file.fieldname,
          mimetype: req.file.mimetype
        },
        memoryUsage: req.memoryUsage
      });
    } catch (error) {
      console.error('Error uploading document with streaming:', error);
      res.status(500).json({
        success: false,
        message: 'Document upload failed'
      });
    }
  }
);

module.exports = router;
