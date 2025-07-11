import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { 
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Car,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminAuth } from '../../context/AdminAuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const AdminUsers = () => {
  const { getUsers } = useAdminAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchUsers()
  }, [pagination.page])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, filterStatus])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const result = await getUsers({
        page: pagination.page,
        limit: pagination.limit
      })
      
      if (result.success) {
        setUsers(result.data.users || [])
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination?.total || 0,
          totalPages: result.data.pagination?.pages || 0
        }))
      } else {
        toast.error(result.error || 'Failed to fetch users')
      }
    } catch (error) {
      toast.error('Failed to fetch users')
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
      )
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => user.status === filterStatus)
    }

    setFilteredUsers(filtered)
  }

  const handleViewUser = (user) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await adminAPI.patch(`/users/${userId}/status`, { status: newStatus })
      toast.success(`User ${newStatus} successfully`)
      fetchUsers()
    } catch (error) {
      toast.error(`Failed to ${newStatus} user`)
    }
  }

  const exportUsers = async () => {
    try {
      const response = await adminAPI.get('/users/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Users exported successfully')
    } catch (error) {
      toast.error('Failed to export users')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'suspended': return 'bg-red-100 text-red-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'suspended': return <XCircle className="w-4 h-4" />
      case 'pending': return <AlertCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Users Management - Admin Portal</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
            <p className="text-gray-600">Manage all registered users on the platform</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportUsers}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="large" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bookings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <motion.tr
                        key={user._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">ID: {user._id.slice(-8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                            {getStatusIcon(user.status)}
                            <span className="ml-1 capitalize">{user.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.totalBookings || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {user.status === 'active' ? (
                            <button
                              onClick={() => handleStatusChange(user._id, 'suspended')}
                              className="text-red-600 hover:text-red-900"
                              title="Suspend User"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(user._id, 'active')}
                              className="text-green-600 hover:text-green-900"
                              title="Activate User"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded">
                      {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Only one dim layer, not inside modal */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowUserModal(false)}></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full relative z-10"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-lg font-medium text-white">
                      {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-500">User Details</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-sm text-gray-900">{selectedUser.email}</p>
                      <span className={`text-xs ml-1 ${selectedUser.isEmailVerified ? 'text-green-600' : 'text-red-500'}`}>{selectedUser.isEmailVerified ? 'Verified' : 'Not Verified'}</span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm text-gray-900">{selectedUser.phone || selectedUser.phoneNumber}</p>
                      <span className={`text-xs ml-1 ${selectedUser.isPhoneVerified ? 'text-green-600' : 'text-red-500'}`}>{selectedUser.isPhoneVerified ? 'Verified' : 'Not Verified'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                        {getStatusIcon(selectedUser.status)}
                        <span className="ml-1 capitalize">{selectedUser.status}</span>
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Joined</label>
                      <p className="text-sm text-gray-900">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Login</label>
                      <p className="text-sm text-gray-900">{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Active</label>
                      <span className={`text-xs ml-1 ${selectedUser.isActive ? 'text-green-600' : 'text-red-500'}`}>{selectedUser.isActive ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Statistics</label>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Total Bookings:</span>
                        <span className="ml-2 font-medium">{(selectedUser.totalBookings !== undefined ? selectedUser.totalBookings : (selectedUser.bookings?.length || 0))}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Spent:</span>
                        <span className="ml-2 font-medium">₹{(selectedUser.totalSpent !== undefined ? selectedUser.totalSpent : (selectedUser.bookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {/* Preferences */}
                  {selectedUser.preferences && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Preferences</label>
                      <div className="text-xs text-gray-700 mt-1">
                        Charging Type: <span className="font-medium">{selectedUser.preferences.preferredChargingType}</span>,
                        Max Distance: <span className="font-medium">{selectedUser.preferences.maxDistance} km</span>
                      </div>
                      <div className="text-xs text-gray-700 mt-1">
                        Notifications: SMS <span className="font-medium">{selectedUser.preferences.notifications?.sms ? 'On' : 'Off'}</span>,
                        Email <span className="font-medium">{selectedUser.preferences.notifications?.email ? 'On' : 'Off'}</span>,
                        Push <span className="font-medium">{selectedUser.preferences.notifications?.push ? 'On' : 'Off'}</span>
                      </div>
                    </div>
                  )}
                  {/* App Preferences */}
                  {selectedUser.appPreferences && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">App Preferences</label>
                      <div className="text-xs text-gray-700 mt-1">
                        Theme: <span className="font-medium">{selectedUser.appPreferences.theme}</span>,
                        Language: <span className="font-medium">{selectedUser.appPreferences.language}</span>,
                        Currency: <span className="font-medium">{selectedUser.appPreferences.currency}</span>
                      </div>
                      <div className="text-xs text-gray-700 mt-1">
                        Biometric: <span className="font-medium">{selectedUser.appPreferences.enableBiometric ? 'Enabled' : 'Disabled'}</span>,
                        Auto Login: <span className="font-medium">{selectedUser.appPreferences.autoLogin ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  )}
                  {/* Vehicles */}
                  {selectedUser.vehicles && selectedUser.vehicles.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vehicles</label>
                      <div className="mt-2 space-y-2">
                        {selectedUser.vehicles.map((vehicle, index) => (
                          <div key={index} className="flex items-center p-2 bg-gray-50 rounded text-xs">
                            <Car className="w-4 h-4 text-gray-400 mr-2" />
                            <span>{vehicle.vehicleType || vehicle.type || 'car'} | {vehicle.vehicleNumber || vehicle.licensePlate} | {vehicle.batteryCapacity ? `${vehicle.batteryCapacity} kWh` : ''} {vehicle.isDefault && <span className="ml-2 text-green-600">(Default)</span>}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* FCM Tokens */}
                  {selectedUser.fcmTokens && selectedUser.fcmTokens.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">FCM Tokens</label>
                      <div className="mt-2 max-h-24 overflow-y-auto bg-gray-50 rounded p-2 text-xs">
                        {selectedUser.fcmTokens.map((token, idx) => (
                          <div key={idx} className="mb-1">
                            <span className="font-mono break-all">{token.token}</span> <span className="ml-2">({token.deviceInfo?.platform || 'web'})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Device Sessions */}
                  {selectedUser.deviceSessions && selectedUser.deviceSessions.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Device Sessions</label>
                      <div className="mt-2 max-h-32 overflow-y-auto bg-gray-50 rounded p-2 text-xs">
                        {selectedUser.deviceSessions.map((session, idx) => (
                          <div key={idx} className="mb-1">
                            <span className="font-mono">{session.deviceId}</span> | {session.platform} | {session.ipAddress || 'N/A'} | Last: {session.lastActivity ? new Date(session.lastActivity).toLocaleString() : 'N/A'} | {session.isActive ? 'Active' : 'Inactive'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminUsers
