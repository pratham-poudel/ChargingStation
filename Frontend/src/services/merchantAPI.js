import axios from 'axios'
import { getDeviceInfo } from '../utils/deviceManager'

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
  
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return merchantApiClient.post('/dashboard/upload-profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
  uploadDocument: (file, documentType, additionalDocumentType = null) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);
    if (additionalDocumentType) {
      formData.append('additionalDocumentType', additionalDocumentType);
    }
    
    return merchantApiClient.post('/dashboard/upload-document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
    
  createStation: (formData) => 
    merchantApiClient.post('/stations', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
      updateStation: (stationId, formData) => 
    merchantApiClient.put(`/stations/${stationId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    
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
