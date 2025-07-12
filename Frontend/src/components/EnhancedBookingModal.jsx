import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Calendar, 
  Clock, 
  Zap, 
  User, 
  Phone, 
  Car, 
  Mail, 
  CreditCard,
  CheckCircle,
  AlertCircle,
  MapPin,
  ExternalLink,
  Loader,
  Plus,
  Minus,
  Timer
} from 'lucide-react'
import { bookingsAPI } from '../services/bookingsAPI'
import { userSession } from '../utils/userSession'
import { useAuth } from '../context/AuthContext'
import TurnstileWidget from './TurnstileWidget'
import useTurnstile from '../hooks/useTurnstile'

const EnhancedBookingModal = ({ station, isOpen, onClose }) => {
  const { user, isAuthenticated } = useAuth()
  const [step, setStep] = useState(1) // 1: slots, 2: duration, 3: booking form, 4: payment, 5: confirmation
  const [selectedPort, setSelectedPort] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState(120) // Default 2 hours
  const [timeSlots, setTimeSlots] = useState([])  
  const [portAvailability, setPortAvailability] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingPorts, setLoadingPorts] = useState(false)
  const [loadingSlotCounts, setLoadingSlotCounts] = useState(false)
  const [bookingForm, setBookingForm] = useState({    phoneNumber: '',
    vehicleNumber: '',
    driverName: '',
    email: '',
    isFlexible: false
  })
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [bookingDetails, setBookingDetails] = useState(null)
  const [slotCounts, setSlotCounts] = useState({}) // { date: { portId: availableCount } }
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(null)
  const [slotLoadError, setSlotLoadError] = useState(null) // Track slot loading errors

  // Turnstile hook for payment verification
  const paymentTurnstile = useTurnstile({
    action: 'booking_payment',
    autoValidate: false
  })

  // Get Nepal time (Asia/Kathmandu timezone)
  const getNepalTime = () => {
    const now = new Date()
    
    // Convert to Nepal timezone (UTC+5:45)
    const nepalTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}))
    
    // Debug logging for timezone comparison
    if (process.env.NODE_ENV === 'development') {
      console.log(`🕒 Nepal Time Debug:`, {
        clientTime: now.toLocaleString(),
        nepalTime: nepalTime.toLocaleString(),
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        nepalTimezone: 'Asia/Kathmandu (UTC+5:45)'
      })
    }
    
    return nepalTime
  }

  // Generate next 7 days for date selection
  const getNext7Days = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = getNepalTime()
      date.setDate(date.getDate() + i)
      days.push({
        date: date.toISOString().split('T')[0],
        display: date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }),
        isToday: i === 0
      })
    }
    return days
  }

  // Utility function to convert time string to minutes since midnight
  const timeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Utility function to convert minutes since midnight to time string
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Get current time in minutes for today's slot calculation (using Nepal time)
  const getCurrentTimeMinutes = () => {
    const now = getNepalTime()
    return now.getHours() * 60 + now.getMinutes()
  }

  // Calculate next available slot time with buffer (using Nepal time)
  const getNextAvailableTime = (currentTimeMinutes, bufferMinutes = 5) => {
    // Round up to next 5-minute interval and add buffer
    const nextSlotMinutes = Math.ceil((currentTimeMinutes + bufferMinutes) / 5) * 5
    return Math.min(nextSlotMinutes, 24 * 60 - 15) // Don't go past 23:45
  }

  // Check if two time ranges overlap (with buffer consideration)
  const timeRangesOverlap = (start1, end1, start2, end2, bufferMinutes = 5) => {
    // Add buffer to existing bookings
    const bufferedStart2 = Math.max(0, start2 - bufferMinutes)
    const bufferedEnd2 = Math.min(24 * 60, end2 + bufferMinutes)
    
    return start1 < bufferedEnd2 && end1 > bufferedStart2
  }

  // Real-time slot calculation without caching to ensure fresh data
  const calculateAvailableDurations = useCallback((startMinutes, existingBookings, selectedDate) => {
    // Get operating hours for the selected date
    const operatingHours = getOperatingHoursForDate(selectedDate)
    
    // Calculate max end time based on operating hours
    let maxEndTime = 24 * 60 // Default to end of day
    if (!operatingHours.is24Hours && operatingHours.close) {
      const closeMinutes = timeToMinutes(operatingHours.close)
      const openMinutes = timeToMinutes(operatingHours.open || '00:00')
      
      // Handle next-day closing
      if (closeMinutes <= openMinutes) {
        maxEndTime = closeMinutes + 24 * 60
      } else {
        maxEndTime = closeMinutes
      }
    }
    
    const standardDurations = [30, 60, 90, 120, 180, 240, 300, 360, 480] // 30min to 8h
    const availableDurations = []
    
    for (const duration of standardDurations) {
      const endMinutes = startMinutes + duration
      
      // Check if duration goes beyond end of day
      if (endMinutes > maxEndTime) continue
      
      // Check if this duration conflicts with any existing booking (using 5-minute buffer)
      const hasConflict = existingBookings.some(booking => {
        // Parse booking times properly - handle both HH:MM and full datetime formats
        let bookingStartTime = booking.startTime
        let bookingEndTime = booking.endTime
        
        // If it's a full datetime string, extract just the time portion
        if (bookingStartTime.includes('T') || bookingStartTime.includes(' ')) {
          const bookingStartDate = new Date(bookingStartTime)
          const nepalStartTime = new Date(bookingStartDate.toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}))
          bookingStartTime = `${nepalStartTime.getHours().toString().padStart(2, '0')}:${nepalStartTime.getMinutes().toString().padStart(2, '0')}`
        }
        
        if (bookingEndTime.includes('T') || bookingEndTime.includes(' ')) {
          const bookingEndDate = new Date(bookingEndTime)
          const nepalEndTime = new Date(bookingEndDate.toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}))
          bookingEndTime = `${nepalEndTime.getHours().toString().padStart(2, '0')}:${nepalEndTime.getMinutes().toString().padStart(2, '0')}`
        }
        
        const bookingStart = timeToMinutes(bookingStartTime)
        const bookingEnd = timeToMinutes(bookingEndTime)
        return timeRangesOverlap(startMinutes, endMinutes, bookingStart, bookingEnd, 5)
      })
      
      if (!hasConflict) {
        availableDurations.push(duration)
      }
    }
    
    // Debug logging for duration calculation
    if (process.env.NODE_ENV === 'development' && availableDurations.length === 0) {
      const slotTime = minutesToTime(startMinutes)
      const parsedConflicts = existingBookings.map(b => {
        const startTime = b.startTime.includes('T') || b.startTime.includes(' ') ? 
          new Date(b.startTime).toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}) : 
          b.startTime
        const endTime = b.endTime.includes('T') || b.endTime.includes(' ') ? 
          new Date(b.endTime).toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}) : 
          b.endTime
        return `${startTime}-${endTime}`
      })
      console.log(`⚠️ No durations available for slot ${slotTime}, conflicts:`, parsedConflicts)
    }
    
    return availableDurations
  }, [])

  // Real-time calculation of maximum continuous duration available from a start time
  const getMaxContinuousDuration = useCallback((startMinutes, existingBookings, selectedDate) => {
    // Get operating hours for the selected date
    const operatingHours = getOperatingHoursForDate(selectedDate)
    
    // Calculate max end time based on operating hours
    let maxEndTime = 24 * 60 // Default to end of day
    if (!operatingHours.is24Hours && operatingHours.close) {
      const closeMinutes = timeToMinutes(operatingHours.close)
      const openMinutes = timeToMinutes(operatingHours.open || '00:00')
      
      // Handle next-day closing
      if (closeMinutes <= openMinutes) {
        maxEndTime = closeMinutes + 24 * 60
      } else {
        maxEndTime = closeMinutes
      }
    }
    
    let maxDuration = 0
    
    // Find the next booking that would conflict
    let nextConflictStart = maxEndTime
    
    for (const booking of existingBookings) {
      // Parse booking time properly - handle both HH:MM and full datetime formats
      let bookingStartTime = booking.startTime
      
      // Debug logging for time parsing
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Processing booking:`, {
          original: booking,
          startTime: bookingStartTime,
          isDatetime: bookingStartTime.includes('T') || bookingStartTime.includes(' ')
        })
      }
      
      // If it's a full datetime string, extract just the time portion
      if (bookingStartTime.includes('T') || bookingStartTime.includes(' ')) {
        const bookingDate = new Date(bookingStartTime)
        // Convert to Nepal timezone and extract time
        const nepalTime = new Date(bookingDate.toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}))
        bookingStartTime = `${nepalTime.getHours().toString().padStart(2, '0')}:${nepalTime.getMinutes().toString().padStart(2, '0')}`
      }
      
      const bookingStart = timeToMinutes(bookingStartTime) - 5 // 5-minute buffer
      
      // Debug logging for conflict analysis
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Conflict check for slot ${minutesToTime(startMinutes)}: booking ${booking.startTime} -> ${bookingStartTime} -> ${bookingStart}min (slot: ${startMinutes}min)`)
      }
      
      if (bookingStart >= startMinutes && bookingStart < nextConflictStart) {
        nextConflictStart = bookingStart
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎯 Found closer conflict: ${bookingStartTime} at ${bookingStart}min`)
        }
      }
    }
    
    maxDuration = Math.min(nextConflictStart - startMinutes, 480) // Max 8 hours
    const result = Math.max(0, maxDuration)
    
    // Enhanced debug logging for slot duration calculation
    if (process.env.NODE_ENV === 'development') {
      const slotTime = minutesToTime(startMinutes)
      const nextConflictTime = minutesToTime(nextConflictStart)
      const conflictDetails = existingBookings.map(b => ({
        original: b.startTime,
        parsed: b.startTime.includes('T') || b.startTime.includes(' ') ? 
          new Date(b.startTime).toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}) : 
          b.startTime
      }))
      console.log(`🔍 Slot ${slotTime}: maxDuration=${result}min (${Math.floor(result/60)}h ${result%60}m), nextConflict=${nextConflictTime}, conflicts:`, conflictDetails)
    }
    
    return result
  }, [])

  // Helper function to get day of week from date string
  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[date.getDay()]
  }

  // Helper function to get operating hours for a specific date
  const getOperatingHoursForDate = (dateString) => {
    if (!station?.operatingHours) {
      // Default to 24/7 if no operating hours defined
      return { is24Hours: true, open: '00:00', close: '23:59' }
    }
    
    const dayOfWeek = getDayOfWeek(dateString)
    const dayOperatingHours = station.operatingHours[dayOfWeek]
    
    if (!dayOperatingHours) {
      // Default to 24/7 if specific day not defined
      return { is24Hours: true, open: '00:00', close: '23:59' }
    }
    
    return dayOperatingHours
  }

  // Note: Removed generateDynamicTimeSlots function to ensure only real-time data is used
  // This prevents any caching or fallback to static data that could be outdated

  // Load port availability
  const loadPortAvailability = async () => {
    if (!station?._id) return
    
    setLoadingPorts(true)
    try {
      const response = await bookingsAPI.getPortAvailability(station._id, selectedDate)
      if (response.success) {
        setPortAvailability(response.data.ports)
      }
    } catch (error) {
      console.error('Error loading port availability:', error)
      setPortAvailability(station?.chargingPorts || [])
    } finally {      setLoadingPorts(false)
    }
  }
  // Load slot counts for all ports across next 7 days using bulk API
  const loadSlotCounts = async () => {
    if (!station?._id) return
    
    setLoadingSlotCounts(true)
    
    // Initialize with "Full" state for all ports and dates
    const availableDates = getNext7Days()
    const initialSlotCounts = {}
    
    availableDates.forEach(day => {
      initialSlotCounts[day.date] = {}
      ;(station?.chargingPorts || []).forEach(port => {
        // Set all slots as "Full" initially during loading
        initialSlotCounts[day.date][port._id] = 0
      })
    })
    setSlotCounts(initialSlotCounts)
    
    try {
      // Prepare dates array for bulk API call
      const dates = availableDates.map(day => day.date)
      
      // Single API call to get all slot counts
      const response = await bookingsAPI.getBulkSlotCounts(station._id, dates)
      
      if (response.success) {
        setSlotCounts(response.data.slotCounts)
      } else {
        console.error('Bulk slot counts API failed:', response.message)
        // Keep the initialized "Full" state as fallback
      }
    } catch (error) {
      console.error('Error loading bulk slot counts:', error)
      
      // Fallback: Calculate slot counts locally
      const fallbackSlotCounts = {}
      availableDates.forEach(day => {
        fallbackSlotCounts[day.date] = {}
        ;(station?.chargingPorts || []).forEach(port => {
          if (day.isToday) {
            const currentTime = getNepalTime()
            const currentHour = currentTime.getHours()
            const currentMinute = currentTime.getMinutes()
            const totalMinutesPassedToday = currentHour * 60 + currentMinute
            const nextSlotMinute = Math.ceil(totalMinutesPassedToday / 30) * 30
            const remainingSlots = Math.max(0, 48 - (nextSlotMinute / 30))
            fallbackSlotCounts[day.date][port._id] = remainingSlots
          } else {
            fallbackSlotCounts[day.date][port._id] = 48 // Default 24 hours × 2 slots per hour
          }
        })
      })
      setSlotCounts(fallbackSlotCounts)
    } finally {
      setLoadingSlotCounts(false)
    }
  }

  const availableDays = getNext7Days()
  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep(1)
      setSelectedPort(null)
      setSelectedDate('')
      setSelectedTimeSlot(null)
      setSelectedDuration(120)
      setTimeSlots([])
      setPortAvailability([])
      setSlotLoadError(null) // Clear any previous errors
      
      // Initialize booking form - auto-fill if user is logged in
      const initialFormData = {
        phoneNumber: '',
        vehicleNumber: '',        
        driverName: '',
        email: '',
        isFlexible: false
      }
      
      // Auto-fill user details if authenticated
      if (isAuthenticated && user) {
        initialFormData.phoneNumber = user.phoneNumber || ''
        initialFormData.email = user.email || ''
        initialFormData.driverName = user.name || ''
        
        // If user has a default vehicle, use it
        if (user.vehicles && user.vehicles.length > 0) {
          const defaultVehicle = user.vehicles.find(v => v.isDefault) || user.vehicles[0]
          initialFormData.vehicleNumber = defaultVehicle.vehicleNumber || ''
        }
      }
      
      setBookingForm(initialFormData)
      setPaymentProcessing(false)
      setBookingDetails(null)
      setSlotCounts({})
      
      // Load initial port availability and slot counts
      loadPortAvailability()
      loadSlotCounts()
    }
  }, [isOpen, isAuthenticated, user])

  useEffect(() => {
    if (isOpen && selectedDate) {
      loadPortAvailability()
    }
  }, [selectedDate])

  useEffect(() => {
    if (isOpen && selectedDate && selectedPort) {
      // This effect now generates dynamic slots based on existing bookings
      // We need to fetch existing bookings for the selected date and port
      const fetchRealTimeSlots = async () => {
        setLoadingSlots(true)
        setSlotLoadError(null) // Clear previous errors
        
        try {
          console.log(`🔄 Fetching real-time slots for station ${station._id}, port ${selectedPort._id}, date ${selectedDate}`)
          
          // Try the new real-time availability endpoint first
          const response = await bookingsAPI.getRealTimeAvailability(station._id, selectedDate, selectedPort._id)
          
          if (response.success && response.data.ports.length > 0) {
            const portData = response.data.ports[0] // Since we're querying for a specific port
            const realTimeSlots = []
            
            // Get operating hours for filtering
            const operatingHours = getOperatingHoursForDate(selectedDate)
            let stationOpenMinutes = 0
            let stationCloseMinutes = 24 * 60
            
            if (!operatingHours.is24Hours && operatingHours.open && operatingHours.close) {
              stationOpenMinutes = timeToMinutes(operatingHours.open)
              stationCloseMinutes = timeToMinutes(operatingHours.close)
              
              // Handle next-day closing
              if (stationCloseMinutes <= stationOpenMinutes) {
                stationCloseMinutes += 24 * 60
              }
            }
            
            // Transform backend slots to frontend format with operating hours filtering
            portData.slots.forEach((slot, index) => {
              const slotMinutes = timeToMinutes(slot.time)
              
              // Skip slots outside operating hours
              if (!operatingHours.is24Hours) {
                if (slotMinutes < stationOpenMinutes || slotMinutes >= stationCloseMinutes) {
                  return // Skip this slot
                }
              }
              
              // Calculate available durations using port-level conflicts (not slot-level)
              const availableDurations = calculateAvailableDurations(
                slotMinutes, 
                portData.conflicts || [], // Use port-level conflicts which contain all bookings
                selectedDate
              )
              
              // Calculate max continuous duration using port-level conflicts (not slot-level)
              const maxContinuousDuration = getMaxContinuousDuration(
                slotMinutes, 
                portData.conflicts || [], // Use port-level conflicts which contain all bookings
                selectedDate
              )
              
              realTimeSlots.push({
                id: `realtime-${slot.time.replace(':', '-')}`,
                startTime: slot.time,
                endTime: minutesToTime(timeToMinutes(slot.time) + 5), // 5-minute slots
                display: slot.time,
                minutes: slotMinutes,
                isAvailable: slot.isAvailable,
                hasConflict: slot.conflicts && slot.conflicts.length > 0,
                conflicts: slot.conflicts || [],
                availableDurations: availableDurations,
                maxContinuousDuration: maxContinuousDuration,
                pricing: [{ duration: 120, totalPrice: calculatePrice(120) }]
              })
            })
            
            console.log(`✅ Loaded ${realTimeSlots.length} real-time slots with ${response.data.totalExistingBookings} existing bookings`)
            
            // Log Nepal time for debugging
            if (process.env.NODE_ENV === 'development') {
              console.log(`🇳🇵 Nepal Time: ${getNepalTime().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })}`)
            }
            
            setTimeSlots(realTimeSlots)
          } else {
            throw new Error(response.message || 'No port data received')
          }
        } catch (error) {
          console.error('Error loading real-time slots:', error)
          
          // No fallback to static data - show error if real-time data fails
          setSlotLoadError(`Failed to load real-time slot availability. Please try again or contact support. Error: ${error.message}`)
          setTimeSlots([]) // Clear any existing slots
        } finally {
          setLoadingSlots(false)
        }
      }
      fetchRealTimeSlots()
    }
  }, [selectedDate, selectedPort, station?._id])

  // Real-time updates: Auto-refresh slots every 30 seconds when viewing time slots
  useEffect(() => {
    if (step === 2 && selectedDate && selectedPort && autoRefreshEnabled && station?._id) {
      // Set up auto-refresh interval
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing slots for real-time updates...')
        
        // Re-fetch real-time slots
        const fetchRealTimeSlots = async () => {
          try {
            const response = await bookingsAPI.getRealTimeAvailability(station._id, selectedDate, selectedPort._id)
            
            if (response.success && response.data.ports.length > 0) {
              const portData = response.data.ports[0]
              const realTimeSlots = []
              
              // Get operating hours for filtering
              const operatingHours = getOperatingHoursForDate(selectedDate)
              let stationOpenMinutes = 0
              let stationCloseMinutes = 24 * 60
              
              if (!operatingHours.is24Hours && operatingHours.open && operatingHours.close) {
                stationOpenMinutes = timeToMinutes(operatingHours.open)
                stationCloseMinutes = timeToMinutes(operatingHours.close)
                
                // Handle next-day closing
                if (stationCloseMinutes <= stationOpenMinutes) {
                  stationCloseMinutes += 24 * 60
                }
              }
              
              portData.slots.forEach((slot) => {
                const slotMinutes = timeToMinutes(slot.time)
                
                // Skip slots outside operating hours
                if (!operatingHours.is24Hours) {
                  if (slotMinutes < stationOpenMinutes || slotMinutes >= stationCloseMinutes) {
                    return // Skip this slot
                  }
                }
                
                const availableDurations = calculateAvailableDurations(
                  slotMinutes, 
                  portData.conflicts || [], 
                  selectedDate
                )
                
                const maxContinuousDuration = getMaxContinuousDuration(
                  slotMinutes, 
                  portData.conflicts || [],
                  selectedDate
                )
                
                realTimeSlots.push({
                  id: `realtime-${slot.time.replace(':', '-')}`,
                  startTime: slot.time,
                  endTime: minutesToTime(timeToMinutes(slot.time) + 5),
                  display: slot.time,
                  minutes: slotMinutes,
                  isAvailable: slot.isAvailable,
                  hasConflict: slot.conflicts && slot.conflicts.length > 0,
                  conflicts: slot.conflicts || [],
                  availableDurations: availableDurations,
                  maxContinuousDuration: maxContinuousDuration,
                  pricing: [{ duration: 120, totalPrice: calculatePrice(120) }]
                })
              })
              
              // Log Nepal time for debugging during auto-refresh
              if (process.env.NODE_ENV === 'development') {
                console.log(`🇳🇵 Auto-refresh Nepal Time: ${getNepalTime().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })}`)
              }
              
              // Only update if there are changes to avoid unnecessary re-renders
              setTimeSlots(prev => {
                const hasChanges = JSON.stringify(prev) !== JSON.stringify(realTimeSlots)
                if (hasChanges) {
                  console.log(`✅ Auto-refresh: Updated ${realTimeSlots.length} slots`)
                  setLastRefreshed(new Date())
                  setSlotLoadError(null) // Clear any previous errors on successful refresh
                  return realTimeSlots
                } else {
                  console.log('📌 Auto-refresh: No changes detected')
                  return prev
                }
              })
            }
          } catch (error) {
            console.error('Auto-refresh failed:', error)
            // Don't show error for auto-refresh failures, just log them
            // This prevents the UI from showing errors for background refresh attempts
          }
        }
        
        fetchRealTimeSlots()
      }, 30000) // Refresh every 30 seconds
      
      setRefreshInterval(interval)
      setLastRefreshed(new Date())
      
      // Cleanup interval on unmount or when dependencies change
      return () => {
        if (interval) {
          clearInterval(interval)
        }
      }
    }
  }, [step, selectedDate, selectedPort, autoRefreshEnabled, station?._id])

  // Cleanup refresh interval when modal closes
  useEffect(() => {
    if (!isOpen && refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }
  }, [isOpen, refreshInterval])

  const handlePortSelection = (port) => {
    setSelectedPort(port)
    setStep(2)
  }

  const handleTimeSlotSelection = (slot) => {
    setSelectedTimeSlot(slot)
    setStep(3)
  }
  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (bookingForm.phoneNumber && bookingForm.vehicleNumber) {
      setStep(4)
    }
  }
    const calculatePrice = (duration) => {
    if (!selectedPort || !duration) return 0
    
    // Simple pricing: Power consumption cost + Platform fee
    // Convert duration from minutes to hours
    const durationHours = duration / 60
    
    // Calculate energy consumption: Power (kW) × Time (hours) = Energy (kWh)
    const estimatedEnergyConsumption = selectedPort.powerOutput * durationHours
    
    // Calculate energy cost: Energy (kWh) × Rate (₹/kWh)
    const energyCost = estimatedEnergyConsumption * (selectedPort.pricePerUnit || 3)
    
    // Add platform fee
    const platformFee = 5
    const totalPrice = energyCost + platformFee
    
    return Math.round(totalPrice)
  }

  const handlePayment = async () => {
    // Validate Turnstile first
    if (!paymentTurnstile.token) {
      alert('Please complete the verification challenge')
      return
    }

    // Start payment processing immediately
    setPaymentProcessing(true)
    
    try {
      const turnstileValidation = await paymentTurnstile.validate()
      if (!turnstileValidation) {
        alert('Verification failed. Please try again.')
        paymentTurnstile.reset()
        setPaymentProcessing(false)
        return
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const bookingData = {
        stationId: station?._id,
        portId: selectedPort._id,
        date: selectedDate,
        startTime: selectedTimeSlot.startTime,
        duration: selectedDuration,
        customerDetails: {
          phoneNumber: bookingForm.phoneNumber,
          vehicleNumber: bookingForm.vehicleNumber,
          driverName: bookingForm.driverName,
          email: bookingForm.email
        },
        vehicleDetails: {
          vehicleNumber: bookingForm.vehicleNumber,
          vehicleType: 'car'
        },        isFlexible: bookingForm.isFlexible
      }

      const result = await bookingsAPI.createSecureBooking(bookingData)
        if (result.success) {
        setBookingDetails(result.data)
        setPaymentProcessing(false)
        setStep(5)
        
        // Save booking and customer info using userSession utility
        userSession.saveBookingAndCustomerInfo(result.data)
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('Booking error:', error)
      alert('Booking failed: ' + error.message)
      setPaymentProcessing(false)
    }
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  // Helper function to validate any duration for the selected time slot
  const validateDurationForSlot = (duration, timeSlot) => {
    if (!timeSlot || !duration) return false
    
    // Basic duration bounds check
    if (duration < 30) return false // Minimum 30 minutes
    if (duration > 480) return false // Maximum 8 hours
    
    // Check if duration doesn't exceed max continuous duration
    const maxDuration = timeSlot.maxContinuousDuration || 480
    if (duration > maxDuration) return false
    
    // Check if this duration would cause conflicts with existing bookings
    // Calculate the end time for this booking
    const startMinutes = timeToMinutes(timeSlot.startTime)
    const endMinutes = startMinutes + duration
    
    // Check against conflicts if available
    const conflicts = timeSlot.conflicts || []
    for (const conflict of conflicts) {
      const conflictStart = timeToMinutes(conflict.startTime)
      const conflictEnd = timeToMinutes(conflict.endTime)
      
      // Check if our proposed booking would overlap with this conflict (with 5-min buffer)
      if (timeRangesOverlap(startMinutes, endMinutes, conflictStart, conflictEnd)) {
        return false
      }
    }
    
    return true
  }

  // Validation functions
  const isDurationValid = () => {
    return validateDurationForSlot(selectedDuration, selectedTimeSlot)
  }

  const isFormValid = bookingForm.phoneNumber && bookingForm.vehicleNumber
  // Helper function to check if a time slot has passed (for today only)
  const isTimeSlotPassed = (slotTime, date) => {
    const selectedDate = new Date(date);
    const today = getNepalTime();
    
    // Only check for past time slots if the selected date is today
    if (selectedDate.toDateString() !== today.toDateString()) {
      return false; // Future dates are always valid
    }
    
    // Parse slot time (assuming format like "17:00")
    const [hours, minutes] = slotTime.split(':').map(Number);
    const slotDateTime = new Date(today);
    slotDateTime.setHours(hours, minutes, 0, 0);
    
    // Only mark as passed if the slot time has actually passed
    // No buffer needed - just check if the slot time is in the past
    return slotDateTime < today;
  };

  if (!isOpen || !station) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="inline-block w-full max-w-6xl p-3 sm:p-6 my-4 sm:my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl sm:rounded-2xl relative z-10 mx-2 sm:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4 sm:mb-6">
              <div className="flex-1 pr-2">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                  Book Charging Slot - 24/7 Service
                </h3>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  {station?.name} - {station?.address?.city}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="mb-6 sm:mb-8">
              {/* Desktop Progress */}
              <div className="hidden sm:flex items-center space-x-4">
                {[1, 2, 3, 4, 5].map((stepNum) => (
                  <div key={stepNum} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step >= stepNum
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {stepNum}
                    </div>
                    {stepNum < 5 && (
                      <div
                        className={`w-12 h-1 mx-2 ${
                          step > stepNum ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Mobile Progress */}
              <div className="sm:hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Step {step} of 5</span>
                  <span className="text-xs text-gray-600">{Math.round((step/5)*100)}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(step/5)*100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="mt-2 text-xs sm:text-sm text-gray-600">
                {step === 1 && 'Select Charging Port'}
                {step === 2 && 'Choose Date & Time (24/7)'}
                {step === 3 && 'Select Duration'}
                {step === 4 && 'Enter Details & Pay'}
                {step === 5 && 'Confirmation'}
              </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[400px] sm:min-h-[500px]">              {/* Step 1: Port Selection */}
              {step === 1 && (                <div>
                  <h4 className="text-lg font-semibold mb-4">Select a Charging Port</h4>
                  
                  {/* Port Status Summary */}
                  {!loadingPorts && (portAvailability.length > 0 ? portAvailability : station?.chargingPorts || []).length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-800 font-medium">Port Status (Real-time):</span>
                        <div className="flex space-x-4">
                          {(() => {
                            const ports = portAvailability.length > 0 ? portAvailability : station?.chargingPorts || []
                            const today = getNepalTime().toISOString().split('T')[0]
                            
                            const operational = ports.filter(p => p.isOperational !== false).length
                            const available = ports.filter(p => {
                              const isOperational = p.isOperational !== false
                              const slotCount = slotCounts[today]?.[p._id]
                              return isOperational && slotCount !== undefined && slotCount > 0
                            }).length
                            const underMaintenance = ports.filter(p => p.isOperational === false).length
                            const noSlots = operational - available
                            
                            return (
                              <>
                                <span className="text-green-700">
                                  <span className="font-medium">{available}</span> Available
                                </span>
                                <span className="text-blue-700">
                                  <span className="font-medium">{operational}</span> Operational
                                </span>
                                {noSlots > 0 && (
                                  <span className="text-red-700">
                                    <span className="font-medium">{noSlots}</span> No Slots
                                  </span>
                                )}
                                {underMaintenance > 0 && (
                                  <span className="text-gray-700">
                                    <span className="font-medium">{underMaintenance}</span> Maintenance
                                  </span>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Global loading indicator for slot counts */}
                  {loadingSlotCounts && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center">
                        <Loader className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                        <span className="text-blue-800 text-sm">Loading slot availability across all dates...</span>
                      </div>
                    </div>
                  )}
                  
                  {loadingPorts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="h-8 w-8 animate-spin text-primary-600" />
                      <span className="ml-2 text-gray-600">Loading ports...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">                      {(portAvailability.length > 0 ? portAvailability : station?.chargingPorts || []).map((port, index) => {
                        // Check all conditions for port availability
                        const isOperational = port.isOperational !== false // Default to true if undefined
                        
                        // Get real-time slot availability for this port
                        const todaySlotCount = slotCounts[getNepalTime().toISOString().split('T')[0]]?.[port._id]
                        const hasAvailableSlots = todaySlotCount !== undefined && todaySlotCount > 0
                        
                        // Port is available if operational AND has available slots
                        const isAvailable = isOperational && hasAvailableSlots
                        
                        // Determine status message based on real-time data
                        const getStatusMessage = () => {
                          if (!isOperational) return 'Out of Service'
                          if (loadingSlotCounts) return 'Checking Availability...'
                          if (!hasAvailableSlots) return 'No Slots Available'
                          return `${todaySlotCount} Slots Available`
                        }
                        
                        // Determine status color
                        const getStatusColor = () => {
                          if (!isOperational) return 'bg-gray-100 text-gray-800'
                          if (loadingSlotCounts) return 'bg-blue-100 text-blue-800'
                          if (!hasAvailableSlots) return 'bg-red-100 text-red-800'
                          return 'bg-green-100 text-green-800'
                        }
                        
                        return (
                          <motion.div
                            key={port._id || index}
                            whileHover={{ scale: isAvailable ? 1.02 : 1 }}
                            className={`p-4 border-2 rounded-xl transition-all ${
                              isAvailable
                                ? 'border-green-200 bg-green-50 hover:border-green-300 cursor-pointer'
                                : !isOperational
                                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70'
                                : 'border-red-200 bg-red-50 cursor-not-allowed opacity-60'
                            }`}
                            onClick={() => isAvailable && handlePortSelection(port)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Port {port.portNumber}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
                                {getStatusMessage()}
                              </span>
                            </div><div className="space-y-1 text-sm">
                              <div className="flex items-center">
                                <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                                {port.connectorType} - {port.powerOutput}kW
                              </div>                              <div className="flex items-center">
                                <CreditCard className="h-4 w-4 mr-2 text-green-500" />
                                ₹{port.pricePerUnit || 3}/kWh + ₹5 platform fee
                              </div>
                              
                              {/* Operational Status Information */}
                              {!isOperational && (
                                <div className="text-xs text-gray-600 mt-1 p-2 bg-gray-100 rounded border">
                                  <div className="font-medium text-gray-700 mb-1">🔧 Under Maintenance</div>
                                  {port.lastMaintenance && (
                                    <div>Last service: {new Date(port.lastMaintenance).toLocaleDateString()}</div>
                                  )}
                                  <div className="text-gray-500">This port is temporarily unavailable</div>
                                </div>
                              )}
                              
                              {/* Real-time availability indicator */}
                              {isOperational && !loadingSlotCounts && (
                                <div className="text-xs text-blue-600 mt-1">
                                  {hasAvailableSlots ? '✅ Slots available' : '❌ No slots available'}
                                </div>
                              )}                                {/* Available Slot Counts for Next 3 Days */}
                              {isOperational ? (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="text-xs font-medium text-gray-700 mb-1">Real-time Slots:</div>
                                  <div className="space-y-1">
                                    {availableDays.slice(0, 3).map((day) => {
                                      const slotCount = slotCounts[day.date]?.[port._id]
                                      const isToday = day.isToday
                                      
                                      // Show loading state or slot count
                                      const displayText = loadingSlotCounts 
                                        ? 'Loading...' 
                                        : slotCount !== undefined
                                          ? slotCount > 0 ? `${slotCount} slots` : 'No slots'
                                          : 'Loading...'
                                      
                                      const textColor = loadingSlotCounts
                                        ? 'text-blue-600'
                                        : slotCount !== undefined
                                          ? slotCount > 30 ? 'text-green-600' : 
                                            slotCount > 15 ? 'text-yellow-600' : 
                                            slotCount > 0 ? 'text-orange-600' : 'text-red-600'
                                          : 'text-blue-600'
                                      
                                      return (
                                        <div key={day.date} className="flex justify-between text-xs">
                                          <span className={isToday ? 'font-medium text-blue-600' : 'text-gray-600'}>
                                            {isToday ? 'Today' : day.display}
                                          </span>
                                          <span className={`${textColor} font-medium ${loadingSlotCounts ? 'animate-pulse' : ''}`}>
                                            {displayText}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="text-xs font-medium text-gray-700 mb-1">Availability:</div>
                                  <div className="text-xs text-gray-500">
                                    Port unavailable due to maintenance
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Date & Time Selection (24/7) */}
              {step === 2 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Choose Date & Time (24/7 Service)</h4>
                  
                  {/* Date Selection */}
                  <div className="mb-6">
                    <h5 className="font-medium mb-3">Select Date</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                      {availableDays.map((day) => {
                        const dayOperatingHours = getOperatingHoursForDate(day.date)
                        const isClosed = !dayOperatingHours.is24Hours && (!dayOperatingHours.open || !dayOperatingHours.close)
                        
                        return (
                          <button
                            key={day.date}
                            onClick={() => !isClosed && setSelectedDate(day.date)}
                            disabled={isClosed}
                            className={`p-3 rounded-lg border transition-all text-center ${
                              isClosed
                                ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed opacity-60'
                                : selectedDate === day.date
                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-sm font-medium">{day.display}</div>
                            {day.isToday && (
                              <div className="text-xs text-primary-600">Today</div>
                            )}
                            {/* Operating hours indicator */}
                            <div className="text-xs mt-1">
                              {isClosed ? (
                                <span className="text-red-500">Closed</span>
                              ) : dayOperatingHours.is24Hours ? (
                                <span className="text-green-600">24/7</span>
                              ) : (
                                <span className="text-blue-600">
                                  {dayOperatingHours.open}-{dayOperatingHours.close}
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                                        {/* Time Slot Selection - Dynamic 24/7 */}
                  {selectedDate && (
                    <div>
                      <h5 className="font-medium mb-3">Select Time Slot (Real-time Availability - 5min intervals)</h5>
                      
                      {/* Real-time status indicator */}
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <Timer className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-blue-800 font-medium">
                              {(() => {
                                const operatingHours = getOperatingHoursForDate(selectedDate)
                                const dayName = getDayOfWeek(selectedDate)
                                const isToday = selectedDate === getNepalTime().toISOString().split('T')[0]
                                
                                if (operatingHours.is24Hours) {
                                  return isToday 
                                    ? `24/7 Service - Showing slots from ${minutesToTime(getNextAvailableTime(getCurrentTimeMinutes()))} onwards (Nepal Time)`
                                    : `24/7 Service - All slots available for ${dayName} (Nepal Time)`
                                } else {
                                  return isToday 
                                    ? `Open ${operatingHours.open} - ${operatingHours.close} - Showing available slots (Nepal Time)`
                                    : `${dayName}: ${operatingHours.open} - ${operatingHours.close} (Nepal Time)`
                                }
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-green-100 border border-green-400 rounded mr-1"></div>
                              <span className="text-green-700">Available</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-red-100 border border-red-400 rounded mr-1"></div>
                              <span className="text-red-700">Booked</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-yellow-100 border border-yellow-400 rounded mr-1"></div>
                              <span className="text-yellow-700">Limited</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Real-time update status */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                            <span className="text-blue-700 text-xs">
                              Real-time updates: {autoRefreshEnabled ? 'ON' : 'OFF'}
                            </span>
                            {lastRefreshed && (
                              <span className="text-blue-600 text-xs">
                                • Last updated: {lastRefreshed.toLocaleTimeString()}
                              </span>
                            )}
                            {process.env.NODE_ENV === 'development' && (
                              <div className="flex items-center space-x-2">
                                <span className="text-green-600 text-xs">
                                  🇳🇵 Nepal Time: {getNepalTime().toLocaleTimeString('en-US', { timeZone: 'Asia/Kathmandu' })}
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            {autoRefreshEnabled ? 'Disable' : 'Enable'} auto-refresh
                          </button>
                        </div>
                      </div>
                      
                      {loadingSlots ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader className="h-8 w-8 animate-spin text-primary-600" />
                          <span className="ml-2 text-gray-600">Analyzing real-time availability...</span>
                        </div>
                      ) : (
                        <div className="max-h-96 overflow-y-auto overflow-x-hidden">
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5">
                            {timeSlots.map((slot) => {
                              const maxDuration = slot.maxContinuousDuration || 0
                              const hasLimitedAvailability = maxDuration > 0 && maxDuration < 240 // Less than 4 hours
                              
                              return (
                              <button
                                key={slot.id}
                                onClick={() => slot.isAvailable && handleTimeSlotSelection(slot)}
                                disabled={!slot.isAvailable}
                                  className={`p-1.5 rounded border transition-all text-center min-w-0 ${
                                  !slot.isAvailable
                                    ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                                    : selectedTimeSlot?.id === slot.id
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                      : hasLimitedAvailability
                                      ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-300 text-yellow-800'
                                      : 'border-green-200 bg-green-50 hover:border-green-300 text-green-800'
                                  }`}
                                  title={
                                    !slot.isAvailable 
                                      ? 'Time slot conflicts with existing booking'
                                      : hasLimitedAvailability
                                      ? `Available for up to ${formatDuration(maxDuration)}`
                                      : `Available for up to ${formatDuration(maxDuration)}`
                                  }
                              >
                                <div className="text-xs font-medium truncate">{slot.display}</div>
                                <div className="text-xs mt-0.5">
                                  {!slot.isAvailable ? (
                                      <span className="text-red-600">Blocked</span>
                                    ) : hasLimitedAvailability ? (
                                      <span className="text-yellow-600">
                                        {formatDuration(maxDuration)}
                                      </span>
                                    ) : (
                                      <span className="text-green-600">
                                        {maxDuration >= 480 ? '8h+' : formatDuration(maxDuration)}
                                      </span>
                                  )}
                                </div>
                              </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Show error message if slot loading failed */}
                      {slotLoadError && (
                        <div className="text-center py-8">
                          <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
                          <p className="font-medium text-red-600 mb-2">Failed to Load Slots</p>
                          <p className="text-sm text-gray-600 mb-4">{slotLoadError}</p>
                          <button
                            onClick={() => {
                              setSlotLoadError(null)
                              // Trigger a re-fetch by changing the dependency
                              const currentDate = selectedDate
                              setSelectedDate('')
                              setTimeout(() => setSelectedDate(currentDate), 100)
                            }}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                          >
                            Retry Loading Slots
                          </button>
                        </div>
                      )}
                      
                      {/* Show no slots message only if no error and no slots */}
                      {!loadingSlots && !slotLoadError && timeSlots.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          {(() => {
                            const operatingHours = getOperatingHoursForDate(selectedDate)
                            const dayName = getDayOfWeek(selectedDate)
                            
                            if (!operatingHours.is24Hours && (!operatingHours.open || !operatingHours.close)) {
                              return (
                                <>
                                  <p className="font-medium text-red-600">Station Closed on {dayName}s</p>
                                  <p className="text-sm">This charging station is not operational on {dayName}s</p>
                                  <p className="text-sm">Please select a different date when the station is open</p>
                                </>
                              )
                            } else {
                              return (
                                <>
                                  <p>No slots available for this date</p>
                                  <p className="text-sm">Please select a different date or try a different port</p>
                                </>
                              )
                            }
                          })()}
                        </div>
                      )}
                      
                      {/* Booking conflicts summary */}
                      {!loadingSlots && !slotLoadError && timeSlots.length > 0 && (
                        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="text-sm text-gray-700">
                            <strong>Availability Summary:</strong> {timeSlots.filter(s => s.isAvailable).length} available slots out of {timeSlots.length} total slots.
                            {timeSlots.some(s => s.hasConflict) && (
                              <span className="text-red-600 ml-2">
                                • {timeSlots.filter(s => s.hasConflict).length} slots blocked due to existing bookings
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Navigation Buttons */}
                  <div className="flex flex-col sm:flex-row justify-between pt-6 mt-6 border-t space-y-3 sm:space-y-0">
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 sm:px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                    >
                      Back
                    </button>
                    {selectedTimeSlot && (
                      <button
                        onClick={() => setStep(3)}
                        className="px-4 sm:px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm sm:text-base"
                      >
                        Select Duration
                      </button>
                    )}
                  </div>
                </div>
              )}              {/* Step 3: Duration Selection */}
              {step === 3 && (
                <div>
                  <h4 className="text-lg sm:text-xl font-semibold mb-4">Select Charging Duration</h4>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <div className="flex items-center mb-2">
                      <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-900 text-sm sm:text-base">Selected Slot</span>
                    </div>
                    <p className="text-blue-800 text-sm sm:text-base">
                      {selectedDate} at {selectedTimeSlot?.display} - Port {selectedPort?.portNumber}
                    </p>
                  </div>

                  {/* Dynamic Duration Options based on selected slot */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                      <h5 className="font-medium text-sm sm:text-base mb-2 sm:mb-0">Available Durations for {selectedTimeSlot?.display}</h5>
                      {selectedTimeSlot?.maxContinuousDuration && (
                        <span className="text-xs sm:text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                          Max: {formatDuration(selectedTimeSlot.maxContinuousDuration)}
                        </span>
                      )}
                    </div>
                    
                    {/* Show conflict information if any */}
                    {selectedTimeSlot?.hasConflict && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-yellow-800 text-sm">
                            This time slot has booking conflicts. Available durations are limited.
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                      {(() => {
                        // Generate dynamic duration options based on available time
                        const maxDuration = selectedTimeSlot?.maxContinuousDuration || 480
                        const commonDurations = [30, 60, 90, 120, 180, 240, 300, 360, 480]
                        
                        // Always include the exact max duration if it's useful and different from common durations
                        const dynamicDurations = [...commonDurations]
                        
                        if (maxDuration > 30 && maxDuration < 480 && !commonDurations.includes(maxDuration)) {
                          // Add the exact max duration (even if it's not a round number)
                          dynamicDurations.push(maxDuration)
                          
                          // Also add a rounded-down version in case user wants something cleaner
                          const roundedMax = Math.floor(maxDuration / 15) * 15
                          if (roundedMax >= 30 && roundedMax !== maxDuration && !dynamicDurations.includes(roundedMax)) {
                            dynamicDurations.push(roundedMax)
                          }
                          
                          // Sort all durations
                          dynamicDurations.sort((a, b) => a - b)
                        }
                        
                        // Filter out durations that exceed max duration and only show those <= maxDuration
                        const validDurations = dynamicDurations.filter(duration => duration <= maxDuration)
                        
                        return validDurations.map((duration) => {
                          // Use the proper validation function
                          const isAvailable = validateDurationForSlot(duration, selectedTimeSlot)
                          const price = calculatePrice(duration)
                          
                          return (
                            <button
                              key={duration}
                              onClick={() => isAvailable && setSelectedDuration(duration)}
                              disabled={!isAvailable}
                              className={`p-2 sm:p-3 rounded-lg border transition-all text-center ${
                                !isAvailable
                                  ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                  : selectedDuration === duration
                                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                                  : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                              }`}
                              title={
                                isAvailable
                                  ? `Available for ₹${price}`
                                  : duration > maxDuration
                                  ? `Duration exceeds maximum available time (${formatDuration(maxDuration)})`
                                  : 'Duration conflicts with existing bookings'
                              }
                            >
                              <div className="font-medium text-xs sm:text-sm">{formatDuration(duration)}</div>
                              <div className="text-xs text-gray-600">
                                {isAvailable ? `₹${price}` : 'N/A'}
                              </div>
                            </button>
                          )
                        })
                      })()}
                    </div>
                  </div>

                  {/* Custom Duration with flexible 15-minute increments */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-sm sm:text-base">Custom Duration (15-minute precision)</h5>
                      {selectedTimeSlot?.maxContinuousDuration && selectedTimeSlot.maxContinuousDuration > 30 && (
                        <button
                          onClick={() => setSelectedDuration(selectedTimeSlot.maxContinuousDuration)}
                          className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                        >
                          Use Max ({formatDuration(selectedTimeSlot.maxContinuousDuration)})
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-center space-x-3 sm:space-x-4 bg-gray-50 p-3 sm:p-4 rounded-lg">
                      <button
                        onClick={() => setSelectedDuration(Math.max(30, selectedDuration - 15))}
                        disabled={selectedDuration <= 30}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="flex flex-col items-center space-y-1 flex-grow text-center">
                        <span className="text-lg sm:text-xl font-semibold">{formatDuration(selectedDuration)}</span>
                        <span className="text-sm text-gray-600">₹{calculatePrice(selectedDuration)}</span>
                        {selectedTimeSlot?.maxContinuousDuration && selectedDuration > selectedTimeSlot.maxContinuousDuration && (
                          <span className="text-red-600 text-xs">(Exceeds available time)</span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const maxAllowed = selectedTimeSlot?.maxContinuousDuration || 480
                          setSelectedDuration(Math.min(maxAllowed, selectedDuration + 15))
                        }}
                        disabled={
                          selectedDuration >= (selectedTimeSlot?.maxContinuousDuration || 480) ||
                          selectedDuration >= 480
                        }
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-gray-500 mt-2 space-y-1 sm:space-y-0">
                      <span>
                        Range: 30 minutes to {formatDuration(selectedTimeSlot?.maxContinuousDuration || 480)}
                        {selectedTimeSlot?.maxContinuousDuration && selectedTimeSlot.maxContinuousDuration < 480 && (
                          <span className="text-orange-600"> (limited by bookings)</span>
                        )}
                      </span>
                      <span className="text-blue-600">15-min precision • Extendable if available</span>
                    </div>
                  </div>                  {/* Pricing Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <h5 className="font-medium text-blue-800 mb-3 text-sm sm:text-base">Price Calculation</h5>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span>Port Power:</span>
                        <span className="font-medium">{selectedPort?.powerOutput}kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rate per kWh:</span>
                        <span className="font-medium">₹{selectedPort?.pricePerUnit || 3}/kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-medium">{formatDuration(selectedDuration)} ({(selectedDuration/60).toFixed(1)}h)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Est. Energy:</span>
                        <span className="font-medium">{(selectedPort?.powerOutput * selectedDuration / 60).toFixed(1)} kWh</span>
                      </div>                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span>Energy Cost (to Merchant):</span>
                          <span>₹{Math.round((selectedPort?.pricePerUnit || 3) * selectedPort?.powerOutput * selectedDuration / 60)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Platform Fee:</span>
                          <span>₹5</span>
                        </div>
                        <div className="flex justify-between font-semibold text-blue-800 text-sm sm:text-lg">
                          <span>Total Amount:</span>
                          <span>₹{calculatePrice(selectedDuration)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Flexible Booking Option */}
                  <div className="mb-6">
                    <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bookingForm.isFlexible}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, isFlexible: e.target.checked }))}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <div>
                        <div className="font-medium">Flexible Booking</div>
                        <div className="text-sm text-gray-600">
                          Allows early completion (with refund) and session extension (subject to availability)
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Dynamic Scheduling Information */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h6 className="font-medium text-blue-900 mb-2">Smart Scheduling System</h6>
                    <div className="text-sm text-blue-800 space-y-1">
                      <div>• <strong>Real-time availability:</strong> Slots are calculated based on current time and existing bookings</div>
                      <div>• <strong>5-minute buffer:</strong> Automatic buffer between bookings for charging preparation</div>
                      <div>• <strong>Dynamic durations:</strong> Available durations adjust based on time conflicts</div>
                      <div>• <strong>Efficient scheduling:</strong> Maximum utilization of available charging time</div>
                    </div>
                  </div>

                  {/* Duration validation warning */}
                  {selectedDuration && !isDurationValid() && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                        <span className="text-red-800 text-sm">
                          {selectedDuration < 30
                            ? 'Minimum booking duration is 30 minutes.'
                            : selectedDuration > 480
                            ? 'Maximum booking duration is 8 hours.'
                            : selectedDuration > (selectedTimeSlot?.maxContinuousDuration || 480)
                            ? `Selected duration exceeds available time. Maximum available: ${formatDuration(selectedTimeSlot?.maxContinuousDuration || 480)}`
                            : 'Selected duration conflicts with existing bookings. Please choose a different duration.'
                          }
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex flex-col sm:flex-row justify-between pt-6 mt-6 border-t space-y-3 sm:space-y-0">
                    <button
                      onClick={() => setStep(2)}
                      className="px-4 sm:px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      disabled={!isDurationValid()}
                      className="px-4 sm:px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                    >
                      {isDurationValid() 
                        ? `Continue to Details (₹${calculatePrice(selectedDuration)})`
                        : 'Select Valid Duration'
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Booking Form & Payment */}
              {step === 4 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Enter Details & Payment</h4>
                    {/* Booking Summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <h5 className="font-medium mb-2">Booking Summary</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Station:</span>
                        <div className="font-medium">{station?.name}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Port:</span>
                        <div className="font-medium">Port {selectedPort?.portNumber} ({selectedPort?.connectorType})</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Date & Time:</span>
                        <div className="font-medium">{selectedDate} at {selectedTimeSlot?.display}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <div className="font-medium">{formatDuration(selectedDuration)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Flexible:</span>
                        <div className="font-medium">{bookingForm.isFlexible ? 'Yes' : 'No'}</div>
                      </div>
                    </div>                    {/* Pricing Breakdown */}
                    <div className="border-t pt-3 mt-3">
                      <h6 className="font-medium text-gray-700 mb-2">Pricing Breakdown</h6>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Rate per kWh:</span>
                          <span>₹{selectedPort?.pricePerUnit || 3}/kWh</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Power & Duration:</span>
                          <span>{selectedPort?.powerOutput}kW × {(selectedDuration / 60).toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Est. Energy:</span>
                          <span>{(selectedPort?.powerOutput * selectedDuration / 60).toFixed(1)} kWh</span>
                        </div>                        <div className="flex justify-between">
                          <span>Energy Cost (to Merchant):</span>
                          <span>₹{Math.round((selectedPort?.pricePerUnit || 3) * selectedPort?.powerOutput * selectedDuration / 60)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Platform Fee:</span>
                          <span>₹5</span>
                        </div>
                        <div className="flex justify-between font-semibold text-primary-600 pt-1 border-t">
                          <span>Total Amount:</span>
                          <span>₹{calculatePrice(selectedDuration)}</span>
                        </div>
                      </div>
                    </div>
                  </div>                  {/* Auto-fill notification for logged in users */}
                  {isAuthenticated && user && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">Welcome back, {user.name || 'User'}!</span>
                      </div>
                      <p className="text-green-700 text-sm mt-1">
                        Your details have been automatically filled from your profile. You can modify them if needed.
                      </p>
                    </div>
                  )}

                  {/* Booking Form */}
                  <form onSubmit={handleFormSubmit} className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number *
                          {isAuthenticated && user?.phoneNumber && (
                            <span className="text-green-600 text-xs ml-1">(auto-filled)</span>
                          )}
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <input
                            type="tel"
                            required
                            value={bookingForm.phoneNumber}
                            onChange={(e) => setBookingForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                            className={`pl-10 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                              isAuthenticated && user?.phoneNumber 
                                ? 'border-green-300 bg-green-50' 
                                : 'border-gray-300'
                            }`}
                            placeholder="Enter your phone number"
                          />
                        </div>
                      </div>                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vehicle Number *
                          {isAuthenticated && user?.vehicles?.length > 0 && (
                            <span className="text-green-600 text-xs ml-1">(auto-filled)</span>
                          )}
                        </label>
                        <div className="relative">
                          <Car className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            required
                            value={bookingForm.vehicleNumber}
                            onChange={(e) => setBookingForm(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                            className={`pl-10 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                              isAuthenticated && user?.vehicles?.length > 0 
                                ? 'border-green-300 bg-green-50' 
                                : 'border-gray-300'
                            }`}
                            placeholder="e.g., KA05MZ1234"
                          />
                        </div>
                        
                        {/* Vehicle Selector for logged-in users with multiple vehicles */}
                        {isAuthenticated && user?.vehicles?.length > 1 && (
                          <div className="mt-2">
                            <label className="block text-xs text-gray-600 mb-1">
                              Or select from your saved vehicles:
                            </label>
                            <select
                              onChange={(e) => {
                                const selectedVehicle = user.vehicles.find(v => v.vehicleNumber === e.target.value)
                                if (selectedVehicle) {
                                  setBookingForm(prev => ({ 
                                    ...prev, 
                                    vehicleNumber: selectedVehicle.vehicleNumber 
                                  }))
                                }
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">Choose a saved vehicle...</option>
                              {user.vehicles.map((vehicle, index) => (
                                <option key={index} value={vehicle.vehicleNumber}>
                                  {vehicle.vehicleNumber} ({vehicle.vehicleType})
                                  {vehicle.isDefault && ' - Default'}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Driver Name
                          {isAuthenticated && user?.name && (
                            <span className="text-green-600 text-xs ml-1">(auto-filled)</span>
                          )}
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={bookingForm.driverName}
                            onChange={(e) => setBookingForm(prev => ({ ...prev, driverName: e.target.value }))}
                            className={`pl-10 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                              isAuthenticated && user?.name 
                                ? 'border-green-300 bg-green-50' 
                                : 'border-gray-300'
                            }`}
                            placeholder="Enter driver name"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                          {isAuthenticated && user?.email && (
                            <span className="text-green-600 text-xs ml-1">(auto-filled)</span>
                          )}
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <input
                            type="email"
                            value={bookingForm.email}
                            onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                            className={`pl-10 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                              isAuthenticated && user?.email 
                                ? 'border-green-300 bg-green-50' 
                                : 'border-gray-300'
                            }`}
                            placeholder="your.email@example.com"
                          />
                        </div>
                      </div>
                    </div>
                  </form>

                  {/* Payment Section */}
                  <div className="border-t pt-6">
                    <h5 className="font-medium mb-4">Payment Information</h5>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                        <span className="text-yellow-800 font-medium">Secure Payment</span>
                      </div>
                      <p className="text-yellow-700 text-sm mt-1">
                        This is a demo. In production, integrate with real payment gateways like Razorpay, Stripe, or PayU.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Turnstile Widget */}
                      <div className="flex justify-center">
                        <TurnstileWidget
                          {...paymentTurnstile.getWidgetProps()}
                          theme="light"
                          size="normal"
                        />
                      </div>

                      {paymentTurnstile.error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-600">{paymentTurnstile.error}</p>
                        </div>
                      )}

                      <div className="p-4 border-2 border-primary-200 bg-primary-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CreditCard className="h-5 w-5 text-primary-600 mr-2" />
                            <span className="font-medium text-primary-900">Pay Now</span>
                          </div>
                          <span className="text-xl font-bold text-primary-600">
                            ₹{calculatePrice(selectedDuration)}
                          </span>
                        </div>
                        <p className="text-primary-700 text-sm mt-1">
                          Secure payment via demo payment gateway
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6 mt-6 border-t">
                    <button
                      onClick={() => setStep(3)}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePayment}
                      disabled={!isFormValid || paymentProcessing || !paymentTurnstile.token}
                      className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      {paymentProcessing ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin mr-2" />
                          Verifying & Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay ₹{calculatePrice(selectedDuration)}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Confirmation */}
              {step === 5 && bookingDetails && (
                <div>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h4>
                    <p className="text-gray-600">
                      Your charging slot has been successfully reserved
                    </p>
                  </div>

                  {/* Booking Details */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                    <h5 className="font-semibold mb-4">Booking Details</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Booking ID:</span>
                        <div className="font-mono font-medium">{bookingDetails.bookingId}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Station:</span>
                        <div className="font-medium">{station?.name}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Port:</span>
                        <div className="font-medium">Port {selectedPort?.portNumber} ({selectedPort?.connectorType})</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Date & Time:</span>
                        <div className="font-medium">{selectedDate} at {selectedTimeSlot?.display}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <div className="font-medium">{formatDuration(selectedDuration)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount Paid:</span>
                        <div className="font-bold text-green-600">₹{calculatePrice(selectedDuration)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Vehicle:</span>
                        <div className="font-medium">{bookingForm.vehicleNumber}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <div className="font-medium">{bookingForm.phoneNumber}</div>
                      </div>
                    </div>
                  </div>

                  {/* Instructions & Next Steps */}
                  <div className="space-y-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h6 className="font-medium text-blue-900 mb-2">What's Next?</h6>
                      <ul className="text-blue-800 text-sm space-y-1">
                        <li>• SMS & Email confirmations sent</li>
                        <li>• Arrive 10 minutes before your slot</li>
                        <li>• Use booking ID for access</li>
                        <li>• Call station support if needed</li>
                      </ul>
                    </div>

                    {bookingForm.isFlexible && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h6 className="font-medium text-green-900 mb-2">Flexible Booking Benefits</h6>
                        <ul className="text-green-800 text-sm space-y-1">
                          <li>• Extend session if available</li>
                          <li>• Complete early for partial refund</li>
                          <li>• Modify timing up to 1 hour before</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => {
                        window.location.href = '/myorders'
                      }}
                      className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View My Orders
                    </button>
                    <button
                      onClick={() => {
                        navigator.share?.({
                          title: 'EV Charging Booking Confirmed',
                          text: `Booking ${bookingDetails.bookingId} confirmed for ${selectedDate} at ${selectedTimeSlot?.display}`,
                          url: window.location.href
                        }) || navigator.clipboard?.writeText(`Booking ${bookingDetails.bookingId} confirmed`)
                      }}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                      Share Details
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}

export default EnhancedBookingModal