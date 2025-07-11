import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { 
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  DollarSign,
  Clock,
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  FileText,
  Phone,
  Mail
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminAuth } from '../../context/AdminAuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const AdminRefunds = () => {
  const { getRefunds, processRefund } = useAdminAuth()
  const [refunds, setRefunds] = useState([])
  const [filteredRefunds, setFilteredRefunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('pending')
  const [selectedRefund, setSelectedRefund] = useState(null)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [transactionId, setTransactionId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchRefunds()
  }, [pagination.page, filterStatus])

  useEffect(() => {
    filterRefunds()
  }, [refunds, searchTerm])

  const fetchRefunds = async () => {
    try {
      setLoading(true)
      const result = await getRefunds({
        page: pagination.page,
        limit: pagination.limit,
        status: filterStatus
      })
      
      if (result.success) {
        setRefunds(result.data.refunds || [])
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination?.total || 0,
          totalPages: result.data.pagination?.pages || 0
        }))
      } else {
        toast.error(result.error || 'Failed to fetch refunds')
      }
    } catch (error) {
      console.error('Error fetching refunds:', error)
      toast.error('Failed to fetch refunds')
    } finally {
      setLoading(false)
    }
  }

  const filterRefunds = () => {
    let filtered = refunds

    if (searchTerm) {
      filtered = filtered.filter(refund => 
        refund.refundId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refund.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refund.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refund.booking?.bookingId?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredRefunds(filtered)
  }

  const handleViewRefund = (refund) => {
    setSelectedRefund(refund)
    setShowRefundModal(true)
  }

  const handleMakePayment = () => {
    setShowRefundModal(false)
    setShowPaymentModal(true)
    setTransactionId('')
    setRemarks('')
  }

  const handleProcessPayment = async () => {
    if (!transactionId.trim()) {
      toast.error('Please enter transaction ID')
      return
    }

    try {
      setPaymentProcessing(true)
      const result = await processRefund(selectedRefund._id, {
        transactionId: transactionId.trim(),
        remarks: remarks.trim()
      })

      if (result.success) {
        toast.success('Refund processed successfully and user notified')
        setShowPaymentModal(false)
        setSelectedRefund(null)
        fetchRefunds()
      } else {
        toast.error(result.error || 'Failed to process refund')
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      toast.error('Failed to process refund')
    } finally {
      setPaymentProcessing(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'processing': return 'bg-blue-100 text-blue-700'
      case 'completed': return 'bg-green-100 text-green-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'rejected': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'processing': return <RefreshCw className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'failed': return <XCircle className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Helmet>
          <title>Refunds Management - Admin Dashboard</title>
        </Helmet>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Refunds Management</h1>
            <p className="text-gray-600">Process and manage user refunds in FIFO order</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchRefunds}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Refunds
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by refund ID, user name, email, or booking ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Status</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('pending')
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Refunds Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Refunds Queue ({pagination.total})
            </h2>
            {filterStatus === 'pending' && (
              <p className="text-sm text-gray-600 mt-1">
                Showing refunds in FIFO order (oldest first)
              </p>
            )}
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Refund Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRefunds.map((refund) => (
                    <motion.tr
                      key={refund._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-white" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {refund.refundId}
                            </div>
                            <div className="text-sm text-gray-500">
                              {refund.cancellationDetails?.cancellationReason || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {refund.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {refund.user?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {refund.user?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {refund.booking?.bookingId || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {refund.booking?.chargingStation?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(refund.refundCalculation?.finalRefundAmount || 0)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Original: {formatCurrency(refund.originalAmount || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(refund.refundStatus)}`}>
                          {getStatusIcon(refund.refundStatus)}
                          <span className="ml-1 capitalize">{refund.refundStatus}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(refund.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewRefund(refund)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {refund.refundStatus === 'pending' && (
                          <button
                            onClick={() => {
                              setSelectedRefund(refund)
                              handleMakePayment()
                            }}
                            className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Process
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Refund Details Modal */}
        {showRefundModal && selectedRefund && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Refund Details</h2>
                  <button
                    onClick={() => setShowRefundModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Refund Information */}
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Refund Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Refund ID:</span>
                          <span className="font-medium">{selectedRefund.refundId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRefund.refundStatus)}`}>
                            {getStatusIcon(selectedRefund.refundStatus)}
                            <span className="ml-1 capitalize">{selectedRefund.refundStatus}</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Requested:</span>
                          <span className="font-medium">{formatDate(selectedRefund.createdAt)}</span>
                        </div>
                        {selectedRefund.processedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Processed:</span>
                            <span className="font-medium">{formatDate(selectedRefund.processedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Information */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">User Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{selectedRefund.user?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium">{selectedRefund.user?.email || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium">{selectedRefund.user?.phoneNumber || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cancellation Details */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Cancellation Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hours Before:</span>
                          <span className="font-medium">{selectedRefund.cancellationDetails?.hoursBeforeCharge || 0} hours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Eligible:</span>
                          <span className={`font-medium ${selectedRefund.cancellationDetails?.isEligibleForRefund ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedRefund.cancellationDetails?.isEligibleForRefund ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Reason:</span>
                          <p className="font-medium mt-1">{selectedRefund.cancellationDetails?.cancellationReason || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Booking and Payment Details */}
                  <div className="space-y-4">
                    {/* Booking Information */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Booking Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Booking ID:</span>
                          <span className="font-medium">{selectedRefund.booking?.bookingId || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Station:</span>
                          <span className="font-medium">{selectedRefund.booking?.chargingStation?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Booking Date:</span>
                          <span className="font-medium">
                            {selectedRefund.booking?.timeSlot?.startTime ? 
                              formatDate(selectedRefund.booking.timeSlot.startTime) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Refund Calculation */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-3">Refund Calculation</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Original Amount:</span>
                          <span className="font-medium">{formatCurrency(selectedRefund.originalAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Platform Fee Deducted:</span>
                          <span className="font-medium text-red-600">-{formatCurrency(selectedRefund.refundCalculation?.platformFeeDeducted || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Slot Occupancy Fee (5%):</span>
                          <span className="font-medium text-red-600">-{formatCurrency(selectedRefund.refundCalculation?.slotOccupancyFee || 0)}</span>
                        </div>
                        <hr className="border-blue-300" />
                        <div className="flex justify-between text-lg font-bold">
                          <span className="text-gray-900">Final Refund Amount:</span>
                          <span className="text-green-600">{formatCurrency(selectedRefund.refundCalculation?.finalRefundAmount || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Original Payment ID:</span>
                          <span className="font-medium font-mono text-sm">{selectedRefund.paymentDetails?.originalPaymentId || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Transaction ID:</span>
                          <span className="font-medium font-mono text-sm">{selectedRefund.paymentDetails?.originalTransactionId || 'N/A'}</span>
                        </div>
                        {selectedRefund.paymentDetails?.refundTransactionId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Refund Transaction ID:</span>
                            <span className="font-medium font-mono text-sm">{selectedRefund.paymentDetails.refundTransactionId}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Refund Method:</span>
                          <span className="font-medium capitalize">{selectedRefund.paymentDetails?.refundMethod?.replace('_', ' ') || 'Original Payment Method'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowRefundModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  {selectedRefund.refundStatus === 'pending' && (
                    <button
                      onClick={handleMakePayment}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Make Payment
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Processing Modal */}
        {showPaymentModal && selectedRefund && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Process Refund Payment</h2>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Refund ID:</span>
                      <span className="font-medium">{selectedRefund.refundId}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">User:</span>
                      <span className="font-medium">{selectedRefund.user?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-bold text-green-600 text-lg">
                        {formatCurrency(selectedRefund.refundCalculation?.finalRefundAmount || 0)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Enter bank transaction ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remarks (Optional)
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Any additional notes about the refund..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> After processing, the user will be notified via email and SMS that their refund has been transferred back to their original payment method.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessPayment}
                    disabled={paymentProcessing || !transactionId.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {paymentProcessing ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      'Confirm Payment'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminRefunds 