// Simple user session management for tracking customer info
export const userSession = {
  // Save customer information to localStorage
  setCustomerInfo: (customerInfo) => {
    try {
      const sessionData = {
        phone: customerInfo.phone,
        email: customerInfo.email,
        name: customerInfo.name,
        timestamp: new Date().toISOString()
      }
      
      localStorage.setItem('userSession', JSON.stringify(sessionData))
      
      // Also trigger a custom event for components to listen to
      window.dispatchEvent(new CustomEvent('userSessionUpdate', {
        detail: sessionData
      }))
      
      return true
    } catch (error) {
      console.error('Failed to save customer info:', error)
      return false
    }
  },

  // Get customer information from localStorage
  getCustomerInfo: () => {
    try {
      const sessionData = localStorage.getItem('userSession')
      if (sessionData) {
        const parsed = JSON.parse(sessionData)
        
        // Check if session is not too old (24 hours)
        const sessionAge = new Date() - new Date(parsed.timestamp)
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        
        if (sessionAge < maxAge) {
          return parsed
        } else {
          // Session expired, clear it
          userSession.clearCustomerInfo()
          return null
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to get customer info:', error)
      return null
    }
  },

  // Clear customer information
  clearCustomerInfo: () => {
    try {
      localStorage.removeItem('userSession')
      
      // Trigger event for components to listen to
      window.dispatchEvent(new CustomEvent('userSessionUpdate', {
        detail: null
      }))
      
      return true
    } catch (error) {
      console.error('Failed to clear customer info:', error)
      return false
    }
  },

  // Update an existing booking and save customer info
  saveBookingAndCustomerInfo: (booking) => {
    try {
      // Save customer info for future use
      if (booking.customerDetails) {
        userSession.setCustomerInfo(booking.customerDetails)
      }

      // Save booking to localStorage for offline viewing
      const existingBookings = JSON.parse(localStorage.getItem('userBookings') || '[]')
      
      // Check if booking already exists (update) or add new
      const existingIndex = existingBookings.findIndex(b => 
        b.id === booking.id || b.bookingId === booking.bookingId
      )
      
      if (existingIndex >= 0) {
        existingBookings[existingIndex] = booking
      } else {
        existingBookings.unshift(booking) // Add to beginning
      }
      
      // Keep only latest 50 bookings to avoid localStorage bloat
      if (existingBookings.length > 50) {
        existingBookings.splice(50)
      }
      
      localStorage.setItem('userBookings', JSON.stringify(existingBookings))
      
      return true
    } catch (error) {
      console.error('Failed to save booking and customer info:', error)
      return false
    }
  },

  // Get customer info from recent bookings if no session exists
  getCustomerInfoFromBookings: () => {
    try {
      const recentBookings = JSON.parse(localStorage.getItem('userBookings') || '[]')
      
      if (recentBookings.length > 0) {
        const lastBooking = recentBookings[0]
        return {
          phone: lastBooking.customerDetails?.phone,
          email: lastBooking.customerDetails?.email,
          name: lastBooking.customerDetails?.name
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to get customer info from bookings:', error)
      return null
    }
  }
}

export default userSession
