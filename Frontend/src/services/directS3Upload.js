/**
 * Direct S3 Upload Service using Presigned URLs
 * Completely bypasses server resources - uploads directly to S3/R2
 */

// Configure API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class DirectS3UploadService {
  constructor() {
    this.apiBase = `${API_BASE_URL}/presigned-upload`;
    this.uploadQueue = [];
    this.activeUploads = new Map();
    this.maxConcurrentUploads = 3; // Can be higher since we're not using server resources
  }

  /**
   * Get authentication token from localStorage
   * Checks multiple token keys based on context
   */
  getAuthToken() {
    // Try different token keys in order of preference
    const tokenKeys = ['merchantToken', 'employeeToken', 'token'];
    
    for (const key of tokenKeys) {
      const token = localStorage.getItem(key);
      if (token && token !== 'null' && token !== 'undefined') {
        console.log(`🔑 Using auth token from: ${key}`);
        return token;
      }
    }
    
    console.error('❌ No valid authentication token found');
    throw new Error('Authentication required. Please login first.');
  }

  /**
   * Upload single file directly to S3 using presigned URL
   * @param {File} file - File to upload
   * @param {Function} onProgress - Progress callback
   * @param {Object} options - Upload options
   * @returns {Promise} Upload result
   */
  async uploadSingleFile(file, onProgress, options = {}) {
    try {
      const { folder = 'Images' } = options;

      // Step 1: Get presigned URL from server
      console.log(`🔗 Getting presigned URL for ${file.name}...`);
      
      const presignedResponse = await fetch(`${this.apiBase}/generate-upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          folder: folder
        })
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json();
        throw new Error(errorData.message || 'Failed to get presigned URL');
      }

      const presignedData = await presignedResponse.json();
      
      if (!presignedData.success) {
        throw new Error(presignedData.message || 'Failed to get presigned URL');
      }

      const { uploadUrl, fileUrl, objectName } = presignedData.data;

      // Step 2: Upload directly to S3 using presigned URL
      console.log(`🚀 Uploading ${file.name} directly to S3...`);
      
      const uploadResponse = await this.uploadToS3(uploadUrl, file, onProgress);
      
      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      // Step 3: Confirm upload with server
      console.log(`✅ Confirming upload for ${file.name}...`);        const confirmResponse = await fetch(`${this.apiBase}/confirm-upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`,
            'X-API-Key': 'your-super-secret-api-key-2024',
            'X-Frontend-Request': 'true'
          },
        body: JSON.stringify({
          objectName: objectName,
          fileUrl: fileUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        })
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.message || 'Failed to confirm upload');
      }

      const confirmData = await confirmResponse.json();
      
      if (!confirmData.success) {
        throw new Error(confirmData.message || 'Failed to confirm upload');
      }

      console.log(`🎉 Successfully uploaded ${file.name} directly to S3!`);
      
      return confirmData.data;

    } catch (error) {
      console.error(`❌ Error uploading ${file.name}:`, error);
      throw error;
    }
  }

  /**
   * Upload multiple files in batch using presigned URLs
   * @param {FileList|Array} files - Files to upload
   * @param {Function} onProgress - Progress callback
   * @param {Object} options - Upload options
   * @returns {Promise} Upload results
   */
  async uploadBatchFiles(files, onProgress, options = {}) {
    try {
      const { folder = 'Images', maxConcurrent = 3 } = options;
      const fileArray = Array.from(files);

      // Validate files
      if (fileArray.length === 0) {
        throw new Error('No files provided');
      }

      if (fileArray.length > 15) {
        throw new Error('Maximum 15 files allowed per batch');
      }

      // Step 1: Get batch presigned URLs
      console.log(`🔗 Getting presigned URLs for ${fileArray.length} files...`);
      
      const filesMetadata = fileArray.map(file => ({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      }));

      const batchResponse = await fetch(`${this.apiBase}/batch-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        },
        body: JSON.stringify({
          files: filesMetadata,
          folder: folder
        })
      });

      if (!batchResponse.ok) {
        const errorData = await batchResponse.json();
        throw new Error(errorData.message || 'Failed to get batch presigned URLs');
      }

      const batchData = await batchResponse.json();
      
      if (!batchData.success) {
        throw new Error(batchData.message || 'Failed to get batch presigned URLs');
      }

      const { batchId, uploadUrls } = batchData.data;
      const successfulUrls = uploadUrls.filter(u => u.success);

      if (successfulUrls.length === 0) {
        throw new Error('No valid presigned URLs generated');
      }

      // Step 2: Upload files concurrently (but limited)
      console.log(`🚀 Uploading ${successfulUrls.length} files directly to S3...`);
      
      const uploadResults = await this.uploadFilesConcurrently(
        fileArray, 
        successfulUrls, 
        onProgress, 
        maxConcurrent
      );

      // Step 3: Confirm successful uploads
      const successfulUploads = uploadResults.filter(r => r.success);
      const failedUploads = uploadResults.filter(r => !r.success);
      
      if (successfulUploads.length > 0) {
        console.log(`✅ Confirming ${successfulUploads.length} successful uploads...`);        const confirmResponse = await fetch(`${this.apiBase}/batch-confirm`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.getAuthToken()}`,
              'X-API-Key': 'your-super-secret-api-key-2024',
              'X-Frontend-Request': 'true'
            },
          body: JSON.stringify({
            batchId: batchId,
            uploadedFiles: successfulUploads.map(upload => upload.data)
          })
        });

        if (confirmResponse.ok) {
          const confirmData = await confirmResponse.json();
          console.log(`🎉 Batch upload completed: ${confirmData.data.totalConfirmed} files confirmed`);
          
          // Return format compatible with merchantAPI expectations
          return {
            success: failedUploads.length === 0,
            images: confirmData.data.confirmedFiles || [],
            errors: failedUploads.map(f => ({ file: f.fileName, error: f.error })),
            uploaded: confirmData.data.totalConfirmed || 0,
            failed: failedUploads.length,
            total: files.length
          };
        }
      }

      // Return format for partial success or confirmation failure
      return {
        success: successfulUploads.length > 0,
        images: successfulUploads.map(upload => upload.data),
        errors: failedUploads.map(f => ({ file: f.fileName, error: f.error })),
        uploaded: successfulUploads.length,
        failed: failedUploads.length,
        total: files.length
      };

    } catch (error) {
      console.error('❌ Error in batch upload:', error);
      
      // Return error format compatible with merchantAPI expectations
      return {
        success: false,
        images: [],
        errors: [{ file: 'batch', error: error.message }],
        uploaded: 0,
        failed: files.length,
        total: files.length
      };
    }
  }

  /**
   * Upload files concurrently with limit
   */
  async uploadFilesConcurrently(files, uploadUrls, onProgress, maxConcurrent = 3) {
    const results = [];
    const activeUploads = [];
    let completedCount = 0;

    for (let i = 0; i < uploadUrls.length; i++) {
      const urlData = uploadUrls[i];
      const file = files[urlData.index];

      if (!urlData.success || !file) {
        results[i] = { 
          success: false, 
          error: urlData.error || 'File not found',
          index: urlData.index 
        };
        continue;
      }

      // Wait if we've reached max concurrent uploads
      if (activeUploads.length >= maxConcurrent) {
        await Promise.race(activeUploads);
      }

      // Start upload
      const uploadPromise = this.uploadSingleFileToS3(file, urlData, (progress) => {
        if (onProgress) {
          onProgress({
            currentFile: i + 1,
            totalFiles: uploadUrls.length,
            fileName: file.name,
            fileProgress: progress,
            overallProgress: Math.round(((completedCount + progress.percentage / 100) / uploadUrls.length) * 100)
          });
        }
      }).then(result => {
        completedCount++;
        results[i] = result;
        // Remove from active uploads
        const index = activeUploads.indexOf(uploadPromise);
        if (index > -1) activeUploads.splice(index, 1);
        return result;
      }).catch(error => {
        completedCount++;
        results[i] = { 
          success: false, 
          error: error.message,
          index: urlData.index 
        };
        // Remove from active uploads
        const index = activeUploads.indexOf(uploadPromise);
        if (index > -1) activeUploads.splice(index, 1);
        return results[i];
      });

      activeUploads.push(uploadPromise);
    }

    // Wait for all uploads to complete
    await Promise.all(activeUploads);

    return results;
  }

  /**
   * Upload single file to S3 using presigned URL
   */
  async uploadSingleFileToS3(file, urlData, onProgress) {
    try {
      const response = await this.uploadToS3(urlData.uploadUrl, file, onProgress);
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        data: {
          index: urlData.index,
          objectName: urlData.objectName,
          fileUrl: urlData.fileUrl,
          fileName: urlData.fileName,
          fileSize: urlData.fileSize,
          fileType: urlData.fileType
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        index: urlData.index
      };
    }
  }

  /**
   * Upload file to S3 using XMLHttpRequest for progress tracking
   */
  uploadToS3(uploadUrl, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          };
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            ok: true,
            status: xhr.status,
            statusText: xhr.statusText
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      // Configure request
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('Content-Length', file.size.toString());

      // Start upload
      xhr.send(file);
    });
  }

  /**
   * Upload station images using direct S3 upload
   */
  async uploadStationImages(files, onProgress, options = {}) {
    return await this.uploadBatchFiles(files, onProgress, {
      ...options,
      folder: 'Images'
    });
  }

  /**
   * Upload documents using direct S3 upload
   */
  async uploadDocuments(files, onProgress, options = {}) {
    return await this.uploadBatchFiles(files, onProgress, {
      ...options,
      folder: 'Documents'
    });
  }

  /**
   * Upload single profile image
   */
  async uploadProfileImage(file, onProgress, options = {}) {
    return await this.uploadSingleFile(file, onProgress, {
      ...options,
      folder: 'Profiles'
    });
  }
}

// Create global instance
const directS3UploadService = new DirectS3UploadService();

// Enhanced API that uses direct S3 uploads
const directUploadAPI = {
  /**
   * Upload station images directly to S3
   */
  async uploadStationImages(files, onProgress, options = {}) {
    return await directS3UploadService.uploadStationImages(files, onProgress, options);
  },

  /**
   * Upload documents directly to S3
   */
  async uploadDocuments(files, onProgress, options = {}) {
    return await directS3UploadService.uploadDocuments(files, onProgress, options);
  },

  /**
   * Upload profile image directly to S3
   */
  async uploadProfileImage(file, onProgress, options = {}) {
    return await directS3UploadService.uploadProfileImage(file, onProgress, options);
  },

  /**
   * Upload profile picture directly to S3 (alias for uploadProfileImage)
   */
  async uploadProfilePicture(file, onProgress, options = {}) {
    return await directS3UploadService.uploadProfileImage(file, onProgress, options);
  },

  /**
   * Upload single file directly to S3
   */
  async uploadSingleFile(file, onProgress, options = {}) {
    return await directS3UploadService.uploadSingleFile(file, onProgress, options);
  }
};

export { directUploadAPI, directS3UploadService };
