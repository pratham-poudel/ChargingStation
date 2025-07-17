import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
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
  Info
} from 'lucide-react'
import { restaurantsAPI } from '../services/api'
import SEOHead from '../components/SEOHead'
import RestaurantOrderModal from '../components/modals/RestaurantOrderModal'
import ImageGallery from '../components/common/ImageGallery'

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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Image Gallery */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <ImageGallery
                  images={images}
                  activeIndex={activeImageIndex}
                  onImageClick={(index) => {
                    setActiveImageIndex(index)
                    setShowImageModal(true)
                  }}
                  className="h-64 md:h-80"
                />
                
                {/* Badges on image */}
                <div className="absolute top-4 left-4 flex flex-col space-y-2">
                  {restaurant.dockitRecommended && (
                    <span className="px-3 py-1 bg-primary-600 text-white text-sm font-medium rounded-full flex items-center">
                      <BadgeCheck className="h-4 w-4 mr-1" />
                      Dockit Choice
                    </span>
                  )}
                  {currentlyOpen && (
                    <span className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-full">
                      Open Now
                    </span>
                  )}
                </div>
              </div>

              {/* Restaurant Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{restaurant.name}</h2>
                    <p className="text-gray-600 mb-3">{restaurant.description}</p>
                    
                    {/* Cuisine Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {restaurant.cuisine?.map((cuisine) => (
                        <span key={cuisine} className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full">
                          {formatCuisine(cuisine)}
                        </span>
                      ))}
                    </div>
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
