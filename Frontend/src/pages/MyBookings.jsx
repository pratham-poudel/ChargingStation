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
import { usersAPI, ordersAPI } from '../services/api'
import { formatAddress, formatDate, formatTime, formatCurrency } from '../utils/formatters'
import toast from 'react-hot-toast'
import CancellationModal from '../components/CancellationModal'
import { useAuth } from '../context/AuthContext'

export default function MyBookings() {
  const { isAuthenticated, loading: authLoading, refreshAuth, user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'bookings', 'orders'
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
    
    fetchData()
  }, [isAuthenticated, authLoading, filters, activeTab])

  // Fetch both bookings and orders
  const fetchData = async (page = 1) => {
    try {
      setLoading(true)
      
      if (activeTab === 'all' || activeTab === 'bookings') {
        await fetchBookings(page)
      }
      
      if (activeTab === 'all' || activeTab === 'orders') {
        await fetchOrders(page)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Fetch bookings
  const fetchBookings = async (page = 1) => {
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...filters
      }
      
      const response = await usersAPI.getBookings(params)
      
      if (response.data.success) {
        const data = response.data.data
        setBookings(data.bookings || [])
        setStats(prevStats => ({
          ...prevStats,
          bookings: data.stats || {}
        }))
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
    }
  }

  // Fetch restaurant orders
  const fetchOrders = async (page = 1) => {
    try {
      if (!user || (!user.phoneNumber && !user._id)) {
        console.log('No user info available for fetching orders')
        return
      }

      const params = {
        page,
        limit: pagination.limit,
        phone: user.phoneNumber,
        userId: user._id,
        status: filters.status === 'all' ? undefined : filters.status,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      }
      
      const response = await ordersAPI.getMyOrders(params)
      
      if (response.success) {
        setOrders(response.data || [])
        setStats(prevStats => ({
          ...prevStats,
          orders: response.stats || {}
        }))
        
        // Update pagination for orders if this is the active tab
        if (activeTab === 'orders') {
          setPagination(response.pagination || { current: 1, pages: 1, total: 0, limit: 10 })
        }
      } else {
        throw new Error(response.message || 'Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      // Don't show error toast for orders as they might not exist for all users
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
        setSelectedOrder(null) // Clear order selection
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

  // View order details
  const viewOrderDetails = async (orderId) => {
    try {
      // Check authentication first
      if (!isAuthenticated) {
        toast.error('Please login to view order details')
        window.location.href = '/auth'
        return
      }

      const response = await ordersAPI.getOrderById(orderId)
      
      if (response.success) {
        setSelectedOrder(response.data)
        setSelectedBooking(null) // Clear booking selection
        setShowDetails(true)
      } else {
        throw new Error(response.message || 'Failed to load order details')
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
      toast.error(error.response?.data?.message || 'Failed to load order details')
    }
  }
  const statusConfig = {
    // Booking statuses
    pending: { color: 'yellow', icon: Timer, label: 'Pending Payment' },
    confirmed: { color: 'blue', icon: CheckCircle, label: 'Confirmed' },
    active: { color: 'green', icon: Zap, label: 'Charging' },
    completed: { color: 'green', icon: CheckCircle, label: 'Completed' },
    cancelled: { color: 'red', icon: XCircle, label: 'Cancelled' },
    expired: { color: 'gray', icon: AlertCircle, label: 'Expired' },
    failed: { color: 'red', icon: XCircle, label: 'Failed' },
    
    // Order statuses
    preparing: { color: 'blue', icon: Timer, label: 'Preparing' },
    ready: { color: 'orange', icon: CheckCircle, label: 'Ready for Pickup' }
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
    { value: 'all', label: 'All Items' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const tabs = [
    { value: 'all', label: 'All Items', icon: ShoppingBag },
    { value: 'bookings', label: 'Charging Bookings', icon: Zap },
    { value: 'orders', label: 'Food Orders', icon: UtensilsCrossed }
  ]

  // Get combined data based on active tab
  const getCombinedData = () => {
    let combinedItems = []
    
    // Get order IDs that are associated with bookings to exclude them from independent orders
    const getBookingAssociatedOrderIds = () => {
      const associatedOrderIds = new Set()
      bookings.forEach(booking => {
        // Check if booking has food order information
        if (booking.foodOrder && booking.foodOrder.orderId) {
          associatedOrderIds.add(booking.foodOrder.orderId.toString())
        }
        // Also check if booking has restaurantOrders array (alternative structure)
        if (booking.restaurantOrders && Array.isArray(booking.restaurantOrders)) {
          booking.restaurantOrders.forEach(order => {
            if (order._id) {
              associatedOrderIds.add(order._id.toString())
            }
          })
        }
      })
      return associatedOrderIds
    }
    
    // Filter out orders that are associated with bookings (not independent orders)
    const getIndependentOrders = () => {
      const associatedOrderIds = getBookingAssociatedOrderIds()
      const independentOrders = orders.filter(order => {
        // If order ID is in the associated orders list, exclude it
        if (associatedOrderIds.has(order._id.toString())) {
          console.log(`🔄 Filtering out order ${order.orderNumber} (${order._id}) - associated with booking`)
          return false
        }
        // Also check if order has any booking-related fields that indicate it's not independent
        const isIndependent = !order.booking && !order.bookingId
        if (!isIndependent) {
          console.log(`🔄 Filtering out order ${order.orderNumber} (${order._id}) - has booking fields`)
        }
        return isIndependent
      })
      
      console.log(`📊 Total orders: ${orders.length}, Independent orders: ${independentOrders.length}, Associated orders: ${associatedOrderIds.size}`)
      return independentOrders
    }
    
    if (activeTab === 'all') {
      // Combine bookings and independent orders only, mark their type
      const bookingItems = bookings.map(booking => ({
        ...booking,
        type: 'booking',
        id: booking._id,
        displayId: booking.bookingId,
        displayName: booking.chargingStation?.name || 'Charging Session',
        displayLocation: formatAddress(booking.chargingStation?.address),
        displayTime: booking.timeSlot?.startTime || booking.createdAt,
        displayAmount: booking.pricing?.totalAmount || 0
      }))
      
      // Only include independent orders (not associated with bookings)
      const independentOrderItems = getIndependentOrders().map(order => ({
        ...order,
        type: 'order',
        id: order._id,
        displayId: order.orderNumber,
        displayName: order.restaurant?.name || 'Restaurant Order',
        displayLocation: formatAddress(order.chargingStation?.address),
        displayTime: order.orderedAt || order.createdAt,
        displayAmount: order.totalAmount || 0
      }))
      
      combinedItems = [...bookingItems, ...independentOrderItems]
    } else if (activeTab === 'bookings') {
      combinedItems = bookings.map(booking => ({
        ...booking,
        type: 'booking',
        id: booking._id,
        displayId: booking.bookingId,
        displayName: booking.chargingStation?.name || 'Charging Session',
        displayLocation: formatAddress(booking.chargingStation?.address),
        displayTime: booking.timeSlot?.startTime || booking.createdAt,
        displayAmount: booking.pricing?.totalAmount || 0
      }))
    } else if (activeTab === 'orders') {
      // Only show independent orders (not associated with bookings)
      combinedItems = getIndependentOrders().map(order => ({
        ...order,
        type: 'order',
        id: order._id,
        displayId: order.orderNumber,
        displayName: order.restaurant?.name || 'Restaurant Order',
        displayLocation: formatAddress(order.chargingStation?.address),
        displayTime: order.orderedAt || order.createdAt,
        displayAmount: order.totalAmount || 0
      }))
    }
    
    // Sort by display time (most recent first)
    combinedItems.sort((a, b) => new Date(b.displayTime) - new Date(a.displayTime))
    
    return combinedItems
  }

  // Get combined stats
  const getCombinedStats = () => {
    const bookingStats = stats?.bookings || {}
    const allOrderStats = stats?.orders || {}
    
    // Get order IDs that are associated with bookings to exclude them from independent orders
    const getBookingAssociatedOrderIds = () => {
      const associatedOrderIds = new Set()
      bookings.forEach(booking => {
        // Check if booking has food order information
        if (booking.foodOrder && booking.foodOrder.orderId) {
          associatedOrderIds.add(booking.foodOrder.orderId.toString())
        }
        // Also check if booking has restaurantOrders array (alternative structure)
        if (booking.restaurantOrders && Array.isArray(booking.restaurantOrders)) {
          booking.restaurantOrders.forEach(order => {
            if (order._id) {
              associatedOrderIds.add(order._id.toString())
            }
          })
        }
      })
      return associatedOrderIds
    }
    
    // Calculate stats for independent orders only
    const associatedOrderIds = getBookingAssociatedOrderIds()
    const independentOrders = orders.filter(order => {
      // If order ID is in the associated orders list, exclude it
      if (associatedOrderIds.has(order._id.toString())) {
        return false
      }
      // Also check if order has any booking-related fields that indicate it's not independent
      return !order.booking && !order.bookingId
    })
    
    const independentOrderStats = {
      total: independentOrders.length,
      completed: independentOrders.filter(order => order.status === 'completed' || order.status === 'delivered').length,
      preparing: independentOrders.filter(order => order.status === 'preparing' || order.status === 'confirmed').length,
      ready: independentOrders.filter(order => order.status === 'ready').length,
      pending: independentOrders.filter(order => order.status === 'pending').length,
      totalSpent: independentOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    }
    
    return {
      total: (bookingStats.total || 0) + (independentOrderStats.total || 0),
      completed: (bookingStats.completed || 0) + (independentOrderStats.completed || 0),
      active: (bookingStats.active || 0) + (independentOrderStats.preparing || 0) + (independentOrderStats.ready || 0),
      pending: (bookingStats.pending || 0) + (independentOrderStats.pending || 0),
      totalSpent: (bookingStats.totalSpent || 0) + (independentOrderStats.totalSpent || 0),
      bookings: bookingStats.total || 0,
      orders: independentOrderStats.total || 0
    }
  }

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

  const combinedStats = getCombinedStats()
  const combinedItems = getCombinedData()

  return (
    <>
      <Helmet>
        <title>My Bookings & Orders - ChargEase</title>
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings & Orders</h1>
          <p className="mt-2 text-gray-600">Track and manage your charging bookings and restaurant orders</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.value
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                    {tab.value === 'bookings' && combinedStats.bookings > 0 && (
                      <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                        {combinedStats.bookings}
                      </span>
                    )}
                    {tab.value === 'orders' && combinedStats.orders > 0 && (
                      <span className="ml-2 bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">
                        {combinedStats.orders}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Stats Cards */}
        {combinedStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
            <StatCard label="Total Items" value={combinedStats.total} icon={ShoppingBag} />
            <StatCard label="Completed" value={combinedStats.completed} icon={CheckCircle} color="green" />
            <StatCard label="Active" value={combinedStats.active} icon={Zap} color="blue" />
            <StatCard label="Pending" value={combinedStats.pending} icon={Timer} color="yellow" />
            <StatCard label="Bookings" value={combinedStats.bookings} icon={Zap} color="blue" />
            <StatCard label="Orders" value={combinedStats.orders} icon={UtensilsCrossed} color="orange" />
            <div className="col-span-2 sm:col-span-3 lg:col-span-6">
              <StatCard label="Total Spent" value={`₹${combinedStats.totalSpent || 0}`} icon={CreditCard} />
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
                  placeholder={activeTab === 'bookings' ? "Search bookings..." : activeTab === 'orders' ? "Search orders..." : "Search items..."}
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
          </div>          {/* Items List */}
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : combinedItems.length === 0 ? (
              <div className="text-center py-12">
                {activeTab === 'bookings' ? (
                  <>
                    <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                    <p className="text-gray-600 mb-6 px-4">
                      {filters.status === 'all' 
                        ? "You haven't made any charging bookings yet"
                        : `No ${filters.status} bookings found`
                      }
                    </p>
                    <Link
                      to="/search"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Find Charging Stations
                    </Link>
                  </>
                ) : activeTab === 'orders' ? (
                  <>
                    <UtensilsCrossed className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                    <p className="text-gray-600 mb-6 px-4">
                      {filters.status === 'all' 
                        ? "You haven't placed any restaurant orders yet"
                        : `No ${filters.status} orders found`
                      }
                    </p>
                    <Link
                      to="/search"
                      className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      Find Restaurants
                    </Link>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                    <p className="text-gray-600 mb-6 px-4">
                      {filters.status === 'all' 
                        ? "You haven't made any bookings or orders yet"
                        : `No ${filters.status} items found`
                      }
                    </p>
                    <div className="space-x-4">
                      <Link
                        to="/search"
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Find Charging Stations
                      </Link>
                      <Link
                        to="/search"
                        className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
                        <UtensilsCrossed className="w-4 h-4 mr-2" />
                        Find Restaurants
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {combinedItems.map((item) => (
                  item.type === 'booking' ? (
                    <BookingCard
                      key={item.id}
                      booking={item}
                      statusConfig={statusConfig}
                      onViewDetails={() => viewBookingDetails(item.id)}
                      onCancel={() => handleCancelBooking(item)}
                      canCancel={canCancelBooking(item)}
                    />
                  ) : (
                    <OrderCard
                      key={item.id}
                      order={item}
                      statusConfig={statusConfig}
                      onViewDetails={() => viewOrderDetails(item.id)}
                    />
                  )
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
        </div>        {/* Details Modal */}
        {showDetails && (selectedBooking || selectedOrder) && (
          <>
            {selectedBooking && (
              <BookingDetailsModal
                booking={selectedBooking}
                onClose={() => {
                  setShowDetails(false)
                  setSelectedBooking(null)
                }}
                onCancel={() => {
                  setShowDetails(false)
                  handleCancelBooking(selectedBooking)
                }}
                statusConfig={statusConfig}
                canCancel={canCancelBooking(selectedBooking)}
              />
            )}
            
            {selectedOrder && (
              <OrderDetailsModal
                order={selectedOrder}
                onClose={() => {
                  setShowDetails(false)
                  setSelectedOrder(null)
                }}
                statusConfig={statusConfig}
              />
            )}
          </>
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
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600'
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

// Order Card Component
function OrderCard({ order, statusConfig, onViewDetails }) {
  const status = statusConfig[order.status] || statusConfig.pending
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow bg-gradient-to-r from-orange-50 to-yellow-50"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
            <span className="text-lg font-semibold text-gray-900">
              #{order.orderNumber}
            </span>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-800`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                <UtensilsCrossed className="w-3 h-3 mr-1" />
                Restaurant Order
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {formatDate(order.orderedAt || order.createdAt)}
          </div>
        </div>

        {/* Restaurant Information */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {order.restaurant?.name}
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span className="break-words">{formatAddress(order.chargingStation?.address)}</span>
              </div>
              <div className="flex items-center">
                <UtensilsCrossed className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Order Items Preview */}
          {order.items && order.items.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Items Ordered:</h4>
              <div className="space-y-1">
                {order.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="text-sm text-gray-600 flex justify-between">
                    <span>{item.quantity}x {item.menuItemSnapshot?.name || 'Item'}</span>
                    <span>{formatCurrency(item.totalPrice || 0)}</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="text-sm text-gray-500 italic">
                    +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Ordered: {formatTime(order.orderedAt || order.createdAt)}</span>
            </div>
            {order.estimatedPreparationTime && (
              <div className="flex items-center text-gray-600">
                <Timer className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Prep: {order.estimatedPreparationTime} min</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 pt-2 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(order.totalAmount || 0)}
            </div>
            <div className="text-sm text-gray-500">
              {order.orderType === 'takeaway' ? 'Takeaway' : 'Dine In'}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onViewDetails}
              className="flex items-center justify-center px-3 py-2 text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-medium transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Order Details Modal Component
function OrderDetailsModal({ order, onClose, statusConfig }) {
  const status = statusConfig[order.status] || statusConfig.pending
  const StatusIcon = status.icon
  
  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kathmandu'
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
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0 min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              Order #{order.orderNumber}
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
          {/* Restaurant Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Restaurant Information</h3>
            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                {order.restaurant?.name}
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{formatAddress(order.chargingStation?.address)}</span>
                </div>
                {order.restaurant?.contactInfo?.phoneNumber && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{order.restaurant.contactInfo.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items</h3>
            <div className="space-y-3">
              {order.items?.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {item.menuItemSnapshot?.name || 'Item'}
                      </h4>
                      {item.menuItemSnapshot?.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.menuItemSnapshot.description}
                        </p>
                      )}
                      <div className="text-sm text-gray-500 mt-2">
                        Quantity: {item.quantity} × {formatCurrency(item.unitPrice || 0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(item.totalPrice || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Order Date</label>
                  <p className="text-sm text-gray-900">
                    {formatDateTime(order.orderedAt || order.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Order Type</label>
                  <p className="text-sm text-gray-900">
                    {order.orderType === 'takeaway' ? 'Takeaway' : 'Dine In'}
                  </p>
                </div>
                {order.estimatedPreparationTime && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Preparation Time</label>
                    <p className="text-sm text-gray-900">
                      {order.estimatedPreparationTime} minutes
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="text-sm text-gray-900">
                    {order.payment?.method === 'cash' ? 'Cash' : 
                     order.payment?.method === 'card' ? 'Card' :
                     order.payment?.method === 'upi' ? 'UPI' : 
                     order.payment?.method || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{order.customer?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{order.customer?.phoneNumber}</p>
                </div>
                {order.customer?.email && (
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{order.customer.email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {order.notes?.customer && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Special Instructions</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900">{order.notes.customer}</p>
              </div>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(order.subtotal || 0)}</span>
              </div>
              {order.tax?.amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({order.tax.percentage || 5}%)</span>
                  <span className="text-gray-900">{formatCurrency(order.tax.amount)}</span>
                </div>
              )}
              {order.serviceCharge?.amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Charge ({order.serviceCharge.percentage || 0}%)</span>
                  <span className="text-gray-900">{formatCurrency(order.serviceCharge.amount)}</span>
                </div>
              )}
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatCurrency(order.totalAmount || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
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

export { OrderDetailsModal }
