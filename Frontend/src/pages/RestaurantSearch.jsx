import React, { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { 
  Search, 
  Filter, 
  ChevronDown, 
  MapPin, 
  Star, 
  Clock, 
  Loader, 
  X,
  List,
  Map,
  ChefHat,
  Utensils,
  BadgeCheck,
  Phone,
  Navigation,
  Heart,
  Share2
} from 'lucide-react'
import { restaurantsAPI, stationsAPI } from '../services/api'
import SEOHead from '../components/SEOHead'
import LocationSelector from '../components/LocationSelector'
import DistanceSlider from '../components/DistanceSlider'
import RestaurantMap from '../components/maps/RestaurantMap'
import RestaurantOrderModal from '../components/modals/RestaurantOrderModal'
import { useAuth } from '../context/AuthContext'

// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function RestaurantSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth() // Get current user data
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'map'
  const [orderModal, setOrderModal] = useState({ isOpen: false, restaurant: null })
  
  // Search and filter states
  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    cuisine: searchParams.get('cuisine') || '',
    category: searchParams.get('category') || '',
    minRating: searchParams.get('minRating') || '',
    maxDistance: searchParams.get('maxDistance') || '20',
    sortBy: searchParams.get('sortBy') || 'recommended',
  })

  const [searchQuery, setSearchQuery] = useState('')
  // Debounce the search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500) // 500ms delay
  
  // Debounce filters as well to avoid excessive API calls when multiple filters change quickly
  const debouncedFilters = useDebounce(filters, 300) // 300ms delay for filters
  
  // Check if search is pending (user is typing but debounce hasn't fired yet)
  const isSearchPending = searchQuery !== debouncedSearchQuery

  // Get user location
  const [userLocation, setUserLocation] = useState(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting user location:', error)
        }
      )
    }
  }, [])

  // Fetch enum values from backend
  const { data: enumsData } = useQuery({
    queryKey: ['restaurant-enums'],
    queryFn: () => restaurantsAPI.getEnums(),
    staleTime: 5 * 60 * 1000,
  })

  const enums = enumsData?.data?.data || {}
  
  // Use backend enums or fallback to static values
  const cuisines = enums.cuisines || [
    'indian', 'chinese', 'continental', 'italian', 'mexican', 
    'thai', 'japanese', 'american', 'mediterranean', 'local'
  ]
  
  const categories = enums.categories || [
    'appetizer', 'main_course', 'dessert', 'beverage', 'snack', 'breakfast', 'lunch', 'dinner'
  ]

  // Fetch restaurants
  const { data: restaurantsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['restaurants', debouncedFilters, userLocation, debouncedSearchQuery],
    queryFn: () => {
      const params = {
        ...debouncedFilters,
        query: debouncedSearchQuery,
        lat: userLocation?.latitude,
        lng: userLocation?.longitude,
      }
      
      // Remove empty params
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === '') {
          delete params[key]
        }
      })
      
      return restaurantsAPI.searchRestaurants(params)
    },
    enabled: true,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
  
  const restaurants = restaurantsData?.data?.data || []
  
  // Separate loading state from data validation
  const isLoadingRestaurants = isLoading || isFetching
  const hasDataLoaded = !!restaurantsData // We have received a response from the API
  
  // Check if we have valid restaurant data with all required fields
  const hasValidRestaurantData = restaurants.length > 0 && Array.isArray(restaurants) && restaurants.every(restaurant => 
    restaurant && 
    restaurant._id && 
    restaurant.name
    // Removed the strict operatingHours check as it might not always be present
  )
  
  // Check if we have a valid response but no restaurants (empty results)
  const hasEmptyResults = hasDataLoaded && restaurants.length === 0
  
  // Debug logging
  console.log('RestaurantSearch - restaurantsData:', restaurantsData || 'undefined')
  console.log('RestaurantSearch - restaurants:', restaurants || [])
  console.log('RestaurantSearch - restaurants length:', restaurants.length)
  console.log('RestaurantSearch - isLoadingRestaurants:', isLoadingRestaurants)
  console.log('RestaurantSearch - hasDataLoaded:', hasDataLoaded)
  console.log('RestaurantSearch - hasValidRestaurantData:', hasValidRestaurantData)
  console.log('RestaurantSearch - hasEmptyResults:', hasEmptyResults)
  console.log('RestaurantSearch - enums:', enums || {})

  // Update URL params when filters change
  useEffect(() => {
    const newParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value)
      }
    })
    setSearchParams(newParams)
  }, [filters, setSearchParams])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }
  
  const clearFilters = () => {
    setFilters({
      location: '',
      cuisine: '',
      category: '',
      minRating: '',
      maxDistance: '20',
      sortBy: 'recommended',
    })
    setSearchQuery('')
  }

  const handleLocationChange = (location) => {
    setUserLocation(location)
    handleFilterChange('location', location?.display_name || '')
  }

  const formatCuisine = (cuisine) => {
    return cuisine.charAt(0).toUpperCase() + cuisine.slice(1).replace('_', ' ')
  }

  const formatCategory = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
  }

  // Check if restaurant is currently open
  const isRestaurantCurrentlyOpen = (restaurant) => {
    if (!restaurant.operatingHours) return false
    
    const now = new Date()
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDay = days[now.getDay()]
    const currentTime = now.toTimeString().slice(0, 5)
    
    const daySchedule = restaurant.operatingHours[currentDay]
    if (!daySchedule || !daySchedule.isOpen) return false
    
    // Check if it's 24 hours (open and close both 00:00)
    if (daySchedule.open === '00:00' && daySchedule.close === '00:00') {
      return true
    }
    
    return currentTime >= daySchedule.open && currentTime <= daySchedule.close
  }

  // Get restaurant image
  const getRestaurantImage = (restaurant) => {
    if (!restaurant.images || restaurant.images.length === 0) {
      return '/api/placeholder/300/200'
    }
    
    // Try to find primary image first
    const primaryImage = restaurant.images.find(img => img.isPrimary)
    if (primaryImage) {
      return primaryImage.url
    }
    
    // Fall back to first image
    return restaurant.images[0]?.url || '/api/placeholder/300/200'
  }

  // Generate SEO-friendly URL for restaurant
  const generateRestaurantUrl = (restaurant) => {
    if (!restaurant || !restaurant.name || !restaurant._id) {
      return '/restaurants'
    }
    
    const slug = restaurant.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return `/restaurants/${restaurant._id}/${slug}`
  }

  // Generate dynamic SEO data based on search parameters
  const generateSEOData = () => {
    let title = 'Find Restaurants Near Charging Stations | ChargEase'
    let description = 'Discover restaurants at EV charging stations. Order food while your vehicle charges.'
    
    if (filters.location) {
      title = `Restaurants in ${filters.location} | ChargEase`
      description = `Find restaurants near charging stations in ${filters.location}. Order food while charging your EV.`
    }
    
    if (filters.cuisine) {
      title = `${formatCuisine(filters.cuisine)} Restaurants | ChargEase`
      description = `Discover ${formatCuisine(filters.cuisine)} restaurants at EV charging stations.`
    }
    
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      "name": title,
      "description": description,
      "url": `${window.location.origin}/restaurants/search${window.location.search}`,
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": restaurants.length,
        "itemListElement": restaurants.map((restaurant, index) => ({
          "@type": "Restaurant",
          "position": index + 1,
          "name": restaurant.name,
          "description": restaurant.description,
          "url": `${window.location.origin}${generateRestaurantUrl(restaurant)}`,
          "address": restaurant.chargingStation?.address,
          "aggregateRating": restaurant.rating?.average ? {
            "@type": "AggregateRating",
            "ratingValue": restaurant.rating.average,
            "reviewCount": restaurant.rating.count
          } : undefined
        }))
      }
    }
    
    return { title, description, structuredData }
  }

  const seoData = generateSEOData()
  
  return (
    <>
      <SEOHead 
        {...seoData}
        canonicalUrl={`/restaurants/search${window.location.search}`}
        structuredData={seoData.structuredData}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Find Restaurants</h1>
                <p className="text-gray-600">
                  {restaurants?.length || 0} restaurants found
                  {filters.location && ` near "${filters.location}"`}
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <div className="flex rounded-lg border border-gray-300 p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      viewMode === 'list'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      viewMode === 'map'
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Map className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Location Selector */}
            <div className="mt-6">
              <LocationSelector
                currentLocation={userLocation}
                onLocationChange={handleLocationChange}
                className="max-w-sm"
              />
            </div>

            {/* Search and Filters */}
            <div className="mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search restaurants, cuisines, or dishes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-10 pr-20"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    {isSearchPending && (
                      <Loader className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="hover:text-gray-600"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn btn-outline btn-md flex items-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${
                    showFilters ? 'rotate-180' : ''
                  }`} />
                </button>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                    <button
                      onClick={clearFilters}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Cuisine Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cuisine Type
                      </label>
                      <select
                        value={filters.cuisine}
                        onChange={(e) => handleFilterChange('cuisine', e.target.value)}
                        className="input"
                      >
                        <option value="">All Cuisines</option>
                        {cuisines.map(cuisine => (
                          <option key={cuisine} value={cuisine}>
                            {formatCuisine(cuisine)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Food Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="input"
                      >
                        <option value="">All Categories</option>
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {formatCategory(category)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rating Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Rating
                      </label>
                      <select
                        value={filters.minRating}
                        onChange={(e) => handleFilterChange('minRating', e.target.value)}
                        className="input"
                      >
                        <option value="">Any Rating</option>
                        <option value="4">4+ Stars</option>
                        <option value="3">3+ Stars</option>
                        <option value="2">2+ Stars</option>
                      </select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort By
                      </label>
                      <select
                        value={filters.sortBy}
                        onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        className="input"
                      >
                        <option value="recommended">Dockit Recommended</option>
                        <option value="distance">Distance</option>
                        <option value="rating">Rating</option>
                        <option value="preparation_time">Preparation Time</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="space-y-6">
                {/* Search Results Summary */}
                {hasDataLoaded && !isLoadingRestaurants && (
                  <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Search Results</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Restaurants found:</span>
                        <span className="font-medium">{restaurants.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Search radius:</span>
                        <span className="font-medium">{filters.maxDistance}km</span>
                      </div>
                      {userLocation && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Your location:</span>
                          <span className="font-medium text-green-600">Detected</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Distance Slider */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <DistanceSlider
                    value={parseInt(filters.maxDistance)}
                    onChange={(value) => handleFilterChange('maxDistance', value.toString())}
                    min={1}
                    max={100}
                    step={1}
                  />
                </div>
              </div>
            </div>

            {/* Restaurant List/Map */}
            <div className="flex-1">
              {isLoadingRestaurants ? (
                // Show skeleton only when actually loading
                <div className="space-y-4">
                  {/* Loading Skeleton Cards */}
                  {[1, 2, 3].map((index) => (
                    <RestaurantCardSkeleton key={index} />
                  ))}
                </div>
              ) : hasEmptyResults ? (
                // Show empty state when we have a response but no restaurants
                <div className="text-center py-12">
                  <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No restaurants found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search criteria or clearing filters
                  </p>
                  <button
                    onClick={clearFilters}
                    className="btn btn-primary btn-md"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-4">
                  {Array.isArray(restaurants) && restaurants.length > 0 ? restaurants.map((restaurant, index) => (
                    // Only render restaurants that have the minimum required fields
                    restaurant && restaurant._id && restaurant.name ? (
                      <RestaurantCard 
                        key={restaurant._id} 
                        restaurant={restaurant} 
                        onOrderClick={() => setOrderModal({ isOpen: true, restaurant })}
                        onViewDetails={() => navigate(generateRestaurantUrl(restaurant))}
                        getRestaurantImage={getRestaurantImage}
                        isCurrentlyOpen={isRestaurantCurrentlyOpen(restaurant)}
                      />
                    ) : null
                  )).filter(Boolean) : !hasDataLoaded ? (
                    <div className="text-center py-12">
                      <div className="text-gray-500">Loading restaurants...</div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-orange-500">No valid restaurant data available</div>
                      <p className="text-gray-600 mt-2">
                        Please try refreshing the page or contact support if this persists.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ height: '600px' }}>
                  <RestaurantMap
                    restaurants={restaurants}
                    userLocation={userLocation}
                    isLoading={isLoadingRestaurants}
                    onRestaurantSelect={(restaurant) => {
                      navigate(generateRestaurantUrl(restaurant))
                    }}
                    onOrderRestaurant={(restaurant) => {
                      setOrderModal({ isOpen: true, restaurant })
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant Order Modal */}
      <RestaurantOrderModal
        restaurant={orderModal.restaurant}
        isOpen={orderModal.isOpen}
        onClose={() => setOrderModal({ isOpen: false, restaurant: null })}
        user={user}
      />
    </>
  )
}

// Restaurant Card Component
function RestaurantCard({ restaurant, onOrderClick, onViewDetails, getRestaurantImage, isCurrentlyOpen }) {
  const [isLiked, setIsLiked] = useState(false)

  // Early return if restaurant data is incomplete
  if (!restaurant || !restaurant._id || !restaurant.name) {
    return <RestaurantCardSkeleton />
  }

  const formatOperatingHours = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const todaySchedule = restaurant.operatingHours?.[today]
    
    if (!todaySchedule || !todaySchedule.isOpen) {
      return 'Closed today'
    }
    
    // Check if it's 24 hours (open and close both 00:00)
    if (todaySchedule.open === '00:00' && todaySchedule.close === '00:00') {
      return 'Open 24 hours'
    }
    
    return `${todaySchedule.open} - ${todaySchedule.close}`
  }

  const getAvailableMenuItems = () => {
    if (!restaurant.menu || !Array.isArray(restaurant.menu)) return 0
    return restaurant.menu.filter(item => item && item.isAvailable).length
  }

  const shareRestaurant = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurant.name,
          text: `Check out ${restaurant.name} at ${restaurant.chargingStation?.name}`,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200 relative ${
        restaurant.isDockitRecommended 
          ? 'border-primary-200 ring-1 ring-primary-100' 
          : 'border-gray-200'
      }`}
    >
      {/* Dockit Recommended Badge - Top Right of Card */}
      {restaurant.isDockitRecommended && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center space-x-1 px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded-full shadow-lg">
            <BadgeCheck className="h-3 w-3" />
            <span>Dockit Choice</span>
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row">
        {/* Restaurant Image */}
        <div className="w-full md:w-80 h-48 md:h-56 relative flex-shrink-0 bg-gray-100">
          <img
            src={getRestaurantImage(restaurant)}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            style={{ 
              display: 'block',
              margin: 0,
              padding: 0,
              border: 'none',
              verticalAlign: 'top',
              lineHeight: 0,
              fontSize: 0
            }}
            onError={(e) => {
              e.target.src = '/api/placeholder/300/200'
            }}
          />
          
          {/* Regular Badges - Only Open Now */}
          <div className="absolute top-3 left-3 flex flex-col space-y-2">
            {isCurrentlyOpen && (
              <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full shadow-lg">
                Open Now
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="absolute top-3 right-3 flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsLiked(!isLiked)
              }}
              className={`p-2 rounded-full backdrop-blur-sm ${
                isLiked ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-700'
              } hover:scale-110 transition-all`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                shareRestaurant()
              }}
              className="p-2 rounded-full bg-white/80 text-gray-700 hover:scale-110 transition-all backdrop-blur-sm"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Restaurant Details */}
        <div className="flex-1 p-6">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`text-xl font-bold mb-0 ${
                  restaurant.isDockitRecommended ? 'text-primary-900' : 'text-gray-900'
                }`}>
                  {restaurant.name}
                </h3>
                {restaurant.isDockitRecommended && (
                  <BadgeCheck className="h-5 w-5 text-primary-600 flex-shrink-0" />
                )}
              </div>
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">{restaurant.description}</p>
              
              {/* Charging Station Info */}
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="truncate">{restaurant.chargingStation?.name}</span>
                {restaurant.distance && (
                  <span className="ml-2 flex-shrink-0">• {restaurant.distance} km away</span>
                )}
              </div>
              
              {/* Cuisine Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {restaurant.cuisine?.slice(0, 3).map((cuisine) => (
                  <span key={cuisine} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                  </span>
                ))}
                {restaurant.cuisine?.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    +{restaurant.cuisine.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Rating */}
            {restaurant.rating && restaurant.rating.average > 0 && (
              <div className="flex items-center flex-shrink-0">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="ml-1 text-sm font-medium text-gray-900">
                  {restaurant.rating.average.toFixed(1)}
                </span>
                <span className="ml-1 text-sm text-gray-500">
                  ({restaurant.rating.count})
                </span>
              </div>
            )}
          </div>

          {/* Restaurant Info */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div className="flex items-center text-gray-600">
              <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{formatOperatingHours()}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Utensils className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{getAvailableMenuItems()} items available</span>
            </div>
            {restaurant.averagePreparationTime && (
              <div className="flex items-center text-gray-600">
                <ChefHat className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">~{restaurant.averagePreparationTime} min prep</span>
              </div>
            )}
            {restaurant.chargingStation?.address?.city && (
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">{restaurant.chargingStation.address.city}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onViewDetails}
              className="flex-1 btn btn-outline btn-md"
            >
              View Details
            </button>
            <button
              onClick={onOrderClick}
              className="flex-1 btn btn-primary btn-md"
              disabled={!restaurant.acceptingOrders || !isCurrentlyOpen}
            >
              {restaurant.acceptingOrders && isCurrentlyOpen 
                ? 'Order Now' 
                : 'Currently Closed'
              }
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Restaurant Card Skeleton Component
function RestaurantCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Image Skeleton */}
        <div className="w-full md:w-80 h-48 md:h-56 relative flex-shrink-0 bg-gray-200">
          <div 
            className="w-full h-full bg-gray-200 animate-pulse" 
            style={{ 
              display: 'block',
              margin: 0,
              padding: 0,
              border: 'none',
              lineHeight: 0,
              fontSize: 0
            }}
          ></div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 p-6">
          <div className="space-y-4">
            {/* Header section */}
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-4">
                {/* Title */}
                <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4 mb-2"></div>
                {/* Description */}
                <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-1"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3 mb-3"></div>
                
                {/* Location */}
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mb-3"></div>
                
                {/* Tags */}
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16"></div>
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20"></div>
                  <div className="h-6 bg-gray-200 rounded-full animate-pulse w-18"></div>
                </div>
              </div>
              
              {/* Rating skeleton */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3">
              <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
