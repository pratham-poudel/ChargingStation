import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { MapPin, X, Check, LocateFixed } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom marker icon for selected location
const selectedLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Component to handle map clicks
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      onLocationSelect([lng, lat]) // [longitude, latitude] format
    }
  })
  return null
}

const LocationPicker = ({ 
  isOpen, 
  onClose, 
  onLocationConfirm, 
  initialCoordinates = [85.3240, 27.7172] // Default to Kathmandu
}) => {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [mapCenter, setMapCenter] = useState([27.7172, 85.3240]) // [lat, lng] for map
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [mapKey, setMapKey] = useState(0) // Key to force re-render map
  const mapRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      // Force map re-render when modal opens
      setMapKey(prev => prev + 1)
      
      if (initialCoordinates[0] !== 0 && initialCoordinates[1] !== 0) {
        setMapCenter([initialCoordinates[1], initialCoordinates[0]])
        setSelectedLocation(initialCoordinates)
      }
    }
  }, [isOpen, initialCoordinates])

  const handleLocationSelect = (coordinates) => {
    setSelectedLocation(coordinates)
  }

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationConfirm(selectedLocation)
      onClose()
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser')
      return
    }

    setIsGettingLocation(true)
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newCoordinates = [longitude, latitude]
        setSelectedLocation(newCoordinates)
        setMapCenter([latitude, longitude])
        
        // Pan map to new location
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 15)
        }
        
        setIsGettingLocation(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Failed to get location: ' + error.message)
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Select Station Location</h3>
              <p className="text-sm text-gray-500 mt-1">
                Click on the map to pinpoint the exact location of your charging station
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>        {/* Map Container */}
        <div className="flex-1 p-6 min-h-0">
          <div className="h-96 relative">            <MapContainer
              key={mapKey}
              center={mapCenter}
              zoom={13}
              className="h-full w-full rounded-lg border border-gray-300"
              ref={mapRef}
              style={{ height: '400px', width: '100%' }}
              whenCreated={(mapInstance) => {
                mapRef.current = mapInstance
                // Force invalidate size after a short delay
                setTimeout(() => {
                  mapInstance.invalidateSize()
                }, 100)
              }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              <MapClickHandler onLocationSelect={handleLocationSelect} />
              
              {selectedLocation && (
                <Marker 
                  position={[selectedLocation[1], selectedLocation[0]]} 
                  icon={selectedLocationIcon}
                />
              )}
            </MapContainer>

            {/* Floating controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
              <button
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="bg-white shadow-lg border border-gray-300 p-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Get Current Location"
              >
                <LocateFixed 
                  size={20} 
                  className={`text-gray-600 ${isGettingLocation ? 'animate-spin' : ''}`} 
                />
              </button>
            </div>

            {/* Selected coordinates display */}
            {selectedLocation && (
              <div className="absolute bottom-4 left-4 z-[1000] bg-white shadow-lg border border-gray-300 p-3 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium text-gray-900 mb-1">Selected Location:</div>
                  <div className="text-gray-600">
                    <div>Latitude: {selectedLocation[1].toFixed(6)}</div>
                    <div>Longitude: {selectedLocation[0].toFixed(6)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedLocation ? (
                <div className="flex items-center text-green-600">
                  <Check size={16} className="mr-1" />
                  Location selected
                </div>
              ) : (
                <div className="flex items-center text-gray-500">
                  <MapPin size={16} className="mr-1" />
                  Click on the map to select location
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationPicker
