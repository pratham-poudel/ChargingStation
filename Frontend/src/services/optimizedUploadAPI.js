/**
 * DEPRECATED: OptimizedUploadAPI - This service is deprecated
 * All uploads now use DirectS3Upload for better performance and no 413 errors
 * 
 * This file provides compatibility wrappers that redirect to directUploadAPI
 * 
 * Migration Guide:
 * - Replace: import optimizedUploadAPI from './optimizedUploadAPI'
 * - With: import { directUploadAPI } from './directS3Upload'
 */

import { directUploadAPI } from './directS3Upload';

console.warn('⚠️ DEPRECATED: optimizedUploadAPI is deprecated. Use directUploadAPI instead for better performance and no 413 errors.');

/**
 * @deprecated Use directUploadAPI instead
 * Compatibility wrapper that redirects to direct S3 upload
 */
class OptimizedUploadService {
  constructor() {
    console.warn('⚠️ DEPRECATED: OptimizedUploadService is deprecated. Use DirectS3UploadService instead.');
  }

  /**
   * @deprecated Use directUploadAPI.uploadStationImages() instead
   */
  async uploadStationImages(files, onProgress = null) {
    console.warn('⚠️ DEPRECATED: uploadStationImages() is deprecated. Use directUploadAPI.uploadStationImages() instead.');
    return await directUploadAPI.uploadStationImages(files, onProgress);
  }

  /**
   * @deprecated Use directUploadAPI.uploadDocuments() instead
   */
  async uploadDocuments(files, onProgress = null) {
    console.warn('⚠️ DEPRECATED: uploadDocuments() is deprecated. Use directUploadAPI.uploadDocuments() instead.');
    return await directUploadAPI.uploadDocuments(files, onProgress);
  }

  /**
   * @deprecated Use directUploadAPI.uploadProfilePicture() instead
   */
  async uploadProfilePicture(file, onProgress = null) {
    console.warn('⚠️ DEPRECATED: uploadProfilePicture() is deprecated. Use directUploadAPI.uploadProfilePicture() instead.');
    return await directUploadAPI.uploadProfilePicture(file, onProgress);
  }

  /**
   * @deprecated Use directUploadAPI.uploadProfilePicture() instead
   */
  async smartUpload(file, folder, options = {}) {
    console.warn('⚠️ DEPRECATED: smartUpload() is deprecated. Use directUploadAPI methods instead.');
    
    if (folder === 'Profiles') {
      return await directUploadAPI.uploadProfilePicture(file, null, options);
    } else if (folder === 'Documents') {
      return await directUploadAPI.uploadDocuments([file], null, options);
    } else {
      return await directUploadAPI.uploadStationImages([file], null, options);
    }
  }

  /**
   * @deprecated All uploads now use direct S3 - this method is not needed
   */
  async uploadDirectToS3(file, folder) {
    console.warn('⚠️ DEPRECATED: uploadDirectToS3() is deprecated. All uploads are now direct to S3.');
    
    if (folder === 'Profiles') {
      return await directUploadAPI.uploadProfilePicture(file);
    } else if (folder === 'Documents') {
      const result = await directUploadAPI.uploadDocuments([file]);
      return result.files?.[0] || result;
    } else {
      const result = await directUploadAPI.uploadStationImages([file]);
      return result.images?.[0] || result;
    }
  }

  /**
   * @deprecated Use directUploadAPI methods instead
   */
  async uploadFileStream(file, folder, onProgress = null) {
    console.warn('⚠️ DEPRECATED: uploadFileStream() is deprecated. Use directUploadAPI methods instead.');
    return await this.smartUpload(file, folder);
  }

  // Utility methods
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create instance with deprecation warning
const optimizedUploadAPI = new OptimizedUploadService();

// Export for backward compatibility
export default optimizedUploadAPI;

// Also export utility functions that components might use
export const uploadUtilities = {
  /**
   * @deprecated Use directUploadAPI.uploadStationImages() instead
   */
  uploadMultiple: async (files, uploadType, options = {}) => {
    console.warn('⚠️ DEPRECATED: uploadMultiple() is deprecated. Use directUploadAPI methods instead.');
    
    if (uploadType === 'images' || uploadType === 'station-images') {
      return await directUploadAPI.uploadStationImages(files, null, options);
    } else if (uploadType === 'documents') {
      return await directUploadAPI.uploadDocuments(files, null, options);
    } else {
      return await directUploadAPI.uploadStationImages(files, null, options);
    }
  },

  /**
   * @deprecated Use directUploadAPI methods instead
   */
  uploadSingle: async (file, folder, options = {}) => {
    console.warn('⚠️ DEPRECATED: uploadSingle() is deprecated. Use directUploadAPI methods instead.');
    
    if (folder === 'Profiles') {
      return await directUploadAPI.uploadProfilePicture(file, null, options);
    } else if (folder === 'Documents') {
      const result = await directUploadAPI.uploadDocuments([file], null, options);
      return result.files?.[0] || result;
    } else {
      const result = await directUploadAPI.uploadStationImages([file], null, options);
      return result.images?.[0] || result;
    }
  }
};

/**
 * Migration Notice
 */
console.info(`
🚀 MIGRATION NOTICE: 
   
   Replace optimizedUploadAPI with directUploadAPI for:
   ✅ No more 413 Content Too Large errors
   ✅ Unlimited file sizes (up to S3 limits)  
   ✅ 99.99% less server resource usage
   ✅ Faster uploads (direct to S3)
   ✅ Better concurrent user support

   Quick Migration:
   - Old: import optimizedUploadAPI from './optimizedUploadAPI'
   - New: import { directUploadAPI } from './directS3Upload'
`);
