import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  AlertTriangle,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Building
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useAdminAuth } from '../../context/AdminAuthContext'

const AdminRestaurants = () => {
  const { admin } = useAdminAuth()
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState('')
  const [actionData, setActionData] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [verificationFilter, setVerificationFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Helper function to safely format address
  const formatAddress = (address) => {
    if (!address) return 'Not provided'
    if (typeof address === 'string') return address
    if (typeof address === 'object') {
      const parts = [
        address.street,
        address.landmark,
        address.city,
        address.state,
        address.pincode,
        address.country
      ].filter(Boolean)
      return parts.join(', ') || 'Address incomplete'
    }
    return 'Invalid address format'
  }

  useEffect(() => {
    fetchRestaurants()
  }, [currentPage, statusFilter, verificationFilter, searchTerm])

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(verificationFilter && { verificationStatus: verificationFilter })
      })

      const response = await fetch(`http://localhost:5000/api/admin/restaurants?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        setRestaurants(data.data.restaurants)
        setTotalPages(data.data.pagination.totalPages)
      } else {
        setError(data.message || 'Failed to fetch restaurants')
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error)
      setError('Failed to fetch restaurants')
    } finally {
      setLoading(false)
    }
  }

  const handleRestaurantAction = async (action, restaurantId, additionalData = {}) => {
    try {
      setIsProcessing(true)
      const token = localStorage.getItem('adminToken')
      
      let endpoint = ''
      let method = 'PATCH'
      let body = {}

      switch (action) {
        case 'verify':
          endpoint = `http://localhost:5000/api/admin/restaurants/${restaurantId}/verify`
          body = { approved: true }
          break
        case 'reject':
          endpoint = `http://localhost:5000/api/admin/restaurants/${restaurantId}/verify`
          body = { approved: false, rejectionReason: additionalData.reason }
          break
        case 'activate':
          endpoint = `http://localhost:5000/api/admin/restaurants/${restaurantId}/toggle-status`
          body = { isActive: true }
          break
        case 'deactivate':
          endpoint = `http://localhost:5000/api/admin/restaurants/${restaurantId}/toggle-status`
          body = { isActive: false, reason: additionalData.reason }
          break
        case 'review':
          endpoint = `http://localhost:5000/api/admin/restaurants/${restaurantId}/review`
          body = { notes: additionalData.notes }
          break
        case 'delete':
          endpoint = `http://localhost:5000/api/admin/restaurants/${restaurantId}`
          method = 'DELETE'
          body = { reason: additionalData.reason }
          break
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.success) {
        await fetchRestaurants()
        setShowActionModal(false)
        setActionData({})
      } else {
        setError(data.message || 'Action failed')
      }
    } catch (error) {
      console.error('Error performing restaurant action:', error)
      setError('Action failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (restaurant) => {
    if (!restaurant.isActive) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Inactive</span>
    }
    if (!restaurant.isVerified) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
  }

  const getVerificationBadge = (status) => {
    const badges = {
      pending: <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>,
      under_review: <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Under Review</span>,
      approved: <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Approved</span>,
      rejected: <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Rejected</span>
    }
    return badges[status] || badges.pending
  }

  if (loading && restaurants.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Restaurant Management - Admin Dashboard</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Store className="w-8 h-8 text-blue-600" />
              Restaurant Management
            </h1>
            <p className="text-gray-600 mt-1">Manage restaurant applications and operations</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search restaurants..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
            >
              <option value="">All Verification</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setVerificationFilter('')
                setCurrentPage(1)
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Restaurants Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {restaurants.map((restaurant) => (
                  <tr key={restaurant._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Store className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{restaurant.name}</div>
                          <div className="text-sm text-gray-500">{restaurant.chargingStation?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {restaurant.vendor?.businessName || restaurant.vendor?.name}
                      </div>
                      <div className="text-sm text-gray-500">{restaurant.vendor?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(restaurant)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getVerificationBadge(restaurant.verificationStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          {restaurant.stats?.dailyRevenue || 0}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {restaurant.stats?.employeeCount || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            console.log('Selected restaurant data:', restaurant)
                            setSelectedRestaurant(restaurant)
                            setShowDetailModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {restaurant.verificationStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRestaurant(restaurant)
                                setActionType('verify')
                                setShowActionModal(true)
                              }}
                              className="text-green-600 hover:text-green-800"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRestaurant(restaurant)
                                setActionType('reject')
                                setShowActionModal(true)
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        {restaurant.isVerified && (
                          <button
                            onClick={() => {
                              setSelectedRestaurant(restaurant)
                              setActionType(restaurant.isActive ? 'deactivate' : 'activate')
                              setShowActionModal(true)
                            }}
                            className={restaurant.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}
                          >
                            {restaurant.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        <AnimatePresence>
          {showDetailModal && selectedRestaurant && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowDetailModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Restaurant Details</h2>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Name:</span>
                          <div className="font-medium">{selectedRestaurant.name || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Cuisine Type:</span>
                          <div className="font-medium">{selectedRestaurant.cuisineType || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <div>{getStatusBadge(selectedRestaurant)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Verification:</span>
                          <div>{getVerificationBadge(selectedRestaurant.verificationStatus)}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Vendor Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Business Name:</span>
                          <div className="font-medium">{selectedRestaurant.vendor?.businessName || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <div className="font-medium">{selectedRestaurant.vendor?.email || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <div className="font-medium">{selectedRestaurant.vendor?.phoneNumber || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Address:</span>
                          <div className="font-medium">
                            {formatAddress(selectedRestaurant.vendor?.address)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Location</h3>
                      <div className="text-sm">
                        <span className="text-gray-500">Charging Station:</span>
                        <div className="font-medium">{selectedRestaurant.chargingStation?.name || 'N/A'}</div>
                        <div className="text-gray-600">
                          {formatAddress(selectedRestaurant.chargingStation?.address)}
                        </div>
                      </div>
                    </div>

                    {selectedRestaurant.stats && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Statistics</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-gray-500">Daily Revenue</div>
                            <div className="font-medium">${selectedRestaurant.stats.dailyRevenue || 0}</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-gray-500">Employees</div>
                            <div className="font-medium">{selectedRestaurant.stats.employeeCount || 0}</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <div className="text-gray-500">Total Orders</div>
                            <div className="font-medium">{selectedRestaurant.stats.totalOrders || 0}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Modal */}
        <AnimatePresence>
          {showActionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-lg max-w-md w-full p-6"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {actionType === 'verify' && 'Verify Restaurant'}
                  {actionType === 'reject' && 'Reject Restaurant'}
                  {actionType === 'activate' && 'Activate Restaurant'}
                  {actionType === 'deactivate' && 'Deactivate Restaurant'}
                </h3>

                {(actionType === 'reject' || actionType === 'deactivate') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason *
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      value={actionData.reason || ''}
                      onChange={(e) => setActionData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Please provide a reason..."
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowActionModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRestaurantAction(actionType, selectedRestaurant._id, actionData)}
                    disabled={isProcessing || ((actionType === 'reject' || actionType === 'deactivate') && !actionData.reason)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}

export default AdminRestaurants
