class UploadService {
  constructor() {
    this.activeUploads = new Map()
  }

  async uploadFiles(files, options = {}) {
    const batchId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Initialize progress tracking
    const progressTracker = {
      overall: 0,
      completed: 0,
      files: files.map(() => ({ status: 'pending', progress: 0 })),
      currentFile: null,
      step: 'preparing'
    }

    // Store the upload reference
    this.activeUploads.set(batchId, {
      files,
      progressTracker,
      onProgress: options.onProgress,
      onStepChange: options.onStepChange,
      cancelled: false
    })

    try {
      // Step 1: Prepare files
      await this.updateStep(batchId, 'preparing')
      await this.delay(500) // Small delay for UX

      // Step 2: Generate presigned URLs
      await this.updateStep(batchId, 'generating')
      const presignedUrls = await this.generatePresignedUrls(files, batchId)

      // Step 3: Upload files
      await this.updateStep(batchId, 'uploading')
      const uploadResults = await this.uploadFilesToStorage(files, presignedUrls, batchId)

      // Step 4: Confirm batch
      await this.updateStep(batchId, 'confirming')
      const confirmResult = await this.confirmBatchUpload(batchId, uploadResults)

      // Step 5: Complete
      await this.updateStep(batchId, 'completed')
      this.updateProgress(batchId, { overall: 100, completed: files.length })

      return {
        success: true,
        urls: confirmResult.data.confirmedFiles.map(file => file.url),
        batchId
      }

    } catch (error) {
      await this.updateStep(batchId, 'error')
      throw error
    } finally {
      // Cleanup after a delay
      setTimeout(() => {
        this.activeUploads.delete(batchId)
      }, 5000)
    }
  }

  async generatePresignedUrls(files, batchId) {
    const uploadData = {
      files: files.map(file => ({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      })),
      batchId
    }

    // Get token from localStorage (try different token keys)
    const vendorToken = localStorage.getItem('merchantToken');
    const employeeToken = localStorage.getItem('employeeToken');
    const userToken = localStorage.getItem('token');
    const token = vendorToken || employeeToken || userToken;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const fullUrl = `${apiUrl}/presigned-upload/batch-generate`
    
    console.log('🔄 Generating presigned URLs:', {
      url: fullUrl,
      hasToken: !!token,
      tokenType: vendorToken ? 'merchant' : employeeToken ? 'employee' : userToken ? 'user' : 'none',
      fileCount: files.length
    });

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(uploadData)
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to generate presigned URLs:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to generate presigned URLs: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('✅ Generated presigned URLs successfully:', result);
    return result
  }

