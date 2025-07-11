import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Zap, 
  Car, 
  Phone,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  RotateCcw
} from 'lucide-react'
import { bookingsAPI } from '../services/bookingsAPI'
import { userSession } from '../utils/userSession'

export default function MyOrders() {
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('all') // all, upcoming, completed, cancelled
  const [loading, setLoading] = useState(true)
  const [customerInfo, setCustomerInfo] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('checking') // checking, online, offline
  useEffect(() => {
    // Get customer info from session or bookings
    let customerInfo = userSession.getCustomerInfo()
    
    if (!customerInfo) {
      customerInfo = userSession.getCustomerInfoFromBookings()
    }
    
    setCustomerInfo(customerInfo)
    loadBookings(customerInfo)

    // Listen for user session updates
    const handleSessionUpdate = (event) => {
      const newCustomerInfo = event.detail
      setCustomerInfo(newCustomerInfo)
      if (newCustomerInfo) {
        loadBookings(newCustomerInfo)
      }
    }

    window.addEventListener('userSessionUpdate', handleSessionUpdate)
    
    return () => {
      window.removeEventListener('userSessionUpdate', handleSessionUpdate)
    }
  }, [])

  const loadBookings = async (customerInfo = null) => {
    try {
      setLoading(true)
      setConnectionStatus('checking')
      
      const response = await bookingsAPI.getUserBookings(customerInfo)
      
      if (response.success) {
        setBookings(response.data)
        setConnectionStatus(response.offline ? 'offline' : 'online')
      }
    } catch (error) {
      console.error('Failed to load bookings:', error)
      setConnectionStatus('offline')
      
      // Try to load from localStorage as fallback
      const localBookings = JSON.parse(localStorage.getItem('userBookings') || '[]')
      setBookings(localBookings)
    } finally {
      setLoading(false)
    }
  }

  const handleExtendBooking = async (booking) => {
    const additionalDuration = prompt('How many additional minutes do you need? (30-240)', '60')
    if (additionalDuration && !isNaN(additionalDuration)) {
      try {
        const response = await bookingsAPI.extendBooking(booking.id || booking.bookingId, parseInt(additionalDuration))
        if (response.success) {
          alert('Booking extended successfully!')
          loadBookings(customerInfo)
        }
      } catch (error) {
        console.error('Failed to extend booking:', error)
        alert('Failed to extend booking: ' + error.message)
      }
    }
  }

  const handleCompleteEarly = async (booking) => {
    if (window.confirm('Complete this session early? You may receive a partial refund.')) {
      try {
        const response = await bookingsAPI.completeBookingEarly(booking.id || booking.bookingId)
        if (response.success) {
          alert('Session completed early! Check your refund details.')
          loadBookings(customerInfo)
        }
      } catch (error) {
        console.error('Failed to complete early:', error)
        alert('Failed to complete session: ' + error.message)
      }
    }
  }
  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return booking.status === 'confirmed'
    if (filter === 'completed') return booking.status === 'completed'
    return true
  })
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100'
      case 'completed': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const handleNavigate = (booking, mapType) => {
    // Handle the new location data structure
    let lat, lng;
    
    if (booking.location?.coordinates) {
      // GeoJSON format [lng, lat]
      lat = booking.location.coordinates[1] || booking.location.latitude;
      lng = booking.location.coordinates[0] || booking.location.longitude;
    } else if (booking.location?.latitude && booking.location?.longitude) {
      // Direct lat/lng properties
      lat = booking.location.latitude;
      lng = booking.location.longitude;
    } else {
      // Fallback - use address for geocoding
      const address = booking.address || booking.station;
      if (address && typeof address === 'string') {
        const encodedAddress = encodeURIComponent(address);
        if (mapType === 'google') {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
        } else if (mapType === 'apple') {
          window.open(`http://maps.apple.com/?q=${encodedAddress}`, '_blank');
        }
        return;
      } else {
        alert('Location information not available for this booking');
        return;
      }
    }

    // Use coordinates if available
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      if (mapType === 'google') {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
      } else if (mapType === 'apple') {
        window.open(`http://maps.apple.com/?daddr=${lat},${lng}`, '_blank');
      }
    } else {
      // Final fallback to address search
      const address = booking.address || booking.station || 'charging station';
      const encodedAddress = encodeURIComponent(address);
      if (mapType === 'google') {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
      } else if (mapType === 'apple') {
        window.open(`http://maps.apple.com/?q=${encodedAddress}`, '_blank');
      }
    }
  }
  const NavigationButtons = ({ booking }) => {
    const [showOptions, setShowOptions] = useState(false)

    return (
      <div className="relative">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center text-sm"
        >
          <MapPin className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Go to Charger</span>
          <span className="sm:hidden">Navigate</span>
        </button>

        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-[150px]"
          >
            <button
              onClick={() => {
                handleNavigate(booking, 'google')
                setShowOptions(false)
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-sm"
            >
              <ExternalLink className="h-4 w-4 mr-2 text-blue-500" />
              Google Maps
            </button>
            <button
              onClick={() => {
                handleNavigate(booking, 'apple')
                setShowOptions(false)
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-sm"
            >
              <ExternalLink className="h-4 w-4 mr-2 text-gray-700" />
              Apple Maps
            </button>
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>My Orders - ChargEase Booking History</title>
        <meta 
          name="description" 
          content="View your charging station booking history, upcoming reservations, and manage your orders." 
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50">        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Orders</h1>
                  {/* Connection Status Indicator */}
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                    connectionStatus === 'online' ? 'bg-green-100 text-green-700' :
                    connectionStatus === 'offline' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'online' ? 'bg-green-500' :
                      connectionStatus === 'offline' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                    {connectionStatus === 'online' ? 'Live Data' :
                     connectionStatus === 'offline' ? 'Offline Mode' :
                     'Checking...'}
                  </div>
                </div>
                <p className="text-gray-600 mt-1">
                  {connectionStatus === 'offline' 
                    ? 'Showing cached data - some information may be outdated'
                    : 'Manage your charging station bookings'
                  }
                </p>
              </div>              {/* Filter Tabs */}
              <div className="flex mt-4 sm:mt-0 gap-4">                <div className="flex rounded-lg border border-gray-300 p-1">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'upcoming', label: 'Upcoming' },
                    { key: 'completed', label: 'Completed' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        filter === tab.key
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                
                {/* Refresh Button */}
                <button
                  onClick={() => loadBookings(customerInfo)}
                  disabled={loading}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                >                  <motion.div
                    animate={loading ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </motion.div>
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>{/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No bookings found
              </h3>
              <p className="text-gray-600 mb-6">
                You haven't made any bookings yet. Start by finding a charging station near you.
              </p>
              <a
                href="/stations"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Find Charging Stations
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredBookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                      <div className="mb-3 sm:mb-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {booking.station}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)} mt-1 sm:mt-0`}>
                            {getStatusIcon(booking.status)}
                            <span className="ml-1 capitalize">{booking.status}</span>
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">
                          Booking ID: {booking.bookingId || booking.id}
                        </p>
                      </div>{booking.status === 'confirmed' && (
                        <div className="flex flex-wrap gap-2">
                          <NavigationButtons booking={booking} />
                          
                          {/* Enhanced Action Buttons for Flexible Bookings */}
                          {booking.isFlexible && (
                            <>
                              <button
                                onClick={() => handleExtendBooking(booking)}
                                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center text-sm"
                                title="Extend your booking duration"
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Extend</span>
                              </button>
                              <button
                                onClick={() => handleCompleteEarly(booking)}
                                className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center text-sm"
                                title="Complete session early for partial refund"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Complete</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Enhanced Features Badge */}
                    {booking.isFlexible && (
                      <div className="mb-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border border-blue-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Flexible Booking - Extendable & Early Completion Available
                        </span>
                      </div>
                    )}                    {/* Booking Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">                      {/* Date & Time */}
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Date & Time</p>
                          <p className="text-sm text-gray-600">
                            {booking.date ? 
                              new Date(booking.date).toLocaleDateString() : 
                              new Date(booking.timeSlot?.startTime || booking.createdAt).toLocaleDateString()
                            }
                          </p>
                          <p className="text-sm text-gray-600">
                            {booking.timeSlot?.display || 
                             `${new Date(booking.timeSlot?.startTime).toLocaleTimeString('en-US', { 
                               hour: '2-digit', 
                               minute: '2-digit', 
                               hour12: false 
                             })} - ${new Date(booking.timeSlot?.endTime).toLocaleTimeString('en-US', { 
                               hour: '2-digit', 
                               minute: '2-digit', 
                               hour12: false 
                             })}`
                            }
                          </p>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Clock className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Duration</p>
                          <p className="text-sm text-gray-600">
                            {booking.timeSlot?.duration ? 
                              `${Math.floor(booking.timeSlot.duration / 60)}h ${booking.timeSlot.duration % 60}m` : 
                              '2h 0m'
                            }
                          </p>
                          {booking.actualUsage?.actualEndTime && booking.actualUsage?.actualStartTime && (
                            <p className="text-xs text-green-600">
                              Actual: {Math.floor((new Date(booking.actualUsage.actualEndTime) - new Date(booking.actualUsage.actualStartTime)) / (1000 * 60))}m
                            </p>
                          )}
                        </div>
                      </div>                      {/* Charging Port */}
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Zap className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Charging Port</p>
                          <p className="text-sm text-gray-600">
                            Port {booking.port?.portNumber || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {booking.port?.connectorType || 'N/A'} - {booking.port?.powerOutput || 'N/A'}
                          </p>
                        </div>
                      </div>                      {/* Vehicle */}
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Car className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Vehicle</p>
                          <p className="text-sm text-gray-600">
                            {booking.vehicle?.vehicleNumber || 'Not specified'}
                          </p>
                          <p className="text-sm text-gray-600 capitalize">
                            {booking.vehicle?.vehicleType || 'car'}
                          </p>
                        </div>
                      </div>                      {/* Vendor Contact */}
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Phone className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Station Contact</p>
                          <p className="text-sm text-gray-600">
                            {booking.vendorContact?.phone || 'Not available'}
                          </p>
                          {booking.vendorContact?.name && (
                            <p className="text-sm text-gray-600">
                              {booking.vendorContact.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Location & Amount */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-1" />
                        {booking.address}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Amount Paid</p>
                        <p className="text-lg font-semibold text-gray-900">₹{booking.pricing?.totalAmount || booking.amount || 0}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
