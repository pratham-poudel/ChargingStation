// Utility functions for formatting data

/**
 * Format address object into a readable string
 * @param {Object|String} address - Address object or string
 * @returns {String} Formatted address string
 */
export const formatAddress = (address) => {
  if (!address) return 'Address not available'
  
  if (typeof address === 'string') return address
  
  if (typeof address === 'object') {
    const parts = []
    if (address.street) parts.push(address.street)
    if (address.landmark) parts.push(address.landmark)
    if (address.city) parts.push(address.city)
    if (address.state) parts.push(address.state)
    if (address.pincode) parts.push(address.pincode)
    
    return parts.length > 0 ? parts.join(', ') : 'Address not available'
  }
  
  return 'Address not available'
}

/**
 * Format currency amount
 * @param {Number} amount - Amount to format
 * @param {String} currency - Currency symbol (default: ₹)
 * @returns {String} Formatted currency string
 */
export const formatCurrency = (amount, currency = '₹') => {
  if (!amount || isNaN(amount)) return `${currency}0`
  return `${currency}${parseFloat(amount).toFixed(2)}`
}

/**
 * Format date to readable string
 * @param {String|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {String} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'Date not available'
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  }
  
  try {
    return new Date(date).toLocaleDateString('en-IN', defaultOptions)
  } catch (error) {
    return 'Invalid date'
  }
}

/**
 * Format time to readable string
 * @param {String|Date} date - Date to format time from
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {String} Formatted time string
 */
export const formatTime = (date, options = {}) => {
  if (!date) return 'Time not available'
  
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }
  
  try {
    return new Date(date).toLocaleTimeString('en-IN', defaultOptions)
  } catch (error) {
    return 'Invalid time'
  }
}

/**
 * Format phone number
 * @param {String} phone - Phone number to format
 * @returns {String} Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return 'Phone not available'
  
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Format as +91 XXXXX XXXXX for Indian numbers
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  
  return phone
}

/**
 * Format vehicle type for display
 * @param {String} vehicleType - Vehicle type
 * @returns {String} Formatted vehicle type
 */
export const formatVehicleType = (vehicleType) => {
  if (!vehicleType) return 'Unknown'
  
  const typeMap = {
    'car': 'Car',
    'bike': 'Bike',
    'truck': 'Truck',
    'bus': 'Bus',
    'auto': 'Auto Rickshaw',
    'scooter': 'Scooter'
  }
  
  return typeMap[vehicleType.toLowerCase()] || vehicleType
}

/**
 * Format duration from minutes
 * @param {Number} minutes - Duration in minutes
 * @returns {String} Formatted duration string
 */
export const formatDuration = (minutes) => {
  if (!minutes || isNaN(minutes)) return '0 min'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours}h`
  
  return `${hours}h ${mins}m`
}

/**
 * Truncate text to specified length
 * @param {String} text - Text to truncate
 * @param {Number} maxLength - Maximum length
 * @returns {String} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
