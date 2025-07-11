import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  ChevronLeft,
  Calendar,
  Clock,
  Zap,
  MapPin,
  AlertCircle,
  Check,
  Loader,
  CreditCard,
  User
} from 'lucide-react'
import { stationsAPI, bookingsAPI } from '../services/api'

export default function BookingFlow() {
  const { stationId } = useParams()
  const navigate = useNavigate()
  
  const [selectedPort, setSelectedPort] = useState(null)
  const [bookingData, setBookingData] = useState({
    startTime: '',
    endTime: '',
    vehicleType: 'car',
    estimatedConsumption: '',
    notes: ''
  })
  const [step, setStep] = useState(1) // 1: Select Port, 2: Booking Details, 3: Payment

  // Fetch station details
  const { data: stationData, isLoading } = useQuery({
    queryKey: ['station', stationId],
    queryFn: () => stationsAPI.getStationById(stationId),
    enabled: !!stationId,
  })

  const station = stationData?.data?.data

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (data) => bookingsAPI.createBooking(data),
    onSuccess: (response) => {
      const bookingId = response.data?.data?._id
      if (bookingId) {
        navigate(`/booking-confirmation/${bookingId}`)
      } else {
        alert('Booking created successfully!')
        navigate('/my-bookings')
      }
    },
    onError: (error) => {
      console.error('Booking error:', error)
      alert('Failed to create booking. Please try again.')
    }
  })

  // Set default start time to current time + 30 minutes
  useEffect(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30)
    const startTime = now.toISOString().slice(0, 16)
    
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours later
    const endTimeString = endTime.toISOString().slice(0, 16)
    
    setBookingData(prev => ({
      ...prev,
      startTime,
      endTime: endTimeString
    }))
  }, [])

  const handleInputChange = (field, value) => {
    setBookingData(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateBooking = () => {
    if (!selectedPort || !bookingData.startTime || !bookingData.endTime) {
      alert('Please fill in all required fields')
      return
    }

    const booking = {
      stationId: station._id,
      portId: selectedPort._id,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      vehicleType: bookingData.vehicleType,
      estimatedConsumption: parseFloat(bookingData.estimatedConsumption) || 0,
      notes: bookingData.notes
    }

    createBookingMutation.mutate(booking)
  }

  const getAvailablePorts = () => {
    if (!station?.chargingPorts) return []
    return station.chargingPorts.filter(port => port.status === 'available')
  }

  const calculateEstimatedCost = () => {
    if (!selectedPort || !bookingData.estimatedConsumption) return 0
    return (parseFloat(bookingData.estimatedConsumption) * selectedPort.pricePerUnit).toFixed(2)
  }

  const calculateDuration = () => {
    if (!bookingData.startTime || !bookingData.endTime) return 0
    const start = new Date(bookingData.startTime)
    const end = new Date(bookingData.endTime)
    return Math.round((end - start) / (1000 * 60 * 60 * 100)) / 10 // Hours with 1 decimal
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto text-primary-600" />
          <p className="mt-2 text-gray-600">Loading station details...</p>
        </div>
      </div>
    )
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-red-600" />
          <p className="mt-2 text-gray-600">Station not found</p>
          <button 
            onClick={() => navigate('/search')}
            className="mt-4 btn btn-primary"
          >
            Back to Search
          </button>
        </div>
      </div>
    )
  }

  const availablePorts = getAvailablePorts()

  return (
    <>
      <Helmet>
        <title>Book {station.stationName} - ChargEase</title>
        <meta 
          name="description" 
          content={`Book a charging session at ${station.stationName}. Select your preferred charging port and schedule your charging time.`}
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              <div className="flex items-center space-x-4">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`flex items-center ${s < 3 ? 'mr-4' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step >= s
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step > s ? <Check className="h-4 w-4" /> : s}
                    </div>
                    {s < 3 && (
                      <div
                        className={`w-16 h-0.5 ${
                          step > s ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Station Info */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{station.stationName}</h1>
            <div className="flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{station.address.street}, {station.address.city}</span>
            </div>
          </div>

          {/* Step 1: Select Port */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Select a Charging Port</h2>
              
              {availablePorts.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                  <p className="text-gray-600">No ports are currently available at this station.</p>
                  <button
                    onClick={() => navigate('/search')}
                    className="mt-4 btn btn-primary"
                  >
                    Find Another Station
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {availablePorts.map((port, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedPort(port)}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedPort === port
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">Port {index + 1}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          port.chargingType === 'rapid'
                            ? 'bg-red-100 text-red-800'
                            : port.chargingType === 'fast'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {port.chargingType.charAt(0).toUpperCase() + port.chargingType.slice(1)}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Zap className="h-4 w-4 mr-2" />
                          <span>{port.power}kW • {port.connectorType}</span>
                        </div>
                        <div>₹{port.pricePerUnit}/kWh</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedPort && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="btn btn-primary"
                  >
                    Continue
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Booking Details */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={bookingData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={bookingData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    min={bookingData.startTime}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type
                  </label>
                  <select
                    value={bookingData.vehicleType}
                    onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                    className="input"
                  >
                    <option value="car">Car</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="bus">Bus</option>
                    <option value="truck">Truck</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Consumption (kWh)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={bookingData.estimatedConsumption}
                    onChange={(e) => handleInputChange('estimatedConsumption', e.target.value)}
                    placeholder="e.g., 20"
                    className="input"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any special requirements or notes..."
                  rows={3}
                  className="input"
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Port:</span>
                    <span>{selectedPort?.power}kW {selectedPort?.connectorType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{calculateDuration()} hours</span>
                  </div>
                  {bookingData.estimatedConsumption && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Cost:</span>
                      <span className="font-medium">₹{calculateEstimatedCost()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="btn btn-outline"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!bookingData.startTime || !bookingData.endTime}
                  className="btn btn-primary"
                >
                  Continue to Payment
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Confirm Booking</h2>
              
              {/* Final Summary */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-medium text-gray-900 mb-4">Final Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Station:</span>
                    <span className="font-medium">{station.stationName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Port:</span>
                    <span>{selectedPort?.power}kW {selectedPort?.connectorType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date & Time:</span>
                    <span>
                      {new Date(bookingData.startTime).toLocaleDateString()} at{' '}
                      {new Date(bookingData.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{calculateDuration()} hours</span>
                  </div>
                  {bookingData.estimatedConsumption && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estimated Consumption:</span>
                        <span>{bookingData.estimatedConsumption} kWh</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-3">
                        <span className="text-gray-900 font-semibold">Estimated Total:</span>
                        <span className="text-gray-900 font-semibold">₹{calculateEstimatedCost()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="space-y-1">
                      <li>• You will be charged only for the actual energy consumed</li>
                      <li>• Please arrive on time to avoid cancellation</li>
                      <li>• You can cancel up to 30 minutes before your scheduled time</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="btn btn-outline"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateBooking}
                  disabled={createBookingMutation.isLoading}
                  className="btn btn-primary flex items-center"
                >
                  {createBookingMutation.isLoading ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Creating Booking...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}
