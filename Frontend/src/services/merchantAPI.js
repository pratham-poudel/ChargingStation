import axios from 'axios'
import { getDeviceInfo } from '../utils/deviceManager'
import optimizedUploadAPI from './optimizedUploadAPI'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance
const merchantApiClient = axios.create({
  baseURL: `${API_BASE_URL}/vendor`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
merchantApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('merchantToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Log subscription requests only
    if (config.url?.includes('/subscription')) {
      console.log(`🌐 SUBSCRIPTION API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
        params: config.params
      });
    }
    
    return config
  },
  (error) => {
    console.error('🚨 Request interceptor error:', error);
    return Promise.reject(error)
  }
)

// Response interceptor to handle common errors
merchantApiClient.interceptors.response.use(
  (response) => {
    // Log subscription responses only
    if (response.config.url?.includes('/subscription')) {
      console.log(`✅ SUBSCRIPTION API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
    }
    return response.data
  },
  (error) => {
    // Always log subscription errors, other errors only if they're important
    if (error.config?.url?.includes('/subscription') || error.response?.status === 401 || error.response?.status === 403) {
      console.error(`❌ ${error.config?.url?.includes('/subscription') ? 'SUBSCRIPTION ' : ''}API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    }
    
    if (error.response?.status === 401) {
      console.warn('🔐 Unauthorized access, redirecting to login...');
      localStorage.removeItem('merchantToken')
      window.location.href = '/merchant/login'
    }
    return Promise.reject(error)
  }
)

export const merchantAPI = {
  // Authentication
  register: (data) => merchantApiClient.post('/auth/register', data),
    sendLoginOTP: async (identifier, fcmToken = null) => {
    const { deviceInfo } = await getDeviceInfo();
    return merchantApiClient.post('/auth/send-login-otp', { 
      identifier, 
      deviceInfo,
      fcmToken
    });
  },
  
  verifyLoginOTP: async (data, fcmToken = null) => {
    const { deviceId, deviceInfo } = await getDeviceInfo();
    return merchantApiClient.post('/auth/verify-login-otp', {
      ...data,
      deviceId,
      deviceInfo,
      fcmToken
    });
  },
  
  passwordLogin: async (data, fcmToken = null) => {
    const { deviceId, deviceInfo } = await getDeviceInfo();
    return merchantApiClient.post('/auth/password-login', {
      ...data,
      deviceId,
      deviceInfo,
      fcmToken
    });
  },
    setPassword: (data) => merchantApiClient.post('/auth/set-password', data),
    changePassword: (data) => merchantApiClient.post('/auth/change-password', data),
  
  updateTwoFactorAuth: (data) => merchantApiClient.put('/auth/two-factor', data),
    getProfile: () => merchantApiClient.get('/auth/me'),
  
  logout: () => merchantApiClient.post('/auth/logout'),

  // FCM and App Management
  updateFCMToken: (data) => merchantApiClient.post('/auth/fcm-token', data),
  removeFCMToken: (data) => merchantApiClient.delete('/auth/fcm-token', { data }),
  updateAppPreferences: (data) => merchantApiClient.put('/auth/app-preferences', data),
  getDeviceSessions: () => merchantApiClient.get('/auth/sessions'),
  endDeviceSession: (deviceId) => merchantApiClient.delete(`/auth/sessions/${deviceId}`),
  logoutApp: (data) => merchantApiClient.post('/auth/logout-app', data),

  // Forgot Password
  forgotPassword: async (identifier) => {
    const { deviceInfo } = await getDeviceInfo();
    return merchantApiClient.post('/auth/forgot-password', { 
      identifier, 
      deviceInfo 
    });
  },
  
  resetPassword: async (data) => {
    const { deviceId, deviceInfo } = await getDeviceInfo();
    return merchantApiClient.post('/auth/reset-password', {
      ...data,
      deviceId,
      deviceInfo
    });
  },  // Dashboard
  getDashboardStats: () => merchantApiClient.get('/dashboard/stats'),
  
  getOnboardingStatus: () => merchantApiClient.get('/dashboard/onboarding'),

  // Subscription Management
  checkSubscriptionStatus: () => merchantApiClient.get('/subscription/status'),
  getSubscriptionDetails: () => merchantApiClient.get('/subscription'),
  upgradeSubscription: (data) => merchantApiClient.post('/subscription/upgrade', data),
  getStationSubscriptions: () => merchantApiClient.get('/subscription/stations'),
  activateStationPremium: (stationId, data) => merchantApiClient.post(`/subscription/stations/${stationId}/activate`, data),
  extendStationPremium: (stationId, data) => merchantApiClient.post(`/subscription/stations/${stationId}/extend`, data),
  deactivateStationPremium: (stationId) => merchantApiClient.post(`/subscription/stations/${stationId}/deactivate`),
  getPaymentHistory: (params = {}) => merchantApiClient.get('/subscription/payment-history', { params }),
    updateProfile: (data) => merchantApiClient.put('/dashboard/profile', data),
  
  uploadProfilePicture: async (file) => {
    try {
      const result = await optimizedUploadAPI.uploadProfilePicture(file);
      return result;
    } catch (error) {
      throw error;
    }
  },
  
  updateNotificationPreferences: (data) => merchantApiClient.put('/dashboard/notification-preferences', data),
  
  getTransactions: (params) => merchantApiClient.get('/dashboard/transactions', { params }),
  
  getStations: (params) => merchantApiClient.get('/dashboard/stations', { params }),
  // Device Management
  getTrustedDevices: () => merchantApiClient.get('/auth/trusted-devices'),
  
  removeTrustedDevice: (deviceId) => merchantApiClient.delete(`/auth/trusted-devices/${deviceId}`),
  
  cleanupDevices: () => merchantApiClient.post('/auth/cleanup-devices'),
  
  cleanupDevices: () => merchantApiClient.post('/auth/cleanup-devices'),

  // Document Management
  uploadDocument: async (file, documentType, additionalDocumentType = null) => {
    try {
      console.log('🔄 merchantAPI: Starting upload document request');
      
      // Use the proper vendor document upload endpoint that handles both upload and DB update
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);
      if (additionalDocumentType) {
        formData.append('additionalDocumentType', additionalDocumentType);
      }

      console.log('📤 merchantAPI: Sending POST request to /dashboard/upload-document');
      const response = await merchantApiClient.post('/dashboard/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      console.log('📋 merchantAPI: Received response:', response);
      
      // The axios interceptor already returns response.data, so we return it directly
      return response;
    } catch (error) {
      console.error('🚨 merchantAPI: Upload document error:', error);
      throw error;
    }
  },

  deleteDocument: (documentType, documentId = null) => 
    merchantApiClient.delete('/dashboard/delete-document', {
      data: { documentType, documentId }
    }),

  getDocumentUrl: (documentType, documentId = null) => 
    merchantApiClient.get(`/dashboard/document-url/${documentType}`, {
      params: documentId ? { documentId } : {}
    }),

  // Notifications
  getNotifications: (params = {}) => 
    merchantApiClient.get('/notifications', { params }),
    
  getUnreadCount: () => 
    merchantApiClient.get('/notifications/unread-count'),
    
  markNotificationAsRead: (notificationId) => 
    merchantApiClient.patch(`/notifications/${notificationId}/read`),
    
  markAllNotificationsAsRead: () => 
    merchantApiClient.patch('/notifications/mark-all-read'),
    
  deleteNotification: (notificationId) => 
    merchantApiClient.delete(`/notifications/${notificationId}`),

  // Stations Management
  getStations: (params = {}) => 
    merchantApiClient.get('/stations', { params }),
    
  getStation: (stationId) => 
    merchantApiClient.get(`/stations/${stationId}`),
    
  createStation: async (formData) => {
    try {
      // Extract files from FormData
      const files = {
        images: [],
        stationMasterPhoto: null
      };
      
      const processedData = {};
      
      // Process FormData entries
      for (let [key, value] of formData.entries()) {
        if (key === 'images') {
          files.images.push(value);
        } else if (key === 'stationMasterPhoto') {
          files.stationMasterPhoto = value;
        } else {
          processedData[key] = value;
        }
      }
      
      // Upload images using optimized service (SEQUENTIAL FOR DISTRIBUTED SYSTEMS)
      let uploadedImages = [];
      if (files.images.length > 0) {
        console.log(`🔄 Starting sequential upload of ${files.images.length} station images...`);
        
        const imageResult = await optimizedUploadAPI.uploadStationImages(files.images, (progress) => {
          console.log(`📤 Upload progress: ${progress.current}/${progress.total} - ${progress.filename} (${progress.status})`);
        });
        
        if (imageResult.success) {
          uploadedImages = imageResult.images || [];
          console.log(`✅ Successfully uploaded ${imageResult.uploaded}/${imageResult.total} images`);
        } else {
          console.error(`❌ Image upload failed: ${imageResult.failed}/${imageResult.total} failed`);
          console.error('Upload errors:', imageResult.errors);
          
          // If some images failed, you might want to throw an error or handle partial success
          if (imageResult.uploaded === 0) {
            throw new Error(`All image uploads failed. First error: ${imageResult.errors[0]?.error || 'Unknown error'}`);
          } else {
            console.warn(`⚠️ Partial upload success: ${imageResult.uploaded}/${imageResult.total} images uploaded`);
            uploadedImages = imageResult.images || [];
          }
        }
      }
      
      // Upload station master photo
      let stationMasterPhotoUrl = null;
      if (files.stationMasterPhoto) {
        const photoResult = await optimizedUploadAPI.smartUpload(files.stationMasterPhoto, 'Profiles');
        stationMasterPhotoUrl = photoResult.file.url;
      }
      
      // Prepare final data for backend
      const finalData = {
        ...processedData,
        images: uploadedImages,
        stationMasterPhotoUrl
      };
      
      return merchantApiClient.post('/stations', finalData, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      throw error;
    }
  },
      updateStation: async (stationId, formData) => {
    try {
      // Similar logic to createStation but for updates
      const files = {
        images: [],
        stationMasterPhoto: null
      };
      
      const processedData = {};
      
      // Process FormData entries
      for (let [key, value] of formData.entries()) {
        if (key === 'images') {
          files.images.push(value);
        } else if (key === 'stationMasterPhoto') {
          files.stationMasterPhoto = value;
        } else {
          processedData[key] = value;
        }
      }
      
      // Upload new images if any (SEQUENTIAL FOR DISTRIBUTED SYSTEMS)
      let uploadedImages = [];
      if (files.images.length > 0) {
        console.log(`🔄 Starting sequential upload of ${files.images.length} new station images...`);
        
        const imageResult = await optimizedUploadAPI.uploadStationImages(files.images, (progress) => {
          console.log(`📤 Update upload progress: ${progress.current}/${progress.total} - ${progress.filename} (${progress.status})`);
        });
        
        if (imageResult.success) {
          uploadedImages = imageResult.images || [];
          console.log(`✅ Successfully uploaded ${imageResult.uploaded}/${imageResult.total} new images`);
        } else {
          console.error(`❌ New image upload failed: ${imageResult.failed}/${imageResult.total} failed`);
          
          if (imageResult.uploaded === 0) {
            throw new Error(`All new image uploads failed. First error: ${imageResult.errors[0]?.error || 'Unknown error'}`);
          } else {
            uploadedImages = imageResult.images || [];
          }
        }
      }
      
      // Upload new station master photo if provided
      let stationMasterPhotoUrl = null;
      if (files.stationMasterPhoto) {
        const photoResult = await optimizedUploadAPI.smartUpload(files.stationMasterPhoto, 'Profiles');
        stationMasterPhotoUrl = photoResult.file.url;
      }
      
      // Prepare final data for backend
      const finalData = {
        ...processedData,
        ...(uploadedImages.length > 0 && { newImages: uploadedImages }),
        ...(stationMasterPhotoUrl && { stationMasterPhotoUrl })
      };
      
      return merchantApiClient.put(`/stations/${stationId}`, finalData, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      throw error;
    }
  },
    
  deleteStation: (stationId) => 
    merchantApiClient.delete(`/stations/${stationId}`),
    
  updateStationStatus: (stationId, status) => 
    merchantApiClient.patch(`/stations/${stationId}/status`, { status }),
    
  deleteStationImage: (stationId, imageId) => 
    merchantApiClient.delete(`/stations/${stationId}/images/${imageId}`),
    
  updateStationImage: (stationId, imageId, data) => 
    merchantApiClient.patch(`/stations/${stationId}/images/${imageId}`, data),
    
  toggleStationStatus: (stationId) => 
    merchantApiClient.patch(`/stations/${stationId}/status`),
      getStationAnalytics: (stationId, params = {}) => 
    merchantApiClient.get(`/stations/${stationId}/analytics`, { params }),
  // Transactions and Analytics
  getTransactionAnalytics: (date) => 
    merchantApiClient.get('/dashboard/transaction-analytics', { 
      params: date ? { date } : {} 
    }),
    
  requestUrgentSettlement: (data) => 
    merchantApiClient.post('/dashboard/request-settlement', data),
    
  getSettlementHistory: (params = {}) => 
    merchantApiClient.get('/dashboard/settlement-history', { params }),

  // Bookings Management
  getAllBookings: (params = {}) => 
    merchantApiClient.get('/dashboard/bookings', { params }),
    
  getBooking: (bookingId) => 
    merchantApiClient.get(`/dashboard/bookings/${bookingId}`),
}

export default merchantAPI
