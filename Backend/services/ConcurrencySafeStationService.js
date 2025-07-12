const mongoose = require('mongoose');
const ChargingStation = require('../models/ChargingStation');
const Vendor = require('../models/Vendor');

/**
 * Concurrency-safe database operations for station management
 */
class ConcurrencySafeStationService {
  
  /**
   * Create a new charging station with images using atomic transaction
   * @param {Object} stationData - Station data
   * @param {Array} images - Array of uploaded images
   * @param {String} vendorId - Vendor ID
   * @returns {Promise<Object>} Created station
   */
  static async createStationWithImages(stationData, images = [], vendorId) {
    const session = await mongoose.startSession();
    
    try {
      const result = await session.withTransaction(async () => {
        // Prepare image data
        const imageData = images.map((img, index) => ({
          url: img?.url,
          objectName: img?.objectName || img?.key,
          originalName: img?.originalName || img?.filename,
          isPrimary: index === 0,
          isThumbnail: index === 0,
          uploadedAt: new Date(),
          uploadStatus: 'completed',
          size: img.size,
          mimetype: img.mimetype || 'image/jpeg'
        }));
        
        // Create station with atomic operation
        const station = new ChargingStation({
          ...stationData,
          vendor: vendorId,
          images: imageData,
          imageCount: imageData.length,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await station.save({ session });
        
        // Update vendor statistics atomically
        await Vendor.findByIdAndUpdate(
          vendorId,
          { 
            $inc: { 
              stationCount: 1,
              totalImageUploads: imageData.length
            },
            $set: {
              lastStationCreated: new Date()
            }
          },
          { session, new: true }
        );
        
        return station;
      });
      
      console.log(`✅ Station created successfully with ${images.length} images`);
      return result;
      
    } catch (error) {
      console.error('❌ Error creating station with images:', error);
      throw new Error(`Failed to create station: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }
  
  /**
   * Update existing charging station with new images using atomic transaction
   * @param {String} stationId - Station ID
   * @param {Array} newImages - Array of new images to add
   * @param {Array} imagesToRemove - Array of image URLs to remove
   * @returns {Promise<Object>} Updated station
   */
  static async updateStationImages(stationId, newImages = [], imagesToRemove = []) {
    const session = await mongoose.startSession();
    
    try {
      const result = await session.withTransaction(async () => {
        // Get current station
        const station = await ChargingStation.findById(stationId).session(session);
        if (!station) {
          throw new Error('Station not found');
        }
        
        // Remove specified images
        let currentImages = station.images.filter(img => 
          !imagesToRemove.includes(img?.url)
        );
        
        // Add new images
        const newImageData = newImages.map((img, index) => ({
          url: img?.url,
          objectName: img?.objectName || img?.key,
          originalName: img?.originalName || img?.filename,
          isPrimary: currentImages.length === 0 && index === 0, // First image is primary if no existing images
          isThumbnail: currentImages.length === 0 && index === 0,
          uploadedAt: new Date(),
          uploadStatus: 'completed',
          size: img?.size,
          mimetype: img?.mimetype || 'image/jpeg'
        }));
        
        currentImages = [...currentImages, ...newImageData];
        
        // Update station atomically
        const updatedStation = await ChargingStation.findByIdAndUpdate(
          stationId,
          {
            $set: {
              images: currentImages,
              imageCount: currentImages.length,
              updatedAt: new Date()
            }
          },
          { session, new: true }
        );
        
        // Update vendor statistics
        await Vendor.findByIdAndUpdate(
          station.vendor,
          {
            $inc: {
              totalImageUploads: newImageData.length,
              totalImageRemovals: imagesToRemove.length
            },
            $set: {
              lastStationUpdated: new Date()
            }
          },
          { session }
        );
        
        return updatedStation;
      });
      
      console.log(`✅ Station updated: +${newImages.length} images, -${imagesToRemove.length} images`);
      return result;
      
    } catch (error) {
      console.error('❌ Error updating station images:', error);
      throw new Error(`Failed to update station images: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }
  
  /**
   * Handle pre-uploaded images for station creation/update
   * @param {String} stationId - Station ID (null for new station)
   * @param {Object} stationData - Station data
   * @param {Array} preUploadedImages - Array of pre-uploaded image URLs
   * @param {String} vendorId - Vendor ID
   * @returns {Promise<Object>} Station result
   */
  static async handlePreUploadedImages(stationId, stationData, preUploadedImages, vendorId) {
    try {
      // Validate pre-uploaded images format
      const validatedImages = preUploadedImages.map(img => {
        if (typeof img === 'string') {
          // Handle simple URL string
          return {
            url: img,
            objectName: img.split('/').pop(),
            originalName: img.split('/').pop(),
            uploadStatus: 'completed'
          };
        } else if (img?.url) {
          // Handle object format
          return {
            url: img.url,
            objectName: img?.objectName || img.url.split('/').pop(),
            originalName: img?.originalName || img.url.split('/').pop(),
            uploadStatus: 'completed',
            size: img?.size,
            mimetype: img?.mimetype
          };
        } else {
          throw new Error('Invalid image format in pre-uploaded images');
        }
      });
      
      if (stationId) {
        // Update existing station
        return await this.updateStationImages(stationId, validatedImages, []);
      } else {
        // Create new station
        return await this.createStationWithImages(stationData, validatedImages, vendorId);
      }
      
    } catch (error) {
      console.error('❌ Error handling pre-uploaded images:', error);
      throw new Error(`Failed to handle pre-uploaded images: ${error.message}`);
    }
  }
  
  /**
   * Get station with concurrency-safe read
   * @param {String} stationId - Station ID
   * @returns {Promise<Object>} Station data
   */
  static async getStationSafely(stationId) {
    try {
      const station = await ChargingStation.findById(stationId)
        .populate('vendor', 'businessName email')
        .lean(); // Use lean() for better performance on read-only operations
      
      if (!station) {
        throw new Error('Station not found');
      }
      
      return station;
    } catch (error) {
      console.error('❌ Error getting station:', error);
      throw new Error(`Failed to get station: ${error.message}`);
    }
  }
  
  /**
   * Batch operation for multiple station updates (useful for concurrent uploads)
   * @param {Array} operations - Array of operation objects
   * @returns {Promise<Array>} Results array
   */
  static async performBatchOperations(operations) {
    const session = await mongoose.startSession();
    
    try {
      const results = await session.withTransaction(async () => {
        const batchResults = [];
        
        for (const operation of operations) {
          const { type, stationId, data } = operation;
          
          switch (type) {
            case 'create':
              const newStation = await this.createStationWithImages(
                data.stationData, 
                data.images, 
                data.vendorId
              );
              batchResults.push({ success: true, result: newStation });
              break;
              
            case 'update':
              const updatedStation = await this.updateStationImages(
                stationId,
                data.newImages,
                data.imagesToRemove
              );
              batchResults.push({ success: true, result: updatedStation });
              break;
              
            default:
              batchResults.push({ 
                success: false, 
                error: `Unknown operation type: ${type}` 
              });
          }
        }
        
        return batchResults;
      });
      
      console.log(`✅ Batch operations completed: ${results.length} operations`);
      return results;
      
    } catch (error) {
      console.error('❌ Error in batch operations:', error);
      throw new Error(`Batch operations failed: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }
}

module.exports = ConcurrencySafeStationService;
