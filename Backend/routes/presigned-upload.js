const express = require('express');
const router = express.Router();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { protect } = require('../middleware/auth');
const { 
  userUploadRateLimit, 
  createUploadSession, 
  memoryMonitor 
} = require('../middleware/concurrency-safe-upload');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.MINIO_ENDPOINT,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  // Force path style for R2/MinIO compatibility
  forcePathStyle: true
});

/**
 * @route   POST /api/presigned-upload/generate-upload-url
 * @desc    Generate presigned URL for direct S3 upload (NO SERVER RESOURCES USED)
 * @access  Private
 */
router.post('/generate-upload-url',
  protect,
  createUploadSession,
  userUploadRateLimit(20, 60000), // 20 presigned URLs per minute per user
  memoryMonitor,
  async (req, res) => {
    try {
      const { fileName, fileType, fileSize, folder = 'Images' } = req.body;

      // Validate input
      if (!fileName || !fileType || !fileSize) {
        return res.status(400).json({
          success: false,
          message: 'fileName, fileType, and fileSize are required'
        });
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (fileSize > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds maximum allowed (50MB)`
        });
      }

      // Validate file type
      const allowedImageTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
      ];
      const allowedDocTypes = [
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (folder === 'Images' && !allowedImageTypes.includes(fileType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image file type. Only JPEG, PNG, WebP, and GIF are allowed.'
        });
      }

      if (folder === 'Documents' && !allowedDocTypes.includes(fileType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document file type. Only PDF and Word documents are allowed.'
        });
      }

      // Generate unique object name
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = fileName.split('.').pop();
      const objectName = `${folder}/${timestamp}_${randomString}.${fileExtension}`;

      // Create presigned URL for PUT operation
      const command = new PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET_NAME,
        Key: objectName,
        ContentType: fileType,
        ContentLength: fileSize,
        Metadata: {
          'original-name': fileName,
          'uploaded-by': req.user.id,
          'upload-session': req.uploadSession?.sessionId || 'unknown',
          'upload-timestamp': timestamp.toString()
        }
      });

      // Generate presigned URL (valid for 10 minutes)
      const presignedUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 600 // 10 minutes
      });

      // Generate the final URL for accessing the file
      const fileUrl = `${process.env.MINIO_PUBLIC_URL}/${objectName}`;

      // Track this in upload session
      if (req.uploadSession) {
        req.uploadSession.uploads.push({
          uploadId: `presigned_${timestamp}_${randomString}`,
          fileName: fileName,
          objectName: objectName,
          size: fileSize,
          timestamp: Date.now(),
          status: 'pending'
        });
      }

      res.json({
        success: true,
        message: 'Presigned URL generated successfully',
        data: {
          uploadUrl: presignedUrl,
          fileUrl: fileUrl,
          objectName: objectName,
          fileName: fileName,
          fileSize: fileSize,
          fileType: fileType,
          folder: folder,
          expiresIn: 600, // 10 minutes
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          uploadInstructions: {
            method: 'PUT',
            headers: {
              'Content-Type': fileType,
              'Content-Length': fileSize.toString()
            },
            note: 'Upload the file directly to uploadUrl using PUT method'
          }
        }
      });

    } catch (error) {
      console.error('Error generating presigned URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate presigned URL',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @route   POST /api/presigned-upload/confirm-upload
 * @desc    Confirm that file was uploaded successfully to S3
 * @access  Private
 */
router.post('/confirm-upload',
  protect,
  userUploadRateLimit(25, 60000), // 25 confirmations per minute per user
  async (req, res) => {
    try {
      const { objectName, fileUrl, fileName, fileSize, fileType } = req.body;

      // Validate input
      if (!objectName || !fileUrl || !fileName) {
        return res.status(400).json({
          success: false,
          message: 'objectName, fileUrl, and fileName are required'
        });
      }

      // Update upload session status
      if (req.uploadSession) {
        const upload = req.uploadSession.uploads.find(u => u.objectName === objectName);
        if (upload) {
          upload.status = 'completed';
          upload.completedAt = Date.now();
        }
      }

      // Return metadata for database storage
      const uploadMetadata = {
        url: fileUrl,
        objectName: objectName,
        originalName: fileName,
        size: fileSize || 0,
        mimetype: fileType || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user.id,
        uploadMethod: 'presigned-url'
      };

      res.json({
        success: true,
        message: 'Upload confirmed successfully',
        data: uploadMetadata
      });

    } catch (error) {
      console.error('Error confirming upload:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm upload'
      });
    }
  }
);

/**
 * @route   POST /api/presigned-upload/batch-generate
 * @desc    Generate multiple presigned URLs for batch upload
 * @access  Private
 */
router.post('/batch-generate',
  protect,
  createUploadSession,
  userUploadRateLimit(10, 60000), // 10 batch requests per minute per user
  memoryMonitor,
  async (req, res) => {
    try {
      const { files, folder = 'Images' } = req.body;

      // Validate input
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'files array is required and must not be empty'
        });
      }

      // Limit batch size
      if (files.length > 15) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 15 files allowed per batch'
        });
      }

      // Validate total size
      const totalSize = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
      const maxTotalSize = 100 * 1024 * 1024; // 100MB total for batch
      
      if (totalSize > maxTotalSize) {
        return res.status(400).json({
          success: false,
          message: `Total batch size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds maximum (100MB)`
        });
      }

      const uploadUrls = [];
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { fileName, fileType, fileSize } = file;

        // Validate each file
        if (!fileName || !fileType || !fileSize) {
          uploadUrls.push({
            index: i,
            success: false,
            error: 'fileName, fileType, and fileSize are required'
          });
          continue;
        }

        try {
          // Generate unique object name
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 15);
          const fileExtension = fileName.split('.').pop();
          const objectName = `${folder}/${timestamp}_${randomString}_${i}.${fileExtension}`;

          // Create presigned URL
          const command = new PutObjectCommand({
            Bucket: process.env.MINIO_BUCKET_NAME,
            Key: objectName,
            ContentType: fileType,
            ContentLength: fileSize,
            Metadata: {
              'original-name': fileName,
              'uploaded-by': req.user.id,
              'batch-id': batchId,
              'batch-index': i.toString(),
              'upload-timestamp': timestamp.toString()
            }
          });

          const presignedUrl = await getSignedUrl(s3Client, command, { 
            expiresIn: 900 // 15 minutes for batch uploads
          });

          const fileUrl = `${process.env.MINIO_PUBLIC_URL}/${objectName}`;

          uploadUrls.push({
            index: i,
            success: true,
            uploadUrl: presignedUrl,
            fileUrl: fileUrl,
            objectName: objectName,
            fileName: fileName,
            fileSize: fileSize,
            fileType: fileType
          });

          // Track in upload session
          if (req.uploadSession) {
            req.uploadSession.uploads.push({
              uploadId: `batch_${batchId}_${i}`,
              fileName: fileName,
              objectName: objectName,
              size: fileSize,
              timestamp: Date.now(),
              status: 'pending',
              batchId: batchId
            });
          }

        } catch (error) {
          console.error(`Error generating presigned URL for file ${i}:`, error);
          uploadUrls.push({
            index: i,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = uploadUrls.filter(u => u.success).length;
      const failureCount = uploadUrls.length - successCount;

      res.json({
        success: true,
        message: `Batch presigned URLs generated: ${successCount} successful, ${failureCount} failed`,
        data: {
          batchId: batchId,
          totalFiles: files.length,
          successfulUrls: successCount,
          failedUrls: failureCount,
          expiresIn: 900, // 15 minutes
          expiresAt: new Date(Date.now() + 900000).toISOString(),
          uploadUrls: uploadUrls
        }
      });

    } catch (error) {
      console.error('Error generating batch presigned URLs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate batch presigned URLs'
      });
    }
  }
);

/**
 * @route   POST /api/presigned-upload/batch-confirm
 * @desc    Confirm multiple file uploads
 * @access  Private
 */
router.post('/batch-confirm',
  protect,
  userUploadRateLimit(15, 60000), // 15 batch confirmations per minute per user
  async (req, res) => {
    try {
      const { batchId, uploadedFiles } = req.body;

      if (!batchId || !uploadedFiles || !Array.isArray(uploadedFiles)) {
        return res.status(400).json({
          success: false,
          message: 'batchId and uploadedFiles array are required'
        });
      }

      const confirmedFiles = [];

      for (const file of uploadedFiles) {
        const { objectName, fileUrl, fileName, fileSize, fileType, index } = file;

        if (objectName && fileUrl && fileName) {
          confirmedFiles.push({
            url: fileUrl,
            objectName: objectName,
            originalName: fileName,
            size: fileSize || 0,
            mimetype: fileType || 'application/octet-stream',
            uploadedAt: new Date().toISOString(),
            uploadedBy: req.user.id,
            uploadMethod: 'presigned-url-batch',
            batchId: batchId,
            batchIndex: index
          });

          // Update upload session
          if (req.uploadSession) {
            const upload = req.uploadSession.uploads.find(u => 
              u.objectName === objectName && u.batchId === batchId
            );
            if (upload) {
              upload.status = 'completed';
              upload.completedAt = Date.now();
            }
          }
        }
      }

      res.json({
        success: true,
        message: `Batch upload confirmed: ${confirmedFiles.length} files`,
        data: {
          batchId: batchId,
          confirmedFiles: confirmedFiles,
          totalConfirmed: confirmedFiles.length
        }
      });

    } catch (error) {
      console.error('Error confirming batch upload:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm batch upload'
      });
    }
  }
);

module.exports = router;
