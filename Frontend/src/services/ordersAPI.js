import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export const ordersAPI = {
  // Create a new order (public endpoint)
  createOrder: async (orderData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/restaurants/orders`, orderData, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      })
      return response.data
    } catch (error) {
      console.error('Create order error:', error)
      throw error
    }
  },

  // Get order by ID
  getOrderById: async (orderId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/restaurants/orders/${orderId}`, {
        headers: {
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      })
      return response.data
    } catch (error) {
      console.error('Get order error:', error)
      throw error
    }
  },

  // Get user's orders (if authentication is added later)
  getUserOrders: async (phoneNumber) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/restaurants/orders/user/${phoneNumber}`, {
        headers: {
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      })
      return response.data
    } catch (error) {
      console.error('Get user orders error:', error)
      throw error
    }
  }
}
