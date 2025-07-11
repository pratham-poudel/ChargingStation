import { useState, useEffect } from 'react'
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
  Info
} from 'lucide-react'
import { bookingsAPI } from '../services/bookingsAPI'


const BookingModal = ({ station, isOpen, onClose }) => {
  const [step, setStep] = useState(1) // 1: slots, 2: timeframes, 3: booking form, 4: payment, 5: confirmation
  const [selectedPort, setSelectedPort] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null)
  const [timeSlots, setTimeSlots] = useState([])
  const [portAvailability, setPortAvailability] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingPorts, setLoadingPorts] = useState(false)
  const [bookingForm, setBookingForm] = useState({
    phoneNumber: '',
    vehicleNumber: '',
    driverName: '',
    email: ''
  })
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [bookingDetails, setBookingDetails] = useState(null)
    // Calculate dynamic price based on port and time duration
  const calculateEstimatedPrice = (port, timeSlot) => {
    if (!port || !timeSlot) return 0
    
    // Parse time duration in hours
    const startTime = timeSlot.startTime.split(':').map(Number)
    const endTime = timeSlot.endTime.split(':').map(Number)
    const startMinutes = startTime[0] * 60 + startTime[1]
    const endMinutes = endTime[0] * 60 + endTime[1]
    let durationHours = (endMinutes - startMinutes) / 60
    
    // Handle cases where end time is next day
    if (durationHours < 0) {
      durationHours += 24
    }
    
    // Calculate energy consumption: Power (kW) × Time (hours) = Energy (kWh)
    const estimatedEnergyConsumption = port.powerOutput * durationHours
    
    // Calculate base price: Energy (kWh) × Rate (₹/kWh)
    const basePrice = port.pricePerUnit * estimatedEnergyConsumption
    
    // Add platform fee
    const platformFee = 5
    const totalPrice = basePrice + platformFee
    
    return Math.round(totalPrice)
  }
  // Generate next 7 days for date selection
  const getNext7Days = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
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

  // Load port availability when modal opens
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
      // Fallback to station ports without booking info
      setPortAvailability(station.chargingPorts || [])
    } finally {
      setLoadingPorts(false)
    }
  }
  // Generate fallback slots based on station operating hours
  const generateFallbackSlots = (date, operatingHours) => {
    const slots = []
    const selectedDate = new Date(date)
    const today = new Date()
    
    // Get the day of week for operating hours
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayOfWeek = dayNames[selectedDate.getDay()]
    
    // Get operating hours for this day
    let dayOperatingHours = operatingHours?.[dayOfWeek]
    
    // Default to 6 AM - 8 PM if no operating hours
    let startHour = 6
    let endHour = 20
    
    if (dayOperatingHours) {
      if (dayOperatingHours.is24Hours) {
        startHour = 0
        endHour = 24
      } else {
        const openTime = dayOperatingHours.open || "06:00"
        const closeTime = dayOperatingHours.close || "20:00"
        
        startHour = parseInt(openTime.split(':')[0])
        endHour = parseInt(closeTime.split(':')[0])
        
        // Handle cases where close time is past midnight
        if (endHour < startHour) {
          endHour = 24
        }
      }
    }
    
    // If it's today, start from current time
    if (selectedDate.toDateString() === today.toDateString()) {
      const currentHour = today.getHours()
      startHour = Math.max(startHour, currentHour)
    }
    
    // Generate 2-hour slots
    for (let hour = startHour; hour < endHour; hour += 2) {
      const actualEndHour = Math.min(hour + 2, endHour)
      const startTime = `${hour.toString().padStart(2, '0')}:00`
      const endTime = `${actualEndHour.toString().padStart(2, '0')}:00`
      
      const slotData = {
        id: `${hour}-${actualEndHour}`,
        startTime,
        endTime,
        display: `${startTime} - ${endTime}`,
        isAvailable: true
      }
      
      // Calculate dynamic price for this slot if we have a selected port
      if (selectedPort) {
        slotData.price = calculateEstimatedPrice(selectedPort, slotData)
      } else {
        slotData.price = 300 // Fallback price
      }
      
      slots.push(slotData)
    }
    
    return slots
  }
  // Load slot availability for selected date and port
  const loadSlotAvailability = async () => {
    if (!station?._id || !selectedDate || !selectedPort) return
    
    setLoadingSlots(true)
    try {
      const response = await bookingsAPI.checkSlotAvailability(
        station._id, 
        selectedDate, 
        selectedPort._id
      )
      if (response.success) {
        // Add dynamic pricing to each slot
        const slotsWithPricing = response.data.slots.map(slot => ({
          ...slot,
          price: calculateEstimatedPrice(selectedPort, slot)
        }))
        setTimeSlots(slotsWithPricing)
      }} catch (error) {
      console.error('Error loading slot availability:', error)
      // Generate fallback slots based on station operating hours
      const fallbackSlots = generateFallbackSlots(selectedDate, station.operatingHours)
      setTimeSlots(fallbackSlots)
    } finally {
      setLoadingSlots(false)
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
      setTimeSlots([])
      setPortAvailability([])
      setBookingForm({
        phoneNumber: '',
        vehicleNumber: '',
        driverName: '',
        email: ''
      })
      setPaymentProcessing(false)
      setBookingDetails(null)
      
      // Load initial port availability
      loadPortAvailability()
    }
  }, [isOpen])

  // Load port availability when date changes
  useEffect(() => {
    if (isOpen && selectedDate) {
      loadPortAvailability()
    }
  }, [selectedDate])
  // Load slot availability when port is selected or date changes
  useEffect(() => {
    if (isOpen && selectedDate && selectedPort) {
      loadSlotAvailability()
    } else if (isOpen && selectedDate && timeSlots.length > 0) {
      // Recalculate prices for existing slots when port changes
      const updatedSlots = timeSlots.map(slot => ({
        ...slot,
        price: selectedPort ? calculateEstimatedPrice(selectedPort, slot) : slot.price
      }))
      setTimeSlots(updatedSlots)
    }
  }, [selectedDate, selectedPort])

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
  
  const handlePayment = async () => {
    setPaymentProcessing(true)
    
    try {
      // Calculate the estimated amount
      const estimatedAmount = calculateEstimatedPrice(selectedPort, selectedTimeSlot)
      
      // Simulate payment processing time
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Prepare booking data for backend API
      const bookingData = {
        stationId: station._id,
        portId: selectedPort._id,
        date: selectedDate,
        timeSlot: {
          startTime: selectedTimeSlot.startTime,
          endTime: selectedTimeSlot.endTime
        },
        customerDetails: {
          phoneNumber: bookingForm.phoneNumber,
          vehicleNumber: bookingForm.vehicleNumber,
          driverName: bookingForm.driverName,
          email: bookingForm.email
        },
        vehicleDetails: {
          vehicleNumber: bookingForm.vehicleNumber,
          vehicleType: 'car' // Default to car for now
        },
        estimatedAmount: estimatedAmount,
        pricePerKWh: selectedPort.pricePerUnit
      }
        // Call backend API
      const response = await bookingsAPI.createQuickBooking(bookingData)
      
      if (response.success) {
        setBookingDetails(response.data)
        setPaymentProcessing(false)
        setStep(5)
        
        // Also save to localStorage for MyOrders page
        const existingBookings = JSON.parse(localStorage.getItem('userBookings') || '[]')
        const bookingForStorage = {
          id: response.data.bookingId,
          bookingId: response.data.bookingId,
          station: response.data.station,
          stationId: response.data.stationId,
          port: response.data.port,
          date: response.data.date,
          timeSlot: {
            startTime: response.data.timeSlot.startTime,
            endTime: response.data.timeSlot.endTime,
            display: `${response.data.timeSlot.startTime} - ${response.data.timeSlot.endTime}`
          },
          customerDetails: response.data.customerDetails,
          amount: response.data.amount,
          status: response.data.status,
          location: response.data.location,
          address: response.data.address
        }
        existingBookings.push(bookingForStorage)
        localStorage.setItem('userBookings', JSON.stringify(existingBookings))
      } else {
        throw new Error(response.message || 'Booking failed')
      }
      
    } catch (error) {
      console.error('Payment/Booking error:', error)
      setPaymentProcessing(false)
      // Show error to user (you could add an error state here)
      alert('Booking failed: ' + error.message)
    }
  }
  const isFormValid = bookingForm.phoneNumber && bookingForm.vehicleNumber

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto" style={{ zIndex: 9999 }}>
        {/* Background overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal Container */}
        <div className="flex items-center justify-center min-h-screen px-4 py-8 relative" style={{ zIndex: 10000 }}>
          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-4xl bg-white shadow-2xl rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Book Charging Slot
                </h3>
                <p className="text-gray-600 mt-1">
                  {station.name} - {station.address?.city}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center space-x-4">
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
              <div className="mt-2 text-sm text-gray-600">
                {step === 1 && 'Select Charging Port'}
                {step === 2 && 'Choose Date & Time'}
                {step === 3 && 'Enter Details'}
                {step === 4 && 'Payment'}
                {step === 5 && 'Confirmation'}
              </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[400px]">              {/* Step 1: Port Selection */}
              {step === 1 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Select a Charging Port</h4>
                  
                  {loadingPorts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="h-8 w-8 animate-spin text-primary-600" />
                      <span className="ml-2 text-gray-600">Loading ports...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(portAvailability.length > 0 ? portAvailability : station.chargingPorts || []).map((port, index) => {
                        const isAvailable = port.currentStatus === 'available' && !port.isCurrentlyBooked
                        
                        return (
                          <motion.div
                            key={port._id || index}
                            whileHover={{ scale: isAvailable ? 1.02 : 1 }}
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                              isAvailable
                                ? 'border-green-200 bg-green-50 hover:border-green-300'
                                : 'border-red-200 bg-red-50 cursor-not-allowed opacity-60'
                            }`}
                            onClick={() => isAvailable && handlePortSelection(port)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Port {port.portNumber}</span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  isAvailable
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {isAvailable ? 'Available' : 'Occupied'}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center">
                                <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                                {port.connectorType} - {port.powerOutput}kW
                              </div>                              <div className="flex items-center">
                                <CreditCard className="h-4 w-4 mr-2 text-green-500" />
                                ₹{port.pricePerUnit}/kWh
                                <div className="group relative ml-1">
                                  <Info className="h-3 w-3 text-gray-400 cursor-help" />
                                  <div className="invisible group-hover:visible absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                                    Final price = Rate × Energy consumed
                                  </div>
                                </div>
                              </div>
                              {port.currentBookings > 0 && (
                                <div className="text-xs text-red-600 mt-1">
                                  {port.currentBookings} booking(s) today
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}              {/* Step 2: Date & Time Selection */}
              {step === 2 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Choose Date & Time</h4>
                  
                  {/* Date Selection */}
                  <div className="mb-6">
                    <h5 className="font-medium mb-3">Select Date</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                      {availableDays.map((day) => (
                        <button
                          key={day.date}
                          onClick={() => setSelectedDate(day.date)}
                          className={`p-3 rounded-lg border transition-all text-center ${
                            selectedDate === day.date
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-sm font-medium">{day.display}</div>
                          {day.isToday && (
                            <div className="text-xs text-primary-600">Today</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slot Selection */}
                  {selectedDate && (
                    <div>
                      <h5 className="font-medium mb-3">Select Time Slot</h5>
                      
                      {loadingSlots ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader className="h-8 w-8 animate-spin text-primary-600" />
                          <span className="ml-2 text-gray-600">Loading available slots...</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {timeSlots.map((slot) => (
                            <button
                              key={slot.id}
                              onClick={() => slot.isAvailable && handleTimeSlotSelection(slot)}
                              disabled={!slot.isAvailable}
                              className={`p-3 rounded-lg border transition-all text-center ${
                                !slot.isAvailable
                                  ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                                  : selectedTimeSlot?.id === slot.id
                                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                                  : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                              }`}
                            >
                              <div className="flex items-center justify-center">
                                <Clock className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">{slot.display}</span>
                              </div>                              <div className="text-xs mt-1">
                                {!slot.isAvailable ? (
                                  <span className="text-red-600">Booked</span>
                                ) : (
                                  <div className="flex items-center justify-center">
                                    <span className="text-green-600">₹{slot.price}</span>
                                    <div className="group relative ml-1">
                                      <Info className="h-3 w-3 text-gray-400 cursor-help" />                                      <div className="invisible group-hover:visible absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                                        {selectedPort?.powerOutput}kW × time × ₹{selectedPort?.pricePerUnit}/kWh + ₹5 fee
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {slot.bookedPorts > 0 && slot.totalPorts && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {slot.bookedPorts}/{slot.totalPorts} ports booked
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {!loadingSlots && timeSlots.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No slots available for this date</p>
                          <p className="text-sm">Please select a different date</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6 mt-6 border-t">
                    <button
                      onClick={() => setStep(1)}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>                    {selectedTimeSlot && (
                      <button
                        onClick={() => setStep(3)}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Continue (₹{calculateEstimatedPrice(selectedPort, selectedTimeSlot)})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Booking Form */}
              {step === 3 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Enter Your Details</h4>
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Phone Number - Required */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="tel"
                            required
                            value={bookingForm.phoneNumber}
                            onChange={(e) => setBookingForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="+977 98xxxxxxxx"
                          />
                        </div>
                      </div>

                      {/* Vehicle Number - Required */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vehicle Number *
                        </label>
                        <div className="relative">
                          <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            required
                            value={bookingForm.vehicleNumber}
                            onChange={(e) => setBookingForm(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="BA 12 PA 1234"
                          />
                        </div>
                      </div>

                      {/* Driver Name - Optional */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Driver Name (Optional)
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            value={bookingForm.driverName}
                            onChange={(e) => setBookingForm(prev => ({ ...prev, driverName: e.target.value }))}
                            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>

                      {/* Email - Optional */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email (Optional)
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="email"
                            value={bookingForm.email}
                            onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="john@example.com"
                          />                        </div>
                      </div>
                    </div>

                    {/* Booking Summary Preview */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h5 className="font-medium text-blue-800 mb-3">Booking Summary</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Station:</span>
                          <span className="font-medium">{station.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Port:</span>
                          <span className="font-medium">{selectedPort.portNumber} ({selectedPort.connectorType})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Date:</span>
                          <span className="font-medium">{new Date(selectedDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Time:</span>
                          <span className="font-medium">{selectedTimeSlot.display}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between">
                            <span>Rate:</span>
                            <span>₹{selectedPort.pricePerUnit}/kWh</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Duration:</span>
                            <span>{(() => {
                              const startTime = selectedTimeSlot.startTime.split(':').map(Number)
                              const endTime = selectedTimeSlot.endTime.split(':').map(Number)
                              const startMinutes = startTime[0] * 60 + startTime[1]
                              const endMinutes = endTime[0] * 60 + endTime[1]
                              let durationHours = (endMinutes - startMinutes) / 60
                              if (durationHours < 0) durationHours += 24
                              return durationHours.toFixed(1)
                            })()} hours</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Energy Cost:</span>
                            <span>₹{(() => {
                              const startTime = selectedTimeSlot.startTime.split(':').map(Number)
                              const endTime = selectedTimeSlot.endTime.split(':').map(Number)
                              const startMinutes = startTime[0] * 60 + startTime[1]
                              const endMinutes = endTime[0] * 60 + endTime[1]
                              let durationHours = (endMinutes - startMinutes) / 60
                              if (durationHours < 0) durationHours += 24
                              const energyCost = Math.round(selectedPort.powerOutput * durationHours * selectedPort.pricePerUnit)
                              return energyCost
                            })()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Platform Fee:</span>
                            <span>₹5</span>
                          </div>
                          <div className="flex justify-between font-semibold text-blue-800">
                            <span>Total Amount:</span>
                            <span>₹{calculateEstimatedPrice(selectedPort, selectedTimeSlot)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Important Notice */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-800">Important:</p>                          <p className="text-yellow-700 mt-1">
                            Estimated cost: ₹{selectedTimeSlot ? calculateEstimatedPrice(selectedPort, selectedTimeSlot) : 300} = ({selectedPort?.powerOutput}kW × {selectedTimeSlot ? (() => {
                              const startTime = selectedTimeSlot.startTime.split(':').map(Number)
                              const endTime = selectedTimeSlot.endTime.split(':').map(Number)
                              const startMinutes = startTime[0] * 60 + startTime[1]
                              const endMinutes = endTime[0] * 60 + endTime[1]
                              let durationHours = (endMinutes - startMinutes) / 60
                              if (durationHours < 0) durationHours += 24
                              return durationHours.toFixed(1)
                            })() : '2'}h × ₹{selectedPort?.pricePerUnit}/kWh) + ₹5 platform fee. Actual cost based on energy consumed.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Back
                      </button>                      <button
                        type="submit"
                        disabled={!isFormValid}
                        className={`px-6 py-2 rounded-lg text-white font-medium ${
                          isFormValid
                            ? 'bg-primary-600 hover:bg-primary-700'
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Continue to Payment (₹{calculateEstimatedPrice(selectedPort, selectedTimeSlot)})
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Step 4: Payment */}
              {step === 4 && (
                <div>
                  <h4 className="text-lg font-semibold mb-4">Payment Details</h4>
                  
                  {/* Booking Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h5 className="font-medium mb-3">Booking Summary</h5>                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Station:</span>
                        <span className="font-medium">{station.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Port:</span>
                        <span className="font-medium">{selectedPort.portNumber} ({selectedPort.connectorType})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span className="font-medium">{new Date(selectedDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span className="font-medium">{selectedTimeSlot.display}</span>
                      </div>                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span>Rate:</span>
                          <span>₹{selectedPort.pricePerUnit}/kWh</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span>{(() => {
                            const startTime = selectedTimeSlot.startTime.split(':').map(Number)
                            const endTime = selectedTimeSlot.endTime.split(':').map(Number)
                            const startMinutes = startTime[0] * 60 + startTime[1]
                            const endMinutes = endTime[0] * 60 + endTime[1]
                            let durationHours = (endMinutes - startMinutes) / 60
                            if (durationHours < 0) durationHours += 24
                            return durationHours.toFixed(1)
                          })()} hours</span>
                        </div>                        <div className="flex justify-between">
                          <span>Est. Energy:</span>
                          <span>{(() => {
                            const startTime = selectedTimeSlot.startTime.split(':').map(Number)
                            const endTime = selectedTimeSlot.endTime.split(':').map(Number)
                            const startMinutes = startTime[0] * 60 + startTime[1]
                            const endMinutes = endTime[0] * 60 + endTime[1]
                            let durationHours = (endMinutes - startMinutes) / 60
                            if (durationHours < 0) durationHours += 24
                            const estimatedEnergy = (selectedPort.powerOutput * durationHours).toFixed(1)
                            return estimatedEnergy
                          })()} kWh</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Energy Cost:</span>
                          <span>₹{(() => {
                            const startTime = selectedTimeSlot.startTime.split(':').map(Number)
                            const endTime = selectedTimeSlot.endTime.split(':').map(Number)
                            const startMinutes = startTime[0] * 60 + startTime[1]
                            const endMinutes = endTime[0] * 60 + endTime[1]
                            let durationHours = (endMinutes - startMinutes) / 60
                            if (durationHours < 0) durationHours += 24
                            const energyCost = Math.round(selectedPort.powerOutput * durationHours * selectedPort.pricePerUnit)
                            return energyCost
                          })()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Platform Fee:</span>
                          <span>₹5</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Estimated Total:</span>
                          <span>₹{calculateEstimatedPrice(selectedPort, selectedTimeSlot)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(3)}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      disabled={paymentProcessing}
                    >
                      Back
                    </button>                    <button
                      onClick={handlePayment}
                      disabled={paymentProcessing}
                      className={`px-8 py-2 rounded-lg text-white font-medium flex items-center ${
                        paymentProcessing
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {paymentProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay ₹{calculateEstimatedPrice(selectedPort, selectedTimeSlot)}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Confirmation */}
              {step === 5 && bookingDetails && (
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h4>
                  <p className="text-gray-600 mb-6">
                    Your charging slot has been booked successfully.
                  </p>                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
                    <h5 className="font-semibold text-green-800 mb-3">Booking Details</h5>
                    <div className="space-y-2 text-sm text-green-700">
                      <div><strong>Booking ID:</strong> {bookingDetails.bookingId}</div>
                      <div><strong>Station:</strong> {bookingDetails.station}</div>
                      <div><strong>Date & Time:</strong> {new Date(bookingDetails.date).toLocaleDateString()} at {bookingDetails.timeSlot.startTime}-{bookingDetails.timeSlot.endTime}</div>
                      <div><strong>Port:</strong> {bookingDetails.port.portNumber} ({bookingDetails.port.connectorType})</div>
                      <div><strong>Amount Paid:</strong> ₹{bookingDetails.amount}</div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-700">
                      📱 SMS confirmation sent to {bookingDetails.customerDetails.phoneNumber}
                      {bookingDetails.customerDetails.email && (
                        <span><br />📧 Email confirmation sent to {bookingDetails.customerDetails.email}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={onClose}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        window.location.href = '/myorders'
                      }}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      View My Orders
                    </button>                  </div>
                </div>
              )}
            </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}

export default BookingModal
