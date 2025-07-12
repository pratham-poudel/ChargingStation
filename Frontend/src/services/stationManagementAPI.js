import axios from 'axios';
import { directUploadAPI } from './directS3Upload';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance for station management
const stationManagementAPI = axios.create({
  baseURL: `${API_BASE_URL}/station-management`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
stationManagementAPI.interceptors.request.use(
  (config) => {
    // Try vendor token first, then employee token
    const vendorToken = localStorage.getItem('merchantToken');
    const employeeToken = localStorage.getItem('employeeToken');
    
    const token = vendorToken || employeeToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
stationManagementAPI.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear tokens and redirect to login
      localStorage.removeItem('merchantToken');
      localStorage.removeItem('employeeToken');
      
      // Determine which login page to redirect to
      const isEmployee = localStorage.getItem('userType') === 'employee';
      window.location.href = isEmployee ? '/station-login' : '/merchant/login';
    }
    return Promise.reject(error);
  }
);

export const stationManagementService = {
  // Get comprehensive station details with bookings
  getStationDetails: (stationId, date = null) => {
    const params = date ? { date } : {};
    return stationManagementAPI.get(`/${stationId}`, { params });
  },

  // Employee login
  employeeLogin: (credentials) => {
    return stationManagementAPI.post('/employee-login', credentials);
  },

  // Assign employee to station (vendor only)
  assignEmployee: (stationId, employeeData) => {
    return stationManagementAPI.post(`/${stationId}/assign-employee`, employeeData);
  },

  // Get station employees (vendor only)
  getStationEmployees: (stationId) => {
    return stationManagementAPI.get(`/${stationId}/employees`);
  },

  // Remove employee (vendor only)
  removeEmployee: (stationId, employeeId) => {
    return stationManagementAPI.delete(`/${stationId}/employees/${employeeId}`);
  },

  // Change employee password (vendor only)
  changeEmployeePassword: (stationId, employeeId, newPassword) => {
    return stationManagementAPI.patch(`/${stationId}/employees/${employeeId}/change-password`, {
      newPassword
    });
  },

  // Update booking status
  updateBookingStatus: (stationId, bookingId, statusData) => {
    return stationManagementAPI.patch(`/${stationId}/bookings/${bookingId}/status`, statusData);
  },

  // OTP verification for starting sessions
  sendStartSessionOTP: (stationId, bookingId) => {
    return stationManagementAPI.post(`/${stationId}/bookings/${bookingId}/send-start-otp`);
  },

  verifyStartSessionOTP: (stationId, bookingId, otpData) => {
    return stationManagementAPI.post(`/${stationId}/bookings/${bookingId}/verify-start-otp`, otpData);
  },

  // Payment adjustment methods
  createPaymentAdjustment: (stationId, bookingId, adjustmentData) => {
    return stationManagementAPI.post(`/${stationId}/bookings/${bookingId}/payment-adjustment`, adjustmentData);
  },

  processPaymentAdjustment: (stationId, bookingId, adjustmentId, processData) => {
    return stationManagementAPI.patch(`/${stationId}/bookings/${bookingId}/payment-adjustment/${adjustmentId}`, processData);
  },

  // Get booking payment adjustments
  getBookingAdjustments: (stationId, bookingId) => {
    return stationManagementAPI.get(`/${stationId}/bookings/${bookingId}/payment-adjustments`);
  },

  // Get bookings by date range
  getBookingsByDateRange: (stationId, startDate, endDate) => {
    return stationManagementAPI.get(`/${stationId}/bookings`, {
      params: { startDate, endDate }
    });
  },

  // Station analytics
  getStationAnalytics: (stationId, period = '7d') => {
    return stationManagementAPI.get(`/${stationId}/analytics`, {
      params: { period }
    });
  },

  // Update station details (for both vendors and employees with permission)
  updateStation: async (stationId, formData) => {
    try {
      // Similar to merchantAPI - process FormData and use optimized uploads
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
      
      // Upload new images if any
      let uploadedImages = [];
      if (files.images.length > 0) {
        const imageResult = await directUploadAPI.uploadStationImages(files.images);
        uploadedImages = imageResult.images || [];
      }
      
      // Upload new station master photo if provided
      let stationMasterPhotoUrl = null;
      if (files.stationMasterPhoto) {
        const photoResult = await directUploadAPI.uploadProfilePicture(files.stationMasterPhoto);
        stationMasterPhotoUrl = photoResult.url;
      }
      
      // Prepare final data for backend
      const finalData = {
        ...processedData,
        ...(uploadedImages.length > 0 && { newImages: uploadedImages }),
        ...(stationMasterPhotoUrl && { stationMasterPhotoUrl })
      };
      
      return stationManagementAPI.put(`/${stationId}/update`, finalData, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      throw error;
    }
  }
};

export default stationManagementService;
