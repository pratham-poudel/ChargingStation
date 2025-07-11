import { useState, useEffect } from 'react'
import { Clock, MapPin, Car } from 'lucide-react'
import locationService from '../services/locationService'

export default function StationDistance({ 
  station, 
  userLocation, 
  className = '' 
}) {
  // Use backend-provided distance data if available, otherwise calculate
  const hasBackendDistance = station.distanceKm !== undefined && station.estimatedTravelTime !== undefined
  const [distanceInfo, setDistanceInfo] = useState(
    hasBackendDistance 
      ? {
          distanceKm: station.distanceKm,
          durationMinutes: station.estimatedTravelTime
        }
      : null
  )
  const [isLoading, setIsLoading] = useState(!hasBackendDistance)

  useEffect(() => {
    // Only calculate distance if backend doesn't provide it
    if (!hasBackendDistance && userLocation && station?.location?.coordinates) {
      calculateDistance()
    } else if (hasBackendDistance) {
      setDistanceInfo({
        distanceKm: station.distanceKm,
        durationMinutes: station.estimatedTravelTime
      })
      setIsLoading(false)
    }
  }, [userLocation, station, hasBackendDistance])
  const calculateDistance = async () => {
    if (!userLocation || !station?.location?.coordinates) return

    setIsLoading(true)
    try {
      const routeDistance = await locationService.calculateRouteDistance(
        userLocation.latitude,
        userLocation.longitude,
        station.location.coordinates[1], // latitude
        station.location.coordinates[0], // longitude
        'driving' // Always use driving mode
      )
      
      setDistanceInfo(routeDistance)
    } catch (error) {
      console.error('Distance calculation error:', error)
      // If API fails, set loading to false and show no distance info
      setDistanceInfo(null)
    } finally {
      setIsLoading(false)
    }
  }
  if (!distanceInfo && (!userLocation || !station?.location?.coordinates)) {
    return null
  }

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}>
        <div className="animate-pulse flex items-center space-x-1">
          <MapPin className="h-3 w-3" />
          <span>Calculating...</span>
        </div>
      </div>
    )
  }

  if (!distanceInfo) {
    return null
  }

  return (
    <div className={`flex items-center space-x-4 text-sm ${className}`}>
      {/* Distance */}
      <div className="flex items-center space-x-1 text-gray-600">
        <MapPin className="h-3 w-3" />
        <span>{locationService.formatDistance(distanceInfo.distanceKm)} away</span>
      </div>
      
      {/* Travel Time */}
      <div className="flex items-center space-x-1 text-primary-600">
        <Car className="h-3 w-3" />        <span>
          {distanceInfo.durationMinutes 
            ? locationService.formatTravelTime(distanceInfo.durationMinutes)
            : '-- min'
          }
        </span>
      </div>
    </div>
  )
}
