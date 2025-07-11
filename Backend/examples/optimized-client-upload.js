/**
 * Optimized client-side upload service that minimizes server RAM usage
 */
class OptimizedUploadService {
  constructor(baseURL = '/api/uploads-optimized', getAuthToken) {
    this.baseURL = baseURL;
    this.getAuthToken = getAuthToken;
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    const token = this.getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Upload file directly to S3 using presigned URL (NO SERVER RAM USAGE)
   * This is the most efficient method as it bypasses the server entirely
   * @param {File} file - File to upload
   * @param {string} folder - Target folder
   * @returns {Promise<Object>} - Upload result
   */
  async uploadDirectToS3(file, folder) {
    try {
      // Step 1: Get presigned URL from server
      const presignedResponse = await fetch(`${this.baseURL}/presigned`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          fileName: file.name,
          folder: folder,
          contentType: file.type
        })
      });

      if (!presignedResponse.ok) {
        throw new Error(`Failed to get presigned URL: ${presignedResponse.statusText}`);
      }

      const { data } = await presignedResponse.json();

      // Step 2: Upload directly to S3 using presigned URL
      const uploadResponse = await fetch(data.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error(`Direct upload failed: ${uploadResponse.statusText}`);
      }

      // Step 3: Return the permanent URL and upload details
      return {
        success: true,
        file: {
          url: data.permanentUrl,
          objectName: data.objectName,
          originalName: data.originalName,
          size: file.size,
          folder: data.folder,
          contentType: data.contentType,
          uploadMethod: 'direct-s3'
        }
      };
    } catch (error) {
      console.error('Direct S3 upload error:', error);
      throw error;
    }
  }

  /**
   * Upload file using streaming through server (REDUCED SERVER RAM USAGE)
   * Use this as fallback when direct upload is not possible
   * @param {File} file - File to upload
   * @param {string} folder - Target folder
   * @returns {Promise<Object>} - Upload result
   */
  async uploadViaStreamingServer(file, folder) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseURL}/${folder}/single-stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Streaming upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      result.file.uploadMethod = 'server-streaming';
      return result;
    } catch (error) {
      console.error('Streaming upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files using streaming (REDUCED SERVER RAM USAGE)
   * @param {FileList|Array} files - Files to upload
   * @param {string} folder - Target folder
   * @returns {Promise<Object>} - Upload result
   */
  async uploadMultipleViaStreaming(files, folder) {
    try {
      const formData = new FormData();
      
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = await fetch(`${this.baseURL}/${folder}/multiple-stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Multiple streaming upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      result.files.forEach(file => {
        file.uploadMethod = 'server-streaming';
      });
      return result;
    } catch (error) {
      console.error('Multiple streaming upload error:', error);
      throw error;
    }
  }

  /**
   * Smart upload method that chooses the best approach
   * Tries direct S3 upload first, falls back to streaming
   * @param {File} file - File to upload
   * @param {string} folder - Target folder
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result
   */
  async smartUpload(file, folder, options = {}) {
    try {
      // For large files or when requested, use direct S3 upload
      if (file.size > 5 * 1024 * 1024 || options.preferDirect) { // > 5MB
        console.log(`📤 Using direct S3 upload for ${file.name} (${this.formatFileSize(file.size)})`);
        return await this.uploadDirectToS3(file, folder);
      } else {
        console.log(`📤 Using streaming upload for ${file.name} (${this.formatFileSize(file.size)})`);
        return await this.uploadViaStreamingServer(file, folder);
      }
    } catch (error) {
      // If direct upload fails, try streaming as fallback
      if (error.message.includes('presigned')) {
        console.log('🔄 Direct upload failed, falling back to streaming...');
        return await this.uploadViaStreamingServer(file, folder);
      }
      throw error;
    }
  }

  /**
   * Upload profile picture with optimization
   * @param {File} file - Profile image file
   * @returns {Promise<Object>} - Upload result
   */
  async uploadProfileOptimized(file) {
    try {
      // For profile pictures, prefer direct upload to reduce server load
      return await this.uploadDirectToS3(file, 'Profiles');
    } catch (error) {
      // Fallback to streaming server upload
      console.log('🔄 Direct profile upload failed, using streaming...');
      const formData = new FormData();
      formData.append('profile', file);

      const response = await fetch(`${this.baseURL}/profile-stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Profile upload failed: ${response.statusText}`);
      }

      return await response.json();
    }
  }

  /**
   * Upload station images with optimization
   * @param {FileList|Array} files - Array of image files
   * @returns {Promise<Object>} - Upload result
   */
  async uploadStationImagesOptimized(files) {
    try {
      // For multiple images, use streaming to maintain server stability
      const formData = new FormData();
      
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }

      const response = await fetch(`${this.baseURL}/station-images-stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Station images upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Station images upload error:', error);
      throw error;
    }
  }

  /**
   * Upload documents with optimization
   * @param {FileList|Array} files - Array of document files
   * @returns {Promise<Object>} - Upload result
   */
  async uploadDocumentsOptimized(files) {
    try {
      // For documents, prefer direct upload for large files
      const results = [];
      
      for (const file of files) {
        try {
          const result = await this.smartUpload(file, 'Documents', { preferDirect: true });
          results.push(result.file);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }

      return {
        success: true,
        message: `${results.length} documents uploaded successfully`,
        documents: results
      };
    } catch (error) {
      console.error('Documents upload error:', error);
      throw error;
    }
  }

  /**
   * Get server memory status
   * @returns {Promise<Object>} - Memory status
   */
  async getServerMemoryStatus() {
    try {
      const response = await fetch(`${this.baseURL}/memory-status`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to get memory status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Memory status error:', error);
      throw error;
    }
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} - Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Monitor upload progress for large files
   * @param {File} file - File being uploaded
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} - Upload promise
   */
  async uploadWithProgress(file, folder, onProgress) {
    try {
      // For now, we'll simulate progress for direct uploads
      // In a real implementation, you might use a different approach
      
      onProgress({ loaded: 0, total: file.size, percent: 0 });
      
      const result = await this.smartUpload(file, folder);
      
      onProgress({ loaded: file.size, total: file.size, percent: 100 });
      
      return result;
    } catch (error) {
      onProgress({ error: error.message });
      throw error;
    }
  }
}

/**
 * React Hook for optimized file uploads
 */
function useOptimizedFileUpload(getAuthToken) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploadMethod, setUploadMethod] = useState(null);

  const uploadService = new OptimizedUploadService('/api/uploads-optimized', getAuthToken);

  const uploadFiles = useCallback(async (files, uploadType, options = {}) => {
    setUploading(true);
    setError(null);
    setProgress(0);
    setUploadMethod(null);

    try {
      let result;

      switch (uploadType) {
        case 'profile':
          result = await uploadService.uploadProfileOptimized(files[0]);
          setUploadMethod('profile-optimized');
          break;
        case 'station-images':
          result = await uploadService.uploadStationImagesOptimized(files);
          setUploadMethod('station-images-optimized');
          break;
        case 'documents':
          result = await uploadService.uploadDocumentsOptimized(files);
          setUploadMethod('documents-optimized');
          break;
        case 'smart-single':
          result = await uploadService.smartUpload(files[0], options.folder || 'Uploads');
          setUploadMethod('smart-upload');
          break;
        case 'direct-s3':
          result = await uploadService.uploadDirectToS3(files[0], options.folder || 'Uploads');
          setUploadMethod('direct-s3');
          break;
        case 'streaming':
          result = await uploadService.uploadViaStreamingServer(files[0], options.folder || 'Uploads');
          setUploadMethod('server-streaming');
          break;
        default:
          throw new Error(`Unknown upload type: ${uploadType}`);
      }

      setProgress(100);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [getAuthToken]);

  const getMemoryStatus = useCallback(async () => {
    try {
      return await uploadService.getServerMemoryStatus();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [getAuthToken]);

  return {
    uploadFiles,
    uploading,
    error,
    progress,
    uploadMethod,
    getMemoryStatus,
    setError
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    OptimizedUploadService, 
    useOptimizedFileUpload 
  };
} else {
  // Browser environment
  window.OptimizedUploadService = OptimizedUploadService;
  window.useOptimizedFileUpload = useOptimizedFileUpload;
}
