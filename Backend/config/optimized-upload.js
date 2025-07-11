const { Upload } = require('@aws-sdk/lib-storage');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const { Readable } = require('stream');

class OptimizedUploadService {
  constructor() {
    this.client = null;
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'mybucket';
    this.folders = {
      PROFILES: 'Profiles',
      THUMBNAILS: 'Thumbnails',
      DOCUMENTS: 'Documents',
      IMAGES: 'Images',
      UPLOADS: 'Uploads'
    };
  }

  /**
   * Initialize S3 client (reuse existing connection logic)
   */
  async connect() {
    // Reuse existing connection logic from minio.js
    const { minioService } = require('./minio');
    await minioService.connect();
    this.client = minioService.getClient();
    return this.client;
  }

  /**
   * Upload file using multipart upload with streaming
   * This approach uses much less RAM as it streams data directly to S3
   * @param {Stream} fileStream - Readable stream of file data
   * @param {string} fileName - Original file name
   * @param {string} folder - Target folder
   * @param {string} contentType - MIME type
   * @param {number} fileSize - File size in bytes (optional, for progress tracking)
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFileStream(fileStream, fileName, folder, contentType, fileSize = null) {
    try {
      if (!this.client) {
        await this.connect();
      }

      // Validate folder
      if (!Object.values(this.folders).includes(folder)) {
        throw new Error(`Invalid folder: ${folder}`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const objectName = `${folder}/${uniqueFileName}`;

      // Set metadata
      const metadata = {
        'X-Upload-Date': new Date().toISOString(),
        'X-Original-Name': fileName
      };

      // Use @aws-sdk/lib-storage Upload class for efficient streaming
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucketName,
          Key: objectName,
          Body: fileStream,
          ContentType: contentType,
          Metadata: metadata
        },
        // Configure multipart upload for better performance
        queueSize: 4, // Number of concurrent uploads
        partSize: 1024 * 1024 * 5, // 5MB parts (minimum for S3)
        leavePartsOnError: false, // Clean up failed uploads
      });

      // Optional: Track upload progress
      if (fileSize) {
        upload.on('httpUploadProgress', (progress) => {
          const percentComplete = Math.round((progress.loaded / fileSize) * 100);
          console.log(`Upload progress: ${percentComplete}% (${progress.loaded}/${fileSize} bytes)`);
        });
      }

      const result = await upload.done();

      // Generate permanent URL structure
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const permanentUrl = `${backendUrl}/api/files/${objectName}`;
      
      console.log(`✅ File uploaded successfully via stream: ${objectName}`);
      return {
        url: permanentUrl,
        objectName: objectName,
        originalName: fileName,
        size: fileSize,
        folder: folder,
        bucketName: this.bucketName,
        etag: result.ETag
      };
    } catch (error) {
      console.error('❌ Error uploading file stream to S3:', error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for direct client-side uploads
   * This completely bypasses server RAM usage
   * @param {string} fileName - Original file name
   * @param {string} folder - Target folder
   * @param {string} contentType - MIME type
   * @param {number} expiresIn - URL expiry in seconds (default: 1 hour)
   * @returns {Promise<Object>} - Presigned URL and upload details
   */
  async generatePresignedUploadUrl(fileName, folder, contentType, expiresIn = 3600) {
    try {
      if (!this.client) {
        await this.connect();
      }

      // Validate folder
      if (!Object.values(this.folders).includes(folder)) {
        throw new Error(`Invalid folder: ${folder}`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const objectName = `${folder}/${uniqueFileName}`;

      // Create presigned URL for PUT operation
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectName,
        ContentType: contentType,
        Metadata: {
          'X-Upload-Date': new Date().toISOString(),
          'X-Original-Name': fileName
        }
      });

      const presignedUrl = await getSignedUrl(this.client, command, { 
        expiresIn: expiresIn 
      });

      // Generate permanent URL for later access
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const permanentUrl = `${backendUrl}/api/files/${objectName}`;

      return {
        presignedUrl: presignedUrl,
        objectName: objectName,
        permanentUrl: permanentUrl,
        originalName: fileName,
        folder: folder,
        expiresIn: expiresIn,
        contentType: contentType
      };
    } catch (error) {
      console.error('❌ Error generating presigned upload URL:', error);
      throw error;
    }
  }

  /**
   * Convert buffer to readable stream
   * Useful for converting existing buffer-based uploads to streams
   * @param {Buffer} buffer - File buffer
   * @returns {Readable} - Readable stream
   */
  bufferToStream(buffer) {
    const readable = new Readable({
      read() {}
    });
    readable.push(buffer);
    readable.push(null);
    return readable;
  }

  /**
   * Optimized multer configuration for streaming
   * Uses temporary disk storage instead of memory storage
   */
  getOptimizedMulterConfig() {
    const service = this; // Capture 'this' context
    const os = require('os');
    const path = require('path');
    const fs = require('fs');
    
    return multer({
      // Use disk storage instead of memory storage to reduce RAM usage
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          // Use system temp directory - cross-platform compatible
          const tempDir = process.env.TEMP_UPLOAD_DIR || os.tmpdir();
          
          // Ensure temp directory exists
          try {
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            cb(null, tempDir);
          } catch (error) {
            console.error('Error creating temp directory:', error);
            cb(error);
          }
        },
        filename: (req, file, cb) => {
          // Generate unique filename
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
        }
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit (can be higher with streaming)
        files: 10 // Maximum 10 files per request
      },
      fileFilter: (req, file, cb) => service.optimizedFileFilter(req, file, cb)
    });
  }

  /**
   * Optimized file filter with better validation
   */
  optimizedFileFilter(req, file, cb) {
    const allowedTypes = {
      'Profiles': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      'Thumbnails': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      'Images': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      'Documents': [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/jpg', 'image/png'
      ],
      'Uploads': [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/json'
      ]
    };

    const folder = req.params.folder || req.body.folder || 'Uploads';
    
    if (!Object.values(this.folders).includes(folder)) {
      return cb(new Error(`Invalid folder: ${folder}`), false);
    }

    if (allowedTypes[folder] && allowedTypes[folder].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed for folder ${folder}`), false);
    }
  }

  /**
   * Clean up temporary files after upload
   * @param {string} filePath - Path to temporary file
   */
  async cleanupTempFile(filePath) {
    try {
      const fs = require('fs').promises;
      await fs.unlink(filePath);
      console.log(`🗑️ Cleaned up temporary file: ${filePath}`);
    } catch (error) {
      console.error('Error cleaning up temp file:', error);
    }
  }
}

// Create singleton instance
const optimizedUploadService = new OptimizedUploadService();

module.exports = {
  OptimizedUploadService,
  optimizedUploadService
};
