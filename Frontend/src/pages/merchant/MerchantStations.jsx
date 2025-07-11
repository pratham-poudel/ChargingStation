import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Search, 
  Filter,
  Zap,
  Activity,
  Clock,
  DollarSign
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useMerchant } from '../../context/MerchantContext'
import MerchantLayout from '../../components/layout/MerchantLayout'
import { merchantAPI } from '../../services/merchantAPI'
import toast from 'react-hot-toast'
import AddStationModal from './components/AddStationModal'
import EditStationModal from './components/EditStationModal'
import StationCard from './components/StationCard'
import StationAnalyticsModal from './components/StationAnalyticsModal'

const MerchantStations = () => {
  const { merchant, dashboardStats, getDashboardStats } = useMerchant()
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStation, setSelectedStation] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  })

  // Load stations
  const loadStations = async (page = 1) => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: 10,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined
      }

      const response = await merchantAPI.getStations(params)
      if (response.success) {
        setStations(response.data.stations)
        setPagination({
          current: response.data.currentPage,
          pages: response.data.totalPages,
          total: response.data.total
        })
      }
    } catch (error) {
      console.error('Failed to load stations:', error)
      toast.error('Failed to load stations')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    loadStations()
  }, [searchTerm, statusFilter])

  // Load dashboard stats if not available (for page refresh scenarios)
  useEffect(() => {
    if (!dashboardStats && merchant) {
      console.log('Dashboard stats not available, loading...')
      getDashboardStats()
    }
  }, [dashboardStats, merchant, getDashboardStats])

  const handleStationCreated = (newStation) => {
    setStations(prev => [newStation, ...prev])
    toast.success('Station created successfully!')
    setShowAddModal(false)
  }
  const handleStationUpdated = (updatedStation) => {
    console.log('handleStationUpdated called with:', updatedStation);
    
    if (!updatedStation || !updatedStation._id) {
      console.error('Updated station is missing or has no _id:', updatedStation);
      toast.error('Error updating station: Invalid station data');
      return;
    }
    
    setStations(prev => {
      const updated = prev.map(station => 
        station && station._id === updatedStation._id ? updatedStation : station
      ).filter(Boolean); // Remove any undefined stations
      console.log('Updated stations array:', updated);
      return updated;
    });
    
    toast.success('Station updated successfully!');
    setShowEditModal(false);
    setSelectedStation(null);
  }

  const handleDeleteStation = async (stationId) => {
    if (!window.confirm('Are you sure you want to delete this station?')) return

    try {
      const response = await merchantAPI.deleteStation(stationId)
      if (response.success) {
        setStations(prev => prev.filter(station => station._id !== stationId))
        toast.success('Station deleted successfully!')
      }
    } catch (error) {
      console.error('Failed to delete station:', error)
      toast.error('Failed to delete station')
    }
  }

  const toggleStationStatus = async (stationId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      const response = await merchantAPI.updateStationStatus(stationId, newStatus)
      if (response.success) {
        setStations(prev => prev.map(station => 
          station._id === stationId 
            ? { ...station, isActive: newStatus === 'active' }
            : station
        ))
        toast.success(`Station ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`)
      }
    } catch (error) {
      console.error('Failed to update station status:', error)
      toast.error('Failed to update station status')
    }
  }
  return (
    <MerchantLayout>
      <Helmet>
        <title>My Stations - Merchant Dashboard</title>
      </Helmet>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Charging Stations</h1>
                <p className="text-gray-600 mt-1">Manage and monitor your charging stations network</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-sm font-medium"
              >
                <Plus size={20} />
                Add New Station
              </button>
            </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Stations</p>
                <p className="text-2xl font-bold text-gray-900">{stations.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Stations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stations.filter(s => s.isActive).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Verification</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stations.filter(s => !s.isVerified && s.isActive).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{(dashboardStats?.stats?.monthlyRevenue || 0).toLocaleString()}
                </p>                {/* Debug info - remove in production */}
                {import.meta.env.DEV && (
                  <p className="text-xs text-gray-400">
                    Stats loaded: {dashboardStats ? 'Yes' : 'No'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search stations by name, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
              <Filter size={16} />
              More Filters
            </button>
          </div>
        </div>

        {/* Stations Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : stations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border">
            <Zap className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No charging stations found</h3>
            <p className="mt-2 text-gray-500">Get started by adding your first charging station to the network.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Add Your First Station
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stations.map((station) => (
              <StationCard
                key={station._id}
                station={station}
                onEdit={(station) => {
                  setSelectedStation(station)
                  setShowEditModal(true)
                }}
                onDelete={handleDeleteStation}
                onToggleStatus={toggleStationStatus}
                onViewAnalytics={(station) => {
                  setSelectedStation(station)
                  setShowAnalyticsModal(true)
                }}
              />
            ))}
          </div>
        )}        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex gap-2">
              {[...Array(pagination.pages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => loadStations(i + 1)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    pagination.current === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>        {showAddModal && (
          <AddStationModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onStationCreated={handleStationCreated}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>        {showEditModal && selectedStation && (
          <EditStationModal
            station={selectedStation}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false)
              setSelectedStation(null)
            }}
            onUpdate={handleStationUpdated}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>        {showAnalyticsModal && selectedStation && (
          <StationAnalyticsModal
            station={selectedStation}
            isOpen={showAnalyticsModal}
            onClose={() => {
              setShowAnalyticsModal(false)
              setSelectedStation(null)
            }}
          />
        )}
      </AnimatePresence>
    </MerchantLayout>
  )
}

export default MerchantStations
