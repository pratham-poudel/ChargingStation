import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  MapPin,
  Phone,
  Calendar,
  Zap,
  DollarSign,
  User,
  Plus,
  Minus,
  Loader
} from 'lucide-react'
import { merchantAPI } from '../services/merchantAPI'

const BookingsModal = ({ isOpen, onClose, getMerchantRevenue }) => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [expandedBooking, setExpandedBooking] = useState(null)
  const [error, setError] = useState('')
  const modalRef = useRef(null)
  const observerRef = useRef(null)

  // Infinite scroll hook
  const lastBookingElementRef = useCallback(node => {
    if (loading) return
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreBookings()
      }
    })
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore])

  // Load initial bookings when modal opens
  useEffect(() => {
    if (isOpen) {
      resetAndLoadBookings()
    }
  }, [isOpen])

  const resetAndLoadBookings = async () => {
    setBookings([])
    setPage(1)
    setHasMore(true)
    setError('')
    setExpandedBooking(null)
    await loadBookings(1, true)
  }

  const loadBookings = async (pageNum = page, isReset = false) => {
    if (loading && !isReset) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await merchantAPI.getAllBookings({
        page: pageNum,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })

      const newBookings = response.data?.bookings || []
      const totalPages = response.data?.totalPages || 1

      if (isReset) {
        setBookings(newBookings)
      } else {
        setBookings(prev => [...prev, ...newBookings])
      }

      setHasMore(pageNum < totalPages)
      setPage(pageNum + 1)
    } catch (error) {
      console.error('Error loading bookings:', error)
      setError('Failed to load bookings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadMoreBookings = () => {
    if (!loading && hasMore) {
      loadBookings()
    }
  }

  const toggleExpanded = (bookingId) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NP', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusConfig = (status) => {
    const configs = {
      pending: { 
        icon: Clock, 
        text: 'Pending',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        iconColor: 'text-yellow-600',
        borderColor: 'border-yellow-200'
      },
      confirmed: { 
        icon: CheckCircle2, 
        text: 'Confirmed',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        iconColor: 'text-blue-600',
        borderColor: 'border-blue-200'
      },
      active: { 
        icon: Zap, 
        text: 'Active',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        iconColor: 'text-green-600',
        borderColor: 'border-green-200'
      },
      completed: { 
        icon: CheckCircle2, 
        text: 'Completed',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        iconColor: 'text-emerald-600',
        borderColor: 'border-emerald-200'
      },
      cancelled: { 
        icon: XCircle, 
        text: 'Cancelled',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        iconColor: 'text-red-600',
        borderColor: 'border-red-200'
      },
    }
    return configs[status] || configs.pending
  }
  const StatusBadge = ({ status }) => {
    const config = getStatusConfig(status)
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
        <Icon className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 ${config.iconColor}`} />
        <span className="hidden sm:inline">{config.text}</span>
        <span className="sm:hidden">{config.text.slice(0, 3)}</span>
      </span>
    )
  }

  const BookingCalculationSummary = ({ booking }) => {
    const originalAmount = booking.pricing?.totalAmount || 0
    const merchantAmount = booking.pricing?.merchantAmount || Math.max(0, originalAmount - 5)
    const platformFee = 5

    const additionalCharges = booking.paymentAdjustments
      ?.filter(adj => adj.type === 'additional_charge' && adj.status === 'processed')
      ?.reduce((total, adj) => total + adj.amount, 0) || 0
    
    const refunds = booking.paymentAdjustments
      ?.filter(adj => adj.type === 'refund' && adj.status === 'processed')
      ?.reduce((total, adj) => total + adj.amount, 0) || 0

    const finalMerchantRevenue = getMerchantRevenue ? getMerchantRevenue(booking) : merchantAmount + additionalCharges - refunds

    return (      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-50 rounded-lg p-3 sm:p-4 mt-3 sm:mt-4 border border-gray-200 mx-3 sm:mx-4"
      >
        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <DollarSign className="w-4 h-4 mr-2" />
          Revenue Calculation Summary
        </h4>
        
        <div className="space-y-2 text-xs sm:text-sm overflow-x-auto">
          {/* Original Pricing */}
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-600">Original Total Amount</span>
            <span className="font-medium">{formatCurrency(originalAmount)}</span>
          </div>
          
          <div className="flex justify-between items-center py-1 pl-4">
            <span className="text-gray-500">- Platform Fee</span>
            <span className="text-gray-500">-{formatCurrency(platformFee)}</span>
          </div>
          
          <div className="flex justify-between items-center py-1 border-b border-gray-200 pb-2">
            <span className="text-gray-600">Base Merchant Amount</span>
            <span className="font-medium">{formatCurrency(merchantAmount)}</span>
          </div>

          {/* Payment Adjustments */}
          {(additionalCharges > 0 || refunds > 0) && (
            <>
              <div className="pt-2">
                <span className="text-gray-700 font-medium">Payment Adjustments:</span>
              </div>
              
              {additionalCharges > 0 && (
                <div className="flex justify-between items-center py-1 pl-4">
                  <span className="text-green-600 flex items-center">
                    <Plus className="w-3 h-3 mr-1" />
                    Additional Charges
                  </span>
                  <span className="text-green-600 font-medium">+{formatCurrency(additionalCharges)}</span>
                </div>
              )}
              
              {refunds > 0 && (
                <div className="flex justify-between items-center py-1 pl-4">
                  <span className="text-red-600 flex items-center">
                    <Minus className="w-3 h-3 mr-1" />
                    Refunds
                  </span>
                  <span className="text-red-600 font-medium">-{formatCurrency(refunds)}</span>
                </div>
              )}
            </>
          )}

          {/* Final Total */}
          <div className="flex justify-between items-center py-2 mt-2 pt-2 border-t border-gray-300 bg-white rounded px-2">
            <span className="font-semibold text-gray-900">Final Merchant Revenue</span>
            <span className="font-bold text-green-600 text-base">{formatCurrency(finalMerchantRevenue)}</span>
          </div>

          {/* Adjustment Details */}
          {booking.paymentAdjustments && booking.paymentAdjustments.length > 0 && (
            <div className="pt-3 border-t border-gray-200 mt-3">
              <span className="text-xs font-medium text-gray-700 mb-2 block">Adjustment Details:</span>
              {booking.paymentAdjustments.map((adjustment, index) => (
                <div key={index} className="text-xs text-gray-600 py-1 flex justify-between">
                  <span className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      adjustment.status === 'processed' ? 'bg-green-400' : 'bg-yellow-400'
                    }`}></span>
                    {adjustment.reason} ({adjustment.type})
                  </span>
                  <span className={adjustment.type === 'additional_charge' ? 'text-green-600' : 'text-red-600'}>
                    {adjustment.type === 'additional_charge' ? '+' : '-'}{formatCurrency(adjustment.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />
          {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-x-2 inset-y-4 sm:inset-x-4 sm:inset-y-8 lg:inset-x-16 lg:inset-y-12 xl:inset-x-32 xl:inset-y-16 bg-white rounded-xl sm:rounded-2xl shadow-2xl flex flex-col max-w-none"
        >          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">All Bookings</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Complete booking history with revenue details</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
            </button>
          </div>          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-auto p-4 sm:p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              {bookings.map((booking, index) => {
                const isExpanded = expandedBooking === booking._id
                const isLast = index === bookings.length - 1
                
                return (
                  <motion.div
                    key={booking._id}
                    ref={isLast ? lastBookingElementRef : null}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >                    {/* Main Booking Row */}
                    <div className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                          {/* Customer Info */}
                          <div className="flex items-center min-w-0 flex-shrink-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-xs sm:text-sm">
                                {(booking.user?.name || 'Guest').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-2 sm:ml-3 min-w-0">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                {booking.user?.name || 'Guest User'}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center">
                                <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{booking.customerDetails?.phoneNumber || 'No phone'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Station Info - Hidden on mobile, shown on tablet+ */}
                          <div className="hidden sm:block min-w-0">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {booking.chargingStation?.name || 'Unknown Station'}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">Port {booking.chargingPort?.portNumber || 'N/A'}</span>
                            </div>
                          </div>

                          {/* Date Info - Hidden on mobile and tablet, shown on desktop */}
                          <div className="hidden lg:block min-w-0">
                            <div className="text-xs text-gray-500 flex items-center">
                              <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{formatDateTime(booking.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Revenue & Status */}
                        <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 flex-shrink-0">
                          <div className="text-right min-w-0">
                            <div className="text-xs sm:text-sm font-semibold text-gray-900">
                              {formatCurrency(booking.pricing?.merchantAmount || 0)}
                            </div>
                            {booking.status === 'completed' && (
                              <div className="text-xs text-green-600 font-medium truncate">
                                Realized: {formatCurrency(getMerchantRevenue ? getMerchantRevenue(booking) : booking.pricing?.merchantAmount || 0)}
                                {booking.paymentAdjustments && booking.paymentAdjustments.length > 0 && (
                                  <span className="ml-1 text-orange-600">*</span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <StatusBadge status={booking.status} />
                            
                            <button
                              onClick={() => toggleExpanded(booking._id)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Info - Show station and date info on mobile */}
                      <div className="sm:hidden mt-3 pt-3 border-t border-gray-100">
                        <div className="flex justify-between text-xs text-gray-500 space-x-2">
                          <span className="flex items-center min-w-0 flex-1">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{booking.chargingStation?.name} - Port {booking.chargingPort?.portNumber}</span>
                          </span>
                          <span className="flex items-center flex-shrink-0">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span className="whitespace-nowrap">{formatDateTime(booking.createdAt)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <BookingCalculationSummary booking={booking} />
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}

              {/* Loading More */}
              {loading && (
                <div className="flex justify-center py-8">
                  <div className="flex items-center text-gray-500">
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Loading more bookings...
                  </div>
                </div>
              )}

              {/* No More Data */}
              {!hasMore && bookings.length > 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-sm">That's all your bookings!</div>
                  <div className="text-xs mt-1">Total: {bookings.length} bookings</div>
                </div>
              )}

              {/* No Data */}
              {!loading && bookings.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No bookings found</h3>
                  <p className="text-sm text-gray-500">When customers book your stations, they'll appear here.</p>
                </div>              )}
            </div>
          </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default BookingsModal
