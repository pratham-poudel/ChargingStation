// Nepal timezone utilities for consistent time handling
// This file handles timezone conversions consistently across the application

/**
 * Get current Nepal time
 * @returns {Date} Current time in Nepal timezone
 */
export const getNepalTime = () => {
  const now = new Date()
  // Convert to Nepal timezone (UTC+5:45)
  return new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}))
}

/**
 * Convert UTC date to Nepal time
 * @param {String|Date} utcDate - UTC date string or Date object
 * @returns {Date} Date in Nepal timezone
 */
export const utcToNepalTime = (utcDate) => {
  if (!utcDate) return null
  
  const date = new Date(utcDate)
  // Convert UTC to Nepal timezone
  return new Date(date.toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}))
}

/**
 * Convert Nepal time to UTC
 * @param {String} date - Date string in YYYY-MM-DD format
 * @param {String} time - Time string in HH:MM format
 * @returns {Date} UTC Date object
 */
export const nepalTimeToUTC = (date, time) => {
  if (!date || !time) return null
  
  // Create date in Nepal timezone
  const [hours, minutes] = time.split(':').map(Number)
  const nepalDate = new Date(date)
  nepalDate.setHours(hours, minutes, 0, 0)
  
  // Convert to UTC by adjusting for Nepal timezone offset (+5:45)
  const utcDate = new Date(nepalDate.getTime() - (5 * 60 + 45) * 60 * 1000)
  return utcDate
}

/**
 * Format date for Nepal timezone display
 * @param {String|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {String} Formatted date string
 */
export const formatNepalDate = (date, options = {}) => {
  if (!date) return 'Date not available'
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kathmandu',
    ...options
  }
  
  try {
    return new Date(date).toLocaleDateString('en-IN', defaultOptions)
  } catch (error) {
    return 'Invalid date'
  }
}

/**
 * Format time for Nepal timezone display
 * @param {String|Date} date - Date to format time from
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {String} Formatted time string
 */
export const formatNepalTime = (date, options = {}) => {
  if (!date) return 'Time not available'
  
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kathmandu',
    ...options
  }
  
  try {
    return new Date(date).toLocaleTimeString('en-IN', defaultOptions)
  } catch (error) {
    return 'Invalid time'
  }
}

/**
 * Format date and time for Nepal timezone display
 * @param {String|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {String} Formatted date and time string
 */
export const formatNepalDateTime = (date, options = {}) => {
  if (!date) return 'Date not available'
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kathmandu',
    ...options
  }
  
  try {
    return new Date(date).toLocaleString('en-IN', defaultOptions)
  } catch (error) {
    return 'Invalid date'
  }
}

/**
 * Get time duration between two dates
 * @param {String|Date} startTime - Start time
 * @param {String|Date} endTime - End time
 * @returns {String} Formatted duration string
 */
export const getTimeDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 'Duration not available'
  
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.round(diffMs / (1000 * 60))
    
    const hours = Math.floor(diffMins / 60)
    const minutes = diffMins % 60
    
    if (hours === 0) return `${minutes}m`
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}m`
  } catch (error) {
    return 'Invalid duration'
  }
}

/**
 * Check if a time slot has passed for today in Nepal timezone
 * @param {String} timeSlot - Time slot in HH:MM format
 * @param {String} date - Date in YYYY-MM-DD format
 * @returns {Boolean} True if time slot has passed
 */
export const isTimeSlotPassed = (timeSlot, date) => {
  if (!timeSlot || !date) return false
  
  try {
    const nepalNow = getNepalTime()
    const slotDate = new Date(date)
    
    // Only check for today's date
    if (slotDate.toDateString() !== nepalNow.toDateString()) {
      return false
    }
    
    const [hours, minutes] = timeSlot.split(':').map(Number)
    const slotDateTime = new Date(nepalNow)
    slotDateTime.setHours(hours, minutes, 0, 0)
    
    return slotDateTime < nepalNow
  } catch (error) {
    return false
  }
}

/**
 * Calculate time until a booking starts
 * @param {String|Date} startTime - Booking start time
 * @returns {String} Time until start description
 */
export const getTimeUntilStart = (startTime) => {
  if (!startTime) return 'Unknown'
  
  try {
    const now = getNepalTime()
    const start = new Date(startTime)
    const diffMs = start.getTime() - now.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    if (diffHours < 0) return 'Started'
    if (diffHours < 1) {
      const minutes = Math.round(diffMs / (1000 * 60))
      return `in ${minutes}m`
    }
    if (diffHours < 24) {
      const hours = Math.round(diffHours)
      return `in ${hours}h`
    }
    const days = Math.round(diffHours / 24)
    return `in ${days}d`
  } catch (error) {
    return 'Unknown'
  }
}

export default {
  getNepalTime,
  utcToNepalTime,
  nepalTimeToUTC,
  formatNepalDate,
  formatNepalTime,
  formatNepalDateTime,
  getTimeDuration,
  isTimeSlotPassed,
  getTimeUntilStart
}
