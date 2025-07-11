/**
 * Optimized Upload API Service - Frontend
 * Uses RAM-efficient upload endpoints with streaming and direct S3 uploads
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance for optimized uploads
const optimizedUploadClient = axios.create({
  baseURL: `${API_BASE_URL}/uploads-optimized`,
  timeout: 300000, // 5 minutes for large file uploads
});

// Add auth token to requests
optimizedUploadClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || 
                localStorage.getItem('vendorToken') || 
                localStorage.getItem('merchantToken') ||
                localStorage.getItem('employeeToken') ||
                localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Optimized Upload Service Class
 * Automatically selects best upload method based on file size and type
 */
class OptimizedUploadService {
  
  /**
   * Smart file upload - automatically chooses best method
   * @param {File} file - File to upload
   * @param {string} folder - Target folder (Profiles, Images, Documents, etc.)
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async smartUpload(file, folder = 'Uploads', options = {}) {
    const fileSize = file.size;
    const preferDirect = options.preferDirect || fileSize > 5 * 1024 * 1024; // >5MB prefer direct
    
    // For Documents folder, always use streaming due to CORS issues with Cloudflare R2
    if (folder === 'Documents') {
      console.log(`🔄 Using streaming upload for document in ${folder} folder: ${file.name} (${this.formatFileSize(fileSize)})`);
      return await this.uploadViaStreaming(file, folder);
    }
    
    try {
      // Try direct S3 upload first for large files or when preferred (non-documents)
      if (preferDirect) {
        console.log(`🚀 Using direct S3 upload for ${file.name} (${this.formatFileSize(fileSize)})`);
        return await this.uploadDirectToS3(file, folder);
      } else {
        console.log(`🔄 Using streaming upload for ${file.name} (${this.formatFileSize(fileSize)})`);
        return await this.uploadViaStreaming(file, folder);
      }
    } catch (error) {
      // Fallback to alternative method
      console.warn(`⚠️ Primary upload method failed, trying fallback...`);
      
      if (preferDirect) {
        return await this.uploadViaStreaming(file, folder);
      } else {
        return await this.uploadDirectToS3(file, folder);
      }
    }
  }

  /**
   * Upload file directly to S3 (NO SERVER RAM USAGE)
   */
  async uploadDirectToS3(file, folder) {
    try {
      // Step 1: Get presigned URL
      const { data: presignedData } = await optimizedUploadClient.post('/presigned', {
        fileName: file.name,
        folder: folder,
        contentType: file.type
      });

      if (!presignedData.success) {
        throw new Error(presignedData.message || 'Failed to get presigned URL');
      }

      // Step 2: Upload directly to S3
      const uploadResponse = await fetch(presignedData.data.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error(`Direct upload failed: ${uploadResponse.statusText}`);
      }

      // Return structured response
      return {
        success: true,
        file: {
          ...presignedData.data,
          uploadMethod: 'direct-s3',
          size: file.size,
          originalName: file.name,
          mimetype: file.type
        },
        message: 'File uploaded successfully via direct S3'
      };
    } catch (error) {
      console.error('Direct S3 upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload file via server streaming (MINIMAL SERVER RAM USAGE)
   */
  async uploadViaStreaming(file, folder) {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await optimizedUploadClient.post(`/${folder}/single-stream`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return data;
  }

  /**
   * Upload profile picture with optimization
   */
  async uploadProfilePicture(file) {
    try {
      // Always use direct upload for profile pictures (typically small)
      const result = await this.uploadDirectToS3(file, 'Profiles');
      
      return {
        success: true,
        file: result.file,
        message: 'Profile picture uploaded successfully'
      };
    } catch (error) {
      // Fallback to streaming
      console.log('🔄 Direct profile upload failed, using streaming...');
      
      const formData = new FormData();
      formData.append('profile', file);

      const { data } = await optimizedUploadClient.post('/profile-stream', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return data;
    }
  }

  /**
   * Upload multiple station images efficiently
   */
  async uploadStationImages(files) {
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('images', file);
    });

    const { data } = await optimizedUploadClient.post('/station-images-stream', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return data;
  }

  /**
   * Upload documents with optimization
   */
  async uploadDocuments(files) {
    // For multiple documents, prefer streaming to maintain stability
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('documents', files);
    });

    const { data } = await optimizedUploadClient.post('/documents-stream', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return data;
  }

  /**
   * Upload single document
   */
  async uploadDocument(file, documentType = null) {
    try {
      // For documents, prefer streaming upload due to CORS issues with direct S3
      // Skip direct upload to avoid CORS errors with Cloudflare R2
      console.log(`🔄 Using streaming upload for document: ${file.name}`);
      
      const formData = new FormData();
      formData.append('document', file);
      if (documentType) {
        formData.append('documentType', documentType);
      }

      const { data } = await optimizedUploadClient.post('/document-stream', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return data;
    } catch (error) {
      console.error('Document streaming upload failed:', error);
      throw error;
    }
  }

  /**
   * Get server memory status (for monitoring)
   */
  async getMemoryStatus() {
    try {
      const { data } = await optimizedUploadClient.get('/memory-status');
      return data;
    } catch (error) {
      console.error('Failed to get memory status:', error);
      return null;
    }
  }

  /**
   * Utility: Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
const optimizedUploadAPI = new OptimizedUploadService();

export default optimizedUploadAPI;

/**
 * React Hook for optimized file uploads
 */
import { useState } from 'react';

export const useOptimizedUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadMethod, setUploadMethod] = useState(null);

  const uploadFile = async (file, folder, options = {}) => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await optimizedUploadAPI.smartUpload(file, folder, options);
      setUploadMethod(result.file?.uploadMethod || 'unknown');
      setProgress(100);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const uploadMultiple = async (files, uploadType, options = {}) => {
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      let result;

      switch (uploadType) {
        case 'station-images':
          result = await optimizedUploadAPI.uploadStationImages(files);
          break;
        case 'documents':
          result = await optimizedUploadAPI.uploadDocuments(files);
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
  };

  return {
    uploadFile,
    uploadMultiple,
    uploading,
    progress,
    error,
    uploadMethod,
    setError
  };
};
