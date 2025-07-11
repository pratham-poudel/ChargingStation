import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Search, Loader, X, Navigation } from 'lucide-react'
import { locationAPI } from '../services/api'

const LocationSelectorNew = ({ 
  placeholder = "Search for a location...",
  onLocationSelect,
  selectedLocation,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const dropdownRef = useRef(null)
  const searchTimeoutRef = useRef(null)

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

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

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
          const response = await locationAPI.autocomplete({
            query,
            lat: 27.7172, // Default to Kathmandu
            lng: 85.3240
          })
          
          if (response.data.success) {
            setSearchResults(response.data.data)
          } else {
            setSearchResults([])
          }
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

  const handleLocationSelectFromSearch = async (result) => {
    try {
      const response = await locationAPI.searchLocation({
        name: result.name,
        currentLat: 27.7172,
        currentLng: 85.3240
      })
      
      if (response.data.success) {
        const locationData = response.data.data
        onLocationSelect({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: result.fullAddress,
          name: result.name
        })
        
        setSearchQuery('')
        setSearchResults([])
        setIsOpen(false)
      }
    } catch (error) {
      console.error('Location selection error:', error)
    }
  }

  const detectCurrentLocation = async () => {
    setIsDetectingLocation(true)
    
    try {
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported'))
          return
        }

        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        )
      })

      const { latitude, longitude } = position.coords
      
      // Reverse geocode to get address
      try {
        const response = await locationAPI.reverseGeocode({
          latitude,
          longitude
        })
        
        if (response.data.success) {
          onLocationSelect({
            latitude,
            longitude,
            address: response.data.data.fullAddress,
            name: response.data.data.address,
            isDetected: true
          })
        } else {
          onLocationSelect({
            latitude,
            longitude,
            address: 'Current Location',
            name: 'Current Location',
            isDetected: true
          })
        }
      } catch (error) {
        onLocationSelect({
          latitude,
          longitude,
          address: 'Current Location',
          name: 'Current Location',
          isDetected: true
        })
      }
      
      setIsOpen(false)
    } catch (error) {
      console.error('Geolocation error:', error)
    } finally {
      setIsDetectingLocation(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <MapPin className="w-5 h-5 text-gray-400" />
          <div className="flex-1">
            {selectedLocation ? (
              <div>
                <div className="font-medium text-gray-900 truncate">
                  {selectedLocation.name}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {selectedLocation.address}
                </div>
              </div>
            ) : (
              <div className="text-gray-500">{placeholder}</div>
            )}
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400"
          >
            ▼
          </motion.div>
        </div>
      </div>

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
              {/* Current Location Button */}
              <motion.button
                onClick={detectCurrentLocation}
                disabled={isDetectingLocation}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 mb-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isDetectingLocation ? (
                  <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5 text-blue-600" />
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

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for a location..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Results */}
            {(isSearching || searchResults.length > 0) && (
              <div className="max-h-64 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center">
                    <Loader className="w-5 h-5 animate-spin mx-auto text-blue-600" />
                    <div className="text-sm text-gray-500 mt-2">Searching...</div>
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.map((result) => (
                      <motion.button
                        key={result.id}
                        onClick={() => handleLocationSelectFromSearch(result)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-3"
                        whileHover={{ backgroundColor: '#f9fafb' }}
                      >
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {result.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {result.fullAddress}
                          </div>
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

export default LocationSelectorNew

