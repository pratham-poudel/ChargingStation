const { 
  uploadFile, 
  getFileUrl, 
  deleteFile, 
  listFiles, 
  getFileMetadata, 
  fileExists, 
  getFolders 
} = require('../config/minio');

class FileService {
  constructor() {
    this.folders = getFolders();
  }

  /**
   * Upload a profile picture for a station proprietor
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original file name
   * @param {string} proprietorId - ID of the proprietor
   * @returns {Promise<Object>} - Upload result
   */
  async uploadProfilePicture(fileBuffer, fileName, proprietorId) {
    try {
      // Add proprietor ID to filename for easy identification
      const modifiedFileName = `proprietor_${proprietorId}_${fileName}`;
      
      const result = await uploadFile(
        fileBuffer,
        modifiedFileName,
        this.folders.PROFILES,
        'image/jpeg' // Assuming JPEG, you can determine this from the buffer
      );

      return {
        ...result,
        type: 'profile_picture',
        proprietorId: proprietorId
      };
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw new Error('Failed to upload profile picture');
    }
  }

  /**
   * Upload a thumbnail/cover image for a charging station
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original file name
   * @param {string} stationId - ID of the charging station
   * @returns {Promise<Object>} - Upload result
   */
  async uploadStationThumbnail(fileBuffer, fileName, stationId) {
    try {
      const modifiedFileName = `station_${stationId}_thumbnail_${fileName}`;
      
      const result = await uploadFile(
        fileBuffer,
        modifiedFileName,
        this.folders.THUMBNAILS,
        'image/jpeg'
      );

      return {
        ...result,
        type: 'station_thumbnail',
        stationId: stationId
      };
    } catch (error) {
      console.error('Error uploading station thumbnail:', error);
      throw new Error('Failed to upload station thumbnail');
    }
  }

  /**
   * Upload station images
   * @param {Array} files - Array of file objects with buffer, fileName, mimeType
   * @param {string} stationId - ID of the charging station
   * @returns {Promise<Array>} - Array of upload results
   */
  async uploadStationImages(files, stationId) {
    try {
      const uploadPromises = files.map(async (file, index) => {
        const modifiedFileName = `station_${stationId}_image_${index + 1}_${file.fileName}`;
        
        return await uploadFile(
          file.buffer,
          modifiedFileName,
          this.folders.IMAGES,
          file.mimeType
        );
      });

      const results = await Promise.all(uploadPromises);
      
      return results.map((result, index) => ({
        ...result,
        type: 'station_image',
        stationId: stationId,
        imageIndex: index + 1
      }));
    } catch (error) {
      console.error('Error uploading station images:', error);
      throw new Error('Failed to upload station images');
    }
  }

  /**
   * Upload legal documents
   * @param {Array} files - Array of file objects with buffer, fileName, mimeType
   * @param {string} entityId - ID of the entity (station, proprietor, etc.)
   * @param {string} entityType - Type of entity (station, proprietor)
   * @returns {Promise<Array>} - Array of upload results
   */
  async uploadLegalDocuments(files, entityId, entityType) {
    try {
      const uploadPromises = files.map(async (file, index) => {
        const modifiedFileName = `${entityType}_${entityId}_doc_${index + 1}_${file.fileName}`;
        
        return await uploadFile(
          file.buffer,
          modifiedFileName,
          this.folders.DOCUMENTS,
          file.mimeType
        );
      });

      const results = await Promise.all(uploadPromises);
      
      return results.map((result, index) => ({
        ...result,
        type: 'legal_document',
        entityId: entityId,
        entityType: entityType,
        documentIndex: index + 1
      }));
    } catch (error) {
      console.error('Error uploading legal documents:', error);
      throw new Error('Failed to upload legal documents');
    }
  }

  /**
   * Get file URL with authentication check
   * @param {string} objectName - Object name in storage
   * @param {number} expiry - URL expiry time in seconds
   * @returns {Promise<string>} - File URL
   */
  async getFileUrlSecure(objectName, expiry = 3600) {
    try {
      const exists = await fileExists(objectName);
      if (!exists) {
        throw new Error('File not found');
      }

      return await getFileUrl(objectName, expiry);
    } catch (error) {
      console.error('Error getting secure file URL:', error);
      throw error;
    }
  }

