/**
 * Optimized Station Images Upload Strategy
 * 
 * PROBLEM: Current approach uploads multiple large images in one request
 * - Creates massive payloads (10-25MB)
 * - Exceeds Nginx client_max_body_size limits
 * - High memory usage
 * - Prone to timeout and failure
 * 
 * SOLUTION: Sequential single-image uploads with progress tracking
 * - Upload one image at a time
 * - Smaller individual requests
 * - Better error handling
 * - Progress feedback
 * - Memory efficient
 */

// Backend: Add new endpoint for single station image upload
router.post('/station-image-single',
  protect,
  memoryMonitor,
  uploadRateLimit(10, 60000), // 10 single image uploads per minute
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image uploaded'
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
        'Images',
        req.file.mimetype,
        req.file.size
      );
      
      // Clean up temp file
      for (const tempFile of tempFilesToCleanup) {
        await optimizedUploadService.cleanupTempFile(tempFile);
      }

      res.json({
        success: true,
        message: 'Station image uploaded successfully',
        image: {
          ...result,
          fieldName: req.file.fieldname,
          mimetype: req.file.mimetype
        },
        memoryUsage: req.memoryUsage
      });
    } catch (error) {
      console.error('Error uploading station image:', error);
      res.status(500).json({
        success: false,
        message: 'Station image upload failed'
      });
    }
  }
);

// Frontend: Sequential upload with progress tracking
class OptimizedStationImageUpload {
  async uploadStationImages(files, onProgress = null) {
    const results = [];
    const errors = [];
    let totalFiles = files.length;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: totalFiles,
            filename: file.name,
            status: 'uploading'
          });
        }
        
        const formData = new FormData();
        formData.append('image', file);
        
        const { data } = await optimizedUploadClient.post('/station-image-single', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (data.success) {
          results.push(data.image);
          
          if (onProgress) {
            onProgress({
              current: i + 1,
              total: totalFiles,
              filename: file.name,
              status: 'completed'
            });
          }
        } else {
          errors.push({ file: file.name, error: data.message });
        }
        
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        errors.push({ file: file.name, error: error.message });
        
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: totalFiles,
            filename: file.name,
            status: 'error',
            error: error.message
          });
        }
      }
    }
    
    return {
      success: errors.length === 0,
      images: results,
      errors: errors,
      uploaded: results.length,
      failed: errors.length
    };
  }
}
