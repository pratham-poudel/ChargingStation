import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance for Trip AI
const tripAIAPI = axios.create({
  baseURL: `${API_URL}/trip-ai`,
  timeout: 30000, 
  headers: {
    'X-API-Key': 'your-super-secret-api-key-2024',
    'X-Frontend-Request': 'true'
  }
})

// Add auth token to requests
tripAIAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Trip AI Services
export const tripAIService = {
  // Plan a trip using AI
  planTrip: async (tripData) => {
    try {
      const response = await tripAIAPI.post('/plan', tripData)
      return response.data
    } catch (error) {
      throw {
        message: error.response?.data?.message || 'Failed to plan trip',
        status: error.response?.status || 500
      }
    }
  },

  // Bulk book charging sessions
  bulkBookSessions: async (bookingData) => {
    try {
      const response = await tripAIAPI.post('/bulk-book', bookingData)
      return response.data
    } catch (error) {
      throw {
        message: error.response?.data?.message || 'Failed to book charging sessions',
        status: error.response?.status || 500
      }
    }
  },

  // Get user's trip history
  getTripHistory: async () => {
    try {
      const response = await tripAIAPI.get('/history')
      return response.data
    } catch (error) {
      throw {
        message: error.response?.data?.message || 'Failed to fetch trip history',
        status: error.response?.status || 500
      }
    }
  },

  // Save trip plan for later
  saveTripPlan: async (tripPlan) => {
    try {
      const response = await tripAIAPI.post('/save', tripPlan)
      return response.data
    } catch (error) {
      throw {
        message: error.response?.data?.message || 'Failed to save trip plan',
        status: error.response?.status || 500
      }
    }
  }
}

// Utility functions for Trip AI
export const tripAIUtils = {
  // Format time from minutes to human readable
  formatTime: (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) return `${mins}min`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}min`
  },

  // Format currency
  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  },

  // Calculate battery percentage from range
  calculateBatteryFromRange: (currentRange, maxRange) => {
    return Math.round((currentRange / maxRange) * 100)
  },

  // Calculate range from battery percentage
  calculateRangeFromBattery: (batteryPercent, maxRange) => {
    return Math.round((batteryPercent / 100) * maxRange)
  },

  // Validate trip form data
  validateTripData: (formData) => {
    const errors = []

    if (!formData.vehicleEfficiency || parseFloat(formData.vehicleEfficiency) <= 0) {
      errors.push('Vehicle efficiency must be greater than 0')
    }

    if (!formData.currentBatteryPercent || parseFloat(formData.currentBatteryPercent) <= 0) {
      errors.push('Current battery percentage must be greater than 0')
    }

    if (!formData.thresholdPercent || parseFloat(formData.thresholdPercent) <= 0) {
      errors.push('Threshold percentage must be greater than 0')
    }

    if (parseFloat(formData.currentBatteryPercent) <= parseFloat(formData.thresholdPercent)) {
      errors.push('Current battery must be higher than threshold')
    }

    if (!formData.fromLocation) {
      errors.push('Starting location is required')
    }

    if (!formData.toLocation) {
      errors.push('Destination is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  },

  // Generate trip summary for sharing
  generateTripSummary: (tripPlan) => {
    if (!tripPlan) return ''

    const { route, totalDistance, totalTime, chargingSessions, totalCost } = tripPlan
    
    return `🚗⚡ My AI Trip Plan
📍 ${route.from.name} → ${route.to.name}
📏 Distance: ${totalDistance}km
⏱️ Time: ${tripAIUtils.formatTime(totalTime)}
🔋 Charging stops: ${chargingSessions.length}
💰 Total cost: ${tripAIUtils.formatCurrency(totalCost)}

Powered by ChargEase Trip AI 🌟`
  },

  // Calculate estimated CO2 savings (vs petrol car)
  calculateCO2Savings: (distanceKm) => {
    // Average petrol car emits ~120g CO2/km
    // Electric cars in Nepal (with hydroelectric power) ~20g CO2/km
    const petrolEmission = distanceKm * 120 // grams
    const electricEmission = distanceKm * 20 // grams
    const savings = petrolEmission - electricEmission // grams
    
    return {
      savings: Math.round(savings / 1000 * 100) / 100, // kg, rounded to 2 decimals
      petrolEmission: Math.round(petrolEmission / 1000 * 100) / 100,
      electricEmission: Math.round(electricEmission / 1000 * 100) / 100
    }
  },

  // Get recommended charging speed based on session time
  getRecommendedChargingSpeed: (availableTime) => {
    if (availableTime >= 120) return 'slow' // 2+ hours - can use slow charging
    if (availableTime >= 60) return 'fast' // 1-2 hours - fast charging recommended
    return 'rapid' // <1 hour - rapid charging needed
  },

  // Calculate optimal departure time
  calculateOptimalDepartureTime: (arrivalTime, travelTimeMinutes) => {
    const arrival = new Date(arrivalTime)
    const departure = new Date(arrival.getTime() - (travelTimeMinutes * 60 * 1000))
    return departure
  },

  // Format location name for display
  formatLocationName: (location) => {
    if (!location) return ''
    
    if (location.shortName) return location.shortName
    if (location.name) return location.name
    return 'Unknown Location'
  },

  // Check if trip is eco-friendly
  isEcoFriendlyTrip: (tripPlan) => {
    if (!tripPlan) return false
    
    const co2Savings = tripAIUtils.calculateCO2Savings(parseFloat(tripPlan.totalDistance))
    return co2Savings.savings > 0
  },

  // Generate route efficiency score (0-100)
  calculateRouteEfficiency: (tripPlan) => {
    if (!tripPlan) return 0
    
    const { chargingSessions, totalTime, travelTime } = tripPlan
    
    // Base score
    let score = 100
    
    // Penalty for each charging stop (more stops = less convenient)
    score -= chargingSessions.length * 10
    
    // Penalty for charging time vs travel time ratio
    const chargingTime = totalTime - travelTime
    const timeRatio = chargingTime / travelTime
    score -= timeRatio * 30
    
    // Bonus for using recommended stations
    const recommendedStations = chargingSessions.filter(s => s.station.dockitRecommended).length
    score += (recommendedStations / chargingSessions.length) * 20
    
    return Math.max(0, Math.min(100, Math.round(score)))
  }
}

export default tripAIService 