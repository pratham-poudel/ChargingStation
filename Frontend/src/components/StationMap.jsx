import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Star, MapPin, Zap } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import EnhancedBookingModal from './EnhancedBookingModal'

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom marker icons
const createCustomIcon = (isRecommended = false) => {
  const iconHtml = isRecommended 
    ? `<div style="
        background: linear-gradient(135deg, #059669, #10b981);
        border: 3px solid #fbbf24;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        position: relative;
      ">
        <span style="
          color: white;
          font-size: 18px;
          font-weight: bold;
        ">⚡</span>
        <div style="
          position: absolute;
          top: -2px;
          right: -2px;
          background: #fbbf24;
          border-radius: 50%;
          width: 12px;
          height: 12px;
          border: 2px solid white;
        "></div>
      </div>`
    : `<div style="
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border: 2px solid white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      ">
        <span style="
          color: white;
          font-size: 14px;
        ">⚡</span>
      </div>`

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: isRecommended ? [40, 40] : [32, 32],
    iconAnchor: isRecommended ? [20, 40] : [16, 32],
    popupAnchor: [0, isRecommended ? -40 : -32]
  })
}

// Component to handle map centering and bounds
const MapController = ({ stations, userLocation }) => {
  const map = useMap()

  useEffect(() => {
    if (stations.length === 0) return

    const bounds = L.latLngBounds()
    
    // Add user location to bounds if available
    if (userLocation) {
      bounds.extend([userLocation.latitude, userLocation.longitude])
    }
    
    // Add all station locations to bounds
    stations.forEach(station => {
      if (station.location?.coordinates) {
        const [lng, lat] = station.location.coordinates
        bounds.extend([lat, lng])
      }
    })

    if (bounds.isValid()) {
      map.fitBounds(bounds, { 
        padding: [20, 20],
        maxZoom: 15
      })
    }
  }, [map, stations, userLocation])

  return null
}

// User location marker
const UserLocationMarker = ({ userLocation }) => {
  if (!userLocation) return null

  const userIcon = L.divIcon({
    html: `<div style="
      background: #ef4444;
      border: 3px solid white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    className: 'user-location-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })

  return (
    <Marker 
      position={[userLocation.latitude, userLocation.longitude]} 
      icon={userIcon}
    >
      <Popup>
        <div className="text-center p-2">
          <div className="flex items-center justify-center mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="font-semibold text-gray-900">Your Location</span>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

const StationMap = ({ stations = [], userLocation = null, onStationSelect, isLoading = false }) => {
  console.log('StationMap component - Received props:', { 
    stationsCount: stations.length, 
    userLocation, 
    isLoading,
    firstStation: stations[0] 
  });

  const [mapCenter, setMapCenter] = useState([27.7172, 85.3240]) // Default to Kathmandu
  const [selectedBookingStation, setSelectedBookingStation] = useState(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  
  useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.latitude, userLocation.longitude])
    } else if (stations.length > 0 && stations[0].location?.coordinates) {
      const [lng, lat] = stations[0].location.coordinates
      setMapCenter([lat, lng])
    }
  }, [userLocation, stations])

  const formatAmenity = (amenity) => {
    return amenity.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full w-full rounded-lg bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  // Show empty state if no stations
  if (!stations || stations.length === 0) {
    return (
      <div className="h-full w-full rounded-lg bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stations to display</h3>
          <p className="text-gray-600">Try adjusting your search criteria</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController stations={stations} userLocation={userLocation} />
        
        <UserLocationMarker userLocation={userLocation} />
        
        {stations.map((station) => {
          if (!station.location?.coordinates) return null
          
          const [lng, lat] = station.location.coordinates
          const isRecommended = station.dockitRecommended
          
          return (
            <Marker
              key={station._id}
              position={[lat, lng]}
              icon={createCustomIcon(isRecommended)}
            >
              <Popup maxWidth={320} minWidth={280}>
                <div className={`p-4 ${isRecommended ? 'border-t-4 border-primary-500' : ''}`}>
                  {/* Header */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-semibold text-gray-900 leading-tight ${isRecommended ? 'text-primary-900' : ''}`}>
                        {station.name}
                        {isRecommended && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                            ⭐ Premium
                          </span>
                        )}
                      </h3>
                    </div>
                    
                    <div className="flex items-center text-gray-600 text-sm mb-2">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {station.address?.street}, {station.address?.city}
                      </span>
                    </div>

                    {/* Rating */}
                    {station.rating && (
                      <div className="flex items-center mb-2">
                        <Star className="h-4 w-4 fill-current text-yellow-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900">
                          {station.rating.average.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({station.rating.count} reviews)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Station Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <Zap className="h-4 w-4 mr-1" />
                        <span>{station.chargingPorts?.length || 0} ports</span>
                      </div>
                      <div className="text-gray-600">
                        {station.operatingHours?.monday?.is24Hours ? '24/7' : 'Limited Hours'}
                      </div>
                    </div>

                    {/* Charging Ports */}
                    {station.chargingPorts && station.chargingPorts.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {station.chargingPorts.slice(0, 2).map((port, idx) => (
                          <span
                            key={idx}
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
                        {station.chargingPorts.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{station.chargingPorts.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Amenities */}
                    {station.amenities && station.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {station.amenities.slice(0, 3).map((amenity, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {formatAmenity(amenity)}
                          </span>
                        ))}
                        {station.amenities.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{station.amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (onStationSelect) {
                          onStationSelect(station)
                        }
                      }}
                      className={`flex-1 px-3 py-2 text-sm font-medium border rounded transition-colors ${
                        isRecommended 
                          ? 'text-primary-700 border-primary-700 hover:bg-primary-50' 
                          : 'text-primary-600 border-primary-600 hover:bg-primary-50'
                      }`}
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedBookingStation(station)
                        setIsBookingModalOpen(true)
                      }}
                      className={`flex-1 px-3 py-2 text-sm font-medium text-white rounded transition-all ${
                        isRecommended 
                          ? 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800' 
                          : 'bg-primary-600 hover:bg-primary-700'
                      }`}
                    >
                      {isRecommended ? '⚡ Quick Book' : 'Book Now'}
                    </button>
                  </div>

                  {/* Premium features for recommended stations */}
                  {isRecommended && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap gap-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                          <span className="h-1.5 w-1.5 bg-green-500 rounded-full mr-1"></span>
                          Fast Response
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          <span className="h-1.5 w-1.5 bg-blue-500 rounded-full mr-1"></span>
                          24/7 Support
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Enhanced Booking Modal */}
      <EnhancedBookingModal
        station={selectedBookingStation}
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false)
          setSelectedBookingStation(null)
        }}
      />
    </div>
  )
}

export default StationMap
