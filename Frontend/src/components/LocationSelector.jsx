import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  Navigation, 
  Search, 
  Clock, 
  Loader, 
  X,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react'
import locationService from '../services/locationService'
import { stationsAPI } from '../services/api'

export default function LocationSelector({ 
  currentLocation, 
  onLocationChange, 
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationDetails, setLocationDetails] = useState(null)
  const [nearestStationInfo, setNearestStationInfo] = useState(null)
  const [error, setError] = useState(null)
  const searchTimeoutRef = useRef(null)
  const dropdownRef = useRef(null)

  // Get location details when current location changes
  useEffect(() => {
    if (currentLocation?.latitude && currentLocation?.longitude) {
      loadLocationDetails()
    }
  }, [currentLocation])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadLocationDetails = async () => {
    try {
      const details = await locationService.reverseGeocode(
        currentLocation.latitude, 
        currentLocation.longitude
      )
      setLocationDetails(details)
    } catch (error) {
      console.error('Failed to get location details:', error)
      setLocationDetails({
        address: 'Current Location',
        fullAddress: 'Current Location'
      })
    }
  }
  const detectCurrentLocation = async () => {
    setIsDetectingLocation(true)
    setError(null)
    
    try {
      const location = await locationService.getCurrentLocation()
      // Add detected flag to indicate this was auto-detected
      onLocationChange({
        ...location,
        isDetected: true
      })
      setIsOpen(false)
    } catch (error) {
      console.error('Geolocation error:', error)
      setError('Unable to detect location. Please enter manually.')
    } finally {
      setIsDetectingLocation(false)
    }
  }

  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Set new timeout for search
    if (query.length >= 3) {
      setIsSearching(true)
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await locationService.autocompleteSearch(
            query,
            currentLocation?.latitude || 27.7172,
            currentLocation?.longitude || 85.3240
          )
          setSearchResults(results)
        } catch (error) {
          console.error('Search error:', error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      }, 300)
    } else {
      setSearchResults([])
      setIsSearching(false)
    }
  }
  const handleLocationSelect = async (result) => {
    try {
      const locationData = await locationService.searchLocation(
        result.name,
        currentLocation?.latitude || 27.7172,
        currentLocation?.longitude || 85.3240
      )
      
      onLocationChange({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: result.fullAddress,
        name: result.name,
        isManuallySelected: true
      })
      
      setSearchQuery('')
      setSearchResults([])
      setIsOpen(false)
    } catch (error) {      console.error('Location selection error:', error)
      setError('Failed to select location. Please try again.')
    }
  }

  // Load nearest station info when location changes
  const loadNearestStationInfo = async () => {
    if (!currentLocation?.latitude || !currentLocation?.longitude) {
      setNearestStationInfo(null)
      return
    }

    try {
      const response = await stationsAPI.getNearestStationInfo({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      })

      if (response.data.success) {
        setNearestStationInfo({          distance: response.data.data.distance,
          time: response.data.data.duration,
          station: response.data.data.station,
          isRealTime: response.data.data.isRealTime
        })
      }
    } catch (error) {
      console.error('Failed to load nearest station info:', error)
      setNearestStationInfo(null)
    }
  }

  // Load nearest station info when current location changes
  useEffect(() => {
    loadNearestStationInfo()
  }, [currentLocation])

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Location Display Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 text-left"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-start space-x-3">
          <MapPin className="h-5 w-5 text-primary-600 mt-1 flex-shrink-0" />          <div className="flex-1 min-w-0">            {currentLocation && locationDetails ? (              <div>
                {/* Company name like Blinkit */}
                <div className="text-xs font-bold text-gray-700 mb-1">
                  Dockit
                </div>
                
                {/* Delivery time like Blinkit */}
                {nearestStationInfo && (
                  <div className="flex items-center text-xs font-bold text-gray-900 mb-1">
                    <span className="text-gray-600 mr-1">Nearest</span>
                    <span className="text-green-600">{nearestStationInfo.time} mins</span>
                    <span className="mx-1 text-gray-400">•</span>
                    <span className="text-gray-600">{(nearestStationInfo.distance / 1000).toFixed(1)} km</span>
                  </div>
                )}
                
                {/* Location address */}
                <div className="flex items-center text-sm font-medium text-gray-900">
                  <span className="truncate">
                    {currentLocation.isManuallySelected && currentLocation.address
                      ? currentLocation.address.split(',')[0] // Show first part like Blinkit
                      : (locationDetails.fullAddress && locationDetails.fullAddress !== 'Current Location'
                          ? locationDetails.fullAddress.split(',')[0]
                          : 'Your location')
                    }
                  </span>
                  <svg className="h-3 w-3 ml-1 text-gray-400 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            ) : (
              <div>
                <div className="font-bold text-gray-900 text-lg">
                  Set Your Location
                </div>
                <div className="text-sm text-gray-500">
                  Find charging stations near you
                </div>
              </div>
            )}
          </div>
          <div className="text-gray-400">
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.div>
          </div>
        </div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">Choose Location</h3>
              
              {/* Current Location Button */}
              <motion.button
                onClick={detectCurrentLocation}
                disabled={isDetectingLocation}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isDetectingLocation ? (
                  <Loader className="h-5 w-5 text-primary-600 animate-spin" />
                ) : (
                  <Navigation className="h-5 w-5 text-primary-600" />
                )}
                <div className="text-left">
                  <div className="font-medium text-gray-900">
                    {isDetectingLocation ? 'Detecting...' : 'Use Current Location'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Get precise location automatically
                  </div>
                </div>
              </motion.button>

              {/* Manual Search */}
              <div className="mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for a location..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setSearchResults([])
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2"
                >
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">{error}</span>
                </motion.div>
              )}
            </div>

            {/* Search Results */}
            {(isSearching || searchResults.length > 0) && (
              <div className="max-h-64 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center">
                    <Loader className="h-5 w-5 animate-spin mx-auto text-primary-600" />
                    <div className="text-sm text-gray-500 mt-2">Searching...</div>
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.map((result) => (
                      <motion.button
                        key={result.id}
                        onClick={() => handleLocationSelect(result)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-3"
                        whileHover={{ backgroundColor: '#f9fafb' }}
                      >
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {result.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {result.fullAddress}
                          </div>
                          {result.distance && (
                            <div className="text-xs text-primary-600">
                              {result.distance}
                            </div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
