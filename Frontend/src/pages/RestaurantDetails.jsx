import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Star,
  Clock,
  MapPin,
  Phone,
  ChefHat,
  Utensils,
  BadgeCheck,
  Share2,
  Heart,
  Navigation,
  Loader,
  AlertCircle,
  Calendar,
  Users,
  Zap,
  Info,
  ImageIcon,
  Camera,
  QrCode,
  CalendarDays,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { restaurantsAPI } from '../services/api'
import SEOHead from '../components/SEOHead'
import RestaurantOrderModal from '../components/modals/RestaurantOrderModal'

function RestaurantDetails() {
  const { id: restaurantId } = useParams()
  const navigate = useNavigate()
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [showImageModal, setShowImageModal] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Check if user can go back (came from within the app)
  const canGoBack = () => {
    return window.history.length > 1 && document.referrer.includes(window.location.origin)
  }

  const handleGoBack = () => {
    if (canGoBack()) {
      navigate(-1)
    } else {
      navigate('/restaurants/search')
    }
  }

  // Fetch restaurant details
  const { data: restaurantData, isLoading, error } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => restaurantsAPI.getRestaurantById(restaurantId),
    enabled: !!restaurantId,
  })
  
  const restaurant = restaurantData?.data?.data

  // Fetch restaurant menu
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['restaurant-menu', restaurantId],
    queryFn: () => restaurantsAPI.getRestaurantMenu(restaurantId),
    enabled: !!restaurantId,
  })
  
  const menu = menuData?.data?.data || []

  // Helper functions
  const formatCuisine = (cuisine) => {
    return cuisine.charAt(0).toUpperCase() + cuisine.slice(1).replace('_', ' ')
  }

  const formatCategory = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
  }

  const formatOperatingHours = (hours) => {
    if (!hours) return 'Hours not available'
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const today = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] // Adjust for Sunday = 0
    
    const todayHours = hours[today]
    if (!todayHours || !todayHours.isOpen) {
      return 'Closed today'
    }
    
    return `Open today: ${todayHours.open} - ${todayHours.close}`
  }

  const isCurrentlyOpen = () => {
    if (!restaurant?.operatingHours) return false
    
    const now = new Date()
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = days[now.getDay()]
    const currentTime = now.toTimeString().slice(0, 5) // Format: HH:MM
    
    const daySchedule = restaurant.operatingHours[currentDay]
    if (!daySchedule || !daySchedule.isOpen) return false
    
    return currentTime >= daySchedule.open && currentTime <= daySchedule.close
  }

  const shareRestaurant = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurant.name,
          text: `Check out ${restaurant.name} - Order food while charging your EV!`,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const openDirections = () => {
    if (restaurant?.chargingStation?.location?.coordinates) {
      const [lng, lat] = restaurant.chargingStation.location.coordinates
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      window.open(url, '_blank')
    }
  }

  const getRestaurantImages = () => {
    if (!restaurant?.images || restaurant.images.length === 0) {
      return [{ url: '/api/placeholder/800/600', caption: restaurant?.name || 'Restaurant' }]
    }
    return restaurant.images
  }

  // Get unique categories from menu
  const getMenuCategories = () => {
    if (!menu || menu.length === 0) return []
    const categories = [...new Set(menu.map(item => item.category))]
    return ['all', ...categories]
  }

  // Filter menu by category
  const getFilteredMenu = () => {
    if (!menu) return []
    if (selectedCategory === 'all') return menu
    return menu.filter(item => item.category === selectedCategory)
  }

  // Group menu items by category
  const getGroupedMenu = () => {
    if (!menu) return {}
    const grouped = menu.reduce((acc, item) => {
      const category = item.category
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {})
    return grouped
  }

  // SEO and metadata
  const seoTitle = restaurant ? 
    `${restaurant.name} - Order Food While Charging | ChargEase` : 
    'Restaurant Details | ChargEase'
  
  const seoDescription = restaurant ? 
    `Order delicious food from ${restaurant.name} while charging your EV at ${restaurant.chargingStation?.name}. ${restaurant.cuisine?.join(', ')} cuisine. ${menu?.length || 0} menu items available.` :
    'Order food while charging your electric vehicle'

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading restaurant details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Restaurant not found</h2>
          <p className="text-gray-600 mb-4">
            The restaurant you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={handleGoBack}
            className="btn btn-primary btn-md"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-600">Restaurant not found</p>
        </div>
      </div>
    )
  }

  const images = getRestaurantImages()
  const menuCategories = getMenuCategories()
  const groupedMenu = getGroupedMenu()
  const currentlyOpen = isCurrentlyOpen()

  return (
    <>
      <SEOHead 
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={`/restaurants/${restaurantId}`}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Restaurant",
          "name": restaurant.name,
          "description": restaurant.description,
          "image": images[0]?.url,
          "address": restaurant.chargingStation?.address,
          "telephone": restaurant.contactInfo?.phoneNumber,
          "aggregateRating": restaurant.rating?.average ? {
            "@type": "AggregateRating",
            "ratingValue": restaurant.rating.average,
            "reviewCount": restaurant.rating.count
          } : undefined,
          "servesCuisine": restaurant.cuisine,
          "openingHours": restaurant.operatingHours ? Object.entries(restaurant.operatingHours).map(([day, hours]) => 
            hours.isOpen ? `${day.slice(0, 2).toUpperCase()} ${hours.open}-${hours.close}` : null
          ).filter(Boolean) : undefined
        }}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-gray-900">{restaurant.name}</h1>
                <p className="text-sm text-gray-500">Restaurant Details</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className={`p-2 rounded-lg transition-colors ${
                    isLiked ? 'bg-red-50 text-red-600' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={shareRestaurant}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-6 lg:py-8">
          {/* Pinterest-style Image Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 h-[300px] sm:h-[400px] lg:h-[500px]">
                
                {/* Main Featured Image */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative col-span-2 row-span-2 sm:col-span-2 sm:row-span-2 rounded-xl lg:rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer group"
                  onClick={() => {
                    setActiveImageIndex(0)
                    setShowImageModal(true)
                  }}
                >
                  <img
                    src={images[0]?.url}
                    alt={`${restaurant.name} - Main image`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      e.target.src = '/api/placeholder/800/600'
                    }}
                  />
                  
                  {/* Tinder-style gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-all duration-300" />
                  
                  {/* Restaurant details overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-8 text-white">
                    <div className="space-y-2 sm:space-y-3">
                      <h1 className="font-bold text-lg sm:text-2xl lg:text-3xl leading-tight drop-shadow-lg">
                        {restaurant.name}
                      </h1>
                      
                      <div className="flex items-start text-white/95">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm sm:text-base">
                          {restaurant.chargingStation?.address?.street}, {restaurant.chargingStation?.address?.city}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {restaurant.rating && restaurant.rating.average > 0 && (
                            <div className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                              <Star className="h-4 w-4 text-yellow-400 fill-current mr-1.5" />
                              <span className="font-bold text-sm">
                                {restaurant.rating.average.toFixed(1)}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                            <Utensils className="h-4 w-4 mr-1.5 text-green-400" />
                            <span className="font-bold text-sm">
                              {restaurant.cuisine?.slice(0, 2).map(c => formatCuisine(c)).join(', ')}
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowOrderModal(true)
                          }}
                          disabled={!restaurant.acceptingOrders || !currentlyOpen}
                          className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 text-white px-4 py-2 lg:px-6 lg:py-3 rounded-lg font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          {restaurant.acceptingOrders && currentlyOpen ? 'Order Now' : 'Closed'}
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs text-white/80">
                          <Clock className="h-4 w-4 mr-1.5" />
                          <span>
                            {currentlyOpen ? 'Open Now' : 'Currently Closed'}
                          </span>
                        </div>
                        
                        {restaurant.dockitRecommended && (
                          <div className="flex items-center bg-primary-600/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                            <BadgeCheck className="h-4 w-4 text-white mr-1.5" />
                            <span className="font-bold text-xs text-white">Dockit Choice</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {images.length > 1 && (
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
                      1 of {images.length}
                    </div>
                  )}
                </motion.div>

                {/* Small Images */}
                {images.slice(1, 5).map((image, index) => (
                  <motion.div
                    key={index + 1}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (index + 1) * 0.1 }}
                    className="relative rounded-lg lg:rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    onClick={() => {
                      setActiveImageIndex(index + 1)
                      setShowImageModal(true)
                    }}
                  >
                    <img
                      src={image?.url}
                      alt={`${restaurant.name} - Image ${index + 2}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = '/api/placeholder/400/300'
                      }}
                    />
                    
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                        <ImageIcon className="h-4 w-4 text-gray-700" />
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Show More Images Button */}
                {images.length > 4 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="relative rounded-lg lg:rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    onClick={() => {
                      setActiveImageIndex(4)
                      setShowImageModal(true)
                    }}
                  >
                    <img
                      src={images[4]?.url}
                      alt={`${restaurant.name} - More images`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = '/api/placeholder/400/300'
                      }}
                    />
                    
                    <div className="absolute inset-0 bg-black/60 group-hover:bg-black/70 transition-all duration-300 flex items-center justify-center">
                      <div className="text-white text-center">
                        <ImageIcon className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2" />
                        <p className="font-bold text-base lg:text-lg">+{images.length - 4}</p>
                        <p className="text-xs opacity-90">more photos</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Order Quick Access Card */}
                {images.length < 5 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group flex items-center justify-center border-2 border-dashed border-primary-300"
                    onClick={() => setShowOrderModal(true)}
                  >
                    <div className="text-center text-primary-700 group-hover:scale-110 transition-transform">
                      <QrCode className="h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2" />
                      <p className="text-xs font-bold">Quick Order</p>
                      <p className="text-xs opacity-75">Menu & Book</p>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="h-[320px] sm:h-[420px] lg:h-[500px] bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-lg">
                <div className="text-center text-gray-500">
                  <Camera className="h-12 w-12 lg:h-16 lg:w-16 mx-auto mb-3 opacity-50" />
                  <p className="text-lg lg:text-xl font-medium">No images available</p>
                  <p className="text-sm opacity-75">Photos will be added soon</p>
                </div>
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Restaurant Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{restaurant.name}</h2>
                    <p className="text-gray-600 mb-3">{restaurant.description}</p>
                  </div>

                  {/* Rating */}
                  {restaurant.rating && restaurant.rating.average > 0 && (
                    <div className="text-center">
                      <div className="flex items-center mb-1">
                        <Star className="h-5 w-5 text-yellow-400 fill-current" />
                        <span className="ml-1 text-lg font-bold text-gray-900">
                          {restaurant.rating.average.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {restaurant.rating.count} reviews
                      </p>
                    </div>
                  )}
                </div>

                {/* Restaurant Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{formatOperatingHours(restaurant.operatingHours)}</p>
                        <p className="text-sm text-gray-500">Operating Hours</p>
                      </div>
                    </div>

                    {restaurant.contactInfo?.phoneNumber && (
                      <div className="flex items-center">
                        <Phone className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">{restaurant.contactInfo.phoneNumber}</p>
                          <p className="text-sm text-gray-500">Contact Number</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center">
                      <ChefHat className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">~{restaurant.averagePreparationTime || 30} minutes</p>
                        <p className="text-sm text-gray-500">Average Preparation Time</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{restaurant.chargingStation?.name}</p>
                        <p className="text-sm text-gray-500">
                          {restaurant.chargingStation?.address?.street}, {restaurant.chargingStation?.address?.city}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Utensils className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{menu?.length || 0} items</p>
                        <p className="text-sm text-gray-500">Menu Items Available</p>
                      </div>
                    </div>

                    {restaurant.minimumOrderAmount > 0 && (
                      <div className="flex items-center">
                        <Users className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Rs. {restaurant.minimumOrderAmount}</p>
                          <p className="text-sm text-gray-500">Minimum Order Amount</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={openDirections}
                    className="flex-1 btn btn-outline btn-lg flex items-center justify-center"
                  >
                    <Navigation className="h-5 w-5 mr-2" />
                    Get Directions
                  </button>
                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="flex-1 btn btn-primary btn-lg"
                    disabled={!restaurant.acceptingOrders || !currentlyOpen}
                  >
                    {restaurant.acceptingOrders && currentlyOpen 
                      ? 'Order Now' 
                      : 'Currently Closed'
                    }
                  </button>
                </div>
              </div>

              {/* Menu Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Menu</h3>
                  
                  {/* Category Filter */}
                  <div className="flex space-x-2 overflow-x-auto">
                    {menuCategories.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                          selectedCategory === category
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category === 'all' ? 'All Items' : formatCategory(category)}
                      </button>
                    ))}
                  </div>
                </div>

                {menuLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="h-6 w-6 animate-spin text-primary-600" />
                    <span className="ml-2 text-gray-600">Loading menu...</span>
                  </div>
                ) : menu && menu.length > 0 ? (
                  <div className="space-y-6">
                    {selectedCategory === 'all' ? (
                      // Show grouped by category
                      Object.entries(groupedMenu).map(([category, items]) => (
                        <div key={category}>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3 capitalize">
                            {formatCategory(category)}
                          </h4>
                          <div className="grid gap-4">
                            {items.map(item => (
                              <MenuItemCard key={item._id} item={item} />
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      // Show filtered items
                      <div className="grid gap-4">
                        {getFilteredMenu().map(item => (
                          <MenuItemCard key={item._id} item={item} />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Utensils className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No menu items available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Charging Station Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-primary-600" />
                  Charging Station
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">{restaurant.chargingStation?.name}</p>
                    <p className="text-sm text-gray-500">
                      {restaurant.chargingStation?.address?.street}, {restaurant.chargingStation?.address?.city}
                    </p>
                  </div>
                  
                  {restaurant.chargingStation?.chargingPorts && (
                    <div>
                      <p className="text-sm text-gray-500">
                        {restaurant.chargingStation.chargingPorts.length} charging ports available
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={openDirections}
                    className="w-full btn btn-outline btn-sm"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Get Directions
                  </button>
                </div>
              </div>

              {/* Quick Info */}
              <div className="bg-primary-50 rounded-xl border border-primary-200 p-6">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-primary-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-primary-900 mb-2">
                      Order While Charging
                    </h4>
                    <p className="text-sm text-primary-700">
                      Enjoy delicious food while your EV charges. Perfect for longer charging sessions!
                    </p>
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h3>
                
                <div className="space-y-2">
                  {restaurant.operatingHours && Object.entries(restaurant.operatingHours).map(([day, hours]) => {
                    const isToday = day === ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]
                    
                    return (
                      <div key={day} className={`flex justify-between ${isToday ? 'font-medium text-primary-600' : 'text-gray-600'}`}>
                        <span className="capitalize">{day}</span>
                        <span>
                          {hours.isOpen ? `${hours.open} - ${hours.close}` : 'Closed'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant Order Modal */}
      <RestaurantOrderModal
        restaurant={restaurant}
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
      />

      {/* Image Modal */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowImageModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm transition-all"
              >
                <X className="h-6 w-6" />
              </button>
              
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm transition-all"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              
              <img
                src={images[activeImageIndex]?.url}
                alt={`${restaurant.name} - Image ${activeImageIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                  <span className="text-white text-sm font-medium">
                    {activeImageIndex + 1} / {images.length}
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Menu Item Card Component
function MenuItemCard({ item }) {
  const formatPrice = (price) => {
    return `Rs. ${price}`
  }

  const getItemImage = () => {
    if (!item.images || item.images.length === 0) {
      return '/api/placeholder/100/100'
    }
    return item.images[0].url
  }

  return (
    <div className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <img
        src={getItemImage()}
        alt={item.name}
        className="w-16 h-16 rounded-lg object-cover"
      />
      
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <h5 className="font-medium text-gray-900">{item.name}</h5>
          <span className="font-semibold text-primary-600">{formatPrice(item.price)}</span>
        </div>
        
        {item.description && (
          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
        )}
        
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-500 capitalize">{item.category?.replace('_', ' ')}</span>
          {item.preparationTime && (
            <span className="text-xs text-gray-500">~{item.preparationTime} min</span>
          )}
          {item.isVegetarian && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Veg</span>
          )}
          {item.isVegan && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Vegan</span>
          )}
          {item.isSpicy && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Spicy</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default RestaurantDetails
