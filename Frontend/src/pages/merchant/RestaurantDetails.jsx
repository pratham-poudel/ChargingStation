import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft,
  ChefHat,
  MapPin,
  Clock,
  Star,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Camera,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Settings,
  BarChart3
} from 'lucide-react'
import { useMerchant } from '../../context/MerchantContext'
import MerchantLayout from '../../components/layout/MerchantLayout'
import LoadingSpinner, { ContentLoader } from '../../components/ui/LoadingSpinner'
import { restaurantAPI } from '../../services/restaurantAPI'

const RestaurantDetails = () => {
  const { id } = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState(null)
  const [updatingAvailability, setUpdatingAvailability] = useState({})
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    cuisine: '',
    phoneNumber: '',
    operatingHours: {},
    imageFile: null
  })

  // Menu item form state
  const [menuFormData, setMenuFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageFile: null,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    ingredients: '',
    allergens: ''
  })

  const { merchant } = useMerchant()

  useEffect(() => {
    loadRestaurant()
  }, [id])

  const loadRestaurant = async () => {
    try {
      setLoading(true)
      const response = await restaurantAPI.getRestaurant(id)
      if (response.success) {
        setRestaurant(response.data)
        setEditFormData({
          name: response.data.name,
          description: response.data.description,
          cuisine: response.data.cuisine,
          phoneNumber: response.data.phoneNumber || '',
          operatingHours: response.data.operatingHours,
          imageFile: null
        })
      }
    } catch (error) {
      console.error('Error loading restaurant:', error)
      setError('Failed to load restaurant details')
    } finally {
      setLoading(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await restaurantAPI.updateRestaurant(id, editFormData)
      if (response.success) {
        setRestaurant(response.data)
        setIsEditModalOpen(false)
        setError('')
      }
    } catch (error) {
      console.error('Error updating restaurant:', error)
      setError(error.response?.data?.message || 'Failed to update restaurant')
    }
  }

  const handleMenuSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingMenuItem) {
        // Update existing menu item
        const response = await restaurantAPI.updateMenuItem(id, editingMenuItem._id, menuFormData)
        if (response.success) {
          await loadRestaurant() // Reload to get updated menu
          resetMenuForm()
        }
      } else {
        // Add new menu item
        const response = await restaurantAPI.addMenuItem(id, menuFormData)
        if (response.success) {
          await loadRestaurant() // Reload to get updated menu
          resetMenuForm()
        }
      }
    } catch (error) {
      console.error('Error saving menu item:', error)
      setError(error.response?.data?.message || 'Failed to save menu item')
    }
  }

  const handleDeleteMenuItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return
    
    try {
      const response = await restaurantAPI.deleteMenuItem(id, itemId)
      if (response.success) {
        await loadRestaurant()
      }
    } catch (error) {
      console.error('Error deleting menu item:', error)
      setError('Failed to delete menu item')
    }
  }

  const handleToggleAvailability = async (itemId, currentAvailability) => {
    try {
      setUpdatingAvailability(prev => ({ ...prev, [itemId]: true }))
      const response = await restaurantAPI.toggleMenuItemAvailability(id, itemId, !currentAvailability)
      if (response.success) {
        await loadRestaurant()
      }
    } catch (error) {
      console.error('Error toggling availability:', error)
      setError('Failed to update item availability')
    } finally {
      setUpdatingAvailability(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const resetMenuForm = () => {
    setMenuFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      imageFile: null,
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      ingredients: '',
      allergens: ''
    })
    setEditingMenuItem(null)
    setIsMenuModalOpen(false)
    setError('')
  }

  const openEditMenuItem = (item) => {
    setEditingMenuItem(item)
    setMenuFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      imageFile: null,
      isVegetarian: item.isVegetarian || false,
      isVegan: item.isVegan || false,
      isGlutenFree: item.isGlutenFree || false,
      ingredients: item.ingredients || '',
      allergens: item.allergens || ''
    })
    setIsMenuModalOpen(true)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200'
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'under_review': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
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

  if (!restaurant) {
    return (
      <MerchantLayout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Restaurant Not Found</h2>
          <p className="text-gray-600 mb-4">The restaurant you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/merchant/restaurants"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Restaurants
          </Link>
        </div>
      </MerchantLayout>
    )
  }

  return (
    <>
      <Helmet>
        <title>{restaurant?.name || 'Restaurant'} - Restaurant Management - DockIt</title>
        <meta name="description" content={`Manage ${restaurant?.name || 'restaurant'} details, menu, and operations`} />
      </Helmet>

      <MerchantLayout>
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link
              to="/merchant/restaurants"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
              <p className="text-gray-600">{restaurant.chargingStation?.name}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(restaurant.verificationStatus)}`}>
              {restaurant.verificationStatus === 'approved' && <CheckCircle2 className="w-4 h-4" />}
              {restaurant.verificationStatus !== 'approved' && <AlertCircle className="w-4 h-4" />}
              {restaurant.verificationStatus?.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Restaurant Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="relative h-64">
              {restaurant.images?.length > 0 ? (
                <img
                  src={restaurant.images[0].url || restaurant.images[0]}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <ChefHat className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg hover:bg-opacity-100 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Cuisine</h3>
                  <p className="text-gray-600">{restaurant.cuisine}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
                  <p className="text-gray-600">{restaurant.phoneNumber || 'Not provided'}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    restaurant.isActive ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${restaurant.isActive ? 'bg-green-600' : 'bg-gray-400'}`}></div>
                    {restaurant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Rating</h3>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{restaurant.rating?.average?.toFixed(1) || '0.0'}</span>
                    <span className="text-gray-500 text-sm">({restaurant.rating?.count || 0})</span>
                  </div>
                </div>
              </div>

              {restaurant.description && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{restaurant.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Menu Items</p>
                  <p className="text-xl font-semibold text-gray-900">{restaurant.menu?.length || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-xl font-semibold text-gray-900">{restaurant.stats?.totalOrders || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Staff</p>
                  <p className="text-xl font-semibold text-gray-900">{restaurant.stats?.employeeCount || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Daily Revenue</p>
                  <p className="text-xl font-semibold text-gray-900">${restaurant.stats?.dailyRevenue || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Management */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Menu Management</h2>
                  <p className="text-gray-600">Add and manage your restaurant menu items</p>
                </div>
                <button
                  onClick={() => {
                    resetMenuForm()
                    setIsMenuModalOpen(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
            </div>

            <div className="p-6">
              {restaurant.menu?.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {restaurant.menu.map((item) => (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div className="relative h-32 bg-gray-100">
                        {item.images?.length > 0 ? (
                          <img
                            src={item.images[0].url || item.images[0]}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ChefHat className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <span className="text-lg font-semibold text-blue-600">${item.price}</span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between text-xs">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {item.category}
                          </span>
                          <div className="flex items-center gap-1">
                            {item.isVegetarian && <span className="text-green-600">🥬</span>}
                            {item.isVegan && <span className="text-green-600">🌱</span>}
                            {item.isGlutenFree && <span className="text-orange-600">GF</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => handleToggleAvailability(item._id, item.isAvailable)}
                            disabled={updatingAvailability[item._id]}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                              item.isAvailable
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {updatingAvailability[item._id] ? (
                              <LoadingSpinner size="sm" />
                            ) : item.isAvailable ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                            {item.isAvailable ? 'Available' : 'Unavailable'}
                          </button>

                          <button
                            onClick={() => openEditMenuItem(item)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteMenuItem(item._id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Menu Items</h3>
                  <p className="text-gray-600 mb-6">Start adding delicious items to your restaurant menu.</p>
                  <button
                    onClick={() => {
                      resetMenuForm()
                      setIsMenuModalOpen(true)
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    Add First Menu Item
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                to={`/restaurant-management/${restaurant._id}`}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Restaurant Portal</h3>
                  <p className="text-sm text-gray-600">Access employee management system</p>
                </div>
              </Link>

              <Link
                to={`/merchant/analytics?restaurant=${restaurant._id}`}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-green-50 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Analytics</h3>
                  <p className="text-sm text-gray-600">View detailed performance reports</p>
                </div>
              </Link>

              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Location</h3>
                  <p className="text-sm text-gray-600">{restaurant.chargingStation?.address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Restaurant Modal */}
        <AnimatePresence>
          {isEditModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setIsEditModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden"
              >
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Restaurant</h2>
                </div>

                <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Restaurant Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cuisine Type *
                      </label>
                      <input
                        type="text"
                        name="cuisine"
                        value={editFormData.cuisine}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, cuisine: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={editFormData.phoneNumber}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={editFormData.description}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Update Restaurant Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditFormData(prev => ({ ...prev, imageFile: e.target.files[0] }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu Item Modal */}
        <AnimatePresence>
          {isMenuModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setIsMenuModalOpen(false)}
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
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}
                    </h2>
                    <button
                      onClick={() => setIsMenuModalOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleMenuSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Item Name *
                        </label>
                        <input
                          type="text"
                          value={menuFormData.name}
                          onChange={(e) => setMenuFormData(prev => ({ ...prev, name: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter item name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Price *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={menuFormData.price}
                          onChange={(e) => setMenuFormData(prev => ({ ...prev, price: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <input
                        type="text"
                        value={menuFormData.category}
                        onChange={(e) => setMenuFormData(prev => ({ ...prev, category: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Appetizers, Main Course, Desserts"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={menuFormData.description}
                        onChange={(e) => setMenuFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe the item, ingredients, and preparation"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setMenuFormData(prev => ({ ...prev, imageFile: e.target.files[0] }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Dietary Information
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={menuFormData.isVegetarian}
                            onChange={(e) => setMenuFormData(prev => ({ ...prev, isVegetarian: e.target.checked }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Vegetarian</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={menuFormData.isVegan}
                            onChange={(e) => setMenuFormData(prev => ({ ...prev, isVegan: e.target.checked }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Vegan</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={menuFormData.isGlutenFree}
                            onChange={(e) => setMenuFormData(prev => ({ ...prev, isGlutenFree: e.target.checked }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Gluten Free</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ingredients
                        </label>
                        <textarea
                          value={menuFormData.ingredients}
                          onChange={(e) => setMenuFormData(prev => ({ ...prev, ingredients: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="List main ingredients"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Allergens
                        </label>
                        <textarea
                          value={menuFormData.allergens}
                          onChange={(e) => setMenuFormData(prev => ({ ...prev, allergens: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="List potential allergens"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setIsMenuModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingMenuItem ? 'Update Item' : 'Add Item'}
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

export default RestaurantDetails
