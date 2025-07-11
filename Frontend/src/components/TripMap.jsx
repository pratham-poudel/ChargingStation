import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { Star, MapPin, Zap, Clock, Battery } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { tripAIUtils } from '../services/tripAIService'

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons for different types of points
const createStartIcon = () => {
  const iconHtml = `<div style="
    background: linear-gradient(135deg, #10b981, #059669);
    border: 3px solid white;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    position: relative;
  ">
    <span style="
      color: white;
      font-size: 16px;
      font-weight: bold;
    ">🏁</span>
  </div>`

  return L.divIcon({
    html: iconHtml,
    className: 'custom-start-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}

const createEndIcon = () => {
  const iconHtml = `<div style="
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border: 3px solid white;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    position: relative;
  ">
    <span style="
      color: white;
      font-size: 16px;
      font-weight: bold;
    ">🏆</span>
  </div>`

  return L.divIcon({
    html: iconHtml,
    className: 'custom-end-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}

const createViaPointIcon = (viaNumber) => {
  const iconHtml = `<div style="
    background: linear-gradient(135deg, #f59e0b, #d97706);
    border: 3px solid white;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    position: relative;
  ">
    <span style="
      color: white;
      font-size: 14px;
      font-weight: bold;
    ">${viaNumber}</span>
  </div>`

  return L.divIcon({
    html: iconHtml,
    className: 'custom-via-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}

const createChargingStationIcon = (isRecommended = false, sessionNumber = 1) => {
  const iconHtml = isRecommended 
    ? `<div style="
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        border: 3px solid #fbbf24;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        position: relative;
      ">
        <span style="
          color: white;
          font-size: 18px;
          font-weight: bold;
        ">⚡</span>
        <div style="
          position: absolute;
          top: -8px;
          right: -8px;
          background: #fbbf24;
          color: #1f2937;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          border: 2px solid white;
        ">${sessionNumber}</div>
        <div style="
          position: absolute;
          top: -2px;
          left: -2px;
          background: #fbbf24;
          border-radius: 50%;
          width: 8px;
          height: 8px;
          border: 2px solid white;
        "></div>
      </div>`
    : `<div style="
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border: 2px solid white;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      ">
        <span style="
          color: white;
          font-size: 16px;
          font-weight: bold;
        ">⚡</span>
        <div style="
          position: absolute;
          top: -6px;
          right: -6px;
          background: #1d4ed8;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          border: 2px solid white;
        ">${sessionNumber}</div>
      </div>`

  return L.divIcon({
    html: iconHtml,
    className: 'custom-charging-marker',
    iconSize: isRecommended ? [40, 40] : [36, 36],
    iconAnchor: isRecommended ? [20, 40] : [18, 36],
    popupAnchor: [0, isRecommended ? -40 : -36]
  })
}

const TripMap = ({ tripPlan, onStationSelect }) => {
  const [mapCenter, setMapCenter] = useState([27.7172, 85.3240]) // Default to Kathmandu
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [mapInstance, setMapInstance] = useState(null)

  useEffect(() => {
    if (tripPlan && tripPlan.route) {
      // Set map center based on route
      const fromCoords = [tripPlan.route.from.latitude, tripPlan.route.from.longitude]
      const toCoords = [tripPlan.route.to.latitude, tripPlan.route.to.longitude]
      
      // Center map between start and end points
      const centerLat = (fromCoords[0] + toCoords[0]) / 2
      const centerLng = (fromCoords[1] + toCoords[1]) / 2
      setMapCenter([centerLat, centerLng])

      // Set route coordinates if available
      if (tripPlan.routeCoordinates) {
        setRouteCoordinates(tripPlan.routeCoordinates.map(coord => [coord.lat, coord.lng]))
      } else {
        // Simple line between start and end if detailed route not available
        setRouteCoordinates([fromCoords, toCoords])
      }
    }
  }, [tripPlan])

  // Fix map size when it becomes visible and fit bounds
  useEffect(() => {
    if (mapInstance && tripPlan) {
      const timer = setTimeout(() => {
        mapInstance.invalidateSize()
        
        // Calculate bounds to show all points
        const bounds = L.latLngBounds()
        
        // Add start point
        if (tripPlan.route?.from) {
          bounds.extend([tripPlan.route.from.latitude, tripPlan.route.from.longitude])
        }
        
        // Add end point  
        if (tripPlan.route?.to) {
          bounds.extend([tripPlan.route.to.latitude, tripPlan.route.to.longitude])
        }
        
        // Add via locations if any
        if (tripPlan.route?.viaLocations) {
          tripPlan.route.viaLocations.forEach(via => {
            if (via.latitude && via.longitude) {
              bounds.extend([via.latitude, via.longitude])
            }
          })
        }
        
        // Add charging stations
        if (tripPlan.chargingSessions && tripPlan.chargingSessions.length > 0) {
          tripPlan.chargingSessions.forEach(session => {
            if (session.station?.location?.coordinates) {
              const [lng, lat] = session.station.location.coordinates
              bounds.extend([lat, lng])
            } else if (session.coordinate) {
              // Fallback to session coordinate if station location not available
              bounds.extend([session.coordinate.lat, session.coordinate.lng])
            }
          })
        }
        
        // Add all route coordinates if available
        if (tripPlan.routeCoordinates && tripPlan.routeCoordinates.length > 0) {
          tripPlan.routeCoordinates.forEach(coord => {
            bounds.extend([coord.lat, coord.lng])
          })
        }
        
        // Fit bounds with padding
        if (bounds.isValid()) {
          try {
            mapInstance.fitBounds(bounds, { 
              padding: [50, 50],
              maxZoom: 15
            })
          } catch (error) {
            console.warn('Error fitting bounds:', error)
            // Fallback to simple center
            if (tripPlan.route?.from) {
              mapInstance.setView([tripPlan.route.from.latitude, tripPlan.route.from.longitude], 10)
            }
          }
        }
      }, 300) // Increased delay to ensure map is fully rendered
      
      return () => clearTimeout(timer)
    }
  }, [mapInstance, tripPlan])

  // Handle map creation
  const handleMapCreate = (map) => {
    setMapInstance(map)
  }

  if (!tripPlan) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No trip data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={8}
        className="h-full w-full"
        scrollWheelZoom={true}
        ref={handleMapCreate}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Route Line */}
        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: '#8b5cf6',
              weight: 4,
              opacity: 0.8,
              dashArray: '10, 5'
            }}
          />
        )}

        {/* Starting Point */}
        <Marker
          position={[tripPlan.route.from.latitude, tripPlan.route.from.longitude]}
          icon={createStartIcon()}
        >
          <Popup maxWidth={300} minWidth={250}>
            <div className="p-3">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <h3 className="font-bold text-gray-900">Starting Point</h3>
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">{tripPlan.route.from.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{tripPlan.route.from.fullAddress}</p>
              
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Initial Battery</span>
                  <div className="flex items-center text-green-700 font-semibold">
                    <Battery className="w-4 h-4 mr-1" />
                    {tripPlan.initialBatteryPercent}%
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Via Points */}
        {tripPlan.route.viaLocations && tripPlan.route.viaLocations.map((viaLocation, index) => {
          if (!viaLocation.latitude || !viaLocation.longitude) return null
          
          return (
            <Marker
              key={`via-${index}`}
              position={[viaLocation.latitude, viaLocation.longitude]}
              icon={createViaPointIcon(index + 1)}
            >
              <Popup maxWidth={300} minWidth={250}>
                <div className="p-3">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                    <h3 className="font-bold text-gray-900">Via Point #{index + 1}</h3>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1">{viaLocation.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{viaLocation.fullAddress}</p>
                  
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Stop #{index + 1}</span>
                      <div className="flex items-center text-orange-700 font-semibold">
                        <MapPin className="w-4 h-4 mr-1" />
                        Waypoint
                      </div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Charging Stations */}
        {tripPlan.chargingSessions && tripPlan.chargingSessions.map((session, index) => {
          const station = session.station
          if (!station.location?.coordinates) return null
          
          const [lng, lat] = station.location.coordinates
          const isRecommended = station.dockitRecommended
          
          return (
            <Marker
              key={station._id}
              position={[lat, lng]}
              icon={createChargingStationIcon(isRecommended, index + 1)}
            >
              <Popup maxWidth={350} minWidth={300}>
                <div className={`p-4 ${isRecommended ? 'border-t-4 border-purple-500' : ''}`}>
                  {/* Header */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-bold text-gray-900 leading-tight ${isRecommended ? 'text-purple-900' : ''}`}>
                        Charging Stop #{index + 1}
                        {isRecommended && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            ⭐ Premium
                          </span>
                        )}
                      </h3>
                    </div>
                    
                    <h4 className="font-semibold text-gray-800 mb-1">{station.name}</h4>
                    <div className="flex items-center text-gray-600 text-sm mb-2">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {station.address?.street}, {station.address?.city}
                      </span>
                    </div>
                  </div>

                  {/* Session Details */}
                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="text-blue-700 font-medium flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Arrival
                      </div>
                      <div className="text-gray-800 font-semibold">
                        {new Date(session.estimatedArrival).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-2">
                      <div className="text-purple-700 font-medium flex items-center">
                        <Zap className="w-3 h-3 mr-1" />
                        Charging
                      </div>
                      <div className="text-gray-800 font-semibold">
                        {tripAIUtils.formatTime(session.chargingTime)}
                      </div>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-2">
                      <div className="text-green-700 font-medium flex items-center">
                        <Battery className="w-3 h-3 mr-1" />
                        Battery
                      </div>
                      <div className="text-gray-800 font-semibold">
                        {session.batteryOnArrival}% → {session.batteryAfterCharging}%
                      </div>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-2">
                      <div className="text-orange-700 font-medium">Cost</div>
                      <div className="text-gray-800 font-semibold">
                        {tripAIUtils.formatCurrency(session.cost)}
                      </div>
                    </div>
                  </div>

                  {/* Station Rating */}
                  {station.rating && (
                    <div className="flex items-center mb-3">
                      <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                      <span className="font-semibold text-gray-900 mr-2">
                        {station.rating.average.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-600">
                        ({station.rating.count} reviews)
                      </span>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => onStationSelect?.(station)}
                    className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-sm"
                  >
                    View Station Details
                  </button>

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

        {/* Destination Point */}
        <Marker
          position={[tripPlan.route.to.latitude, tripPlan.route.to.longitude]}
          icon={createEndIcon()}
        >
          <Popup maxWidth={300} minWidth={250}>
            <div className="p-3">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <h3 className="font-bold text-gray-900">Destination</h3>
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">{tripPlan.route.to.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{tripPlan.route.to.fullAddress}</p>
              
              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Final Battery</span>
                  <div className="flex items-center text-green-700 font-semibold">
                    <Battery className="w-4 h-4 mr-1" />
                    {tripPlan.finalBatteryPercentage}%
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

export default TripMap 