  /**
   * Delete files by pattern
   * @param {string} pattern - Pattern to match files (e.g., "station_123_")
   * @param {string} folder - Folder to search in
   * @returns {Promise<Array>} - Array of deleted file names
   */
  async deleteFilesByPattern(pattern, folder) {
    try {
      const files = await listFiles(folder, 1000); // Get up to 1000 files
      const matchingFiles = files.filter(file => file.name.includes(pattern));
      
      const deletePromises = matchingFiles.map(file => deleteFile(file.name));
      await Promise.all(deletePromises);
      
      return matchingFiles.map(file => file.name);
    } catch (error) {
      console.error('Error deleting files by pattern:', error);
      throw error;
    }
  }

  /**
   * Get all files for a specific entity
   * @param {string} entityId - ID of the entity
   * @param {string} entityType - Type of entity (station, proprietor)
   * @returns {Promise<Object>} - Object containing categorized files
   */
  async getEntityFiles(entityId, entityType) {
    try {
      const allFiles = {};
      
      // Get files from each folder
      for (const [folderKey, folderName] of Object.entries(this.folders)) {
        const files = await listFiles(folderName, 1000);
        const entityFiles = files.filter(file => 
          file.name.includes(`${entityType}_${entityId}_`)
        );
        
        // Generate URLs for each file
        const filesWithUrls = await Promise.all(
          entityFiles.map(async (file) => {
            const url = await getFileUrl(file.name, 3600); // 1 hour expiry
            return {
              ...file,
              url: url,
              folder: folderName
            };
          })
        );
        
        allFiles[folderKey.toLowerCase()] = filesWithUrls;
      }
      
      return allFiles;
    } catch (error) {
      console.error('Error getting entity files:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary or orphaned files
   * @param {number} daysOld - Delete files older than this many days
   * @returns {Promise<Object>} - Cleanup results
   */
  async cleanupOldFiles(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const cleanupResults = {};
      
      for (const [folderKey, folderName] of Object.entries(this.folders)) {
        const files = await listFiles(folderName, 1000);
        const oldFiles = files.filter(file => file.lastModified < cutoffDate);
        
        const deletePromises = oldFiles.map(file => deleteFile(file.name));
        await Promise.all(deletePromises);
        
        cleanupResults[folderKey] = {
          folder: folderName,
          deletedCount: oldFiles.length,
          deletedFiles: oldFiles.map(f => f.name)
        };
      }
      
      return cleanupResults;
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      throw error;
    }
  }

  /**
   * Validate file type and size
   * @param {string} mimeType - MIME type of the file
   * @param {number} fileSize - Size of the file in bytes
   * @param {string} folder - Target folder
   * @returns {Object} - Validation result
   */
  validateFile(mimeType, fileSize, folder) {
    const maxSizes = {
      [this.folders.PROFILES]: 5 * 1024 * 1024, // 5MB
      [this.folders.THUMBNAILS]: 5 * 1024 * 1024, // 5MB
      [this.folders.IMAGES]: 10 * 1024 * 1024, // 10MB
      [this.folders.DOCUMENTS]: 20 * 1024 * 1024, // 20MB
      [this.folders.UPLOADS]: 10 * 1024 * 1024 // 10MB
    };

    const allowedTypes = {
      [this.folders.PROFILES]: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      [this.folders.THUMBNAILS]: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      [this.folders.IMAGES]: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      [this.folders.DOCUMENTS]: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ],
      [this.folders.UPLOADS]: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/json'
      ]
    };

    const errors = [];

    // Check file size
    if (fileSize > maxSizes[folder]) {
      errors.push(`File size exceeds maximum allowed size of ${maxSizes[folder] / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!allowedTypes[folder].includes(mimeType)) {
      errors.push(`File type ${mimeType} not allowed for ${folder} folder`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

// Create singleton instance
const fileService = new FileService();

module.exports = {
  FileService,
  fileService
};
