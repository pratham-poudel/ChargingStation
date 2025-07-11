import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Check if it's a token expiration error
      const errorCode = error.response?.data?.code
      console.log('Auth error code:', errorCode);
      
      // For now, just clear token and notify - we don't have refresh endpoint yet
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Dispatch custom event for auth context to handle
      window.dispatchEvent(new CustomEvent('auth-error', {
        detail: { 
          code: errorCode, 
          message: error.response?.data?.message 
        }
      }));
      
      // Only redirect if not already on auth page
      if (!window.location.pathname.includes('/auth')) {
        console.log('Redirecting to auth page due to 401 error');
        window.location.href = '/auth'
      }    }
    
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  sendOTP: (data) => api.post('/auth/send-otp', data),
  checkUserExists: (data) => api.post('/auth/check-user', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  verifyToken: (token) => api.get('/auth/verify-token', {
    headers: { Authorization: `Bearer ${token}` }
  }),
  refreshToken: () => api.post('/auth/refresh'),
  updateProfile: (data) => api.put('/auth/profile', data),
  
  // FCM and App Management
  updateFCMToken: (data) => api.post('/auth/fcm-token', data),
  removeFCMToken: (data) => api.delete('/auth/fcm-token', { data }),
  updateAppPreferences: (data) => api.put('/auth/app-preferences', data),
  getDeviceSessions: () => api.get('/auth/sessions'),
  endDeviceSession: (deviceId) => api.delete(`/auth/sessions/${deviceId}`),
  logout: (data) => api.post('/auth/logout', data),
}

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  addVehicle: (data) => api.post('/users/vehicles', data),
  updateVehicle: (vehicleId, data) => api.put(`/users/vehicles/${vehicleId}`, data),
  deleteVehicle: (vehicleId) => api.delete(`/users/vehicles/${vehicleId}`),
  getBookings: (params) => api.get('/users/bookings', { params }),
  getBookingById: (bookingId) => api.get(`/users/bookings/${bookingId}`),
  cancelBooking: (bookingId, data) => api.put(`/users/bookings/${bookingId}/cancel`, data),
  getRefundPreview: (bookingId) => api.get(`/users/bookings/${bookingId}/refund-preview`),
  getRefundStatus: (refundId) => api.get(`/users/refunds/${refundId}`),
  getRefundHistory: (params) => api.get('/users/refunds', { params }),
}

// Stations API
export const stationsAPI = {
  getStations: (params) => api.get('/stations', { params }),
  getStationById: (id) => api.get(`/stations/${id}`),
  searchStations: (params) => api.get('/stations/search', { params }),
  getNearestStationInfo: (params) => api.get('/stations/nearest-info', { params }),
  getAvailableSlots: (stationId, portId) => api.get(`/stations/${stationId}/ports/${portId}/slots`),
}

// Location API (wrapping mapping service)
export const locationAPI = {
  reverseGeocode: (data) => api.post('/location/reverse-geocode', data),
  autocomplete: (params) => api.get('/location/autocomplete', { params }),
  searchLocation: (data) => api.post('/location/search', data),
  calculateDistance: (data) => api.post('/location/distance', data),
  calculateDistancesBatch: (data) => api.post('/location/distances-batch', data),
}

// Bookings API
export const bookingsAPI = {
  createBooking: (data) => api.post('/bookings', data),
  getMyBookings: (params) => api.get('/bookings/my-bookings', { params }),
  getBookingById: (id) => api.get(`/bookings/${id}`),
  cancelBooking: (id) => api.patch(`/bookings/${id}/cancel`),
  startCharging: (id, data) => api.patch(`/bookings/${id}/start`, data),
  endCharging: (id, data) => api.patch(`/bookings/${id}/end`, data),
  getBookingStatus: (id) => api.get(`/bookings/${id}/status`),
}

// Payments API
export const paymentsAPI = {
  initiatePayment: (data) => api.post('/payments/initiate', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
  getPaymentHistory: (params) => api.get('/payments/history', { params }),
  refundPayment: (id) => api.post(`/payments/${id}/refund`),
}

// Vendors API (if needed for public data)
export const vendorsAPI = {
  getVendors: () => api.get('/vendors'),
  getVendorById: (id) => api.get(`/vendors/${id}`),
}

// Ratings API
export const ratingsAPI = {
  getRatingStatus: (bookingId) => api.get(`/ratings/booking/${bookingId}`),
  submitRating: (bookingId, data) => api.post(`/ratings/booking/${bookingId}`, data),
  getStationReviews: (stationId, params) => api.get(`/ratings/station/${stationId}/reviews`, { params })
}

export default api
