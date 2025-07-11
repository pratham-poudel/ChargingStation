import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { 
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  MapPin,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Power,
  Settings,
  ExternalLink,
  Building,
  Crown,
  Star,
  Timer,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminAuth } from '../../context/AdminAuthContext'
import StationMap from '../../components/StationMap'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import StationDetailsModal from '../../components/StationDetailsModal'

const AdminStations = () => {
  const { 
    getStations,
    getStationPremiumDetails,
    activateStationPremium,
    deactivateStationPremium,
    extendStationPremium,
    bulkManageStationPremium
  } = useAdminAuth()
  const [stations, setStations] = useState([])
  const [filteredStations, setFilteredStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterVerification, setFilterVerification] = useState('all')
  const [filterPremium, setFilterPremium] = useState('all')
  const [selectedStation, setSelectedStation] = useState(null)
  const [showStationModal, setShowStationModal] = useState(false)
  const [showMapView, setShowMapView] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [selectedStationForPremium, setSelectedStationForPremium] = useState(null)
  const [premiumDetails, setPremiumDetails] = useState(null)
  const [loadingPremium, setLoadingPremium] = useState(false)
  const [selectedStationsForBulk, setSelectedStationsForBulk] = useState([])
  const [showBulkPremiumModal, setShowBulkPremiumModal] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    fetchStations()
  }, [pagination.page])

  useEffect(() => {
    filterStations()
  }, [stations, searchTerm, filterStatus, filterVerification, filterPremium])

  const fetchStations = async () => {
    try {
      setLoading(true)
      const result = await getStations({
        page: pagination.page,
        limit: pagination.limit
      })
      
      if (result.success) {
        setStations(result.data.stations || [])
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination?.total || 0,
          totalPages: result.data.pagination?.pages || 0
        }))
      } else {
        toast.error(result.error || 'Failed to fetch stations')
      }
    } catch (error) {
      toast.error('Failed to fetch stations')
      console.error('Error fetching stations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterStations = () => {
    let filtered = stations

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(station => 
        station.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.vendor?.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.location?.address?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(station => station.status === filterStatus)
    }

    // Filter by verification
    if (filterVerification !== 'all') {
      filtered = filtered.filter(station => station.verification?.status === filterVerification)
    }

    // Filter by premium status
    if (filterPremium !== 'all') {
      filtered = filtered.filter(station => {
        const isPremiumActive = station.premiumSubscription?.isActive && 
                               new Date(station.premiumSubscription?.endDate) > new Date()
        const isRecommended = station.dockitRecommended

        switch (filterPremium) {
          case 'premium_active':
            return isPremiumActive
          case 'premium_expired':
            return station.premiumSubscription?.isActive === false || 
                   (station.premiumSubscription?.endDate && new Date(station.premiumSubscription.endDate) <= new Date())
          case 'recommended':
            return isRecommended
          case 'not_premium':
            return !isPremiumActive && !isRecommended
          default:
            return true
        }
      })
    }

    setFilteredStations(filtered)
  }

  const handleViewStation = (station) => {
    setSelectedStation(station)
    setShowStationModal(true)
  }

  const handleStatusChange = async (stationId, newStatus) => {
    try {
      await adminAPI.patch(`/stations/${stationId}/status`, { status: newStatus })
      toast.success(`Station ${newStatus} successfully`)
      fetchStations()
    } catch (error) {
      toast.error(`Failed to ${newStatus} station`)
    }
  }

  const handleVerificationAction = async (stationId, action, reason = '') => {
    try {
      await adminAPI.patch(`/stations/${stationId}/verification`, { 
        action, 
        reason,
        reviewedBy: 'admin'
      })
      toast.success(`Station ${action} successfully`)
      fetchStations()
    } catch (error) {
      toast.error(`Failed to ${action} station`)
    }
  }

  const handleVerifyStation = async (stationId) => {
    try {
      await adminAPI.patch(`/stations/${stationId}/verify`);
      toast.success('Station verified and vendor notified');
      fetchStations();
    } catch (error) {
      toast.error('Failed to verify station');
    }
  };

  const exportStations = async () => {
    try {
      const response = await adminAPI.get('/stations/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `stations_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Stations exported successfully')
    } catch (error) {
      toast.error('Failed to export stations')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'inactive': return 'bg-red-100 text-red-700'
      case 'maintenance': return 'bg-yellow-100 text-yellow-700'
      case 'pending': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getVerificationColor = (status) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'under_review': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />
      case 'inactive': return <XCircle className="w-4 h-4" />
      case 'maintenance': return <Settings className="w-4 h-4" />
      case 'pending': return <AlertCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  // Premium status helpers
  const isPremiumActive = (station) => {
    return station.premiumSubscription?.isActive && 
           new Date(station.premiumSubscription?.endDate) > new Date()
  }

  const getPremiumStatusColor = (station) => {
    if (isPremiumActive(station)) {
      return 'bg-purple-100 text-purple-700'
    } else if (station.dockitRecommended) {
      return 'bg-yellow-100 text-yellow-700'
    } else if (station.premiumSubscription?.endDate && new Date(station.premiumSubscription.endDate) <= new Date()) {
      return 'bg-red-100 text-red-700'
    }
    return 'bg-gray-100 text-gray-700'
  }

  const getPremiumStatusText = (station) => {
    if (isPremiumActive(station)) {
      return 'Premium Active'
    } else if (station.dockitRecommended) {
      return 'Recommended'
    } else if (station.premiumSubscription?.endDate && new Date(station.premiumSubscription.endDate) <= new Date()) {
      return 'Premium Expired'
    }
    return 'Basic'
  }

  const getPremiumIcon = (station) => {
    if (isPremiumActive(station)) {
      return <Crown className="w-4 h-4" />
    } else if (station.dockitRecommended) {
      return <Star className="w-4 h-4" />
    } else if (station.premiumSubscription?.endDate && new Date(station.premiumSubscription.endDate) <= new Date()) {
      return <Timer className="w-4 h-4" />
    }
    return <Zap className="w-4 h-4" />
  }

  // Premium management handlers
  const handleManagePremium = async (station) => {
    setSelectedStationForPremium(station)
    setLoadingPremium(true)
    setShowPremiumModal(true)
    
    const result = await getStationPremiumDetails(station._id)
    if (result.success) {
      setPremiumDetails(result.data)
    } else {
      toast.error('Failed to load premium details')
    }
    setLoadingPremium(false)
  }

  const handleActivatePremium = async (premiumData) => {
    const result = await activateStationPremium(selectedStationForPremium._id, premiumData)
    if (result.success) {
      await fetchStations()
      // Refresh premium details
      const updatedDetails = await getStationPremiumDetails(selectedStationForPremium._id)
      if (updatedDetails.success) {
        setPremiumDetails(updatedDetails.data)
      }
    }
    return result
  }

  const handleDeactivatePremium = async (reason) => {
    const result = await deactivateStationPremium(selectedStationForPremium._id, reason)
    if (result.success) {
      await fetchStations()
      // Refresh premium details
      const updatedDetails = await getStationPremiumDetails(selectedStationForPremium._id)
      if (updatedDetails.success) {
        setPremiumDetails(updatedDetails.data)
      }
    }
    return result
  }

  const handleExtendPremium = async (extensionData) => {
    const result = await extendStationPremium(selectedStationForPremium._id, extensionData)
    if (result.success) {
      await fetchStations()
      // Refresh premium details
      const updatedDetails = await getStationPremiumDetails(selectedStationForPremium._id)
      if (updatedDetails.success) {
        setPremiumDetails(updatedDetails.data)
      }
    }
    return result
  }

  const handleBulkSelection = (stationId, isSelected) => {
    if (isSelected) {
      setSelectedStationsForBulk(prev => [...prev, stationId])
    } else {
      setSelectedStationsForBulk(prev => prev.filter(id => id !== stationId))
    }
  }

  const handleSelectAllStations = (isSelected) => {
    if (isSelected) {
      setSelectedStationsForBulk(filteredStations.map(station => station._id))
    } else {
      setSelectedStationsForBulk([])
    }
  }

  const handleBulkPremiumAction = async (bulkData) => {
    const result = await bulkManageStationPremium({
      stationIds: selectedStationsForBulk,
      ...bulkData
    })
    if (result.success) {
      await fetchStations()
      setSelectedStationsForBulk([])
      setShowBulkPremiumModal(false)
    }
    return result
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Stations Management - Admin Portal</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stations Management</h1>
            <p className="text-gray-600">Manage all charging stations on the platform</p>
          </div>
          <div className="flex space-x-3">
            {selectedStationsForBulk.length > 0 && (
              <button
                onClick={() => setShowBulkPremiumModal(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Crown className="w-4 h-4 mr-2" />
                Bulk Premium ({selectedStationsForBulk.length})
              </button>
            )}
            <button
              onClick={() => setShowMapView(!showMapView)}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                showMapView
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              {showMapView ? 'List View' : 'Map View'}
            </button>
            <button
              onClick={exportStations}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Map View */}
        {showMapView && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">All Stations Map</h3>
            <div className="h-96 bg-gray-100 rounded-lg overflow-hidden">
              <StationMap 
                stations={filteredStations}
                userLocation={null}
                onStationSelect={handleViewStation}
                isLoading={loading}
              />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search stations by name, vendor, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="lg:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Verification Filter */}
            <div className="lg:w-48">
              <select
                value={filterVerification}
                onChange={(e) => setFilterVerification(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Premium Filter */}
            <div className="lg:w-48">
              <select
                value={filterPremium}
                onChange={(e) => setFilterPremium(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Premium</option>
                <option value="premium_active">Premium Active</option>
                <option value="premium_expired">Premium Expired</option>
                <option value="recommended">Recommended</option>
                <option value="not_premium">Basic/No Premium</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stations Table */}
        {!showMapView && (
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
                          <input
                            type="checkbox"
                            checked={selectedStationsForBulk.length === filteredStations.length && filteredStations.length > 0}
                            onChange={(e) => handleSelectAllStations(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Station
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Verification
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Premium
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Slots
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStations.map((station) => (
                        <motion.tr
                          key={station._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedStationsForBulk.includes(station._id)}
                              onChange={(e) => handleBulkSelection(station._id, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-white" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{station.name}</div>
                                <div className="text-sm text-gray-500">ID: {station._id.slice(-8)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Building className="w-4 h-4 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900">{station.vendor?.businessName || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900">
                                {station.address ? `${station.address.street || ''}${station.address.landmark ? ', ' + station.address.landmark : ''}, ${station.address.city || ''}, ${station.address.state || ''} - ${station.address.pincode || ''}` : 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(station.isActive ? 'active' : 'inactive')}`}>
                              {getStatusIcon(station.isActive ? 'active' : 'inactive')}
                              <span className="ml-1 capitalize">{station.isActive ? 'Active' : 'Inactive'}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVerificationColor(station.isVerified ? 'verified' : 'unverified')}`}>
                              <span className="capitalize">{station.isVerified ? 'Verified' : 'Unverified'}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPremiumStatusColor(station)}`}>
                                {getPremiumIcon(station)}
                                <span className="ml-1">{getPremiumStatusText(station)}</span>
                              </span>
                              {isPremiumActive(station) && station.premiumSubscription?.endDate && (
                                <div className="text-xs text-gray-500">
                                  Expires: {new Date(station.premiumSubscription.endDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-600">{station.availablePorts ?? station.availableSlots ?? 0}</span>
                              <span className="text-gray-400">/</span>
                              <span className="text-gray-600">{station.totalPorts ?? station.totalSlots ?? 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewStation(station)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                              {/* Premium Management */}
                              <button
                                onClick={() => handleManagePremium(station)}
                                className="text-purple-600 hover:text-purple-900"
                                title="Manage Premium"
                              >
                                <Crown className="w-4 h-4" />
                              </button>

                              {/* Verify & Activate button for unverified stations */}
                              {!station.isVerified && (
                                <button
                                  onClick={() => handleVerifyStation(station._id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Verify & Activate"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              
                              {station.verification?.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleVerificationAction(station._id, 'approve')}
                                    className="text-green-600 hover:text-green-900"
                                    title="Approve Verification"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleVerificationAction(station._id, 'reject', 'Requirements not met')}
                                    className="text-red-600 hover:text-red-900"
                                    title="Reject Verification"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {station.status === 'active' ? (
                                <button
                                  onClick={() => handleStatusChange(station._id, 'inactive')}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Deactivate Station"
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(station._id, 'active')}
                                  className="text-green-600 hover:text-green-900"
                                  title="Activate Station"
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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
        )}
      </div>

      {/* Premium Management Modal */}
      {showPremiumModal && selectedStationForPremium && (
        <StationPremiumManagementModal
          station={selectedStationForPremium}
          premiumDetails={premiumDetails}
          loading={loadingPremium}
          onClose={() => {
            setShowPremiumModal(false)
            setSelectedStationForPremium(null)
            setPremiumDetails(null)
          }}
          onActivate={handleActivatePremium}
          onDeactivate={handleDeactivatePremium}
          onExtend={handleExtendPremium}
        />
      )}

      {/* Bulk Premium Management Modal */}
      {showBulkPremiumModal && (
        <BulkPremiumManagementModal
          selectedStations={selectedStationsForBulk}
          stationsList={filteredStations.filter(s => selectedStationsForBulk.includes(s._id))}
          onClose={() => setShowBulkPremiumModal(false)}
          onBulkAction={handleBulkPremiumAction}
        />
      )}

      {/* Station Details Modal */}
      {showStationModal && selectedStation && (
        <StationDetailsModal
          station={selectedStation}
          onClose={() => setShowStationModal(false)}
          onActionSuccess={fetchStations}
        />
      )}
    </AdminLayout>
  )
}

// Station Premium Management Modal Component
const StationPremiumManagementModal = ({ 
  station, 
  premiumDetails, 
  loading, 
  onClose, 
  onActivate, 
  onDeactivate, 
  onExtend 
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [processingAction, setProcessingAction] = useState(false)

  // Activation form state
  const [activationForm, setActivationForm] = useState({
    subscriptionType: 'monthly',
    customEndDate: '',
    reason: ''
  })

  // Extension form state
  const [extensionForm, setExtensionForm] = useState({
    days: '',
    months: '',
    years: '',
    reason: ''
  })

  const handleActivateSubmit = async (e) => {
    e.preventDefault()
    setProcessingAction(true)
    const result = await onActivate(activationForm)
    setProcessingAction(false)
    if (result.success) {
      setActivationForm({ subscriptionType: 'monthly', customEndDate: '', reason: '' })
      setActiveTab('overview')
    }
  }

  const handleExtendSubmit = async (e) => {
    e.preventDefault()
    if (!extensionForm.days && !extensionForm.months && !extensionForm.years) {
      toast.error('Please specify at least one time period')
      return
    }

    setProcessingAction(true)
    const result = await onExtend({
      days: extensionForm.days ? parseInt(extensionForm.days) : undefined,
      months: extensionForm.months ? parseInt(extensionForm.months) : undefined,
      years: extensionForm.years ? parseInt(extensionForm.years) : undefined,
      reason: extensionForm.reason
    })
    setProcessingAction(false)

    if (result.success) {
      setExtensionForm({ days: '', months: '', years: '', reason: '' })
      setActiveTab('overview')
    }
  }

  const handleDeactivateSubmit = async () => {
    const reason = prompt('Please provide a reason for deactivation:')
    if (!reason) return

    setProcessingAction(true)
    const result = await onDeactivate(reason)
    setProcessingAction(false)

    if (result.success) {
      setActiveTab('overview')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-[9998]" onClick={onClose}></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full z-[10000]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Crown className="w-6 h-6 text-white mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-white">Premium Management</h3>
                  <p className="text-purple-100 text-sm">{station.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-purple-100 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('activate')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'activate'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Activate Premium
              </button>
              <button
                onClick={() => setActiveTab('extend')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'extend'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Extend Premium
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="large" />
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && premiumDetails && (
                  <div className="space-y-6">
                    {/* Current Status */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Current Premium Status</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Status:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                premiumDetails.metrics.isPremiumActive 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {premiumDetails.metrics.isPremiumActive ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Type:</span>
                              <span className="text-sm font-medium">
                                {premiumDetails.premiumSubscription.type?.toUpperCase() || 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Start Date:</span>
                              <span className="text-sm font-medium">{formatDate(premiumDetails.premiumSubscription.startDate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">End Date:</span>
                              <span className="text-sm font-medium">{formatDate(premiumDetails.premiumSubscription.endDate)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Recommended:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                premiumDetails.isRecommended 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {premiumDetails.isRecommended ? 'YES' : 'NO'}
                              </span>
                            </div>
                            {premiumDetails.metrics.timeUntilExpiration && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Time Left:</span>
                                <span className="text-sm font-medium">
                                  {premiumDetails.metrics.timeUntilExpiration.days}d {premiumDetails.metrics.timeUntilExpiration.hours}h
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Premium Features</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(premiumDetails.premiumSubscription.features || {}).map(([feature, enabled]) => (
                          <div key={feature} className="flex items-center justify-between p-2 bg-white rounded border">
                            <span className="text-sm text-gray-700 capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
                            {enabled ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h4>
                      <div className="flex space-x-3">
                        {!premiumDetails.metrics.isPremiumActive ? (
                          <button
                            onClick={() => setActiveTab('activate')}
                            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                          >
                            <Crown className="w-4 h-4 mr-2" />
                            Activate Premium
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setActiveTab('extend')}
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              <Timer className="w-4 h-4 mr-2" />
                              Extend
                            </button>
                            <button
                              onClick={handleDeactivateSubmit}
                              disabled={processingAction}
                              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              {processingAction ? 'Deactivating...' : 'Deactivate'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Activate Tab */}
                {activeTab === 'activate' && (
                  <form onSubmit={handleActivateSubmit} className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Activate Premium Subscription</h4>
                      <p className="text-sm text-gray-600 mb-6">
                        Activate premium features for this station with admin privileges.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Type</label>
                        <select
                          value={activationForm.subscriptionType}
                          onChange={(e) => setActivationForm(prev => ({ ...prev, subscriptionType: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Custom End Date (Optional)</label>
                        <input
                          type="date"
                          value={activationForm.customEndDate}
                          onChange={(e) => setActivationForm(prev => ({ ...prev, customEndDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                      <textarea
                        value={activationForm.reason}
                        onChange={(e) => setActivationForm(prev => ({ ...prev, reason: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows="3"
                        placeholder="Reason for activating premium..."
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={processingAction}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                      >
                        {processingAction ? 'Activating...' : 'Activate Premium'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Extend Tab */}
                {activeTab === 'extend' && (
                  <form onSubmit={handleExtendSubmit} className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Extend Premium Subscription</h4>
                      <p className="text-sm text-gray-600 mb-6">
                        Add time to the current premium subscription. The extension will be added to the current end date.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                        <input
                          type="number"
                          min="0"
                          value={extensionForm.days}
                          onChange={(e) => setExtensionForm(prev => ({ ...prev, days: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Months</label>
                        <input
                          type="number"
                          min="0"
                          value={extensionForm.months}
                          onChange={(e) => setExtensionForm(prev => ({ ...prev, months: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Years</label>
                        <input
                          type="number"
                          min="0"
                          value={extensionForm.years}
                          onChange={(e) => setExtensionForm(prev => ({ ...prev, years: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                      <textarea
                        value={extensionForm.reason}
                        onChange={(e) => setExtensionForm(prev => ({ ...prev, reason: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows="3"
                        placeholder="Reason for extending premium..."
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={processingAction}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {processingAction ? 'Extending...' : 'Extend Premium'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Bulk Premium Management Modal Component
const BulkPremiumManagementModal = ({ 
  selectedStations, 
  stationsList, 
  onClose, 
  onBulkAction 
}) => {
  const [action, setAction] = useState('activate')
  const [subscriptionType, setSubscriptionType] = useState('monthly')
  const [days, setDays] = useState('')
  const [months, setMonths] = useState('')
  const [years, setYears] = useState('')
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (action === 'extend' && !days && !months && !years) {
      toast.error('Please specify at least one time period for extension')
      return
    }

    setProcessing(true)
    const result = await onBulkAction({
      action,
      subscriptionType: action === 'activate' ? subscriptionType : undefined,
      days: days ? parseInt(days) : undefined,
      months: months ? parseInt(months) : undefined,
      years: years ? parseInt(years) : undefined,
      reason
    })
    setProcessing(false)

    if (result.success) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-[9998]" onClick={onClose}></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full z-[10000]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Crown className="w-6 h-6 text-white mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-white">Bulk Premium Management</h3>
                  <p className="text-purple-100 text-sm">{selectedStations.length} stations selected</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-purple-100 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Selected Stations Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">Selected Stations ({stationsList.length})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {stationsList.map(station => (
                  <div key={station._id} className="text-sm text-gray-600">
                    • {station.name} ({station.vendor?.businessName})
                  </div>
                ))}
              </div>
            </div>

            {/* Action Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="activate">Activate Premium</option>
                <option value="deactivate">Deactivate Premium</option>
                <option value="extend">Extend Premium</option>
              </select>
            </div>

            {/* Conditional Fields */}
            {action === 'activate' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Type</label>
                <select
                  value={subscriptionType}
                  onChange={(e) => setSubscriptionType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}

            {action === 'extend' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Extension Period</label>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    min="0"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Days"
                  />
                  <input
                    type="number"
                    min="0"
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Months"
                  />
                  <input
                    type="number"
                    min="0"
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Years"
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows="3"
                placeholder={`Reason for ${action}ing premium...`}
                required
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : `${action.charAt(0).toUpperCase() + action.slice(1)} Premium`}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default AdminStations
