import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance for presigned uploads
const presignedAPI = axios.create({
  baseURL: `${API_BASE_URL}/presigned-upload`,
  timeout: 30000,
})

// Add auth token to requests
presignedAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('merchantToken') || localStorage.getItem('userToken') || localStorage.getItem('adminToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle auth errors
presignedAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Remove tokens and redirect based on current path
      localStorage.removeItem('merchantToken')
      localStorage.removeItem('userToken')
      localStorage.removeItem('adminToken')
      
      if (window.location.pathname.includes('/merchant')) {
        window.location.href = '/merchant/login'
      } else if (window.location.pathname.includes('/admin')) {
        window.location.href = '/admin/login'
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const presignedUploadAPI = {
  // Generate presigned URL for single file upload
  generateUploadUrl: async (fileData) => {
    const response = await presignedAPI.post('/generate-upload-url', fileData)
    return response.data
  },

  // Generate presigned URLs for batch upload
  generateBatchUploadUrls: async (filesData) => {
    const response = await presignedAPI.post('/batch-generate', filesData)
    return response.data
  },

  // Confirm single file upload
  confirmUpload: async (uploadData) => {
    const response = await presignedAPI.post('/confirm-upload', uploadData)
    return response.data
  },

  // Confirm batch file upload
  confirmBatchUpload: async (batchData) => {
    const response = await presignedAPI.post('/batch-confirm', batchData)
    return response.data
  },

  // Upload file directly to R2 using presigned URL
  uploadFileToR2: async (uploadUrl, file, onProgress = null) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100
            onProgress(percentComplete)
          }
        })
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve({
            success: true,
            status: xhr.status
          })
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'))
      })

      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.setRequestHeader('Content-Length', file.size.toString())
      xhr.send(file)
    })
  },

  // Complete workflow: Generate URL, Upload File, Confirm Upload
  uploadFile: async (file, folder = 'Images', onProgress = null) => {
    try {
      // Step 1: Generate presigned URL
      const urlResponse = await presignedUploadAPI.generateUploadUrl({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        folder: folder
      })

      if (!urlResponse.success) {
        throw new Error(urlResponse.message || 'Failed to generate upload URL')
      }

      // Step 2: Upload file to R2
      await presignedUploadAPI.uploadFileToR2(
        urlResponse.data.uploadUrl,
        file,
        onProgress
      )

      // Step 3: Confirm upload
      const confirmResponse = await presignedUploadAPI.confirmUpload({
        objectName: urlResponse.data.objectName,
        fileUrl: urlResponse.data.fileUrl,
        fileName: urlResponse.data.fileName,
        fileSize: file.size,
        fileType: file.type
      })

      if (!confirmResponse.success) {
        throw new Error(confirmResponse.message || 'Failed to confirm upload')
      }

      return {
        success: true,
        data: {
          url: urlResponse.data.fileUrl,
          objectName: urlResponse.data.objectName,
          fileName: urlResponse.data.fileName,
          size: file.size,
          mimetype: file.type,
          uploadedAt: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('Upload file error:', error)
      throw error
    }
  },

  // Upload multiple files
  uploadFiles: async (files, folder = 'Images', onProgress = null) => {
    try {
      const fileData = files.map(file => ({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      }))

      // Step 1: Generate batch presigned URLs
      const urlResponse = await presignedUploadAPI.generateBatchUploadUrls({
        files: fileData,
        folder: folder
      })

      if (!urlResponse.success) {
        throw new Error(urlResponse.message || 'Failed to generate upload URLs')
      }

      // Step 2: Upload all files to R2
      const uploadPromises = urlResponse.data.uploadUrls.map(async (urlData, index) => {
        if (!urlData.success) {
          return {
            index,
            success: false,
            error: urlData.error
          }
        }

        try {
          await presignedUploadAPI.uploadFileToR2(
            urlData.uploadUrl,
            files[index],
            onProgress ? (progress) => onProgress(index, progress) : null
          )

          return {
            index,
            success: true,
            objectName: urlData.objectName,
            fileUrl: urlData.fileUrl,
            fileName: urlData.fileName,
            fileSize: files[index].size,
            fileType: files[index].type
          }
        } catch (error) {
          return {
            index,
            success: false,
            error: error.message
          }
        }
      })

      const uploadResults = await Promise.all(uploadPromises)
      const successfulUploads = uploadResults.filter(result => result.success)

      // Step 3: Confirm successful uploads
      if (successfulUploads.length > 0) {
        const confirmResponse = await presignedUploadAPI.confirmBatchUpload({
          batchId: urlResponse.data.batchId,
          uploadedFiles: successfulUploads
        })

        if (!confirmResponse.success) {
          console.warn('Failed to confirm batch upload:', confirmResponse.message)
        }
      }

      return {
        success: true,
        data: {
          batchId: urlResponse.data.batchId,
          totalFiles: files.length,
          successfulUploads: successfulUploads.length,
          failedUploads: uploadResults.length - successfulUploads.length,
          results: uploadResults,
          confirmedFiles: successfulUploads.map(upload => ({
            url: upload.fileUrl,
            objectName: upload.objectName,
            fileName: upload.fileName,
            size: upload.fileSize,
            mimetype: upload.fileType,
            uploadedAt: new Date().toISOString()
          }))
        }
      }

    } catch (error) {
      console.error('Upload files error:', error)
      throw error
    }
  }
}

export default presignedUploadAPI
