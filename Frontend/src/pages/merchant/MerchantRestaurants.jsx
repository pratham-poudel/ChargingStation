import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus,
  ChefHat,
  MapPin,
  Clock,
  Users,
  Star,
  Edit,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  DollarSign,
  TrendingUp,
  Package,
  Settings,
  Camera,
  Upload,
  X,
  Zap
} from 'lucide-react'
import { useMerchant } from '../../context/MerchantContext'
import MerchantLayout from '../../components/layout/MerchantLayout'
import LoadingSpinner, { ContentLoader } from '../../components/ui/LoadingSpinner'
import { restaurantAPI } from '../../services/restaurantAPI'
import { merchantAPI } from '../../services/merchantAPI'

const MerchantRestaurants = () => {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedStation, setSelectedStation] = useState('')
  const [stations, setStations] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ image: 0, license: 0 })
  const { merchant } = useMerchant()

  // Cuisine options matching the database enum
  const cuisineOptions = [
    { value: 'indian', label: 'Indian' },
    { value: 'chinese', label: 'Chinese' },
    { value: 'continental', label: 'Continental' },
    { value: 'italian', label: 'Italian' },
    { value: 'mexican', label: 'Mexican' },
    { value: 'thai', label: 'Thai' },
    { value: 'japanese', label: 'Japanese' },
    { value: 'american', label: 'American' },
    { value: 'mediterranean', label: 'Mediterranean' },
    { value: 'local', label: 'Local' }
  ]

  // Create restaurant form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine: '',
    phoneNumber: '',
    operatingHours: {
      monday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
      tuesday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
      wednesday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
      thursday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
      friday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
      saturday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
      sunday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false }
    },
    imageFile: null,
    licenseNumber: '',
    licenseFile: null
  })

  // Load data
  useEffect(() => {
    loadRestaurants()
    loadStations()
  }, [])

  const loadRestaurants = async () => {
    try {
      setLoading(true)
      const response = await restaurantAPI.getVendorRestaurants()
      if (response.success) {
        setRestaurants(response.data)
      }
    } catch (error) {
      console.error('Error loading restaurants:', error)
      setError('Failed to load restaurants')
    } finally {
      setLoading(false)
    }
  }

  const loadStations = async () => {
    try {
      const response = await merchantAPI.getStations()
      if (response.success) {
        // Extract stations array from nested response structure
        const stationsArray = response.data?.stations || []
        // Filter for verified and active stations without restaurants
        const availableStations = stationsArray.filter(station => 
          station.isVerified && station.isActive && !station.hasRestaurant
        )
        setStations(availableStations)
      }
    } catch (error) {
      console.error('Error loading stations:', error)
      setStations([])
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleTimeChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value
        }
      }
    }))
  }

  const handleDayToggle = (day, toggleType) => {
    setFormData(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [toggleType]: !prev.operatingHours[day][toggleType],
          // If setting to closed, turn off 24 hours
          ...(toggleType === 'isClosed' && !prev.operatingHours[day].isClosed && { is24Hours: false }),
          // If setting to 24 hours, turn off closed
          ...(toggleType === 'is24Hours' && !prev.operatingHours[day].is24Hours && { isClosed: false })
        }
      }
    }))
  }

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        [fileType]: file
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStation) {
      setError('Please select a charging station')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setUploadProgress({ image: 0, license: 0 })

      // Track upload progress for the files
      const handleImageProgress = (progress) => {
        setUploadProgress(prev => ({ ...prev, image: progress.percentage }))
      }

      const handleLicenseProgress = (progress) => {
        setUploadProgress(prev => ({ ...prev, license: progress.percentage }))
      }

      // Pass progress handlers to the restaurant creation
      const response = await restaurantAPI.createRestaurant({
        ...formData,
        chargingStation: selectedStation,
        imageProgressCallback: handleImageProgress,
        licenseProgressCallback: handleLicenseProgress
      })

      if (response.success) {
        setIsCreateModalOpen(false)
        resetForm()
        await loadRestaurants()
        await loadStations()
      }
    } catch (error) {
      console.error('Error creating restaurant:', error)
      setError(error.response?.data?.message || error.message || 'Failed to create restaurant')
    } finally {
      setIsSubmitting(false)
      setUploadProgress({ image: 0, license: 0 })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      cuisine: '',
      phoneNumber: '',
      operatingHours: {
        monday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
        tuesday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
        wednesday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
        thursday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
        friday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
        saturday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false },
        sunday: { open: '09:00', close: '22:00', isClosed: false, is24Hours: false }
      },
      imageFile: null,
      licenseNumber: '',
      licenseFile: null
    })
    setSelectedStation('')
    setError('')
    setUploadProgress({ image: 0, license: 0 })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'under_review': return 'text-blue-600 bg-blue-50'
      case 'rejected': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'under_review': return <Eye className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <MerchantLayout>
        <div className="p-6">
          <ContentLoader />
        </div>
      </MerchantLayout>
    )
  }

  return (
    <>
      <Helmet>
        <title>My Restaurants - DockIt Merchant Portal</title>
        <meta name="description" content="Manage your restaurant locations at EV charging stations" />
      </Helmet>

      <MerchantLayout>
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Restaurants</h1>
              <p className="text-gray-600 mt-1">
                Manage your restaurant locations at EV charging stations
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreateModalOpen(true)}
              disabled={stations.length === 0}
              className={`mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                stations.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              Add Restaurant
            </motion.button>
          </div>

          {/* No available stations message */}
          {stations.length === 0 && restaurants.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center"
            >
              <ChefHat className="w-12 h-12 text-amber-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                No Available Stations
              </h3>
              <p className="text-amber-700 mb-4">
                You need verified and active charging stations to create restaurants. 
                Please add and verify your charging stations first.
              </p>
              <Link
                to="/merchant/stations"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Manage Stations
              </Link>
            </motion.div>
          )}

          {/* Restaurant Cards */}
          {restaurants.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants.map((restaurant, index) => (
                <motion.div
                  key={restaurant._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Restaurant Image */}
                  <div className="relative h-48 bg-gray-100">
                    {restaurant.images?.length > 0 ? (
                      <img
                        src={restaurant.images[0].url || restaurant.images[0]}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(restaurant.verificationStatus)}`}>
                      {getStatusIcon(restaurant.verificationStatus)}
                      {restaurant.verificationStatus?.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>

                  {/* Restaurant Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{restaurant.name}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {restaurant.description}
                    </p>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{restaurant.chargingStation?.name}</span>
                    </div>

                    {/* Cuisine & Status */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {restaurant.cuisine?.length > 0 
                          ? cuisineOptions.find(c => c.value === restaurant.cuisine[0])?.label || restaurant.cuisine[0]
                          : 'Not specified'
                        }
                      </span>
                      {restaurant.isActive ? (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                          Active
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {restaurant.stats?.totalOrders || 0}
                        </div>
                        <div className="text-xs text-gray-500">Orders</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {restaurant.menu?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">Menu Items</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {restaurant.rating?.average?.toFixed(1) || '0.0'}
                        </div>
                        <div className="text-xs text-gray-500">Rating</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        to={`/merchant/restaurants/${restaurant._id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Manage
                      </Link>
                      <Link
                        to={`/restaurant-management/${restaurant._id}`}
                        className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : stations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Restaurants Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first restaurant to start serving delicious food to EV charging customers.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus className="w-5 h-5" />
                Create Restaurant
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Create Restaurant Modal */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setIsCreateModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden"
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Create New Restaurant</h2>
                    <button
                      onClick={() => setIsCreateModalOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Restaurant Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter restaurant name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Charging Station *
                          </label>
                          <select
                            value={selectedStation}
                            onChange={(e) => setSelectedStation(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select a station</option>
                            {stations.map((station) => (
                              <option key={station._id} value={station._id}>
                                {station.name} - {station.address?.city || station.address?.street || 'Address not available'}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cuisine Type *
                          </label>
                          <select
                            name="cuisine"
                            value={formData.cuisine}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select cuisine type</option>
                            {cuisineOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Restaurant contact number"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Describe your restaurant, specialties, and atmosphere"
                        />
                      </div>
                    </div>

                    {/* Operating Hours */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Operating Hours</h3>
                      <div className="space-y-3">
                        {Object.entries(formData.operatingHours).map(([day, hours]) => (
                          <div key={day} className="flex items-center gap-4 flex-wrap">
                            <div className="w-20">
                              <span className="text-sm font-medium text-gray-700 capitalize">
                                {day}
                              </span>
                            </div>
                            
                            {/* Closed Toggle */}
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={hours.isClosed}
                                onChange={() => handleDayToggle(day, 'isClosed')}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-600">Closed</span>
                            </label>
                            
                            {/* 24 Hours Toggle */}
                            {!hours.isClosed && (
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={hours.is24Hours}
                                  onChange={() => handleDayToggle(day, 'is24Hours')}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-600">24 Hours</span>
                              </label>
                            )}
                            
                            {/* Time Inputs */}
                            {!hours.isClosed && !hours.is24Hours && (
                              <>
                                <input
                                  type="time"
                                  value={hours.open}
                                  onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                  type="time"
                                  value={hours.close}
                                  onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded"
                                />
                              </>
                            )}
                            
                            {/* 24 Hours Display */}
                            {hours.is24Hours && (
                              <span className="text-sm text-green-600 font-medium">Open 24 Hours</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Documents & Images</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Restaurant Image
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'imageFile')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          {formData.imageFile && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-600">
                                {formData.imageFile.name} ({Math.round(formData.imageFile.size / 1024)} KB)
                              </div>
                              {isSubmitting && uploadProgress.image > 0 && (
                                <div className="mt-1">
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>Uploading image...</span>
                                    <span>{Math.round(uploadProgress.image)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                      style={{ width: `${uploadProgress.image}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            License Number
                          </label>
                          <input
                            type="text"
                            name="licenseNumber"
                            value={formData.licenseNumber}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Food service license number"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            License Document
                          </label>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange(e, 'licenseFile')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Upload food service license or permit (PDF, Word, Excel, Images, Archives, etc.)
                          </p>
                          {formData.licenseFile && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-600">
                                {formData.licenseFile.name} ({Math.round(formData.licenseFile.size / 1024)} KB)
                              </div>
                              {isSubmitting && uploadProgress.license > 0 && (
                                <div className="mt-1">
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>Uploading license...</span>
                                    <span>{Math.round(uploadProgress.license)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div 
                                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                      style={{ width: `${uploadProgress.license}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <LoadingSpinner size="sm" />
                          Creating...
                        </div>
                      ) : (
                        'Create Restaurant'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </MerchantLayout>
    </>
  )
}

export default MerchantRestaurants