  async uploadFilesToStorage(files, presignedData, batchId) {
    const upload = this.activeUploads.get(batchId)
    if (!upload || upload.cancelled) {
      throw new Error('Upload cancelled')
    }

    // Check if we have successful URLs
    if (!presignedData.data || !presignedData.data.uploadUrls) {
      console.error('❌ Invalid presigned data structure:', presignedData);
      throw new Error('No upload URLs received from server')
    }

    const uploadUrls = presignedData.data.uploadUrls;
    const successfulUploads = uploadUrls.filter(url => url.success);
    
    console.log('📋 Upload URLs received:', {
      total: uploadUrls.length,
      successful: successfulUploads.length,
      failed: uploadUrls.length - successfulUploads.length,
      uploadUrls: uploadUrls.map(url => ({
        index: url.index,
        success: url.success,
        error: url.error,
        hasUploadUrl: !!url.uploadUrl
      }))
    });
    
    if (successfulUploads.length === 0) {
      const errors = uploadUrls.map(url => url.error).join(', ');
      throw new Error(`Failed to generate any upload URLs: ${errors}`)
    }

    const uploadPromises = files.map(async (file, index) => {
      if (upload.cancelled) {
        throw new Error('Upload cancelled')
      }

      const urlData = uploadUrls[index];
      
      // Check if this specific file's URL generation was successful
      if (!urlData || !urlData.success) {
        upload.progressTracker.files[index].status = 'error'
        throw new Error(`Failed to get upload URL for ${file.name}: ${urlData?.error || 'Unknown error'}`)
      }

      const presignedUrl = urlData.uploadUrl;
      
      // Update current file being uploaded
      this.updateProgress(batchId, {
        currentFile: { name: file.name, progress: 0 }
      })

      // Update file status to uploading
      upload.progressTracker.files[index].status = 'uploading'
      this.notifyProgress(batchId)

      try {
        const result = await this.uploadSingleFile(file, presignedUrl, (progress) => {
          // Update individual file progress
          upload.progressTracker.files[index].progress = progress
          this.updateProgress(batchId, {
            currentFile: { name: file.name, progress }
          })
        }, batchId)

        // Mark file as completed
        upload.progressTracker.files[index].status = 'completed'
        upload.progressTracker.files[index].progress = 100
        upload.progressTracker.completed++

        // Update overall progress
        const overallProgress = (upload.progressTracker.completed / files.length) * 80 // 80% for upload, 20% for confirmation
        this.updateProgress(batchId, { overall: overallProgress })

        // Return the file data in the format expected by batch-confirm
        return {
          objectName: urlData.objectName,
          fileUrl: urlData.fileUrl,
          fileName: urlData.fileName,
          fileSize: urlData.fileSize,
          fileType: urlData.fileType,
          index: index
        }

      } catch (error) {
        upload.progressTracker.files[index].status = 'error'
        throw error
      }
    })

    return await Promise.all(uploadPromises)
  }

  async uploadSingleFile(file, presignedUrl, onProgress, batchId) {
    const upload = this.activeUploads.get(batchId)
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (upload?.cancelled) {
          xhr.abort()
          return
        }

        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            url: presignedUrl.split('?')[0], // Remove query parameters to get clean URL
            key: presignedUrl.match(/\/([^\/\?]+)\?/)?.[1]
          })
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'))
      })

      xhr.open('PUT', presignedUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }

  async confirmBatchUpload(batchId, uploadResults) {
    // Get token from localStorage (try different token keys)
    const vendorToken = localStorage.getItem('merchantToken');
    const employeeToken = localStorage.getItem('employeeToken');
    const userToken = localStorage.getItem('token');
    const token = vendorToken || employeeToken || userToken;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const fullUrl = `${apiUrl}/presigned-upload/batch-confirm`
    
    console.log('🔄 Confirming batch upload:', {
      url: fullUrl,
      batchId,
      hasToken: !!token,
      uploadedFilesCount: uploadResults.length,
      uploadedFiles: uploadResults.map(file => ({
        fileName: file.fileName,
        objectName: file.objectName,
        fileSize: file.fileSize,
        index: file.index
      }))
    });

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({
        batchId,
        uploadedFiles: uploadResults
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to confirm batch upload:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to confirm batch upload: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('✅ Confirmed batch upload successfully:', result);
    return result
  }

  async updateStep(batchId, step) {
    const upload = this.activeUploads.get(batchId)
    if (upload) {
      upload.progressTracker.step = step
      if (upload.onStepChange) {
        upload.onStepChange(step)
      }
      this.notifyProgress(batchId)
    }
  }

  updateProgress(batchId, updates) {
    const upload = this.activeUploads.get(batchId)
    if (upload) {
      Object.assign(upload.progressTracker, updates)
      this.notifyProgress(batchId)
    }
  }

  notifyProgress(batchId) {
    const upload = this.activeUploads.get(batchId)
    if (upload && upload.onProgress) {
      upload.onProgress(upload.progressTracker)
    }
  }

  cancelUpload(batchId) {
    if (batchId) {
      // Cancel specific upload
      const upload = this.activeUploads.get(batchId)
      if (upload) {
        upload.cancelled = true
        this.activeUploads.delete(batchId)
      }
    } else {
      // Cancel all active uploads if no specific batchId provided
      for (const [id, upload] of this.activeUploads.entries()) {
        upload.cancelled = true
        this.activeUploads.delete(id)
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export default new UploadService()
