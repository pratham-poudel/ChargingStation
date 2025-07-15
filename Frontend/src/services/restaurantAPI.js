import axios from 'axios'
import { directUploadAPI } from './directS3Upload'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for file uploads
  headers: {
    'X-API-Key': 'your-super-secret-api-key-2024',
    'X-Frontend-Request': 'true'
  }
})

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('merchantToken')
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('merchantToken')
      window.location.href = '/merchant/login'
    }
    return Promise.reject(error)
  }
)

export const restaurantAPI = {
  // Vendor Restaurant Management

  // Get all vendor restaurants
  getVendorRestaurants: async (params = {}) => {
    const response = await api.get('/vendor/restaurants', { params })
    return response.data
  },

  // Get specific restaurant details
  getRestaurant: async (restaurantId) => {
    const response = await api.get(`/vendor/restaurants/${restaurantId}`)
    return response.data
  },

  // Create new restaurant
  createRestaurant: async (restaurantData) => {
    try {
      const processedData = { ...restaurantData }
      
      // Handle file uploads with your existing directS3Upload service
      if (restaurantData.imageFile) {
        console.log('Uploading restaurant image...')
        const imageUpload = await directUploadAPI.uploadSingleFile(
          restaurantData.imageFile,
          restaurantData.imageProgressCallback || ((progress) => {
            console.log(`Image upload progress: ${progress.percentage}%`)
          }),
          { folder: 'Images' }
        )
        
        processedData.images = [imageUpload.url]
        processedData.imageMetadata = {
          objectName: imageUpload.objectName,
          originalName: imageUpload.originalName,
          size: imageUpload.size,
          mimetype: imageUpload.mimetype
        }
        
        // Remove the file and callback from the data
        delete processedData.imageFile
        delete processedData.imageProgressCallback
      }
      
      if (restaurantData.licenseFile) {
        console.log('Uploading license document...')
        const licenseUpload = await directUploadAPI.uploadSingleFile(
          restaurantData.licenseFile,
          restaurantData.licenseProgressCallback || ((progress) => {
            console.log(`License upload progress: ${progress.percentage}%`)
          }),
          { folder: 'Documents' }
        )
        
        processedData.licenseDocument = licenseUpload.url
        processedData.licenseMetadata = {
          objectName: licenseUpload.objectName,
          originalName: licenseUpload.originalName,
          size: licenseUpload.size,
          mimetype: licenseUpload.mimetype
        }
        
        // Remove the file and callback from the data
        delete processedData.licenseFile
        delete processedData.licenseProgressCallback
      }

      // Send the data as JSON (no FormData needed)
      const response = await api.post('/vendor/restaurants', processedData, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      })
      return response.data
      
    } catch (error) {
      console.error('Create restaurant error:', error)
      throw error
    }
  },

  // Update restaurant
  updateRestaurant: async (restaurantId, restaurantData) => {
    try {
      const processedData = { ...restaurantData }
      
      // Handle file uploads with your existing directS3Upload service
      if (restaurantData.imageFile) {
        console.log('Uploading updated restaurant image...')
        const imageUpload = await directUploadAPI.uploadSingleFile(
          restaurantData.imageFile,
          (progress) => {
            console.log(`Image upload progress: ${progress.percentage}%`)
          },
          { folder: 'Images' }
        )
        
        processedData.images = [imageUpload.url]
        processedData.imageMetadata = {
          objectName: imageUpload.objectName,
          originalName: imageUpload.originalName,
          size: imageUpload.size,
          mimetype: imageUpload.mimetype
        }
        
        // Remove the file from the data
        delete processedData.imageFile
      }
      
      if (restaurantData.licenseFile) {
        console.log('Uploading updated license document...')
        const licenseUpload = await directUploadAPI.uploadSingleFile(
          restaurantData.licenseFile,
          (progress) => {
            console.log(`License upload progress: ${progress.percentage}%`)
          },
          { folder: 'Documents' }
        )
        
        processedData.licenseDocument = licenseUpload.url
        processedData.licenseMetadata = {
          objectName: licenseUpload.objectName,
          originalName: licenseUpload.originalName,
          size: licenseUpload.size,
          mimetype: licenseUpload.mimetype
        }
        
        // Remove the file from the data
        delete processedData.licenseFile
      }

      // Send the data as JSON (no FormData needed)
      const response = await api.put(`/vendor/restaurants/${restaurantId}`, processedData, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      })
      return response.data
      
    } catch (error) {
      console.error('Update restaurant error:', error)
      throw error
    }
  },

  // Delete restaurant
  deleteRestaurant: async (restaurantId) => {
    const response = await api.delete(`/vendor/restaurants/${restaurantId}`)
    return response.data
  },

  // Menu Management

  // Get restaurant menu
  getMenu: async (restaurantId) => {
    const response = await api.get(`/vendor/restaurants/${restaurantId}/menu`)
    return response.data
  },

  // Add menu item
  addMenuItem: async (restaurantId, menuItemData) => {
    const formData = new FormData()
    
    Object.keys(menuItemData).forEach(key => {
      if (key === 'imageFile') {
        if (menuItemData[key]) {
          formData.append(key, menuItemData[key])
        }
      } else {
        formData.append(key, menuItemData[key])
      }
    })

    const response = await api.post(`/vendor/restaurants/${restaurantId}/menu`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Update menu item
  updateMenuItem: async (restaurantId, itemId, menuItemData) => {
    const formData = new FormData()
    
    Object.keys(menuItemData).forEach(key => {
      if (key === 'imageFile') {
        if (menuItemData[key]) {
          formData.append(key, menuItemData[key])
        }
      } else if (menuItemData[key] !== null && menuItemData[key] !== undefined) {
        formData.append(key, menuItemData[key])
      }
    })

    const response = await api.put(`/vendor/restaurants/${restaurantId}/menu/${itemId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Delete menu item
  deleteMenuItem: async (restaurantId, itemId) => {
    const response = await api.delete(`/vendor/restaurants/${restaurantId}/menu/${itemId}`)
    return response.data
  },

  // Toggle menu item availability
  toggleMenuItemAvailability: async (restaurantId, itemId, isAvailable) => {
    const response = await api.patch(`/vendor/restaurants/${restaurantId}/menu/${itemId}/availability`, {
      isAvailable
    })
    return response.data
  },

  // Restaurant Management (Restaurant Employee Portal)

  // Employee login
  employeeLogin: async (restaurantId, credentials) => {
    const response = await api.post(`/restaurant-management/${restaurantId}/login`, credentials)
    return response.data
  },

  // Get restaurant dashboard
  getRestaurantDashboard: async (restaurantId, token) => {
    const response = await axios.get(`${API_BASE_URL}/restaurant-management/${restaurantId}/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Get restaurant orders
  getRestaurantOrders: async (restaurantId, params = {}, token) => {
    const response = await axios.get(`${API_BASE_URL}/restaurant-management/${restaurantId}/orders`, {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Update order status
  updateOrderStatus: async (restaurantId, orderId, statusData, token) => {
    const response = await axios.patch(
      `${API_BASE_URL}/restaurant-management/${restaurantId}/orders/${orderId}/status`,
      statusData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      }
    )
    return response.data
  },

  // Assign order to employees
  assignOrder: async (restaurantId, orderId, assignmentData, token) => {
    const response = await axios.patch(
      `${API_BASE_URL}/restaurant-management/${restaurantId}/orders/${orderId}/assign`,
      assignmentData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      }
    )
    return response.data
  },

  // Get restaurant menu for management
  getRestaurantMenu: async (restaurantId, token) => {
    const response = await axios.get(`${API_BASE_URL}/restaurant-management/${restaurantId}/menu`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Update menu item availability (restaurant employee)
  updateMenuAvailability: async (restaurantId, itemId, isAvailable, token) => {
    const response = await axios.patch(
      `${API_BASE_URL}/restaurant-management/${restaurantId}/menu/${itemId}/availability`,
      { isAvailable },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      }
    )
    return response.data
  },

  // Get restaurant employees
  getRestaurantEmployees: async (restaurantId, token) => {
    const response = await axios.get(`${API_BASE_URL}/restaurant-management/${restaurantId}/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Assign employee to restaurant
  assignRestaurantEmployee: async (restaurantId, employeeData, token) => {
    const response = await axios.post(`${API_BASE_URL}/restaurant-management/${restaurantId}/assign-employee`, employeeData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Delete restaurant employee
  deleteRestaurantEmployee: async (restaurantId, employeeId, token) => {
    const response = await axios.delete(`${API_BASE_URL}/restaurant-management/${restaurantId}/employees/${employeeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Request password change OTP
  requestPasswordChangeOTP: async (restaurantId, employeeId, newPassword, token) => {
    const response = await axios.post(`${API_BASE_URL}/restaurant-management/${restaurantId}/employees/${employeeId}/change-password-request`, {
      newPassword
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Verify OTP and change password
  verifyPasswordChangeOTP: async (restaurantId, employeeId, newPassword, otp, token) => {
    const response = await axios.post(`${API_BASE_URL}/restaurant-management/${restaurantId}/employees/${employeeId}/change-password-verify`, {
      newPassword,
      otp
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Get restaurant analytics
  getRestaurantAnalytics: async (restaurantId, params = {}, token) => {
    const response = await axios.get(`${API_BASE_URL}/restaurant-management/${restaurantId}/analytics`, {
      params,
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Add menu item (restaurant management)
  addMenuItem: async (restaurantId, menuData, token) => {
    const response = await axios.post(
      `${API_BASE_URL}/restaurant-management/${restaurantId}/menu`,
      menuData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      }
    )
    return response.data
  },

  // Update menu item (restaurant management)
  updateMenuItem: async (restaurantId, itemId, menuData, token) => {
    const response = await axios.put(
      `${API_BASE_URL}/restaurant-management/${restaurantId}/menu/${itemId}`,
      menuData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      }
    )
    return response.data
  },

  // Delete menu item (restaurant management)
  deleteMenuItem: async (restaurantId, itemId, token) => {
    const response = await axios.delete(
      `${API_BASE_URL}/restaurant-management/${restaurantId}/menu/${itemId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      }
    )
    return response.data
  },

  // Toggle accepting orders
  toggleAcceptingOrders: async (restaurantId, acceptingOrders, token) => {
    const response = await axios.patch(
      `${API_BASE_URL}/restaurant-management/${restaurantId}/accepting-orders`,
      { acceptingOrders },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      }
    )
    return response.data
  },

  // Admin Restaurant Management

  // Get all restaurants (admin)
  getAdminRestaurants: async (params = {}, adminToken) => {
    const response = await axios.get(`${API_BASE_URL}/admin/restaurants`, {
      params,
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Get restaurant details (admin)
  getAdminRestaurantDetails: async (restaurantId, adminToken) => {
    const response = await axios.get(`${API_BASE_URL}/admin/restaurants/${restaurantId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Verify restaurant (admin)
  verifyRestaurant: async (restaurantId, verificationData, adminToken) => {
    const response = await axios.patch(
      `${API_BASE_URL}/admin/restaurants/${restaurantId}/verify`,
      verificationData,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      }
    )
    return response.data
  },

  // Toggle restaurant status (admin)
  toggleRestaurantStatus: async (restaurantId, statusData, adminToken) => {
    const response = await axios.patch(
      `${API_BASE_URL}/admin/restaurants/${restaurantId}/toggle-status`,
      statusData,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      }
    )
    return response.data
  },

  // Mark restaurant under review (admin)
  markUnderReview: async (restaurantId, reviewData, adminToken) => {
    const response = await axios.patch(
      `${API_BASE_URL}/admin/restaurants/${restaurantId}/review`,
      reviewData,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      }
    )
    return response.data
  },

  // Delete restaurant (admin)
  deleteRestaurantAdmin: async (restaurantId, deleteData, adminToken) => {
    const response = await axios.delete(`${API_BASE_URL}/admin/restaurants/${restaurantId}`, {
      data: deleteData,
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Get restaurant statistics (admin)
  getRestaurantStats: async (adminToken) => {
    const response = await axios.get(`${API_BASE_URL}/admin/restaurants/stats/overview`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-API-Key': 'your-super-secret-api-key-2024',
        'X-Frontend-Request': 'true'
      }
    })
    return response.data
  },

  // Public Restaurant APIs (for booking integration)
  
  // Get restaurant by charging station ID (public access)
  getRestaurantByStation: async (stationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/restaurants/station/${stationId}`,{
        headers: {
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get restaurant')
      }
      
      return response.json()
    } catch (error) {
      console.error('Get restaurant by station error:', error)
      throw error
    }
  },

  // Get menu items for a restaurant (public access)
  getMenuItems: async (restaurantId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/menu`,{
        headers: {
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get menu items')
      }
      
      return response.json()
    } catch (error) {
      console.error('Get menu items error:', error)
      throw error
    }
  },

  // Get public restaurant details (for customers)
  getPublicRestaurant: async (restaurantId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/restaurants/public/${restaurantId}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get restaurant')
      }
      
      return response.json()
    } catch (error) {
      console.error('Get public restaurant error:', error)
      throw error
    }
  },

  // Search restaurants (public access)
  searchRestaurants: async (query, filters = {}) => {
    try {
      const params = new URLSearchParams({ query, ...filters })
      const response = await fetch(`${API_BASE_URL}/restaurants/search?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to search restaurants')
      }
      
      return response.json()
    } catch (error) {
      console.error('Search restaurants error:', error)
      throw error
    }
  },

  // Get restaurants by location (public access)
  getRestaurantsByLocation: async (lat, lng, radius = 10) => {
    try {
      const params = new URLSearchParams({ lat, lng, radius })
      const response = await fetch(`${API_BASE_URL}/restaurants/nearby?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get nearby restaurants')
      }
      
      return response.json()
    } catch (error) {
      console.error('Get nearby restaurants error:', error)
      throw error
    }
  }
}

export default restaurantAPI
