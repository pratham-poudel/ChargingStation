import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { 
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  MapPin,
  Clock,
  Shield,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Eye,
  Search,
  Filter
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminAuth } from '../../context/AdminAuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const AdminSessions = () => {
  const { adminAPI } = useAdminAuth()
  const [sessions, setSessions] = useState([])
  const [filteredSessions, setFilteredSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDevice, setFilterDevice] = useState('all')
  const [selectedSession, setSelectedSession] = useState(null)
  const [showSessionModal, setShowSessionModal] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    filterSessions()
  }, [sessions, searchTerm, filterStatus, filterDevice])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.get('/auth/sessions')
      
      if (response.data.success) {
        setSessions(response.data.data.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
      toast.error('Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  const filterSessions = () => {
    let filtered = sessions

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.deviceInfo?.deviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.deviceInfo?.browser?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.deviceInfo?.os?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.location?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.location?.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.ipAddress?.includes(searchTerm)
      )
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(session => session.isActive === (filterStatus === 'active'))
    }

    // Filter by device type
    if (filterDevice !== 'all') {
      filtered = filtered.filter(session => {
        const platform = session.deviceInfo?.platform?.toLowerCase()
        switch (filterDevice) {
          case 'desktop':
            return platform === 'web' || platform === 'desktop'
          case 'mobile':
            return platform === 'mobile' || platform === 'android' || platform === 'ios'
          case 'tablet':
            return platform === 'tablet'
          default:
            return true
        }
      })
    }

    setFilteredSessions(filtered)
  }

  const handleTerminateSession = async (sessionId) => {
    try {
      await adminAPI.delete(`/auth/sessions/${sessionId}`)
      toast.success('Session terminated successfully')
      fetchSessions()
    } catch (error) {
      toast.error('Failed to terminate session')
    }
  }

  const handleTerminateAllSessions = async () => {
    if (!confirm('Are you sure you want to terminate all other sessions? This will log you out from all other devices.')) {
      return
    }

    try {
      await adminAPI.delete('/auth/sessions/all')
      toast.success('All other sessions terminated successfully')
      fetchSessions()
    } catch (error) {
      toast.error('Failed to terminate sessions')
    }
  }

  const handleViewSession = (session) => {
    setSelectedSession(session)
    setShowSessionModal(true)
  }

  const getDeviceIcon = (platform) => {
    const platformLower = platform?.toLowerCase()
    switch (platformLower) {
      case 'mobile':
      case 'android':
      case 'ios':
        return <Smartphone className="h-5 w-5" />
      case 'tablet':
        return <Tablet className="h-5 w-5" />
      case 'web':
      case 'desktop':
      default:
        return <Monitor className="h-5 w-5" />
    }
  }

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'text-green-600 bg-green-100'
      : 'text-gray-600 bg-gray-100'
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

  const formatDuration = (startDate) => {
    const now = new Date()
    const start = new Date(startDate)
    const diffMs = now - start
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    } else {
      return `${diffMinutes}m`
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Helmet>
          <title>Active Sessions - Admin Dashboard</title>
        </Helmet>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
            <p className="text-gray-600">Monitor and manage your device sessions</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchSessions}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={handleTerminateAllSessions}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Terminate All Others
            </button>
          </div>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Monitor className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => s.isActive).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Smartphone className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mobile Sessions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => ['mobile', 'android', 'ios'].includes(s.deviceInfo?.platform?.toLowerCase())).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Suspicious Sessions</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Sessions
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by device, location, IP..."
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
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device Type
              </label>
              <select
                value={filterDevice}
                onChange={(e) => setFilterDevice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Devices</option>
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('all')
                  setFilterDevice('all')
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Sessions ({filteredSessions.length})
            </h2>
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
                      Device & Browser
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSessions.map((session) => (
                    <motion.tr
                      key={session._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-gray-500 mr-3">
                            {getDeviceIcon(session.deviceInfo?.platform)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {session.deviceInfo?.deviceName || 'Unknown Device'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {session.deviceInfo?.browser} • {session.deviceInfo?.os}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {session.location?.city || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {session.location?.country || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {session.ipAddress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {formatDate(session.lastActivity)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(session.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.isActive)}`}>
                            {session.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {session.isCurrent && (
                            <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full text-blue-600 bg-blue-100">
                              Current
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewSession(session)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {!session.isCurrent && session.isActive && (
                            <button
                              onClick={() => handleTerminateSession(session._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <LogOut className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Session Details Modal */}
        {showSessionModal && selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Session Details</h2>
                  <button
                    onClick={() => setShowSessionModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Session ID</label>
                      <p className="text-sm text-gray-900 font-mono">{selectedSession._id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedSession.isActive)}`}>
                        {selectedSession.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Device Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Device</label>
                        <p className="text-sm text-gray-900">{selectedSession.deviceInfo?.deviceName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Platform</label>
                        <p className="text-sm text-gray-900 capitalize">{selectedSession.deviceInfo?.platform}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Browser</label>
                        <p className="text-sm text-gray-900">{selectedSession.deviceInfo?.browser}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Operating System</label>
                        <p className="text-sm text-gray-900">{selectedSession.deviceInfo?.os}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Location & Network</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">IP Address</label>
                        <p className="text-sm text-gray-900 font-mono">{selectedSession.ipAddress}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <p className="text-sm text-gray-900">
                          {selectedSession.location?.city}, {selectedSession.location?.country}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Session Timeline</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Created</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedSession.createdAt)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Activity</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedSession.lastActivity)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {!selectedSession.isCurrent && selectedSession.isActive && (
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => {
                        handleTerminateSession(selectedSession._id)
                        setShowSessionModal(false)
                      }}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Terminate Session
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminSessions
