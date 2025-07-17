import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Battery, 
  CreditCard, 
  Eye, 
  X, 
  Filter,
  Search,
  ChevronDown,
  Zap,
  Car,
  Phone,
  Mail,
  Loader,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  Star,
  RotateCcw,
  UtensilsCrossed,
  ShoppingBag
} from 'lucide-react'
import { usersAPI } from '../services/api'
import { formatAddress, formatDate, formatTime, formatCurrency } from '../utils/formatters'
import toast from 'react-hot-toast'
import CancellationModal from '../components/CancellationModal'
import { useAuth } from '../context/AuthContext'

export default function MyBookings() {
  const { isAuthenticated, loading: authLoading, refreshAuth } = useAuth()
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState(null)
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 10
  })

  // Check authentication on mount
  useEffect(() => {
    if (authLoading) return // Wait for auth to finish loading
    
    if (!isAuthenticated) {
      toast.error('Please login to view your bookings')
      window.location.href = '/auth'
      return
    }
    
    fetchBookings()
  }, [isAuthenticated, authLoading, filters])
  // Fetch bookings
  const fetchBookings = async (page = 1) => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: pagination.limit,
        ...filters
      }
      
      const response = await usersAPI.getBookings(params)
      
      if (response.data.success) {
        const data = response.data.data
        setBookings(data.bookings || [])
        setStats(data.stats || {})
        setPagination(data.pagination || { current: 1, pages: 1, total: 0, limit: 10 })
      } else {
        throw new Error(response.data.message || 'Failed to fetch bookings')
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
      
      // Handle specific authentication errors
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        await refreshAuth() // Try to refresh authentication
        return
      }
      
      toast.error(error.response?.data?.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Handle booking cancellation - Updated to use new modal
  const handleCancelBooking = (booking) => {
    setBookingToCancel(booking)
    setShowCancellationModal(true)
  }

  // Handle successful cancellation
  const handleCancellationSuccess = (updatedBookingData) => {
    // Update the booking in the list
    setBookings(prevBookings => 
      prevBookings.map(booking => 
        booking._id === updatedBookingData.booking._id 
          ? { ...booking, ...updatedBookingData.booking }
          : booking
      )
    )
    
    // Close modals
    setShowCancellationModal(false)
    setShowDetails(false)
    setBookingToCancel(null)
    
    // Refresh bookings to get updated stats
    fetchBookings()
  }

  // View booking details - Fixed authentication issue
  const viewBookingDetails = async (bookingId) => {
    try {
      // Check authentication first
      if (!isAuthenticated) {
        toast.error('Please login to view booking details')
        window.location.href = '/auth'
        return
      }

      const response = await usersAPI.getBookingById(bookingId)
      
      if (response.data.success) {
        setSelectedBooking(response.data.data)
        setShowDetails(true)
      } else {
        throw new Error(response.data.message || 'Failed to load booking details')
      }
    } catch (error) {
      console.error('Error fetching booking details:', error)
      
      // Handle specific authentication errors
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        await refreshAuth() // Try to refresh authentication
      } else {
        toast.error(error.response?.data?.message || 'Failed to load booking details')
      }
    }
  }
  const statusConfig = {
    pending: { color: 'yellow', icon: Timer, label: 'Pending Payment' },
    confirmed: { color: 'blue', icon: CheckCircle, label: 'Confirmed' },
    active: { color: 'green', icon: Zap, label: 'Charging' },
    completed: { color: 'green', icon: CheckCircle, label: 'Completed' },
    cancelled: { color: 'red', icon: XCircle, label: 'Cancelled' },
    expired: { color: 'gray', icon: AlertCircle, label: 'Expired' },
    failed: { color: 'red', icon: XCircle, label: 'Failed' }
  }

  // Helper function to check if booking can be cancelled
  const canCancelBooking = (booking) => {
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return false
    }
    
    const now = new Date()
    const startTime = new Date(booking.timeSlot?.startTime)
    const hoursUntilStart = (startTime - now) / (1000 * 60 * 60)
    
    return hoursUntilStart > 6 // Can only cancel if more than 6 hours before start
  }
  const statusFilters = [
    { value: 'all', label: 'All Bookings' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated (this should not happen due to useEffect, but safety check)
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Authentication required</p>
          <Link
            to="/auth"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Login to Continue
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>My Bookings - ChargEase</title>
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-2 text-gray-600">Track and manage your charging station bookings</p>
        </div>        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
            <StatCard label="Total Bookings" value={stats.total} icon={Calendar} />
            <StatCard label="Completed" value={stats.completed} icon={CheckCircle} color="green" />
            <StatCard label="Active" value={stats.active} icon={Zap} color="blue" />
            <StatCard label="Pending" value={stats.pending} icon={Timer} color="yellow" />
            <div className="col-span-2 sm:col-span-1">
              <StatCard label="Total Spent" value={`₹${stats.totalSpent || 0}`} icon={CreditCard} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">          {/* Filters */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Status and Sort Filters */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1 sm:hidden">Filter by Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    {statusFilters.map(filter => (
                      <option key={filter.value} value={filter.value}>
                        {filter.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1 sm:hidden">Sort by</label>
                  <select
                    value={`${filters.sortBy}-${filters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('-')
                      handleFilterChange('sortBy', sortBy)
                      handleFilterChange('sortOrder', sortOrder)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="timeSlot.startTime-desc">Start Time (Latest)</option>
                    <option value="timeSlot.startTime-asc">Start Time (Earliest)</option>
                    <option value="pricing.totalAmount-desc">Amount (High to Low)</option>
                    <option value="pricing.totalAmount-asc">Amount (Low to High)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>          {/* Bookings List */}
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-600 mb-6 px-4">
                  {filters.status === 'all' 
                    ? "You haven't made any bookings yet"
                    : `No ${filters.status} bookings found`
                  }
                </p>
                <Link
                  to="/search"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Find Charging Stations
                </Link>
              </div>
            ) : (
              <div className="space-y-4">{bookings.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    statusConfig={statusConfig}
                    onViewDetails={() => viewBookingDetails(booking._id)}
                    onCancel={() => handleCancelBooking(booking)}
                    canCancel={canCancelBooking(booking)}
                  />
                ))}
              </div>
            )}            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="text-sm text-gray-700 text-center sm:text-left">
                  Showing {((pagination.current - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.current * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex justify-center sm:justify-end">
                  <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
                    {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                      let page;
                      if (pagination.pages <= 5) {
                        page = i + 1;
                      } else if (pagination.current <= 3) {
                        page = i + 1;
                      } else if (pagination.current >= pagination.pages - 2) {
                        page = pagination.pages - 4 + i;
                      } else {
                        page = pagination.current - 2 + i;
                      }
                      
                      return (
                        <button
                          key={page}
                          onClick={() => fetchBookings(page)}
                          className={`px-3 py-2 rounded-lg text-sm ${
                            page === pagination.current
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>        {/* Booking Details Modal */}
        {showDetails && selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            onClose={() => setShowDetails(false)}
            onCancel={() => {
              setShowDetails(false)
              handleCancelBooking(selectedBooking)
            }}
            statusConfig={statusConfig}
            canCancel={canCancelBooking(selectedBooking)}
          />
        )}

        {/* Cancellation Modal */}
        {showCancellationModal && bookingToCancel && (
          <CancellationModal
            booking={bookingToCancel}
            onClose={() => {
              setShowCancellationModal(false)
              setBookingToCancel(null)
            }}
            onSuccess={handleCancellationSuccess}
          />
        )}
      </div>
    </>
  )
}

// Stats Card Component
function StatCard({ label, value, icon: Icon, color = 'gray' }) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600'
  }

  return (
    <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
      <div className="flex items-center">
        <div className={`p-1.5 sm:p-2 rounded-lg ${colorClasses[color]} flex-shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="ml-2 sm:ml-3 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{label}</p>
          <p className="text-sm sm:text-lg font-semibold text-gray-900 truncate">{value}</p>
        </div>
      </div>
    </div>
  )
}

// Booking Card Component
function BookingCard({ booking, statusConfig, onViewDetails, onCancel, canCancel }) {
  const status = statusConfig[booking.status] || statusConfig.pending
  const StatusIcon = status.icon
  
  // Calculate time until booking starts
  const getTimeUntilStart = () => {
    const now = new Date()
    const startTime = new Date(booking.timeSlot?.startTime)
    const hoursUntilStart = (startTime - now) / (1000 * 60 * 60)
    
    if (hoursUntilStart < 0) return 'Started'
    if (hoursUntilStart < 1) return `${Math.floor(hoursUntilStart * 60)} minutes`
    if (hoursUntilStart < 24) return `${Math.floor(hoursUntilStart)} hours`
    return `${Math.floor(hoursUntilStart / 24)} days`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
            <span className="text-lg font-semibold text-gray-900">
              #{booking.bookingId}
            </span>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-800`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </span>
              {booking.foodOrder && booking.foodOrder.items?.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  <UtensilsCrossed className="w-3 h-3 mr-1" />
                  Food Order
                </span>
              )}
              {booking.status === 'confirmed' && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  Starts in {getTimeUntilStart()}
                </span>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {formatDate(booking.createdAt)}
          </div>
        </div>

        {/* Station Info */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {booking.chargingStation?.name}
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span className="break-words">{formatAddress(booking.chargingStation?.address)}</span>
              </div>
              <div className="flex items-center">
                <Car className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{booking.vehicle?.vehicleNumber} ({booking.vehicle?.vehicleType})</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div className="flex items-center text-gray-600">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{formatDate(booking.timeSlot?.startTime)}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{formatTime(booking.timeSlot?.startTime)} - {formatTime(booking.timeSlot?.endTime)}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Battery className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{booking.chargingPort?.chargingType} • {booking.chargingPort?.powerOutput}kW</span>
            </div>
          </div>
        </div>

        {/* Price Info and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 pt-2 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(booking.pricing?.totalAmount)}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-1 sm:space-y-0 text-sm text-gray-500">
              <span>{booking.pricing?.estimatedUnits || 0} kWh estimated</span>
              {booking.foodOrder && booking.foodOrder.items?.length > 0 && (
                <span className="flex items-center text-orange-600">
                  <UtensilsCrossed className="w-3 h-3 mr-1" />
                  {booking.foodOrder.items.length} food item{booking.foodOrder.items.length > 1 ? 's' : ''} • {formatCurrency(booking.foodOrder.totalAmount)}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              onClick={onViewDetails}
              className="flex items-center justify-center px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg text-sm font-medium transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </button>
            
            {canCancel && (
              <button
                onClick={onCancel}
                className="flex items-center justify-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </button>
            )}
            
            {!canCancel && ['pending', 'confirmed'].includes(booking.status) && (
              <span 
                className="flex items-center justify-center text-xs text-gray-400 px-3 py-2 bg-gray-100 rounded-lg"
                title="Cannot cancel within 6 hours of charging time"
              >
                Cannot Cancel
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Booking Details Modal Component
function BookingDetailsModal({ booking, onClose, onCancel, statusConfig, canCancel }) {
  const status = statusConfig[booking.status] || statusConfig.pending
  const StatusIcon = status.icon
  
  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kathmandu' // Force Nepal timezone
    })
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0 min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              Booking #{booking.bookingId}
            </h2>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-800 self-start`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Station Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Station Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                {booking.chargingStation?.name}
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="break-words">{formatAddress(booking.chargingStation?.address)}</span>
                </div>
                {booking.chargingStation?.contactInfo && (
                  <>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="break-all">{booking.chargingStation.contactInfo.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="break-all">{booking.chargingStation.contactInfo.email}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Booking Details</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Booking Date</label>
                    <p className="text-sm text-gray-900">{formatDateTime(booking.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Start Time</label>
                    <p className="text-sm text-gray-900">{formatDateTime(booking.timeSlot?.startTime)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">End Time</label>
                    <p className="text-sm text-gray-900">{formatDateTime(booking.timeSlot?.endTime)}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Vehicle</label>
                    <p className="text-sm text-gray-900 break-words">
                      {booking.vehicle?.vehicleNumber} ({booking.vehicle?.vehicleType})
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Charging Port</label>
                    <p className="text-sm text-gray-900">
                      Port {booking.chargingPort?.portNumber} • {booking.chargingPort?.connectorType}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Power Output</label>
                    <p className="text-sm text-gray-900">
                      {booking.chargingPort?.powerOutput}kW ({booking.chargingPort?.chargingType})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing Details</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600">Base Cost ({booking.pricing?.estimatedUnits || 0} kWh)</span>
                  <span className="text-sm text-gray-900 font-medium">{formatCurrency(booking.pricing?.baseCost)}</span>
                </div>
                {booking.pricing?.taxes > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Taxes</span>
                    <span className="text-sm text-gray-900 font-medium">{formatCurrency(booking.pricing?.taxes)}</span>
                  </div>
                )}
                {booking.pricing?.serviceCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Service Charges</span>
                    <span className="text-sm text-gray-900 font-medium">{formatCurrency(booking.pricing?.serviceCharges)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Platform Fee</span>
                  <span className="text-sm text-gray-900 font-medium">{formatCurrency(booking.pricing?.platformFee)}</span>
                </div>
                {booking.foodOrder && booking.foodOrder.items?.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Food Order</span>
                    <span className="text-sm text-gray-900 font-medium">{formatCurrency(booking.foodOrder.totalAmount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">Total Amount</span>
                    <span className="font-bold text-gray-900 text-lg">{formatCurrency(booking.pricing?.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Food Order Details */}
          {booking.foodOrder && booking.foodOrder.items?.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Food Order Details</h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UtensilsCrossed className="w-5 h-5 text-orange-600 mr-2" />
                      <span className="font-medium text-gray-900">
                        {booking.foodOrder.items.length} item{booking.foodOrder.items.length > 1 ? 's' : ''} ordered
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      booking.foodOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.foodOrder.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      booking.foodOrder.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                      booking.foodOrder.status === 'ready' ? 'bg-green-100 text-green-800' :
                      booking.foodOrder.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.foodOrder.status || 'pending'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {booking.foodOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          <span className="text-sm text-gray-600 ml-2">×{item.quantity}</span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-orange-200 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Food Total</span>
                      <span className="font-bold text-gray-900">{formatCurrency(booking.foodOrder.totalAmount)}</span>
                    </div>
                    {booking.foodOrder.orderedAt && (
                      <div className="text-sm text-gray-600 mt-1">
                        Ordered: {formatDateTime(booking.foodOrder.orderedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Info for cancelled bookings */}
          {booking.status === 'cancelled' && booking.cancellation && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Cancellation Details</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-red-700 font-medium">Cancelled At:</span>
                    <span className="text-red-900">{formatDateTime(booking.cancellation.cancelledAt)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-red-700 font-medium">Reason:</span>
                    <span className="text-red-900 break-words">{booking.cancellation.cancellationReason}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-red-700 font-medium">Refund Status:</span>
                    <span className="text-red-900 font-medium">
                      {booking.cancellation.refundEligible ? 'Eligible for Refund' : 'No Refund'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
            {canCancel && (
              <button
                onClick={onCancel}
                className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Booking
              </button>
            )}
            
            <button
              onClick={onClose}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
