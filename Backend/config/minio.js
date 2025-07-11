const { S3Client } = require('@aws-sdk/client-s3');
const { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command, 
  HeadObjectCommand 
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class MinIOService {
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
   * Initialize S3 client connection
   */
  async connect() {
  try {
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const accessKeyId = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    const secretAccessKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
    const region = process.env.AWS_REGION || 'auto';

    let endpoint;
    let forcePathStyle = true;

    if (process.env.MINIO_PORT) {
      // Running locally with MinIO
      const host = process.env.MINIO_ENDPOINT || '127.0.0.1';
      const port = parseInt(process.env.MINIO_PORT);
      endpoint = `${useSSL ? 'https' : 'http'}://${host}:${port}`;
      forcePathStyle = true;
    } else {
      // Running on Cloudflare R2 (full HTTPS endpoint, no port)
      endpoint = process.env.MINIO_ENDPOINT;
      forcePathStyle = false;
    }

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Test connection by checking if bucket exists
    await this.bucketExists();
    console.log('✅ Connected to S3-compatible storage successfully');

    // Ensure bucket exists
    await this.ensureBucketExists();

    return this.client;
  } catch (error) {
    console.error('❌ S3 client connection error:', error);
    throw error;
  }
}

  /**
   * Check if bucket exists
   * @returns {Promise<boolean>} - Bucket exists status
   */
  async bucketExists() {
    try {
      if (!this.client) {
        throw new Error('S3 client not initialized');
      }

      const { HeadBucketCommand } = require('@aws-sdk/client-s3');
      const command = new HeadBucketCommand({
        Bucket: this.bucketName
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.name === 'NoSuchBucket' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      // For other errors, assume bucket exists (might be permission issue)
      console.log('Bucket existence check warning:', error.message);
      return true;
    }
  }

  /**
   * Ensure the bucket exists, create if it doesn't
   */
  async ensureBucketExists() {
    try {
      const { CreateBucketCommand } = require('@aws-sdk/client-s3');
      
      const exists = await this.bucketExists();
      if (!exists) {
        const command = new CreateBucketCommand({
          Bucket: this.bucketName
        });
        await this.client.send(command);
        console.log(`✅ Created bucket: ${this.bucketName}`);
      }
    } catch (error) {
      // Ignore bucket already exists errors
      if (error.name === 'BucketAlreadyExists' || error.name === 'BucketAlreadyOwnedByYou') {
        console.log(`✅ Bucket ${this.bucketName} already exists`);
      } else {
        console.error('❌ Error ensuring bucket exists:', error);
        throw error;
      }
    }
  }

  /**
   * Upload file to S3-compatible storage
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - File name
   * @param {string} folder - Folder name (PROFILES, THUMBNAILS, etc.)
   * @param {string} contentType - MIME type
   * @returns {Promise<Object>} - File info with permanent URL structure
   */
  async uploadFile(fileBuffer, fileName, folder, contentType) {
    try {
      if (!this.client) {
        throw new Error('S3 client not initialized');
      }

      // Validate folder
      if (!Object.values(this.folders).includes(folder)) {
        throw new Error(`Invalid folder: ${folder}. Must be one of: ${Object.values(this.folders).join(', ')}`);
      }

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const objectName = `${folder}/${uniqueFileName}`;

      // Set metadata
      const metadata = {
        'X-Upload-Date': new Date().toISOString(),
        'X-Original-Name': fileName
      };

      // Upload file using S3 SDK
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectName,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: metadata
      });

      await this.client.send(command);

      // Generate permanent URL structure (not presigned)
      // Use the backend server URL instead of S3 direct URL
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const permanentUrl = `${backendUrl}/api/files/${objectName}`;
      
      console.log(`✅ File uploaded successfully: ${objectName}`);
      return {
        url: permanentUrl, // This will be served through our API endpoint
        objectName: objectName,
        originalName: fileName,
        size: fileBuffer.length,
        folder: folder,
        bucketName: this.bucketName
      };
    } catch (error) {
      console.error('❌ Error uploading file to S3:', error);
      throw error;
    }
  }

  /**
   * Generate fresh presigned URL for an object
   * @param {string} objectName - Object name in bucket
   * @param {number} expiry - Expiry time in seconds (default: 1 hour)
   * @returns {Promise<string>} - Fresh presigned URL
   */
  async generateFreshUrl(objectName, expiry = 3600) {
    try {
      if (!this.client) {
        throw new Error('S3 client not initialized');
      }

      // Generate fresh presigned URL using S3 SDK
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectName
      });

      const url = await getSignedUrl(this.client, command, { expiresIn: expiry });
      return url;
    } catch (error) {
      console.error('❌ Error generating fresh URL:', error);
      throw error;
    }
  }

  /**
   * Delete file from S3-compatible storage
   * @param {string} objectName - Object name in bucket
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(objectName) {
    try {
      if (!this.client) {
        throw new Error('S3 client not initialized');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: objectName
      });

      await this.client.send(command);
      console.log(`✅ File deleted successfully: ${objectName}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting file from S3:', error);
      throw error;
    }
  }

  /**
   * List files in a folder
   * @param {string} folder - Folder name
   * @param {number} limit - Maximum number of files to return
   * @returns {Promise<Array>} - Array of file objects
   */
  async listFiles(folder, limit = 100) {
    try {
      if (!this.client) {
        throw new Error('S3 client not initialized');
      }

      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: `${folder}/`,
        MaxKeys: limit
      });

      const response = await this.client.send(command);
      
      if (!response.Contents) {
        return [];
      }

      return response.Contents.map(obj => ({
        name: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag
      }));
    } catch (error) {
      console.error('❌ Error listing files from S3:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param {string} objectName - Object name in bucket
   * @returns {Promise<Object>} - File metadata
   */
  async getFileMetadata(objectName) {
    try {
      if (!this.client) {
        throw new Error('S3 client not initialized');
      }

      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: objectName
      });

      const response = await this.client.send(command);
      
      return {
        size: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
        contentType: response.ContentType,
        metadata: response.Metadata
      };
    } catch (error) {
      console.error('❌ Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Check if file exists
   * @param {string} objectName - Object name in bucket
   * @returns {Promise<boolean>} - File exists status
   */
  async fileExists(objectName) {
    try {
      if (!this.client) {
        throw new Error('S3 client not initialized');
      }

      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: objectName
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file stream for serving files
   * @param {string} objectName - Object name in bucket
   * @returns {Promise<Stream>} - File stream
   */
  async getFileStream(objectName) {
    try {
      if (!this.client) {
        throw new Error('S3 client not initialized');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectName
      });

      const response = await this.client.send(command);
      return response.Body;
    } catch (error) {
      console.error('❌ Error getting file stream:', error);
      throw error;
    }
  }

  /**
   * Get client instance
   * @returns {S3Client} - S3 client instance
   */
  getClient() {
    if (!this.client) {
      throw new Error('S3 client not initialized. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Get available folders
   * @returns {Object} - Available folders
   */
  getFolders() {
    return this.folders;
  }
}

// Create singleton instance
const minioService = new MinIOService();

module.exports = {
  MinIOService,
  minioService,
  connectMinIO: () => minioService.connect(),
  uploadFile: (fileBuffer, fileName, folder, contentType) => 
    minioService.uploadFile(fileBuffer, fileName, folder, contentType),
  getFileUrl: (objectName, expiry) => 
    minioService.generateFreshUrl(objectName, expiry),
  generateFreshUrl: (objectName, expiry) => 
    minioService.generateFreshUrl(objectName, expiry),
  getFileStream: (objectName) =>
    minioService.getFileStream(objectName),
  deleteFile: (objectName) => 
    minioService.deleteFile(objectName),
  listFiles: (folder, limit) => 
    minioService.listFiles(folder, limit),
  getFileMetadata: (objectName) => 
    minioService.getFileMetadata(objectName),
  fileExists: (objectName) => 
    minioService.fileExists(objectName),
  getFolders: () => minioService.getFolders()
};
