/**
 * Concurrency-safe upload queue manager for frontend
 * Prevents conflicts when multiple users perform operations during sequential uploads
 */
class UploadQueueManager {
  constructor() {
    this.queue = [];
    this.activeUploads = new Map();
    this.maxConcurrentUploads = 1; // Sequential processing to avoid 413 errors
    this.uploadSession = null;
    this.globalStats = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalBytes: 0
    };
  }

  /**
   * Add upload task to queue
   * @param {Array} files - Files to upload
   * @param {Function} onProgress - Progress callback
   * @param {Object} options - Upload options
   * @returns {Promise} Upload result
   */
  async addUploadTask(files, onProgress, options = {}) {
    const taskId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate files
    if (!files || files.length === 0) {
      throw new Error('No files provided for upload');
    }

    // Check file sizes
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 50 * 1024 * 1024; // 50MB total limit
    
    if (totalSize > maxTotalSize) {
      throw new Error(`Total file size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds limit (${maxTotalSize / 1024 / 1024}MB)`);
    }

    return new Promise((resolve, reject) => {
      const task = {
        id: taskId,
        files: Array.from(files),
        onProgress,
        options,
        resolve,
        reject,
        createdAt: Date.now(),
        totalSize,
        status: 'queued'
      };

      this.queue.push(task);
      
      // Update queue status for UI
      this.notifyQueueStatus();
      
      // Start processing if not already running
      this.processQueue();
    });
  }

  /**
   * Process upload queue sequentially
   */
  async processQueue() {
    // Don't start new processing if already at max capacity
    if (this.activeUploads.size >= this.maxConcurrentUploads || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    this.activeUploads.set(task.id, task);
    task.status = 'uploading';

    console.log(`🚀 Starting upload task ${task.id} with ${task.files.length} files`);

    try {
      // Create upload session identifier
      this.createUploadSession(task);
      
      const result = await this.executeUpload(task);
      
      // Update statistics
      this.globalStats.totalUploads++;
      this.globalStats.successfulUploads++;
      this.globalStats.totalBytes += task.totalSize;
      
      task.status = 'completed';
      task.resolve(result);
      
      console.log(`✅ Upload task ${task.id} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Upload task ${task.id} failed:`, error);
      
      this.globalStats.totalUploads++;
      this.globalStats.failedUploads++;
      
      task.status = 'failed';
      task.error = error.message;
      task.reject(error);
      
    } finally {
      this.activeUploads.delete(task.id);
      this.notifyQueueStatus();
      
      // Process next task in queue
      setTimeout(() => this.processQueue(), 100); // Small delay to prevent overwhelming
    }
  }

  /**
   * Create upload session for tracking
   */
  createUploadSession(task) {
    this.uploadSession = {
      sessionId: `session_${task.id}`,
      taskId: task.id,
      startTime: Date.now(),
      totalFiles: task.files.length,
      uploadedFiles: 0,
      totalSize: task.totalSize,
      uploadedSize: 0
    };
  }

  /**
   * Execute upload with enhanced error handling and progress tracking
   */
  async executeUpload(task) {
    const { files, onProgress, options } = task;
    const uploadedUrls = [];
    const uploadSession = this.uploadSession;

    // Sequential upload with proper error isolation
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        console.log(`📤 Uploading file ${i + 1}/${files.length}: ${file.name}`);
        
        // Create FormData for this file
        const formData = new FormData();
        formData.append('image', file);
        
        // Add upload session info if available
        if (uploadSession) {
          formData.append('sessionId', uploadSession.sessionId);
          formData.append('fileIndex', i.toString());
        }

        // Make request with retry logic
        const uploadResult = await this.uploadWithRetry(formData, file, options);
        
        uploadedUrls.push({
          url: uploadResult.url,
          objectName: uploadResult.objectName,
          originalName: uploadResult.originalName,
          fileName: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });

        // Update progress
        uploadSession.uploadedFiles = i + 1;
        uploadSession.uploadedSize += file.size;
        
        if (onProgress) {
          const progress = {
            loaded: uploadSession.uploadedSize,
            total: uploadSession.totalSize,
            percentage: Math.round((uploadSession.uploadedSize / uploadSession.totalSize) * 100),
            currentFile: i + 1,
            totalFiles: files.length,
            currentFileName: file.name
          };
          
          onProgress(progress);
        }

        console.log(`✅ File ${i + 1} uploaded successfully`);
        
        // Small delay between uploads to prevent overwhelming
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

      } catch (error) {
        console.error(`❌ Failed to upload file ${i + 1} (${file.name}):`, error);
        
        // Decision: Continue with other files or fail completely?
        if (options.stopOnFirstError) {
          throw new Error(`Upload failed at file ${i + 1}: ${error.message}`);
        } else {
          // Log error but continue with other files
          console.warn(`⚠️ Skipping failed file ${i + 1}, continuing with others...`);
        }
      }
    }

    if (uploadedUrls.length === 0) {
      throw new Error('No files were uploaded successfully');
    }

    console.log(`🎉 Upload batch completed: ${uploadedUrls.length}/${files.length} files successful`);
    
    return uploadedUrls;
  }

  /**
   * Upload single file with retry logic
   */
  async uploadWithRetry(formData, file, options, maxRetries = 3) {
    const apiUrl = options.apiUrl || '/api/uploads-optimized/station-image-single';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Upload attempt ${attempt}/${maxRetries} for ${file.name}`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-API-Key': 'your-super-secret-api-key-2024',
            'X-Frontend-Request': 'true'
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Handle specific error types
          if (response.status === 429) {
            // Rate limited - wait and retry
            const retryAfter = parseInt(response.headers.get('Retry-After')) || 10;
            console.log(`⏱️ Rate limited, waiting ${retryAfter} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            continue;
          }
          
          if (response.status === 413) {
            // File too large - don't retry
            throw new Error(`File too large: ${file.name}`);
          }
          
          throw new Error(`Upload failed: ${errorData.message || response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Upload failed');
        }

        return result.data;
        
      } catch (error) {
        console.error(`❌ Upload attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries || error.message.includes('too large')) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏱️ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      activeUploads: this.activeUploads.size,
      totalProcessed: this.globalStats.totalUploads,
      successRate: this.globalStats.totalUploads > 0 
        ? Math.round((this.globalStats.successfulUploads / this.globalStats.totalUploads) * 100) 
        : 0,
      currentSession: this.uploadSession,
      statistics: this.globalStats
    };
  }

  /**
   * Notify queue status change (for UI updates)
   */
  notifyQueueStatus() {
    const status = this.getQueueStatus();
    
    // Dispatch custom event for UI components to listen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('uploadQueueStatus', { 
        detail: status 
      }));
    }
    
    console.log('📊 Queue Status:', status);
  }

  /**
   * Cancel all pending uploads
   */
  cancelAllUploads() {
    // Cancel queued uploads
    this.queue.forEach(task => {
      task.reject(new Error('Upload cancelled by user'));
    });
    this.queue = [];
    
    // Note: Active uploads cannot be cancelled easily with fetch API
    // They will complete but results will be ignored
    
    this.notifyQueueStatus();
    console.log('🚫 All pending uploads cancelled');
  }

  /**
   * Clear upload statistics
   */
  clearStatistics() {
    this.globalStats = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalBytes: 0
    };
    console.log('🧹 Upload statistics cleared');
  }
}

// Create global instance
const uploadQueueManager = new UploadQueueManager();

// Enhanced upload API that uses the queue manager
const optimizedUploadAPI = {
  /**
   * Upload station images using queue manager
   */
  async uploadStationImages(files, onProgress, options = {}) {
    return await uploadQueueManager.addUploadTask(files, onProgress, {
      ...options,
      apiUrl: '/api/uploads-optimized/station-image-single'
    });
  },

  /**
   * Upload documents using queue manager
   */
  async uploadDocuments(files, onProgress, options = {}) {
    return await uploadQueueManager.addUploadTask(files, onProgress, {
      ...options,
      apiUrl: '/api/uploads-optimized/document-single'
    });
  },

  /**
   * Get queue status
   */
  getQueueStatus() {
    return uploadQueueManager.getQueueStatus();
  },

  /**
   * Cancel uploads
   */
  cancelUploads() {
    return uploadQueueManager.cancelAllUploads();
  }
};

export { optimizedUploadAPI, uploadQueueManager };
