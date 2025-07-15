import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  Zap, 
  Clock, 
  Navigation,
  ChevronDown,
  X,
  Loader,
  Map,
  List
} from 'lucide-react'
import { stationsAPI } from '../services/api'
import LocationSelector from '../components/LocationSelector'
import StationDistance from '../components/StationDistance'
import DistanceSlider from '../components/DistanceSlider'
import EnhancedBookingWithRestaurantModal from '../components/EnhancedBookingWithRestaurantModal'
import StationSlotAvailability from '../components/StationSlotAvailability'
import StationMap from '../components/StationMap'
import SEOHead from '../components/SEOHead'
import { SEO_DATA, LOCATION_SEO } from '../utils/seoData'
import { generateMetaDescription, generateBreadcrumbs } from '../utils/seoUtils'

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

export default function StationSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'map'
  const [bookingModal, setBookingModal] = useState({ isOpen: false, station: null })
  
  // Search and filter states
  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    chargingType: searchParams.get('chargingType') || '',
    connectorType: searchParams.get('connectorType') || '',
    amenities: searchParams.get('amenities')?.split(',') || [],
    minRating: searchParams.get('minRating') || '',
    maxDistance: searchParams.get('maxDistance') || '20',
    sortBy: searchParams.get('sortBy') || 'distance',
  })

  const [searchQuery, setSearchQuery] = useState('')  // Debounce the search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500) // 500ms delay
  
  // Debounce filters as well to avoid excessive API calls when multiple filters change quickly
  const debouncedFilters = useDebounce(filters, 300) // 300ms delay for filters
  
  // Check if search is pending (user is typing but debounce hasn't fired yet)
  const isSearchPending = searchQuery !== debouncedSearchQuery
  
  /* 
   * Note: We use debouncedSearchQuery and debouncedFilters for API calls to avoid excessive requests,
   * but the UI uses the immediate filters state to provide instant visual feedback to users
   */

    // Get the primary image or first available image for a station
  const getStationImage = (station) => {
    if (!station.images || station.images.length === 0) {
      return null
    }
    
    // Try to find primary image first
    const primaryImage = station.images.find(img => img.isPrimary)
    if (primaryImage) {
      return primaryImage?.url || null
    }
    
    // Try to find thumbnail image
    const thumbnailImage = station.images.find(img => img.isThumbnail)
    if (thumbnailImage) {
      return thumbnailImage?.url || null
    }
    
    // Fall back to first image
    return station.images[0]?.url || null
  }
  // Get station master profile picture
  const getStationMasterImage = (stationMaster) => {
    if (!stationMaster?.photo) {
      return null
    }
    
    // Handle both object and string formats
    if (typeof stationMaster.photo === 'object') {
      return stationMaster.photo?.url || null
    }
    
    return stationMaster.photo
  }

  // Generate SEO-friendly URL for station
  const generateStationUrl = (station) => {
    const slug = `${station.name}-${station.address?.area || station.address?.city || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
    
    return `/station/${slug}/${station._id}`
  }

  // Get user location
  const [userLocation, setUserLocation] = useState(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.log('Geolocation error:', error)
        }
      )
    }
  }, [])

  // Fetch enum values from backend
  const { data: enumsData } = useQuery({
    queryKey: ['station-enums'],
    queryFn: () => stationsAPI.getEnums(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const enums = enumsData?.data?.data || {}
    // Use backend enums or fallback to static values
  const chargingTypesRaw = enums.chargingTypes || ['slow', 'fast', 'rapid']
  const chargingTypes = chargingTypesRaw.map(type => {
    switch (type) {
      case 'slow':
        return { value: type, label: 'Slow (< 22kW)', color: 'text-yellow-600' }
      case 'fast':
        return { value: type, label: 'Fast (22-50kW)', color: 'text-orange-600' }
      case 'rapid':
        return { value: type, label: 'Rapid (> 50kW)', color: 'text-red-600' }
      default:
        return { value: type, label: type.charAt(0).toUpperCase() + type.slice(1), color: 'text-gray-600' }
    }
  })

  const connectorTypes = enums.connectorTypes || ['CCS', 'CHAdeMO', 'Type2', 'GB/T', 'Tesla', 'CCS2']

  const amenitiesList = enums.amenities || [
    'parking', 'restroom', 'cafe', 'wifi', 'atm', 
    'restaurant', 'shopping', 'waiting_area', 'cctv', 
    'security', 'car_wash', 'air_pump'  ]  // Fetch stations with location-based filtering
  const { data: stationsData, isLoading, refetch } = useQuery({
    queryKey: ['stations', debouncedFilters, userLocation, debouncedSearchQuery],
    queryFn: () => {
      // For universal search (search query without location filtering)
      if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
        return stationsAPI.getStations({
          search: debouncedSearchQuery,
          chargingType: debouncedFilters.chargingType,
          connectorType: debouncedFilters.connectorType,
          amenities: debouncedFilters.amenities,
          minRating: debouncedFilters.minRating,
          sortBy: debouncedFilters.sortBy,
          // Don't include location, maxDistance, or latitude/longitude for universal search
        })
      }
      
      // For location-based filtering (when user location is available)
      if (userLocation) {
        return stationsAPI.getStations({
          ...debouncedFilters,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        })
      }
      
      // Default search without location (only basic filters)
      return stationsAPI.getStations({
        chargingType: debouncedFilters.chargingType,
        connectorType: debouncedFilters.connectorType,
        amenities: debouncedFilters.amenities,
        minRating: debouncedFilters.minRating,
        sortBy: debouncedFilters.sortBy,
        // Don't include location, maxDistance, or coordinates
      })
    },
    enabled: true,
    staleTime: 30 * 1000, // Cache results for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
  const stations = stationsData?.data?.data || []
  
  // Debug logging
  console.log('StationSearch - stationsData:', stationsData || 'undefined')
  console.log('StationSearch - stations:', stations || [])
  console.log('StationSearch - stations type:', typeof stations)
  console.log('StationSearch - is array:', Array.isArray(stations))
  console.log('StationSearch - enums:', enums || {})

  // Update URL params when filters change
  useEffect(() => {
    const newParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        if (Array.isArray(value)) {
          newParams.set(key, value.join(','))
        } else {
          newParams.set(key, value)
        }
      }
    })
    setSearchParams(newParams)
  }, [filters, setSearchParams])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleAmenityToggle = (amenity) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }))
  }
  
  const clearFilters = () => {
    setFilters({
      location: '',
      chargingType: '',
      connectorType: '',
      amenities: [],
      minRating: '',
      maxDistance: '20',
      sortBy: 'distance',
    })
  }

  const handleLocationChange = (location) => {
    setUserLocation(location)
  }

  const formatAmenity = (amenity) => {
    return amenity.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Generate dynamic SEO data based on search parameters
  const generateSEOData = () => {
    const city = searchParams.get('city')
    const location = searchParams.get('location')
    const area = searchParams.get('area')
    
    // Use location-specific SEO if available
    if (city && LOCATION_SEO[city.toUpperCase()]) {
      return LOCATION_SEO[city.toUpperCase()]
    }
    
    // Generate dynamic SEO data
    const searchLocation = city || location || area || 'Nepal'
    const resultCount = stations?.length || 0
    
    return {
      title: `Find EV Charging Stations in ${searchLocation} | ${resultCount}+ Locations | ChargEase`,
      description: generateMetaDescription('cityListing', { 
        city: searchLocation, 
        stationCount: resultCount 
      }),
      keywords: `EV charging stations ${searchLocation}, electric vehicle charging ${searchLocation}, find EV chargers ${searchLocation}, charging stations near me, electric car charging ${searchLocation}, fast charging ${searchLocation}`,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": `EV Charging Stations in ${searchLocation}`,
        "description": `Find electric vehicle charging stations in ${searchLocation}, Nepal`,
        "url": `https://chargease.com.np/search${window.location.search}`,
        "numberOfItems": resultCount,
        "itemListElement": stations?.slice(0, 5).map((station, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "AutomotiveBusiness",
            "name": station.name,
            "address": station.address,
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": station.latitude,
              "longitude": station.longitude
            }
          }
        })) || []
      }
    }
  }

  const seoData = generateSEOData()
  
  return (
    <>
      <SEOHead 
        {...seoData}
        canonicalUrl={`/search${window.location.search}`}
        structuredData={seoData.structuredData}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">              <div>
                <h1 className="text-2xl font-bold text-gray-900">Find Charging Stations</h1>
                <p className="text-gray-600">
                  {stations?.length || 0} stations found
                  {filters.location && ` near "${filters.location}"`}
                </p>
              </div>

              {/* View Toggle */}
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

            {/* Location Selector - Below heading and count */}
            <div className="mt-6">
              <LocationSelector
                currentLocation={userLocation}
                onLocationChange={handleLocationChange}
                className="max-w-sm"
              />
            </div>

            {/* Search and Filters */}
            <div className="mt-6 space-y-4">
              {/* Universal Search Bar */}              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search stations globally (e.g., 'Kathmandu', 'Butwal Station')..."
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
                    {/* Charging Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Charging Speed
                      </label>
                      <select
                        value={filters.chargingType}
                        onChange={(e) => handleFilterChange('chargingType', e.target.value)}
                        className="input"
                      >
                        <option value="">All Speeds</option>
                        {chargingTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Connector Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Connector Type
                      </label>
                      <select
                        value={filters.connectorType}
                        onChange={(e) => handleFilterChange('connectorType', e.target.value)}
                        className="input"
                      >
                        <option value="">All Connectors</option>
                        {connectorTypes.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Distance */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Distance (km)
                      </label>
                      <select
                        value={filters.maxDistance}
                        onChange={(e) => handleFilterChange('maxDistance', e.target.value)}
                        className="input"
                      >
                        <option value="5">5 km</option>
                        <option value="10">10 km</option>
                        <option value="25">25 km</option>
                        <option value="50">50 km</option>
                        <option value="100">100 km</option>
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
                        <option value="distance">Distance</option>
                        <option value="rating">Rating</option>
                        <option value="price">Price</option>
                        <option value="availability">Availability</option>
                      </select>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Amenities
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {amenitiesList.map(amenity => (
                        <button
                          key={amenity}
                          onClick={() => handleAmenityToggle(amenity)}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                            filters.amenities.includes(amenity)
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                          }`}
                        >
                          {formatAmenity(amenity)}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>        {/* Results */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">            {/* Left Sidebar - Location and Quick Info */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="space-y-6">
                {/* Quick Stats - Hidden on mobile */}
                {!isLoading && (
                  <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Search Results</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stations found:</span>
                        <span className="font-medium">{stations.length}</span>
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
                    </div>                  </div>
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

            {/* Main Content */}
            <div className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-8 w-8 animate-spin text-primary-600" />
                  <span className="ml-2 text-gray-600">Finding stations...</span>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-4">                  {Array.isArray(stations) ? stations.map((station, index) => {
                    // Check if this station is recommended and if we should show the badge
                    const isRecommended = station.dockitRecommended
                    const totalRecommended = stations.filter(s => s.dockitRecommended).length
                    const showBadge = isRecommended && totalRecommended <= Math.ceil(stations.length * 0.6) // Show badge only if ≤60% are recommended
                    
                    return (
                    <motion.div
                      key={station._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}                      className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${
                        showBadge 
                          ? 'border-2 border-primary-300 relative transform hover:scale-[1.01] ring-1 ring-primary-100' 
                          : 'border border-gray-200'                      }`}
                    >                      {/* Recommended Badge - Top Left - Compact */}
                      {showBadge && (
                        <>
                          {/* Main Badge - Smaller and more compact */}
                          <div className="absolute top-2 left-2 z-10">
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white text-xs font-bold px-3 py-1 rounded-md shadow-md">
                              <span className="flex items-center">
                                <Star className="h-3 w-3 mr-1 fill-current text-yellow-300" />
                                Dockit Recommended
                              </span>
                            </div>
                          </div>
                          
                          {/* Subtle Accent Line */}
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500"></div>
                          
                          {/* Trust Indicator - Smaller */}
                          <div className="absolute top-2 right-2 z-10">
                            <div className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full flex items-center">
                              <div className="h-1.5 w-1.5 bg-green-500 rounded-full mr-1"></div>
                              Verified
                            </div>
                          </div>
                        </>
                      )}
                        <div className="flex flex-col lg:flex-row">
                        {/* Left side - Station Info */}                        <div className={`flex-1 p-6 ${showBadge ? 'pt-10' : ''}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="w-full">
                              <h3 className="text-lg font-semibold text-gray-900 pr-16">
                                {station.name}
                                {showBadge && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                                    Premium Partner
                                  </span>
                                )}
                              </h3>
                              <p className="text-gray-600 flex items-center pr-16">
                                <MapPin className="h-4 w-4 mr-1" />
                                {station.address.street}, {station.address.city}
                              </p>
                              
                              {/* Premium Features for Recommended Stations */}
                              {showBadge && (
                                <div className="mt-2 flex flex-wrap gap-2 pr-16">
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                                    <span className="h-1.5 w-1.5 bg-green-500 rounded-full mr-1.5"></span>
                                    Fast Response
                                  </span>
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                    <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                                    24/7 Support
                                  </span>
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                    <span className="h-1.5 w-1.5 bg-purple-500 rounded-full mr-1.5"></span>
                                    Quality Assured
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Distance Information */}
                          <StationDistance 
                            station={station}
                            userLocation={userLocation}
                            className="mb-3"
                          />

                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                            <div className="flex items-center">
                              <Zap className="h-4 w-4 mr-1" />
                              {station.chargingPorts?.length || 0} ports
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {station.operatingHours?.monday?.is24Hours ? '24/7' : 'Limited Hours'}
                            </div>
                          </div>

                          {/* Charging Types */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {station.chargingPorts?.map((port, portIndex) => (
                              <span
                                key={portIndex}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  port.chargingType === 'rapid'
                                    ? 'bg-red-100 text-red-800'
                                    : port.chargingType === 'fast'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {port.connectorType} - {port.powerOutput}kW
                              </span>
                            ))}
                          </div>                          {/* Amenities */}
                          {station.amenities?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {station.amenities.slice(0, 4).map((amenity, amenityIndex) => (
                                <span
                                  key={amenityIndex}
                                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                                >
                                  {formatAmenity(amenity)}
                                </span>
                              ))}
                              {station.amenities.length > 4 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  +{station.amenities.length - 4} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Real-time Slot Availability */}
                          <StationSlotAvailability 
                            stationId={station._id}
                            className="mb-4"
                          />
                        </div>{/* Right side - Image and Actions */}
                        <div className="lg:w-56 flex-shrink-0">
                          <div className="h-full flex flex-col p-4">                            {/* Optimized Image Size */}
                            <div className="aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden mb-4">
                              <img
                                src={getStationImage(station) || `https://picsum.photos/224/168?random=${station._id}`}
                                alt={station.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // If station image fails, try placeholder, then fallback to SVG
                                  if (e.target.src.includes('picsum.photos')) {
                                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='224' height='168' viewBox='0 0 224 168'%3E%3Crect width='224' height='168' fill='%23f3f4f6'/%3E%3Ctext x='112' y='84' font-family='Arial' font-size='12' fill='%236b7280' text-anchor='middle'%3ECharging Station%3C/text%3E%3C/svg%3E";
                                  } else {
                                    e.target.src = `https://picsum.photos/224/168?random=${station._id}`;
                                  }
                                }}
                              />
                            </div>                            {/* Rating Section - Improved */}
                            <div className="mb-3">
                              {station.rating ? (
                                <div className={`flex items-center justify-center ${showBadge ? 'bg-yellow-50 px-3 py-2 rounded-lg' : 'py-2'}`}>
                                  <Star className={`h-4 w-4 fill-current ${showBadge ? 'text-yellow-500' : 'text-yellow-400'}`} />
                                  <span className={`ml-1 text-sm font-medium ${showBadge ? 'text-yellow-700' : ''}`}>
                                    {station.rating.average.toFixed(1)}
                                  </span>
                                  <span className={`ml-1 text-xs ${showBadge ? 'text-yellow-600' : 'text-gray-500'}`}>
                                    ({station.rating.count} reviews)
                                  </span>
                                </div>
                              ) : (
                                <div className="text-center py-2">
                                  <span className="text-xs text-gray-400">No rating yet</span>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons - Symmetric Layout */}
                            <div className="space-y-2 mt-auto">                              <Link
                                to={generateStationUrl(station)}
                                className={`w-full px-4 py-2 text-sm font-medium border rounded-lg transition-colors text-center block ${
                                  showBadge 
                                    ? 'text-primary-700 border-primary-700 hover:bg-primary-100' 
                                    : 'text-primary-600 border-primary-600 hover:bg-primary-50'
                                }`}
                              >
                                View Details
                              </Link><button
                                onClick={() => setBookingModal({ isOpen: true, station })}
                                className={`w-full px-4 py-2 text-sm font-medium text-white rounded-lg transition-all text-center ${
                                  showBadge 
                                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transform hover:scale-105' 
                                    : 'bg-primary-600 hover:bg-primary-700'
                                }`}
                              >
                                {showBadge ? '⚡ Quick Book' : 'Book Now'}
                              </button>                            </div>
                          </div>
                        </div>
                      </div>                      {/* Station Master Info - At the very bottom of the entire card */}
                      {station.stationMaster && (
                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                          <div className="flex items-center justify-between gap-4">
                            {/* Left side - Managed by */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                                {getStationMasterImage(station.stationMaster) ? (
                                  <img
                                    src={getStationMasterImage(station.stationMaster)}
                                    alt={station.stationMaster.name || 'Station Master'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className={`w-full h-full bg-gray-300 flex items-center justify-center text-xs text-gray-600 ${getStationMasterImage(station.stationMaster) ? 'hidden' : ''}`}>
                                  {station.stationMaster.name ? station.stationMaster.name.charAt(0).toUpperCase() : 'SM'}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 truncate">
                                  Managed by <span className="font-medium text-gray-700">{station.stationMaster.name || 'Station Master'}</span>
                                </p>
                              </div>
                            </div>

                            {/* Right side - Owned by */}
                            <div className="flex-1 min-w-0 text-right">
                              <p className="text-xs text-gray-500 truncate">
                                Owned by <span className="font-medium text-gray-700">{station.vendor?.businessName || station.vendor?.name || 'Unknown'}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}) : (
                <div className="text-center py-12">
                  <div className="text-red-500">Error: Invalid data format</div>
                </div>
              )}

              {Array.isArray(stations) && stations.length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No stations found
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
              )}
                </div>              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ height: '600px' }}>
                  <StationMap
                    stations={stations}
                    userLocation={userLocation}
                    isLoading={isLoading}
                    onStationSelect={(station) => {
                      window.location.href = generateStationUrl(station)
                    }}
                    onBookStation={(station) => {
                      setBookingModal({ isOpen: true, station })
                    }}
                  />
                </div>
              )}
            </div>
          </div>        </div>
      </div>      {/* Enhanced Booking Modal */}
      <EnhancedBookingWithRestaurantModal
        station={bookingModal.station}
        isOpen={bookingModal.isOpen}
        onClose={() => setBookingModal({ isOpen: false, station: null })}
      />
    </>
  )
}
