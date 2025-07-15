import { slotCache } from '../utils/slotCache'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const bookingsAPI = {
  // Check slot availability for a specific date and station
  checkSlotAvailability: async (stationId, date, portId = null) => {
    try {
      const params = new URLSearchParams({ date })
      if (portId) params.append('portId', portId)
      
      const response = await fetch(`${API_BASE_URL}/bookings/availability/${stationId}?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to check availability')
      }
      
      return response.json()
    } catch (error) {
      console.error('Check availability error:', error)
      throw error
    }
  },

  // Get port availability for a station
  getPortAvailability: async (stationId, date = null) => {
    try {
      const params = new URLSearchParams()
      if (date) params.append('date', date)
      
      const response = await fetch(`${API_BASE_URL}/bookings/ports/${stationId}?${params}`,{
        headers: {
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get port availability')
      }
      
      return response.json()
    } catch (error) {
      console.error('Get port availability error:', error)
      throw error
    }
  },
  // Create a quick booking (demo)
  createQuickBooking: async (bookingData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/quick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        },
        body: JSON.stringify(bookingData),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create booking')
      }
      
      return response.json()
    } catch (error) {
      console.error('Create booking error:', error)
      throw error
    }
  },
  // Get user bookings from backend
  getUserBookings: async (customerInfo = null) => {
    try {
      // Try to get customer info from various sources
      let phone, email;
      
      if (customerInfo) {
        phone = customerInfo.phone;
        email = customerInfo.email;
      } else {
        // Try to get from recent booking localStorage
        const recentBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
        if (recentBookings.length > 0) {
          const lastBooking = recentBookings[0];
          phone = lastBooking.customerDetails?.phone;
          email = lastBooking.customerDetails?.email;
        }
        
        // If still no info, try to get from localStorage user session
        const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
        phone = phone || userSession.phone;
        email = email || userSession.email;
      }      // If we have customer info, fetch from backend
      if (phone || email) {
        const params = new URLSearchParams();
        if (phone) params.append('phone', phone);
        if (email) params.append('email', email);
        
        const url = `${API_BASE_URL}/bookings/user?${params}`;
        console.log('Fetching bookings from:', url);
        console.log('Customer info:', { phone, email });
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to fetch bookings');
        }
        
        const result = await response.json();
        
        // Also update localStorage for offline viewing
        if (result.success && result.data.length > 0) {
          localStorage.setItem('userBookings', JSON.stringify(result.data));
        }
        
        return result;
      } else {
        // Fallback to localStorage if no customer info available
        const localBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
        
        return {
          success: true,
          data: localBookings,
          count: localBookings.length,
          message: localBookings.length > 0 ? 'Loaded from local storage' : 'No bookings found'
        };
      }
    } catch (error) {
      console.error('Get bookings error:', error);
      
      // Fallback to localStorage on error
      const localBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
      
      return {
        success: true,
        data: localBookings,
        count: localBookings.length,
        message: 'Loaded from local storage (offline mode)',
        offline: true
      };
    }
  },

  // Get specific booking by ID
  getBookingById: async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch booking');
      }
      
      return response.json();
    } catch (error) {
      console.error('Get booking by ID error:', error);
      throw error;
    }
  },  // Update booking status (for completed bookings)
  updateBookingStatus: async (bookingId, status) => {
    try {
      // For demo purposes, update localStorage
      const bookings = JSON.parse(localStorage.getItem('userBookings') || '[]')
      const updatedBookings = bookings.map(booking => 
        booking.id === bookingId || booking.bookingId === bookingId 
          ? { ...booking, status }
          : booking
      )
      localStorage.setItem('userBookings', JSON.stringify(updatedBookings))
      
      return {
        success: true,
        message: 'Booking status updated successfully'
      }
    } catch (error) {
      console.error('Update booking error:', error)
      throw error
    }
  },

  // Get enhanced 24/7 slot availability (new robust endpoint)
  getSlotAvailability: async (stationId, date, portId = null) => {
    try {
      const params = new URLSearchParams({ date })
      if (portId) params.append('portId', portId)
      
      const response = await fetch(`${API_BASE_URL}/bookings/slots/${stationId}?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get slot availability')
      }
      
      return response.json()
    } catch (error) {
      console.error('Get slot availability error:', error)
      throw error
    }
  },

  // Get real-time booking conflicts and available windows (new dynamic endpoint)
  getRealTimeAvailability: async (stationId, date, portId = null) => {
    try {
      const params = new URLSearchParams({ 
        date,
        realTime: 'true',
        includeConflicts: 'true'
      })
      if (portId) params.append('portId', portId)
      
      const response = await fetch(`${API_BASE_URL}/bookings/realtime-availability/${stationId}?${params}`,{
        headers: {
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get real-time availability')
      }
      
      return response.json()
    } catch (error) {
      console.error('Get real-time availability error:', error)
      throw error
    }
  },

  // Get booking conflicts for a specific port and date range
  getBookingConflicts: async (stationId, portId, date, timeRange = null) => {
    try {
      const params = new URLSearchParams({ 
        portId,
        date
      })
      if (timeRange) {
        params.append('startTime', timeRange.start)
        params.append('endTime', timeRange.end)
      }
      
      const response = await fetch(`${API_BASE_URL}/bookings/conflicts/${stationId}?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get booking conflicts')
      }
      
      return response.json()
    } catch (error) {
      console.error('Get booking conflicts error:', error)
      throw error
    }
  },

  // Get existing bookings for a specific date and port (for dynamic slot generation)
  getBookingsByDateAndPort: async (stationId, date, portId = null) => {
    try {
      const params = new URLSearchParams({ date })
      if (portId) params.append('portId', portId)
      
      const response = await fetch(`${API_BASE_URL}/bookings/existing/${stationId}?${params}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get existing bookings')
      }
      
      return response.json()
    } catch (error) {
      console.error('Get existing bookings error:', error)
      // Return empty bookings array as fallback
      return {
        success: true,
        data: {
          bookings: []
        },
        message: 'Using fallback - no existing bookings data'
      }
    }
  },
  // Get bulk slot counts for all ports across multiple dates (optimized with caching)
  getBulkSlotCounts: async (stationId, dates) => {
    try {
      // Check cache first
      const cachedData = slotCache.get(stationId, dates)
      if (cachedData) {
        console.log('📋 Using cached slot counts')
        return cachedData
      }

      const datesParam = Array.isArray(dates) ? dates.join(',') : dates
      const params = new URLSearchParams({ dates: datesParam })
      
      console.log(`🔄 Fetching bulk slot counts for station ${stationId} - dates: ${datesParam}`)
      
      const response = await fetch(`${API_BASE_URL}/bookings/bulk-slot-counts/${stationId}?${params}`,{
        headers: {
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to get bulk slot counts')
      }
      
      const result = await response.json()
      
      // Cache the successful result
      slotCache.set(stationId, dates, result)
      
      console.log(`✅ Bulk slot counts loaded successfully - replaced ${Array.isArray(dates) ? dates.length : 1} dates × ports individual calls`)
      
      return result
    } catch (error) {
      console.error('Get bulk slot counts error:', error)
      throw error
    }
  },

  // Create secure booking with conflict prevention (new robust endpoint)
  createSecureBooking: async (bookingData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/secure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        },
        body: JSON.stringify(bookingData),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create booking')
      }
      
      return response.json()
    } catch (error) {
      console.error('Create secure booking error:', error)
      throw error
    }
  },

  // Extend booking duration
  extendBooking: async (bookingId, additionalDuration) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        },
        body: JSON.stringify({ additionalDuration }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to extend booking')
      }
      
      return response.json()
    } catch (error) {
      console.error('Extend booking error:', error)
      throw error
    }
  },

  // Complete booking early (with refund)
  completeBookingEarly: async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-super-secret-api-key-2024',
          'X-Frontend-Request': 'true'
        },
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to complete booking')
      }
      
      return response.json()
    } catch (error) {
      console.error('Complete booking error:', error)
      throw error
    }
  },
}

export default bookingsAPI
