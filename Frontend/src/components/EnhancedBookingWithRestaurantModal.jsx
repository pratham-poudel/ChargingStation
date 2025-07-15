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
  Timer,
  UtensilsCrossed,
  Search,
  ShoppingCart,
  Star,
  Leaf,
  Flame,
  ChefHat,
  Filter
} from 'lucide-react'
import { bookingsAPI } from '../services/bookingsAPI'
import { restaurantAPI } from '../services/restaurantAPI'
import { userSession } from '../utils/userSession'
import { useAuth } from '../context/AuthContext'
import TurnstileWidget from './TurnstileWidget'
import turnstileService from '../services/turnstileService'
import useTurnstile from '../hooks/useTurnstile'

const EnhancedBookingWithRestaurantModal = ({ station, isOpen, onClose }) => {
  // All existing state from EnhancedBookingModal
  const [step, setStep] = useState(1)
  const [selectedPort, setSelectedPort] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null)
  const [selectedDuration, setSelectedDuration] = useState(120)
  const [timeSlots, setTimeSlots] = useState([])
  const [portAvailability, setPortAvailability] = useState([])
  const [bookingForm, setBookingForm] = useState({
    phoneNumber: '',
    vehicleNumber: '',
    driverName: '',
    email: '',
    isFlexible: false
  })
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [bookingDetails, setBookingDetails] = useState(null)
  const [loadingPorts, setLoadingPorts] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingSlotCounts, setLoadingSlotCounts] = useState(false)
  const [slotCounts, setSlotCounts] = useState({})
  const [slotLoadError, setSlotLoadError] = useState(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  // New restaurant-related state
  const [showRestaurant, setShowRestaurant] = useState(false)
  const [restaurant, setRestaurant] = useState(null)
  const [loadingRestaurant, setLoadingRestaurant] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const [filteredMenuItems, setFilteredMenuItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cart, setCart] = useState([])
  const [loadingMenu, setLoadingMenu] = useState(false)
  const [recentlyAdded, setRecentlyAdded] = useState(null) // For showing "item added" notification
  const [stepBeforeRestaurant, setStepBeforeRestaurant] = useState(1) // Track step before restaurant view

  const { isAuthenticated, user } = useAuth()

  // Turnstile state
  // Turnstile hook for payment verification
  const paymentTurnstile = useTurnstile({
    action: 'charging_booking',
    autoValidate: false, // We'll validate manually when needed
    retryOnFailure: true,
    maxRetries: 3
  })

  // Auto-validate Turnstile tokens when received
  useEffect(() => {
    if (paymentTurnstile.token && !paymentTurnstile.isValid && !paymentTurnstile.isValidating) {
      console.log('Auto-validating Turnstile token:', paymentTurnstile.token)
      paymentTurnstile.validate()
    }
  }, [paymentTurnstile.token, paymentTurnstile.isValid, paymentTurnstile.isValidating, paymentTurnstile.validate])

  // All existing utility functions from EnhancedBookingModal
  const getNext7Days = () => {
    const days = []
    const today = new Date()
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      days.push(date.toISOString().split('T')[0])
    }
    return days
  }

  const getNepalTime = () => {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}))
  }

  const getDayOfWeek = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const calculatePrice = (duration) => {
    if (!selectedPort || !duration) return 0
    const energyCost = Math.round((selectedPort.pricePerUnit || 3) * selectedPort.powerOutput * duration / 60)
    const platformFee = 5
    return energyCost + platformFee
  }

  const calculateFoodTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const calculateTotalAmount = () => {
    const chargingCost = calculatePrice(selectedDuration)
    const foodCost = calculateFoodTotal()
    return chargingCost + foodCost
  }

  // Restaurant functions
  const loadRestaurantData = async () => {
    if (!station?._id) return
    
    setLoadingRestaurant(true)
    try {
      const response = await restaurantAPI.getRestaurantByStation(station._id)
      if (response.success && response.data) {
        setRestaurant(response.data)
        return true
      }
      return false
    } catch (error) {
      console.error('Error loading restaurant:', error)
      return false
    } finally {
      setLoadingRestaurant(false)
    }
  }

  const loadMenuItems = async () => {
    if (!restaurant?._id) return
    
    setLoadingMenu(true)
    try {
      const response = await restaurantAPI.getMenuItems(restaurant._id)
      if (response.success) {
        setMenuItems(response.data)
        setFilteredMenuItems(response.data)
      }
    } catch (error) {
      console.error('Error loading menu:', error)
    } finally {
      setLoadingMenu(false)
    }
  }

  const filterMenuItems = () => {
    let filtered = menuItems

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    setFilteredMenuItems(filtered)
  }

  const addToCart = (item) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem._id === item._id)
      if (existingItem) {
        const newQuantity = Math.min(existingItem.quantity + 1, 10)
        // Show notification for existing item
        setRecentlyAdded({
          name: item.name,
          quantity: newQuantity,
          action: 'updated'
        })
        return prevCart.map(cartItem =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: newQuantity }
            : cartItem
        )
      } else {
        // Show notification for new item
        setRecentlyAdded({
          name: item.name,
          quantity: 1,
          action: 'added'
        })
        return [...prevCart, { ...item, quantity: 1 }]
      }
    })
    
    // Clear the notification after 3 seconds
    setTimeout(() => {
      setRecentlyAdded(null)
    }, 3000)
  }

  const updateCartItemQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item._id !== itemId))
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item._id === itemId ? { ...item, quantity: Math.min(newQuantity, 10) } : item
        )
      )
    }
  }

  const getCartItemQuantity = (itemId) => {
    const item = cart.find(cartItem => cartItem._id === itemId)
    return item ? item.quantity : 0
  }

  // Operating hours functions
  const getOperatingHoursForDate = (dateString) => {
    if (!station?.operatingHours) {
      return { is24Hours: true, open: null, close: null }
    }

    const date = new Date(dateString)
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[date.getDay()]
    
    const dayHours = station.operatingHours[dayName]
    
    if (!dayHours) {
      return { is24Hours: true, open: null, close: null }
    }

    return {
      is24Hours: dayHours.is24Hours || false,
      open: dayHours.open || null,
      close: dayHours.close || null
    }
  }

  const timeRangesOverlap = (start1, end1, start2, end2, bufferMinutes = 0) => {
    return start1 < (end2 - bufferMinutes) && (end1 + bufferMinutes) > start2
  }

  const calculateAvailableDurations = (slotMinutes, existingBookings, selectedDate) => {
    const availableDurations = []
    const operatingHours = getOperatingHoursForDate(selectedDate)
    
    let maxEndTime = 24 * 60
    if (!operatingHours.is24Hours && operatingHours.close) {
      const closeMinutes = timeToMinutes(operatingHours.close)
      if (closeMinutes <= slotMinutes) {
        maxEndTime = closeMinutes + 24 * 60
      } else {
        maxEndTime = closeMinutes
      }
    }

    for (let duration = 30; duration <= 480; duration += 15) {
      const startMinutes = slotMinutes
      const endMinutes = startMinutes + duration

      if (endMinutes > maxEndTime) break

      const hasConflict = existingBookings.some(booking => {
        let bookingStartTime = booking.startTime
        let bookingEndTime = booking.endTime
        
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
    
    return availableDurations
  }

  const getMaxContinuousDuration = (slotMinutes, existingBookings, selectedDate) => {
    const operatingHours = getOperatingHoursForDate(selectedDate)
    
    let maxEndTime = 24 * 60
    if (!operatingHours.is24Hours && operatingHours.close) {
      const closeMinutes = timeToMinutes(operatingHours.close)
      if (closeMinutes <= slotMinutes) {
        maxEndTime = closeMinutes + 24 * 60
      } else {
        maxEndTime = closeMinutes
      }
    }
    
    let maxDuration = 0
    let nextConflictStart = maxEndTime
    
    for (const booking of existingBookings) {
      let bookingStartTime = booking.startTime
      
      if (bookingStartTime.includes('T') || bookingStartTime.includes(' ')) {
        const bookingDate = new Date(bookingStartTime)
        const nepalTime = new Date(bookingDate.toLocaleString("en-US", {timeZone: "Asia/Kathmandu"}))
        bookingStartTime = `${nepalTime.getHours().toString().padStart(2, '0')}:${nepalTime.getMinutes().toString().padStart(2, '0')}`
      }
      
      const bookingStart = timeToMinutes(bookingStartTime)
      
      if (bookingStart > slotMinutes && bookingStart < nextConflictStart) {
        nextConflictStart = bookingStart
      }
    }
    
    maxDuration = Math.min(nextConflictStart - slotMinutes - 5, 480)
    
    return Math.max(maxDuration, 0)
  }

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
    } finally {
      setLoadingPorts(false)
    }
  }

  const loadSlotCounts = async () => {
    if (!station?._id) return
    
    setLoadingSlotCounts(true)
    
    const availableDates = getNext7Days()
    const initialSlotCounts = {}
    
    availableDates.forEach(day => {
      initialSlotCounts[day] = {}
      ;(station?.chargingPorts || []).forEach(port => {
        initialSlotCounts[day][port._id] = { available: 0, total: 288, status: 'Full' }
      })
    })
    
    setSlotCounts(initialSlotCounts)
    
    try {
      const response = await bookingsAPI.getBulkSlotCounts(station._id, availableDates)
      if (response.success) {
        setSlotCounts(response.data.slotCounts)
      }
    } catch (error) {
      console.error('Error loading bulk slot counts:', error)
    } finally {
      setLoadingSlotCounts(false)
    }
  }

  const isDurationValid = () => {
    if (!selectedDuration) return false
    if (selectedDuration < 30 || selectedDuration > 480) return false
    if (selectedTimeSlot?.maxContinuousDuration && selectedDuration > selectedTimeSlot.maxContinuousDuration) return false
    return true
  }

  const isFormValid = useMemo(() => {
    return bookingForm.phoneNumber && bookingForm.vehicleNumber
  }, [bookingForm.phoneNumber, bookingForm.vehicleNumber])

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (isFormValid) {
      setStep(4)
    }
  }

  const handlePayment = async () => {
    setPaymentProcessing(true)
    
    try {
      // First validate Turnstile token
      if (!paymentTurnstile.token) {
        alert('Please complete the security verification first.')
        setPaymentProcessing(false)
        return
      }

      // Validate token with backend
      if (!paymentTurnstile.isValid) {
        console.log('Validating Turnstile token before payment...')
        const isValidated = await paymentTurnstile.validate()
        if (!isValidated) {
          alert('Security verification failed. Please try again.')
          setPaymentProcessing(false)
          return
        }
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
        },
        isFlexible: bookingForm.isFlexible,
        // Add food order if cart has items
        foodOrder: cart.length > 0 ? {
          restaurantId: restaurant._id,
          items: cart.map(item => ({
            menuItemId: item._id,
            quantity: item.quantity,
            price: item.price,
            name: item.name
          })),
          totalAmount: calculateFoodTotal()
        } : null,
        // Add Turnstile token for backend verification
        turnstileToken: paymentTurnstile.token
      }

      const result = await bookingsAPI.createSecureBooking(bookingData)
      if (result.success) {
        setBookingDetails(result.data)
        setPaymentProcessing(false)
        setStep(5)
        
        userSession.saveBookingAndCustomerInfo(result.data)
      } else {
        throw new Error(result.message || 'Booking failed')
      }
    } catch (error) {
      console.error('Payment/Booking error:', error)
      setPaymentProcessing(false)
      alert('Booking failed: ' + error.message)
    }
  }

  // Effect to load restaurant data when modal opens
  useEffect(() => {
    if (isOpen && station) {
      loadRestaurantData()
    }
  }, [isOpen, station])

  // Effect to load menu when restaurant is loaded
  useEffect(() => {
    if (restaurant) {
      loadMenuItems()
    }
  }, [restaurant])

  // Effect to filter menu items
  useEffect(() => {
    filterMenuItems()
  }, [searchQuery, selectedCategory, menuItems])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setShowRestaurant(false)
      setStepBeforeRestaurant(1)
      setCart([])
      setRecentlyAdded(null)
      setSearchQuery('')
      setSelectedCategory('all')
      setSelectedPort(null)
      setSelectedDate('')
      setSelectedTimeSlot(null)
      setSelectedDuration(120)
      setTimeSlots([])
      setPortAvailability([])
      setSlotLoadError(null)
      
      const initialFormData = {
        phoneNumber: '',
        vehicleNumber: '',        
        driverName: '',
        email: '',
        isFlexible: false
      }
      
      if (isAuthenticated && user) {
        initialFormData.phoneNumber = user.phoneNumber || ''
        initialFormData.email = user.email || ''
        initialFormData.driverName = user.name || ''
        
        if (user.vehicles && user.vehicles.length > 0) {
          const defaultVehicle = user.vehicles.find(v => v.isDefault) || user.vehicles[0]
          initialFormData.vehicleNumber = defaultVehicle.vehicleNumber || ''
        }
      }
      
      setBookingForm(initialFormData)
      setPaymentProcessing(false)
      setBookingDetails(null)
      setSlotCounts({})
      
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
      const fetchRealTimeSlots = async () => {
        setLoadingSlots(true)
        setSlotLoadError(null)
        
        try {
          console.log(`🔄 Fetching real-time slots for station ${station._id}, port ${selectedPort._id}, date ${selectedDate}`)
          
          const response = await bookingsAPI.getRealTimeAvailability(station._id, selectedDate, selectedPort._id)
          
          if (response.success && response.data.ports.length > 0) {
            const portData = response.data.ports[0]
            const realTimeSlots = []
            
            const operatingHours = getOperatingHoursForDate(selectedDate)
            let stationOpenMinutes = 0
            let stationCloseMinutes = 24 * 60
            
            if (!operatingHours.is24Hours && operatingHours.open && operatingHours.close) {
              stationOpenMinutes = timeToMinutes(operatingHours.open)
              stationCloseMinutes = timeToMinutes(operatingHours.close)
              
              if (stationCloseMinutes <= stationOpenMinutes) {
                stationCloseMinutes += 24 * 60
              }
            }
            
            portData.slots.forEach((slot) => {
              const slotMinutes = timeToMinutes(slot.time)
              
              if (!operatingHours.is24Hours) {
                if (slotMinutes < stationOpenMinutes || slotMinutes >= stationCloseMinutes) {
                  return
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
            
            console.log(`✅ Loaded ${realTimeSlots.length} real-time slots with ${response.data.totalExistingBookings} existing bookings`)
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`🇳🇵 Nepal Time: ${getNepalTime().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })}`)
            }
            
            setTimeSlots(realTimeSlots)
          } else {
            throw new Error(response.message || 'No port data received')
          }
        } catch (error) {
          console.error('Error loading real-time slots:', error)
          setSlotLoadError(`Failed to load real-time slot availability. Please try again or contact support. Error: ${error.message}`)
          setTimeSlots([])
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
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing slots for real-time updates...')
        
        const fetchRealTimeSlots = async () => {
          try {
            const response = await bookingsAPI.getRealTimeAvailability(station._id, selectedDate, selectedPort._id)
            
            if (response.success && response.data.ports.length > 0) {
              const portData = response.data.ports[0]
              
              const realTimeSlots = []
              
              const operatingHours = getOperatingHoursForDate(selectedDate)
              let stationOpenMinutes = 0
              let stationCloseMinutes = 24 * 60
              
              if (!operatingHours.is24Hours && operatingHours.open && operatingHours.close) {
                stationOpenMinutes = timeToMinutes(operatingHours.open)
                stationCloseMinutes = timeToMinutes(operatingHours.close)
                
                if (stationCloseMinutes <= stationOpenMinutes) {
                  stationCloseMinutes += 24 * 60
                }
              }
              
              portData.slots.forEach((slot) => {
                const slotMinutes = timeToMinutes(slot.time)
                
                if (!operatingHours.is24Hours) {
                  if (slotMinutes < stationOpenMinutes || slotMinutes >= stationCloseMinutes) {
                    return
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
              
              setTimeSlots(realTimeSlots)
              setLastRefreshed(new Date())
            }
          } catch (error) {
            console.warn('Auto-refresh failed:', error)
          }
        }
        
        fetchRealTimeSlots()
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [step, selectedDate, selectedPort, autoRefreshEnabled, station?._id])

  const availableDays = getNext7Days()

  // Get unique categories for filter
  const categories = [
    { value: 'all', label: 'All Items' },
    { value: 'appetizer', label: 'Appetizers' },
    { value: 'main_course', label: 'Main Course' },
    { value: 'dessert', label: 'Desserts' },
    { value: 'beverage', label: 'Beverages' },
    { value: 'snack', label: 'Snacks' }
  ]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
            onClick={onClose}
          />

          {/* Modal */}
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
                  {showRestaurant ? 'Order Food & Book Charging' : 'Book Charging Slot - 24/7 Service'}
                </h3>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  {station?.name} - {station?.address?.city}
                </p>
                {restaurant && (
                  <p className="text-blue-600 mt-1 text-sm">
                    🍽️ Restaurant Available • Skip the queues with advance ordering
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Restaurant Banner (show if restaurant exists and we're not in restaurant view) */}
            {restaurant && !showRestaurant && step < 5 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 rounded-full">
                      <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-orange-900">Hungry? Order Food Now!</h4>
                      <p className="text-sm text-orange-700">
                        {restaurant.name} is available at this station. Order in advance to skip the queues!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setStepBeforeRestaurant(step)
                      setShowRestaurant(true)
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
                  >
                    <ChefHat className="h-4 w-4" />
                    <span>Browse Menu</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Restaurant View */}
            {showRestaurant && restaurant ? (
              <RestaurantOrderingView
                restaurant={restaurant}
                menuItems={filteredMenuItems}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                categories={categories}
                cart={cart}
                addToCart={addToCart}
                updateCartItemQuantity={updateCartItemQuantity}
                getCartItemQuantity={getCartItemQuantity}
                calculateFoodTotal={calculateFoodTotal}
                loadingMenu={loadingMenu}
                recentlyAdded={recentlyAdded}
                onBack={() => setShowRestaurant(false)}
                onContinueToBooking={() => {
                  setShowRestaurant(false)
                  // Return to the step user was on before entering restaurant view
                  setStep(stepBeforeRestaurant)
                }}
              />
            ) : (
              <>
                {/* Progress Indicator - same as original */}
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
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">Step {step} of 5</span>
                        {cart.length > 0 && (
                          <div className="flex items-center space-x-1 text-xs text-orange-600">
                            <ShoppingCart className="h-3 w-3" />
                            <span>{cart.length}</span>
                          </div>
                        )}
                      </div>
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

                {/* Cart Summary - Show on all steps when cart has items */}
                {cart.length > 0 && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ShoppingCart className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">
                          Food Order: {cart.length} {cart.length === 1 ? 'item' : 'items'}
                        </span>
                        <span className="text-sm text-orange-700">
                          (₹{calculateFoodTotal().toFixed(2)})
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setStepBeforeRestaurant(step)
                          setShowRestaurant(true)
                        }}
                        className="text-xs text-orange-600 hover:text-orange-700 underline"
                      >
                        Edit Order
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Content */}
                <div className="min-h-[400px] sm:min-h-[500px]">
                  {/* Step 1: Port Selection */}
                  {step === 1 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-4">Select a Charging Port</h4>
                      
                      {!loadingPorts && (portAvailability.length > 0 ? portAvailability : station?.chargingPorts || []).length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-800 font-medium">Port Status (Real-time):</span>
                            <div className="flex space-x-4">
                              {(() => {
                                const ports = portAvailability.length > 0 ? portAvailability : station?.chargingPorts || []
                                const available = ports.filter(p => p.isOperational !== false).length
                                const total = ports.length
                                const unavailable = total - available

                                return (
                                  <>
                                    <div className="flex items-center">
                                      <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                                      <span className="text-green-700">{available} Available</span>
                                    </div>
                                    {unavailable > 0 && (
                                      <div className="flex items-center">
                                        <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                                        <span className="text-red-700">{unavailable} Unavailable</span>
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                      
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(portAvailability.length > 0 ? portAvailability : station?.chargingPorts || []).map((port, index) => {
                            const isOperational = port.isOperational !== false
                            
                            return (
                              <div
                                key={port._id || index}
                                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                  selectedPort?._id === port._id
                                    ? 'border-primary-500 bg-primary-50 shadow-md'
                                    : isOperational
                                    ? 'border-gray-200 hover:border-primary-300 hover:shadow-sm'
                                    : 'border-red-200 bg-red-50 cursor-not-allowed opacity-60'
                                }`}
                                onClick={() => {
                                  if (isOperational) {
                                    setSelectedPort(port)
                                    setSelectedDate(availableDays[0])
                                    setStep(2)
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <h5 className="font-semibold text-lg">Port {port.portNumber}</h5>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isOperational ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {isOperational ? 'Available' : 'Maintenance'}
                                  </div>
                                </div>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center">
                                    <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                                    {port.connectorType} - {port.powerOutput}kW
                                  </div>
                                  <div className="flex items-center">
                                    <CreditCard className="h-4 w-4 mr-2 text-green-500" />
                                    ₹{port.pricePerUnit || 3}/kWh + ₹5 platform fee
                                  </div>
                                  
                                  {!isOperational && (
                                    <div className="text-xs text-gray-600 mt-1 p-2 bg-gray-100 rounded border">
                                      <div className="font-medium text-gray-700 mb-1">🔧 Under Maintenance</div>
                                      {port.lastMaintenance && (
                                        <div>Last service: {new Date(port.lastMaintenance).toLocaleDateString()}</div>
                                      )}
                                      <div className="text-gray-500">This port is temporarily unavailable</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Date & Time Selection */}
                  {step === 2 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-4">Choose Date & Time (24/7 Service)</h4>
                      
                      <div className="mb-6">
                        <h5 className="font-medium mb-3">Select Date</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                          {availableDays.map((day) => (
                            <button
                              key={day}
                              onClick={() => setSelectedDate(day)}
                              className={`p-3 rounded-lg border-2 text-center transition-all ${
                                selectedDate === day
                                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="font-medium">{formatDate(day)}</div>
                              <div className="text-xs text-gray-500 mt-1">{getDayOfWeek(day)}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {selectedDate && (
                        <div>
                          <h5 className="font-medium mb-3">Select Time Slot (Real-time Availability - 5min intervals)</h5>
                          
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center">
                                <Timer className="h-4 w-4 text-blue-600 mr-2" />
                                <span className="text-blue-800 font-medium">
                                  {(() => {
                                    const operatingHours = getOperatingHoursForDate(selectedDate)
                                    if (operatingHours.is24Hours) {
                                      return "24/7 Operation"
                                    } else {
                                      return `Operating Hours: ${operatingHours.open} - ${operatingHours.close}`
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
                                {timeSlots.map((slot) => (
                                  <button
                                    key={slot.id}
                                    onClick={() => {
                                      if (slot.isAvailable) {
                                        setSelectedTimeSlot(slot)
                                        setStep(3)
                                      }
                                    }}
                                    disabled={!slot.isAvailable}
                                    className={`p-2 text-xs rounded-md border transition-all ${
                                      selectedTimeSlot?.id === slot.id
                                        ? 'border-primary-500 bg-primary-100 text-primary-800'
                                        : slot.isAvailable
                                        ? 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100'
                                        : 'border-red-300 bg-red-50 text-red-600 cursor-not-allowed'
                                    }`}
                                    title={slot.isAvailable ? `Available - Max ${formatDuration(slot.maxContinuousDuration || 480)}` : 'Booked'}
                                  >
                                    {slot.display}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {slotLoadError && (
                            <div className="text-center py-8">
                              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
                              <p className="font-medium text-red-600 mb-2">Failed to Load Slots</p>
                              <p className="text-sm text-gray-600 mb-4">{slotLoadError}</p>
                              <button
                                onClick={() => {
                                  setSlotLoadError(null)
                                  // Trigger reload of slots
                                  setSelectedDate(selectedDate)
                                }}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                              >
                                Retry Loading Slots
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
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
                  )}

                  {/* Step 3: Duration Selection */}
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

                      <div className="mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                          <h5 className="font-medium text-sm sm:text-base mb-2 sm:mb-0">Available Durations for {selectedTimeSlot?.display}</h5>
                          {selectedTimeSlot?.maxContinuousDuration && (
                            <span className="text-xs sm:text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                              Max: {formatDuration(selectedTimeSlot.maxContinuousDuration)}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                          {(() => {
                            const commonDurations = [30, 60, 120, 180, 240, 360]
                            const maxDuration = selectedTimeSlot?.maxContinuousDuration || 480
                            
                            return commonDurations
                              .filter(duration => duration <= maxDuration)
                              .map(duration => (
                                <button
                                  key={duration}
                                  onClick={() => setSelectedDuration(duration)}
                                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                                    selectedDuration === duration
                                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="font-medium text-sm">{formatDuration(duration)}</div>
                                  <div className="text-xs text-gray-500 mt-1">₹{calculatePrice(duration)}</div>
                                </button>
                              ))
                          })()}
                        </div>
                      </div>

                      <div className="mb-4 sm:mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-sm sm:text-base">Custom Duration (15-minute precision)</h5>
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
                          </div>
                          <button
                            onClick={() => {
                              const maxAllowed = Math.min(selectedTimeSlot?.maxContinuousDuration || 480, 480)
                              setSelectedDuration(Math.min(selectedDuration + 15, maxAllowed))
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
                      </div>

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
                          </div>
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between">
                              <span>Energy Cost:</span>
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
                            ? `Continue to Details (₹${calculateTotalAmount()})`
                            : 'Select Valid Duration'
                          }
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Step 4: Enhanced with food items in pricing */}
                  {step === 4 && selectedPort && selectedDate && selectedTimeSlot && selectedDuration && (
                    <div>
                      <h4 className="text-lg font-semibold mb-4">Enter Details & Payment</h4>
                      
                      {/* Booking Summary with Food Items */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                        <h5 className="font-medium mb-2">Booking & Order Summary</h5>
                        
                        {/* Charging Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
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
                        </div>

                        {/* Food Items if any */}
                        {cart.length > 0 && (
                          <div className="border-t pt-3 mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="font-medium text-gray-700">Food Order ({cart.length} items)</h6>
                              <button
                                onClick={() => {
                                  setStepBeforeRestaurant(step)
                                  setShowRestaurant(true)
                                }}
                                className="text-sm text-orange-600 hover:text-orange-700 underline"
                              >
                                Edit Order
                              </button>
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {cart.map((item) => (
                                <div key={item._id} className="flex justify-between items-center text-sm">
                                  <span>{item.name} × {item.quantity}</span>
                                  <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Enhanced Pricing Breakdown */}
                        <div className="border-t pt-3 mt-3">
                          <h6 className="font-medium text-gray-700 mb-2">Pricing Breakdown</h6>
                          <div className="space-y-1 text-sm">
                            {/* Charging costs */}
                            <div className="flex justify-between">
                              <span>Energy Cost:</span>
                              <span>₹{Math.round((selectedPort?.pricePerUnit || 3) * selectedPort?.powerOutput * selectedDuration / 60)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Charging Platform Fee:</span>
                              <span>₹5</span>
                            </div>
                            
                            {/* Food costs */}
                            {cart.length > 0 && (
                              <>
                                <div className="flex justify-between">
                                  <span>Food Total:</span>
                                  <span>₹{calculateFoodTotal().toFixed(2)}</span>
                                </div>
                              </>
                            )}
                            
                            <div className="flex justify-between font-semibold text-primary-600 pt-1 border-t text-lg">
                              <span>Total Amount:</span>
                              <span>₹{calculateTotalAmount()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Auto-fill notification for logged in users */}
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
                                onChange={(e) => setBookingForm(prev => ({ ...prev, phoneNumber: e.target.value }))
                                }
                                className={`pl-10 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                                  isAuthenticated && user?.phoneNumber 
                                    ? 'border-green-300 bg-green-50' 
                                    : 'border-gray-300'
                                }`}
                                placeholder="Enter your phone number"
                              />
                            </div>
                          </div>

                          <div>
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
                                onChange={(e) => setBookingForm(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))
                                }
                                className={`pl-10 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                                  isAuthenticated && user?.vehicles?.length > 0 
                                    ? 'border-green-300 bg-green-50' 
                                    : 'border-gray-300'
                                }`}
                                placeholder="e.g., KA05MZ1234"
                              />
                            </div>
                            
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
                                onChange={(e) => setBookingForm(prev => ({ ...prev, driverName: e.target.value }))
                                }
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
                                onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))
                                }
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

                      {/* Payment Information */}
                      <div className="border-t pt-6">
                        <h5 className="font-medium mb-4">Payment Information</h5>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                            <span className="text-yellow-800 font-medium">Secure Payment</span>
                          </div>
                          <p className="text-yellow-700 text-sm mt-1">
                            {cart.length > 0 
                              ? 'Combined payment for charging and food order. Food will be prepared during your charging session.'
                              : 'Secure payment for your charging session.'
                            }
                          </p>
                        </div>

                        <div className="space-y-4">
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
                                ₹{calculateTotalAmount()}
                              </span>
                            </div>
                            <p className="text-primary-700 text-sm mt-1">
                              {cart.length > 0 
                                ? `Charging (₹${calculatePrice(selectedDuration)}) + Food (₹${calculateFoodTotal()})`
                                : 'Charging session payment'
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between pt-6 mt-6 border-t">
                        <button
                          onClick={() => setStep(3)}
                          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Back
                        </button>
                        
                        <button
                          onClick={handlePayment}
                          disabled={!isFormValid || paymentProcessing || !paymentTurnstile.isValid}
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
                              Pay ₹{calculateTotalAmount()}
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
                        <h4 className="text-2xl font-bold text-gray-900 mb-2">
                          {cart.length > 0 ? 'Booking & Order Confirmed!' : 'Booking Confirmed!'}
                        </h4>
                        <p className="text-gray-600">
                          {cart.length > 0 
                            ? 'Your charging slot has been reserved and food order placed'
                            : 'Your charging slot has been successfully reserved'
                          }
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
                            <div className="font-bold text-green-600">₹{calculateTotalAmount()}</div>
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

                        {/* Food Order Details */}
                        {cart.length > 0 && (
                          <div className="border-t pt-4 mt-4">
                            <h6 className="font-semibold mb-2 text-orange-900">Food Order ({cart.length} items)</h6>
                            <div className="space-y-2">
                              {cart.map((item) => (
                                <div key={item._id} className="flex justify-between text-sm">
                                  <span>{item.name} × {item.quantity}</span>
                                  <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="border-t pt-2 flex justify-between font-semibold text-orange-900">
                                <span>Food Total:</span>
                                <span>₹{calculateFoodTotal().toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Instructions & Next Steps */}
                      <div className="space-y-4 mb-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h6 className="font-medium text-blue-900 mb-2">What's Next?</h6>
                          <ul className="text-blue-800 text-sm space-y-1">
                            <li>• SMS & Email confirmations sent</li>
                            <li>• Arrive 10 minutes before your slot</li>
                            <li>• Use booking ID for access</li>
                            {cart.length > 0 && (
                              <li>• Food will be ready when you arrive</li>
                            )}
                            <li>• Call station support if needed</li>
                          </ul>
                        </div>

                        {cart.length > 0 && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <h6 className="font-medium text-orange-900 mb-2">Food Order Information</h6>
                            <ul className="text-orange-800 text-sm space-y-1">
                              <li>• Your food will be prepared during charging</li>
                              <li>• Estimated preparation time: 20-30 minutes</li>
                              <li>• You'll receive SMS when food is ready</li>
                              <li>• Collect from restaurant counter</li>
                            </ul>
                          </div>
                        )}

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
                              text: `Booking ${bookingDetails.bookingId} confirmed for ${selectedDate} at ${selectedTimeSlot?.display}${cart.length > 0 ? ' with food order' : ''}`,
                              url: window.location.href
                            }).catch(() => {
                              // Fallback for browsers that don't support Web Share API
                              const text = `Booking ${bookingDetails.bookingId} confirmed for ${selectedDate} at ${selectedTimeSlot?.display}${cart.length > 0 ? ' with food order' : ''}`
                              navigator.clipboard.writeText(text).then(() => {
                                alert('Booking details copied to clipboard!')
                              })
                            })
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
                  
                  {/* Step 4 Error State - Show when step 4 is accessed without completing charging selection */}
                  {step === 4 && (!selectedPort || !selectedDate || !selectedTimeSlot || !selectedDuration) && (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Complete Charging Slot Selection</h4>
                      <p className="text-gray-600 mb-4">
                        Please select your charging port, date, time, and duration before proceeding to payment.
                      </p>
                      <button
                        onClick={() => setStep(1)}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Back to Slot Selection
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}

// Restaurant Ordering View Component
const RestaurantOrderingView = ({ 
  restaurant, 
  menuItems, 
  searchQuery, 
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories,
  cart,
  addToCart,
  updateCartItemQuantity,
  getCartItemQuantity,
  calculateFoodTotal,
  loadingMenu,
  recentlyAdded,
  onBack,
  onContinueToBooking
}) => {
  return (
    <div className="space-y-6">
      {/* Restaurant Header */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{restaurant.name}</h3>
            <p className="text-gray-600 mb-3">{restaurant.description}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span>4.5 Rating</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>15-30 min</span>
              </div>
              <div className="flex items-center space-x-1">
                {restaurant.cuisine?.map((cuisine) => (
                  <span key={cuisine} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                    {cuisine}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Booking
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cart Summary (if items in cart) */}
      {cart.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">
                {cart.length} item{cart.length > 1 ? 's' : ''} in cart
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-lg font-bold text-green-900">
                ₹{calculateFoodTotal().toFixed(2)}
              </span>
              <button
                onClick={onContinueToBooking}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue to Booking
                {cart.length > 0 && (
                  <span className="ml-1 text-xs">
                    ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div>
        <h4 className="text-lg font-semibold mb-4">Menu</h4>
        
        {loadingMenu ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-orange-600" />
            <span className="ml-2 text-gray-600">Loading menu...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <MenuItemCard
                key={item._id}
                item={item}
                quantity={getCartItemQuantity(item._id)}
                onAdd={() => addToCart(item)}
                onUpdateQuantity={(newQuantity) => updateCartItemQuantity(item._id, newQuantity)}
              />
            ))}
          </div>
        )}

        {!loadingMenu && menuItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No menu items found</p>
          </div>
        )}

        {/* Recently Added Notification */}
        <AnimatePresence>
          {recentlyAdded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">
                {recentlyAdded.name} × {recentlyAdded.quantity} {recentlyAdded.action}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h5 className="font-semibold text-orange-900 mb-3 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Your Order ({cart.length} {cart.length === 1 ? 'item' : 'items'})
            </h5>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item._id} className="flex justify-between items-center">
                  <span className="text-sm text-orange-800">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="text-sm font-medium text-orange-900">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-orange-300 pt-2 flex justify-between items-center">
                <span className="font-semibold text-orange-900">Total</span>
                <span className="font-bold text-orange-900">₹{calculateFoodTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Menu Item Card Component
const MenuItemCard = ({ item, quantity, onAdd, onUpdateQuantity }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
    >
      {/* Item Image */}
      {item.images && item.images.length > 0 && (
        <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
          <img
            src={item.images[0].url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Item Details */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h5 className="font-semibold text-gray-900 leading-tight">{item.name}</h5>
          <div className="flex items-center space-x-1 ml-2">
            {item.isVegetarian && <Leaf className="h-4 w-4 text-green-500" />}
            {item.isSpicy && <Flame className="h-4 w-4 text-red-500" />}
          </div>
        </div>

        {item.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-lg font-bold text-gray-900">₹{item.price}</div>
            <div className="text-xs text-gray-500">{item.preparationTime} min</div>
          </div>

          {/* Add to Cart Button / Quantity Controls */}
          {quantity === 0 ? (
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Add to Cart
            </button>
          ) : (
            <div className="flex items-center space-x-2 bg-orange-50 rounded-lg p-1">
              <button
                onClick={() => onUpdateQuantity(quantity - 1)}
                className="p-1 text-orange-600 hover:bg-orange-100 rounded"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-medium text-orange-900">{quantity}</span>
              <button
                onClick={() => onUpdateQuantity(quantity + 1)}
                disabled={quantity >= 10}
                className="p-1 text-orange-600 hover:bg-orange-100 rounded disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default EnhancedBookingWithRestaurantModal
